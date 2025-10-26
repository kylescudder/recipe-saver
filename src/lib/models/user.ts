// Shared user interface for the app (Convex-backed)
export interface IUser {
  _id: string;
  clerkId: string;
  username: string;
  name: string;
  bio: string;
  image: string;
  onboarded: boolean;
}

// This file used to export a Mongoose model. It now only contains types.
