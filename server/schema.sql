-- Onboarding profiles were removed; the previous release no longer reads users.
DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS recipes (
  id text PRIMARY KEY,
  recipe_name text NOT NULL,
  recipe_link text NOT NULL DEFAULT '',
  recipe_book text NOT NULL DEFAULT '',
  recipe_page_no text NOT NULL DEFAULT '',
  archive boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS recipes_active_name ON recipes (lower(recipe_name)) WHERE archive = false;
