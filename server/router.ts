import { initTRPC, TRPCError } from '@trpc/server'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import type { Database } from './db'
import type { IRecipe } from '../src/lib/models/recipe'
import type { IUser } from '../src/lib/models/user'
export type Context = { sql: Database; userId: string | null }
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return error.code === 'INTERNAL_SERVER_ERROR'
      ? {
          ...shape,
          message: 'The request could not be completed',
          data: { ...shape.data, stack: undefined }
        }
      : shape
  }
})
const authenticated = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, userId: ctx.userId } })
})
const member = authenticated.use(async ({ ctx, next }) => {
  const [user] =
    await ctx.sql`SELECT onboarded FROM users WHERE clerk_id = ${ctx.userId}`
  if (!user?.onboarded)
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Complete your profile first'
    })
  return next()
})
const id = z.string().min(1).max(100)
const text = z.string().trim()
const httpUrl = text.max(2048).refine((value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}, 'Use an http or https website URL')
export const recipeInput = z
  .object({
    _id: z.string().max(100),
    recipeName: text.min(1).max(300),
    recipeLink: z.union([z.literal(''), httpUrl]),
    recipeBook: text.max(300),
    recipePageNo: text.max(50),
    archive: z.boolean()
  })
  .refine(
    (recipe) => Boolean(recipe.recipeLink) !== Boolean(recipe.recipeBook),
    'Choose a website link or a book'
  )
export const appRouter = t.router({
  profile: t.router({
    me: authenticated.query(async ({ ctx }) => {
      const [user] = await ctx.sql<
        IUser[]
      >`SELECT id AS "_id", clerk_id AS "clerkId", username, name, bio, image, onboarded FROM users WHERE clerk_id = ${ctx.userId}`
      return user ?? null
    }),
    save: authenticated
      .input(
        z.object({
          username: text.min(3).max(200),
          name: text.min(1).max(100),
          bio: text.max(2000),
          image: z.union([z.literal(''), httpUrl])
        })
      )
      .mutation(async ({ ctx, input }) => {
        await ctx.sql`INSERT INTO users (id, clerk_id, username, name, bio, image, onboarded)
        VALUES (${randomUUID()}, ${ctx.userId}, ${input.username}, ${input.name}, ${input.bio}, ${input.image}, true)
        ON CONFLICT (clerk_id) DO UPDATE SET username = EXCLUDED.username, name = EXCLUDED.name, bio = EXCLUDED.bio, image = EXCLUDED.image, onboarded = true`
        return { ok: true }
      })
  }),
  // The original application is a shared household recipe collection. All
  // onboarded Clerk users see it; profile identity always comes from Clerk.
  recipes: t.router({
    list: member.query(
      ({ ctx }) =>
        ctx.sql<
          IRecipe[]
        >`SELECT id AS "_id", recipe_name AS "recipeName", recipe_link AS "recipeLink", recipe_book AS "recipeBook", recipe_page_no AS "recipePageNo", archive FROM recipes WHERE archive = false ORDER BY lower(recipe_name), id`
    ),
    save: member.input(recipeInput).mutation(async ({ ctx, input }) => {
      const recipeId = input._id || randomUUID()
      const rows = input._id
        ? await ctx.sql<
            IRecipe[]
          >`UPDATE recipes SET recipe_name = ${input.recipeName}, recipe_link = ${input.recipeLink}, recipe_book = ${input.recipeBook}, recipe_page_no = ${input.recipePageNo}, archive = ${input.archive} WHERE id = ${recipeId} RETURNING id AS "_id", recipe_name AS "recipeName", recipe_link AS "recipeLink", recipe_book AS "recipeBook", recipe_page_no AS "recipePageNo", archive`
        : await ctx.sql<
            IRecipe[]
          >`INSERT INTO recipes (id, recipe_name, recipe_link, recipe_book, recipe_page_no, archive) VALUES (${recipeId}, ${input.recipeName}, ${input.recipeLink}, ${input.recipeBook}, ${input.recipePageNo}, ${input.archive}) RETURNING id AS "_id", recipe_name AS "recipeName", recipe_link AS "recipeLink", recipe_book AS "recipeBook", recipe_page_no AS "recipePageNo", archive`
      if (!rows[0]) throw new TRPCError({ code: 'NOT_FOUND' })
      return rows[0]
    }),
    archive: member.input(id).mutation(async ({ ctx, input }) => {
      const rows =
        await ctx.sql`UPDATE recipes SET archive = true WHERE id = ${input} RETURNING id`
      if (!rows.length) throw new TRPCError({ code: 'NOT_FOUND' })
      return { ok: true }
    })
  })
})
export type AppRouter = typeof appRouter
