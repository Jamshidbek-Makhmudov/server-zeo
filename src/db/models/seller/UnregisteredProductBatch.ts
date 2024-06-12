import { Schema, model, Document } from "mongoose";

export enum ProductBathStatus {
  CREATED = "CREATED",
  FINISHED = "FINISHED",
}

export interface IUnregisteredBatchFile {
  _id: string;
  url: string;
  name: string;
  created: number | Date;
}

export const unregisteredProductBatch = new Schema<Document>(
  {
    created: { type: Schema.Types.Date, required: true, default: Date.now },

    report: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "ProductImportReport",
    },

    sellerId: { type: Schema.Types.Number, required: true },
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    seller: { type: Schema.Types.ObjectId, required: true, ref: "Vendor" },

    categoryFile: {
      url: {
        type: Schema.Types.String,
      },
      name: {
        type: Schema.Types.String,
      },
      created: { type: Schema.Types.Date },
    },

    sellerFiles: [
      {
        url: {
          type: Schema.Types.String,
        },
        name: {
          type: Schema.Types.String,
        },
        created: { type: Schema.Types.Date },
      },
    ],

    status: {
      type: Schema.Types.String,
      enum: ProductBathStatus,
      required: true,
      default: ProductBathStatus.CREATED,
    },
    finished: { type: Schema.Types.Date },
  },
  { collection: "unregisteredProductBatches" }
);

export const UnregisteredProductBatch = model(
  "UnregisteredProductBatch",
  unregisteredProductBatch
);
