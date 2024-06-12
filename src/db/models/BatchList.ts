import { Schema, model, Document } from "mongoose";
import type { IBatchList } from "../../package/types";
import { BatchListStatus } from "../../package/types";

type BatchListModel = Document & IBatchList;

const batchListSchema = new Schema<BatchListModel>(
  {
    name: { type: Schema.Types.String, required: true },
    products: [
      {
        sku: { type: Schema.Types.String, required: true },
      },
    ],
    marketplaces: [
      {
        marketplace: {
          type: Schema.Types.ObjectId,
          required: true,
          ref: "Marketplace",
        },
        products: [
          {
            sku: { type: Schema.Types.String, required: true },
            error: { type: Schema.Types.String },
            uploaded: { type: Schema.Types.Boolean, default: false },
          },
        ],
        status: {
          type: Schema.Types.String,
          enum: BatchListStatus,
          required: true,
          default: BatchListStatus.WAITING,
        },
      },
    ],
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    status: {
      type: Schema.Types.String,
      enum: BatchListStatus,
      required: true,
      default: BatchListStatus.WAITING,
    },
    updated: { type: Schema.Types.Date, required: true, default: Date.now },
    created: { type: Schema.Types.Date, required: true, default: Date.now },
  },
  { collection: "batchLists" }
);

export const BatchList = model<BatchListModel>("BatchList", batchListSchema);
