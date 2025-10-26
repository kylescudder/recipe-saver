import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    return await ctx.db.query("recipes").collect();
  },
});

export const upsert = mutation({
  args: {
    id: v.optional(v.id("recipes")),
    recipeName: v.string(),
    recipeLink: v.string(),
    recipeBook: v.string(),
    recipePageNo: v.string(),
    archive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    if (args.id) {
      await ctx.db.patch(args.id as Id<"recipes">, {
        recipeName: args.recipeName,
        recipeLink: args.recipeLink,
        recipeBook: args.recipeBook,
        recipePageNo: args.recipePageNo,
        archive: args.archive,
      });
      return await ctx.db.get(args.id as Id<"recipes">);
    }
    const newId = await ctx.db.insert("recipes", {
      recipeName: args.recipeName,
      recipeLink: args.recipeLink,
      recipeBook: args.recipeBook,
      recipePageNo: args.recipePageNo,
      archive: args.archive,
    });
    return await ctx.db.get(newId);
  },
});

export const archive = mutation({
  args: { id: v.id("recipes") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    await ctx.db.patch(id, { archive: true });
    return await ctx.db.get(id);
  },
});

// Internal mutation for migration
export const internalUpsert = internalMutation({
  args: {
    recipeName: v.string(),
    recipeLink: v.string(),
    recipeBook: v.string(),
    recipePageNo: v.string(),
    archive: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("recipes", { ...args });
  },
});
