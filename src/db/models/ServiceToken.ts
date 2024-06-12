import { model, Schema } from "mongoose";
import * as T from "../../package/types";

const serviceToken = new Schema<T.ServiceToken>(
  {
    token: { type: Schema.Types.String, required: true },
    uid: { type: Schema.Types.String, required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: "Date", required: false },
    createdAt: { type: "Date", required: true, default: Date.now },
  },
  { collection: "serviceTokens" }
);

export const ServiceToken = model<T.ServiceToken>("ServiceToken", serviceToken);
