// Offline, owner-only import of two mongoexport --jsonArray files.
// No MongoDB client or credential is needed by the running application.
import { database } from '../server/db'
import { z } from 'zod'
const mongoId = z.union([
  z.string().min(1),
  z
    .object({ $oid: z.string().regex(/^[a-f0-9]{24}$/) })
    .transform((value) => value.$oid)
])
const legacyRecipe = z.object({
  _id: mongoId,
  recipeName: z.string(),
  recipeLink: z.string().default(''),
  recipeBook: z.string().default(''),
  recipePageNo: z.string().default(''),
  archive: z.boolean().default(false)
})
const legacyUser = z.object({
  _id: mongoId,
  clerkId: z.string().min(1),
  username: z.string().min(1),
  name: z.string().default(''),
  bio: z.string().default(''),
  image: z.string().default(''),
  onboarded: z.boolean().default(false)
})
export async function importSnapshot(
  sql: ReturnType<typeof database>,
  sourceRecipes: unknown,
  sourceUsers: unknown
) {
  const recipes = z.array(legacyRecipe).parse(sourceRecipes)
  const users = z.array(legacyUser).parse(sourceUsers)
  for (const rows of [recipes, users])
    if (new Set(rows.map((row) => row._id)).size !== rows.length)
      throw new Error('Duplicate source IDs')
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(72819304)`
    for (const r of recipes) {
      await tx`INSERT INTO recipes (id, recipe_name, recipe_link, recipe_book, recipe_page_no, archive) VALUES (${r._id}, ${r.recipeName}, ${r.recipeLink}, ${r.recipeBook}, ${r.recipePageNo}, ${r.archive}) ON CONFLICT (id) DO NOTHING`
      const [actual] =
        await tx`SELECT recipe_name, recipe_link, recipe_book, recipe_page_no, archive FROM recipes WHERE id = ${r._id}`
      const expected = {
        recipe_name: r.recipeName,
        recipe_link: r.recipeLink,
        recipe_book: r.recipeBook,
        recipe_page_no: r.recipePageNo,
        archive: r.archive
      }
      if (
        Object.entries(expected).some(([key, value]) => actual[key] !== value)
      )
        throw new Error(
          'Existing recipe differs from source; import rolled back'
        )
    }
    for (const u of users) {
      await tx`INSERT INTO users (id, clerk_id, username, name, bio, image, onboarded) VALUES (${u._id}, ${u.clerkId}, ${u.username}, ${u.name}, ${u.bio}, ${u.image}, ${u.onboarded}) ON CONFLICT (id) DO NOTHING`
      const [actual] =
        await tx`SELECT clerk_id, username, name, bio, image, onboarded FROM users WHERE id = ${u._id}`
      const expected = {
        clerk_id: u.clerkId,
        username: u.username,
        name: u.name,
        bio: u.bio,
        image: u.image,
        onboarded: u.onboarded
      }
      if (
        Object.entries(expected).some(([key, value]) => actual[key] !== value)
      )
        throw new Error('Existing user differs from source; import rolled back')
    }
  })
  return { recipes: recipes.length, users: users.length }
}
if (import.meta.main) {
  const [recipesPath, usersPath] = process.argv.slice(2)
  if (!recipesPath || !usersPath || !process.env.DATABASE_URL)
    throw new Error(
      'Usage: DATABASE_URL=<owner URL> bun deploy/import-mongo.ts recipes.json users.json'
    )
  const sql = database(process.env.DATABASE_URL)
  try {
    console.log(
      await importSnapshot(
        sql,
        await Bun.file(recipesPath).json(),
        await Bun.file(usersPath).json()
      )
    )
  } catch {
    console.error(
      'Import failed; transaction rolled back. Check the protected source and database locally.'
    )
    process.exitCode = 1
  } finally {
    await sql.end()
  }
}
