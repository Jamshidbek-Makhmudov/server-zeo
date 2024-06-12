import { Schema, model } from "mongoose";

export enum ProductOrigin {
  BIGBUY = "bigbuy",
  WORTEN = "worten",
}

export const StagingProductSchema = new Schema(
  {
    title: { type: "String", required: true },
    origin: { type: "String" },
    name: { type: "String" },
    productType: { type: "String" },
    sku_origin: { type: "String" },
    ean: { type: "String" },
    image: { type: "String" },
    sku_zeoos: { type: "String" },
    seller_zeoos: { type: "Number" },
    productData: { type: Schema.Types.Mixed },
    created: { type: "Date", default: Date.now },
    updatedStock: { type: "Date" },
    updatedPrice: { type: "Date" },
    updatedShipping: { type: "Date" },
  },
  { collection: "stagingProducts" }
);

StagingProductSchema.index({ ean: 1, origin: 1 });

StagingProductSchema.index(
  { origin: 1, sku_origin: 1, seller_zeoos: 1 },
  { unique: true }
);

export const StagingProduct = model("StagingProduct", StagingProductSchema);

export const StagingCategorySchema = new Schema(
  {
    origin: { type: "String", required: true },
    name: { type: "String" },
    id_origin: { type: "String" },
    id_zeoos: { type: "String" },
    categoryData: { type: Schema.Types.Mixed },
    created: { type: "Date", default: Date.now },
  },
  { collection: "stagingCategories" }
);

export const StagingCategory = model("StagingCategory", StagingCategorySchema);
