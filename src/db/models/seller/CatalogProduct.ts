import { Schema, model } from "mongoose";

export const CatalogProductSchema = new Schema(
  {
    ean: { type: Schema.Types.String, required: true },
    sku: { type: Schema.Types.String },

    sellerSku: { type: Schema.Types.String },
    stock: { type: Schema.Types.Number, required: true, default: 0 },

    offersCount: { type: Schema.Types.Number, default: 0 },

    seller: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    report: {
      type: Schema.Types.ObjectId,
      ref: "ProductImportReport",
    },

    created: { type: Schema.Types.Date, required: true, default: Date.now },
  },
  { collection: "catalogProducts" }
);

CatalogProductSchema.index({ ean: 1, seller: 1 }, { unique: true });

export const CatalogProduct = model("CatalogProduct", CatalogProductSchema);
