import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const importAll = action({
  args: {
    token: v.string(),
    users: v.array(
      v.object({
        clerkId: v.string(),
        username: v.string(),
        name: v.string(),
        bio: v.string(),
        image: v.string(),
        onboarded: v.boolean(),
      }),
    ),
    recipes: v.array(
      v.object({
        recipeName: v.string(),
        recipeLink: v.string(),
        recipeBook: v.string(),
        recipePageNo: v.string(),
        archive: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, { token, users, recipes }) => {
    if (token !== process.env.CONVEX_MIGRATION_TOKEN) {
      throw new Error("Unauthorized migration token");
    }

    // Import users
    for (const u of users) {
      await ctx.runMutation(internal.users.internalUpsert, u);
    }

    // Import recipes
    for (const r of recipes) {
      await ctx.runMutation(internal.recipes.internalUpsert, r);
    }

    return { users: users.length, recipes: recipes.length };
  },
});
