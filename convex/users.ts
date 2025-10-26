import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const result = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();
    return result ?? null;
  },
});

export const upsert = mutation({
  args: {
    clerkId: v.string(),
    username: v.string(),
    name: v.string(),
    bio: v.string(),
    image: v.string(),
    onboarded: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        username: args.username,
        name: args.name,
        bio: args.bio,
        image: args.image,
        onboarded: args.onboarded,
      });
      return await ctx.db.get(existing._id);
    }

    const id = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      username: args.username,
      name: args.name,
      bio: args.bio,
      image: args.image,
      onboarded: args.onboarded,
    });
    return await ctx.db.get(id);
  },
});

// Internal mutation for data migration (bypasses auth checks)
export const internalUpsert = internalMutation({
  args: {
    clerkId: v.string(),
    username: v.string(),
    name: v.string(),
    bio: v.string(),
    image: v.string(),
    onboarded: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        username: args.username,
        name: args.name,
        bio: args.bio,
        image: args.image,
        onboarded: args.onboarded,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      username: args.username,
      name: args.name,
      bio: args.bio,
      image: args.image,
      onboarded: args.onboarded,
    });
  },
});
