'use server'

import { connectToDB } from '../mongoose'
import Recipe, { type IRecipe } from '../models/recipe'
import mongoose from 'mongoose'

export async function getRecipes (): Promise<IRecipe[]> {
	try {
		await connectToDB()

		return await Recipe.find({})
	} catch (error: any) {
		throw new Error(`Failed to get recipes: ${error.message}`)
	}
}

export async function archiveRecipe (id: string): Promise<void> {
	try {
		await connectToDB()

		await Recipe.findOneAndUpdate(
			{ _id: new mongoose.Types.ObjectId(id) },
			{
				archive: true
			}
		)
	} catch (error: any) {
		throw new Error(`Failed to archive recipe: ${error.message}`)
	}
}
