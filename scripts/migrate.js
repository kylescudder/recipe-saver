/*
Usage:
  MONGODB_URL="mongodb+srv://..." \
  NEXT_PUBLIC_CONVEX_URL="https://<your>.convex.cloud" \
  CONVEX_MIGRATION_TOKEN="your-secret" \
  bun run migrate

This script reads existing Mongo collections (users, recipes) and posts them to the Convex migration HTTP endpoint created in convex/http.ts.
*/

import { MongoClient } from "mongodb";

const mongoUrl = process.env.MONGODB_URL;
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const token = process.env.CONVEX_MIGRATION_TOKEN;

if (!mongoUrl) throw new Error("MONGODB_URL env is required");
if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL env is required");
if (!token) throw new Error("CONVEX_MIGRATION_TOKEN env is required");

const client = new MongoClient(mongoUrl);

async function run() {
  try {
    await client.connect();
    const db = client.db();

    const users = await db
      .collection("users")
      .find({})
      .project({
        _id: 0,
        clerkId: 1,
        username: 1,
        name: 1,
        bio: 1,
        image: 1,
        onboarded: 1,
      })
      .toArray();

    const recipes = await db
      .collection("recipes")
      .find({})
      .project({
        _id: 0,
        recipeName: 1,
        recipeLink: 1,
        recipeBook: 1,
        recipePageNo: 1,
        archive: 1,
      })
      .toArray();

    const res = await fetch(`${convexUrl}/migrate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-migration-token": token,
      },
      body: JSON.stringify({ users, recipes }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Convex migration failed: ${res.status} ${text}`);
    }
    const data = await res.json();
    console.log("Migration completed:", data);
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
