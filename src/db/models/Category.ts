import { Schema, model, Document } from "mongoose";
import { LogisticClass } from "types/category";

export interface ICategory extends Document {
  code: string;
  codeWorten: string;
  take: number;
  image?: string;

  parent?: string;
  level: 1 | 2 | 3;
  products: number;
  logisticClass: LogisticClass;

  label: string;
  label_en: string;
  label_es: string;
  label_fr: string;

  created: string;
}

const category = new Schema(
  {
    code: { type: Schema.Types.String, required: true, unique: true },
    codeWorten: { type: Schema.Types.String },
    take: { type: Schema.Types.Number, required: true },
    image: { type: Schema.Types.String },

    parent: { type: Schema.Types.ObjectId, ref: "Category" },
    level: { type: Schema.Types.Number, required: true },
    products: { type: Schema.Types.Number, required: true, default: 0 },
    logisticClass: { type: Schema.Types.String, required: true },

    label: { type: Schema.Types.String, required: true },
    label_en: { type: Schema.Types.String, required: true },
    label_es: { type: Schema.Types.String, required: true },
    label_fr: { type: Schema.Types.String, required: true },

    name: { type: Schema.Types.String },
    name_en: { type: Schema.Types.String },
    name_es: { type: Schema.Types.String },
    name_fr: { type: Schema.Types.String },

    created: { type: Schema.Types.Date, default: Date.now },
  },
  { collection: "productCategories" }
);

export const Category = model("Category", category);

const categoryPlatformRate = new Schema({
  category: { type: Schema.Types.ObjectId, required: true, ref: "Category" },
  categoryCode: { type: Schema.Types.String, required: true },
  marketplaceIntegration: {
    type: Schema.Types.ObjectId,
    ref: "MarketplaceIntegration",
    required: true,
  },
  marketplaceIntegrationName: { type: Schema.Types.String, required: true },
  rate: { type: Schema.Types.Number, required: true },
  created: { type: Schema.Types.Date, default: Date.now },
});

categoryPlatformRate.index(
  { category: 1, marketplaceIntegration: 1 },
  { unique: true }
);

export const CategoryPlatformRate = model(
  "categoryPlatformRate",
  categoryPlatformRate
);

const categoryTaxRate = new Schema({
  category: { type: Schema.Types.ObjectId, required: true, ref: "Category" },
  categoryCode: { type: Schema.Types.String, required: true },
  country: {
    type: Schema.Types.ObjectId,
    ref: "CountryManagement",
    required: true,
  },
  countryCode: { type: Schema.Types.String, required: true },
  rate: { type: Schema.Types.Number, required: true },
  created: { type: Schema.Types.Date, default: Date.now },
});

categoryTaxRate.index({ category: 1, country: 1 }, { unique: true });

export const CategoryTaxRate = model("CategoryTaxRate", categoryTaxRate);
