import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { httpRouter } from "convex/server";

export const migrateImport = httpAction(async (ctx, request) => {
  const token = request.headers.get("x-migration-token") || "";
  if (token !== process.env.CONVEX_MIGRATION_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.users) || !Array.isArray(body.recipes)) {
    return new Response("Invalid body", { status: 400 });
  }

  // Users
  for (const u of body.users) {
    await ctx.runMutation(internal.users.internalUpsert, {
      clerkId: String(u.clerkId || ""),
      username: String(u.username || ""),
      name: String(u.name || ""),
      bio: String(u.bio || ""),
      image: String(u.image || ""),
      onboarded: Boolean(u.onboarded || false),
    });
  }

  // Recipes
  for (const r of body.recipes) {
    await ctx.runMutation(internal.recipes.internalUpsert, {
      recipeName: String(r.recipeName || ""),
      recipeLink: String(r.recipeLink || ""),
      recipeBook: String(r.recipeBook || ""),
      recipePageNo: String(r.recipePageNo || ""),
      archive: Boolean(r.archive || false),
    });
  }

  return new Response(
    JSON.stringify({ users: body.users.length, recipes: body.recipes.length }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );
});

const http = httpRouter();
http.route({ path: "/migrate", method: "POST", handler: migrateImport });
export default http;
