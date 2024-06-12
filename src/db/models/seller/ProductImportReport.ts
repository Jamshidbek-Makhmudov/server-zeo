import { Schema, model, Document } from "mongoose";

export const productImportReport = new Schema<Document>(
  {
    created: { type: Schema.Types.Date, required: true, default: Date.now },
    sellerId: { type: Schema.Types.Number, required: true },
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    seller: { type: Schema.Types.ObjectId, required: true, ref: "Vendor" },

    platformCounter: {
      type: Map,
      of: new Schema({
        productsCount: Number,
        marketplaceName: String,
      }),
      default: {},
    },
    total: { type: Schema.Types.Number, required: true },
    integrated: { type: Schema.Types.Number, required: true },
    nonIntegrated: { type: Schema.Types.Number, required: true },
    unregistered: { type: Schema.Types.Number, required: true },

    competitive: { type: Schema.Types.Number, default: 0 },
    nonCompetitive: { type: Schema.Types.Number, default: 0 },
    buyboxWinner: { type: Schema.Types.Number, default: 0 },
    buyboxPlatforms: [
      {
        zeoosName: { type: Schema.Types.String },
        buyboxWinner: { type: Schema.Types.Number },
        total: { type: Schema.Types.Number },
      },
    ],

    errorMessages: [{ type: Schema.Types.String }],
    wasRead: { type: Schema.Types.Boolean, default: false },

    offerImport: { type: Schema.Types.ObjectId, ref: "OfferImportReport" },
  },
  { collection: "productImportReports" }
);

export const ProductImportReport = model(
  "ProductImportReport",
  productImportReport
);
