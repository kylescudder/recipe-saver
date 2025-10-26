import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    username: v.string(),
    name: v.string(),
    bio: v.string(),
    image: v.string(),
    onboarded: v.boolean(),
  }).index("by_clerkId", ["clerkId"]),

  recipes: defineTable({
    recipeName: v.string(),
    recipeLink: v.string(),
    recipeBook: v.string(),
    recipePageNo: v.string(),
    archive: v.boolean(),
  }),
});
