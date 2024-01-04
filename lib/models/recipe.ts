import mongoose from 'mongoose'

// 1. Create an interface representing a document in MongoDB.
export interface IRecipe {
	_id: string
	recipeName: string
	link: string
	book: string
	pageNo: string
	archive: boolean
}
interface RecipeClass {
  _id: mongoose.Types.ObjectId;
  recipeName: string;
  link: string;
  book: string;
  pageNo: string;
  archive: boolean;
}
const recipeSchema = new mongoose.Schema<RecipeClass>({
  _id: { type: mongoose.Schema.Types.ObjectId },
  recipeName: { type: String },
  link: { type: String },
  book: { type: String },
  pageNo: { type: String },
  archive: { type: Boolean },
});

const Recipe = mongoose.models.Recipe || mongoose.model("Recipe", recipeSchema);

export default Recipe;
