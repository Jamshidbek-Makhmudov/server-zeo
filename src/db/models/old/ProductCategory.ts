import mongoose, { Schema, Document } from "mongoose";

export interface ICategory extends Document {
  root: string;
  code: string;
  label: string;
  type: string;
  required_attributes: string[];
  recommended_attributes: string[];
  optional_attributes: string[];
}

const CategorySchema: Schema = new Schema({
  root: { type: String, default: "" },
  code: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  type: { type: String, required: true },
});

const ProductCategory = mongoose.model<ICategory>(
  "ProductCategory",
  CategorySchema
);

export default ProductCategory;
