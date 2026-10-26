import { sql } from 'drizzle-orm'
import { boolean, index, pgTable, text } from 'drizzle-orm/pg-core'

export const recipes = pgTable(
  'recipes',
  {
    id: text('id').primaryKey(),
    recipeName: text('recipe_name').notNull(),
    recipeLink: text('recipe_link').notNull().default(''),
    recipeBook: text('recipe_book').notNull().default(''),
    recipePageNo: text('recipe_page_no').notNull().default(''),
    archive: boolean('archive').notNull().default(false)
  },
  (table) => [
    index('recipes_active_name')
      .on(sql`lower(${table.recipeName})`)
      .where(sql`${table.archive} = false`)
  ]
)
