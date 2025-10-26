"use server";

import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { type IUser } from "../models/user";
import { convertBase64ToFile } from "../utils";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "convex/_generated/api";

export async function getUserInfo(id: string): Promise<IUser | null> {
  try {
    const user = (await fetchQuery(api.users.getByClerkId, {
      clerkId: id,
    })) as any;
    if (!user) return null;
    return {
      _id: user._id as string,
      clerkId: user.clerkId,
      username: user.username,
      name: user.name,
      bio: user.bio,
      image: user.image,
      onboarded: user.onboarded,
    };
  } catch (error: any) {
    throw new Error(`Failed to get user: ${error.message}`);
  }
}

export async function updateUser(userData: IUser, path: string): Promise<void> {
  try {
    await fetchMutation(api.users.upsert, {
      clerkId: userData.clerkId,
      username: userData.username,
      name: userData.name,
      bio: userData.bio,
      image: userData.image,
      onboarded: true,
    });

    if (!userData.image.includes("https://img.clerk.com")) {
      const file: File = convertBase64ToFile(userData.image);
      clerkClient.users
        .updateUserProfileImage(userData.clerkId, { file })
        .catch((err) => {
          console.table(err.errors);
        });
    }

    if (path === "/profile/edit") {
      revalidatePath(path);
    }
  } catch (error: any) {
    throw new Error(`Failed to create/update user: ${error.message}`);
  }
}
