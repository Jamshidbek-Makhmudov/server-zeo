import { Schema, model, Document } from "mongoose";

export const offerImportReport = new Schema<Document>(
  {
    created: { type: Schema.Types.Date, required: true, default: Date.now },
    sellerId: { type: Schema.Types.Number },
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    seller: { type: Schema.Types.ObjectId, ref: "Vendor" },

    platformCounter: {
      type: Map,
      of: new Schema({
        offers: Number,
        competitive: Number,
        nonCompetitive: Number
      }),
      default: {},
    },
    offers: { type: Schema.Types.Number,  default: 0 },
    competitive: { type: Schema.Types.Number, default: 0 },
    nonCompetitive: { type: Schema.Types.Number, default: 0 },
    buyboxWinner: { type: Schema.Types.Number, default: 0 },
    
    errorMessages: [{ type: Schema.Types.String }],
    wasRead: { type: Schema.Types.Boolean, default: false },

    uploadFile: { type: Schema.Types.String },
  },
  { collection: "offerImportReports" }
);

export const OfferImportReport = model(
  "OfferImportReport",
  offerImportReport
);
