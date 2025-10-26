# recipe-saver

A list of recipes so we dont have to keep a massive list of tabs open

## Data layer

This app now uses Convex instead of Mongo/Mongoose.

### Prerequisites

- Convex project created (Convex Cloud) with envs configured in this repo
  - NEXT_PUBLIC_CONVEX_URL
  - CONVEX_DEPLOYMENT (optional)
  - CONVEX_MIGRATION_TOKEN (only needed for one-off migration)
- Clerk is used for auth; Convex functions enforce Clerk authentication.

### Local setup

1. Install deps
   - bun install
2. Generate Convex client/types (runs a local Convex dev process)
   - bun run convex:dev
3. Run the app
   - bun run dev

### Data model

- users: { clerkId, username, name, bio, image, onboarded }
- recipes: { recipeName, recipeLink, recipeBook, recipePageNo, archive }

### Server actions now call Convex

- src/lib/actions/recipe.actions.ts → uses convex/\_generated/api recipes.list/upsert/archive
- src/lib/actions/user.actions.ts → uses convex/\_generated/api users.getByClerkId/upsert

## Migration from Mongo → Convex

If you have existing Mongo data, you can migrate it automatically.

Important: The Mongo/Mongoose runtime is removed from the app. A small migration script exists which uses the Node `mongodb` driver as a devDependency; remove it after migration if you like.

1. Ensure env vars are set (in your shell or a .env.local):
   - MONGODB_URL
   - NEXT_PUBLIC_CONVEX_URL
   - CONVEX_MIGRATION_TOKEN (must match the token expected by Convex)

2. Start Convex dev to ensure the HTTP route is available and code is compiled:
   - bun run convex:dev

3. Run the migration:
   - bun run migrate

This will read `users` and `recipes` collections from Mongo and POST them to the Convex HTTP endpoint `/migrate` implemented in `convex/http.ts`.

After migration, you can remove the `mongodb` devDependency and the `scripts/migrate.js` script if you wish.

## Removing Mongo/Mongoose

- Mongoose has been fully removed from the runtime and build config.
- File `src/lib/mongoose.ts` is no longer used and can be deleted.
- The `mongodb` devDependency is only required to run the migration script once; you can remove it afterwards.
