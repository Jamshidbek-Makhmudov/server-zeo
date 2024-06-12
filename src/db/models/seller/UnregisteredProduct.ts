import { Schema, model, Document } from "mongoose";
import { Product } from "../ProductInfo";
import Bluebird from "bluebird";

export const unregisteredProduct = new Schema<Document>(
  {
    created: { type: Schema.Types.Date, required: true, default: Date.now },
    batch: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "UnregisteredProductBatch",
    },
    ean: { type: "String", required: true },

    seller: { type: Schema.Types.ObjectId, ref: "Vendor" },
    sellerId: { type: Schema.Types.Number, required: true },
    isCreated: { type: Schema.Types.Boolean, required: true, default: false },
    sellerSku: { type: Schema.Types.String },
  },
  { collection: "unregisteredProducts" }
);

unregisteredProduct.index({ batch: 1, ean: 1 }, { unique: true });

export const UnregisteredProduct = model(
  "UnregisteredProduct",
  unregisteredProduct
);

export async function syncUnregisteredProducts(filter: any = {}) {
  const ps = await UnregisteredProduct.find({
    ...filter,
    isCreated: false,
  }).select("ean");

  await Bluebird.map(
    ps,
    async (p: any) => {
      const ean = p?._doc?.ean || p?.ean;

      const product = await Product.exists({ ean });

      if (product) {
        await UnregisteredProduct.updateMany({ ean }, { isCreated: true });
      }
    },
    { concurrency: 500 }
  );
}
