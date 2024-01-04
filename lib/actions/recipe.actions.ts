'use server'

import { connectToDB } from '../mongoose'
import Recipe, { type IRecipe } from '../models/recipe'

export async function getRecipes (): Promise<IRecipe[]> {
  try {
    await connectToDB();

    return await Recipe.find({});
  } catch (error: any) {
    throw new Error(`Failed to get recipes: ${error.message}`);
  }
}

//export async function getRecipe (id: string): Promise<IRecipe | null> {
//  try {
//    await connectToDB();

//    return await Recipe.findOne({
//      _id: id,
//    });
//  } catch (error: any) {
//    throw new Error(`Failed to get user: ${error.message}`);
//  }
//}

//export async function updateUser (userData: IUser, path: string): Promise<void> {
//	try {
//		await connectToDB()

//		await User.findOneAndUpdate(
//			{ clerkId: userData.clerkId },
//			{
//				username: userData.username,
//				clerkId: userData.clerkId,
//				name: userData.name,
//				bio: userData.bio,
//				onboarded: true
//			},
//			{ upsert: true, new: true }
//		)
//		if (!userData.image.includes('https://img.clerk.com')) {
//			const file: File = convertBase64ToFile(userData.image)
//			clerkClient.users
//				.updateUserProfileImage(userData.clerkId, { file })
//				.catch((err) => {
//					console.table(err.errors)
//				})
//		}

//		if (path === '/profile/edit') {
//			revalidatePath(path)
//		}
//	} catch (error: any) {
//		throw new Error(`Failed to create/update user: ${error.message}`)
//	}
//}
