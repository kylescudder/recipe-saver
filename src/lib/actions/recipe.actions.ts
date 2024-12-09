'use server'

import { connectToDB } from '../mongoose'
import Recipe, { type IRecipe } from '../models/recipe'
import mongoose from 'mongoose'

export async function getRecipes(): Promise<IRecipe[]> {
  try {
    await connectToDB()

    const recipes = await Recipe.find({ archive: false })

    return recipes.map((recipe) => ({
      ...recipe.toObject(),
      _id: recipe._id.toString()
    }))
  } catch (error: any) {
    throw new Error(`Failed to get recipes: ${error.message}`)
  }
}

export async function updateRecipe(recipeData: IRecipe) {
  try {
    connectToDB()

    const newId = new mongoose.Types.ObjectId()
    if (recipeData._id === '') {
      recipeData._id = newId.toString()
    }

    const recipe = await Recipe.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(recipeData._id) },
      {
        _id: new mongoose.Types.ObjectId(recipeData._id),
        recipeName: recipeData.recipeName,
        recipeLink: recipeData.recipeLink,
        recipeBook: recipeData.recipeBook,
        recipePageNo: recipeData.recipePageNo,
        archive: recipeData.archive
      },
      { upsert: true, new: true }
    )

    return {
      ...recipe.toObject(),
      _id: recipe._id.toString()
    }
  } catch (error: any) {
    throw new Error(`Failed to create/update recipe: ${error.message}`)
  }
}
export async function archiveRecipe(id: string) {
  try {
    connectToDB()

    await Recipe.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id) },
      { archive: true },
      { new: true }
    )
  } catch (error: any) {
    throw new Error(`Failed to archive recipe: ${error.message}`)
  }
}
