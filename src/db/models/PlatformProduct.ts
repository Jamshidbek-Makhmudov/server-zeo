import { Schema, model } from "mongoose";

export enum ProductPlatformStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export const PlatformProductSchema = new Schema(
  {
    ean: { type: "String", required: true },
    sku: { type: "String" },

    country: { type: "String" },
    platform: {
      type: Schema.Types.ObjectId,
      ref: "Marketplace",
      required: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    offer: {
      type: Schema.Types.ObjectId,
      ref: "Offer",
    },

    id: { type: "String", required: true },
    extraId: { type: "String" },
    //change default to true to avoid integrations "problems"
    active: { type: "Boolean", required: true, default: true },
    integrated: { type: "Boolean", default: false },
    integrationDate: { type: "Date" },
    platformStatus: { type: "String", enum: ProductPlatformStatus },

    prematch: { type: "Boolean" },
    prematchDate: { type: "Date" },

    link: { type: "String" },
    linkType: { type: "String" },
    issues: [{ type: Schema.Types.Mixed }],

    created: { type: "Date", required: true, default: Date.now },
  },
  { collection: "platformProducts" }
);

PlatformProductSchema.index({ ean: 1, platform: 1 }, { unique: true });

export const PlatformProduct = model("PlatformProduct", PlatformProductSchema);
