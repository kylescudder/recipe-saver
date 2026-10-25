import { initTRPC, TRPCError } from '@trpc/server'
import { randomUUID } from 'node:crypto'
import { asc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Orm } from './db'
import { recipes } from './schema'
export type Context = { db: Orm; userId: string | null }
const recipeColumns = {
  _id: recipes.id,
  recipeName: recipes.recipeName,
  recipeLink: recipes.recipeLink,
  recipeBook: recipes.recipeBook,
  recipePageNo: recipes.recipePageNo,
  archive: recipes.archive
}
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
  // The original application is a shared household recipe collection. All
  // signed-in Clerk users see it; identity always comes from the session.
  recipes: t.router({
    list: authenticated.query(({ ctx }) =>
      ctx.db
        .select(recipeColumns)
        .from(recipes)
        .where(eq(recipes.archive, false))
        .orderBy(sql`lower(${recipes.recipeName})`, asc(recipes.id))
    ),
    save: authenticated.input(recipeInput).mutation(async ({ ctx, input }) => {
      const recipeId = input._id || randomUUID()
      const values = {
        recipeName: input.recipeName,
        recipeLink: input.recipeLink,
        recipeBook: input.recipeBook,
        recipePageNo: input.recipePageNo,
        archive: input.archive
      }
      const rows = input._id
        ? await ctx.db
            .update(recipes)
            .set(values)
            .where(eq(recipes.id, recipeId))
            .returning(recipeColumns)
        : await ctx.db
            .insert(recipes)
            .values({ id: recipeId, ...values })
            .returning(recipeColumns)
      if (!rows[0]) throw new TRPCError({ code: 'NOT_FOUND' })
      return rows[0]
    }),
    archive: authenticated.input(id).mutation(async ({ ctx, input }) => {
      const rows = await ctx.db
        .update(recipes)
        .set({ archive: true })
        .where(eq(recipes.id, input))
        .returning({ id: recipes.id })
      if (!rows.length) throw new TRPCError({ code: 'NOT_FOUND' })
      return { ok: true }
    })
  })
})
export type AppRouter = typeof appRouter
