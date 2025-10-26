// Shared recipe interface for the app (Convex-backed)
export interface IRecipe {
  _id: string;
  recipeName: string;
  recipeLink: string;
  recipeBook: string;
  recipePageNo: string;
  archive: boolean;
}

// This file used to export a Mongoose model. It now only contains types.
