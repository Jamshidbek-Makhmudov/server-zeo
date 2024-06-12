import { Schema, model, Document } from "mongoose";
import * as T from "types/stripeProduct";

export const stripeProductSchema = new Schema<Document & T.StripeProduct>(
  {
    stripeId: { type: Schema.Types.String, required: true },
    name: { type: Schema.Types.String, required: true },
    description: { type: Schema.Types.String, required: true },
    prices: [
      {
        stripeId: { type: Schema.Types.String, required: true },
        price: { type: Schema.Types.Number, required: true },
        interval: { type: Schema.Types.String, required: true },
        currency: { type: Schema.Types.String, required: true },
      },
    ],
    created: { type: Schema.Types.Date, required: true, default: Date.now },
  },
  { collection: "stripeProducts" }
);

export const StripeProduct = model("StripeProduct", stripeProductSchema);
