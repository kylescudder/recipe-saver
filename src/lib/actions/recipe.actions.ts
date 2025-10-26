"use server";

import { type IRecipe } from "../models/recipe";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "convex/_generated/api";

export async function getRecipes(): Promise<IRecipe[]> {
  try {
    const docs = await fetchQuery(api.recipes.list, {});
    // Map Convex docs to IRecipe (string _id)
    return docs.map((d: any) => ({
      _id: d._id as string,
      recipeName: d.recipeName,
      recipeLink: d.recipeLink,
      recipeBook: d.recipeBook,
      recipePageNo: d.recipePageNo,
      archive: d.archive,
    }));
  } catch (error: any) {
    throw new Error(`Failed to get recipes: ${error.message}`);
  }
}

export async function updateRecipe(recipeData: IRecipe): Promise<IRecipe> {
  try {
    const d: any = await fetchMutation(api.recipes.upsert, {
      id: recipeData._id ? (recipeData._id as any) : undefined,
      recipeName: recipeData.recipeName,
      recipeLink: recipeData.recipeLink,
      recipeBook: recipeData.recipeBook,
      recipePageNo: recipeData.recipePageNo,
      archive: recipeData.archive,
    });
    return {
      _id: d._id as string,
      recipeName: d.recipeName,
      recipeLink: d.recipeLink,
      recipeBook: d.recipeBook,
      recipePageNo: d.recipePageNo,
      archive: d.archive,
    };
  } catch (error: any) {
    throw new Error(`Failed to create/update recipe: ${error.message}`);
  }
}

export async function archiveRecipe(id: string) {
  try {
    const d = (await fetchMutation(api.recipes.archive, {
      id: id as any,
    })) as any;
    return {
      _id: d._id as string,
      recipeName: d.recipeName,
      recipeLink: d.recipeLink,
      recipeBook: d.recipeBook,
      recipePageNo: d.recipePageNo,
      archive: d.archive,
    } as IRecipe;
  } catch (error: any) {
    throw new Error(`Failed to archive recipe: ${error.message}`);
  }
}
