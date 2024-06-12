import { Schema, model, Document } from "mongoose";
import { ICountryManagement } from "./CountryManagement";

export interface IPasswordManagement extends Document {
  site: string;
  label: string;
  country: ICountryManagement;
  userName: string;
  password: string;
  otpToken?: string;
}

const passwordManagement = new Schema<IPasswordManagement>(
  {
    site: { type: Schema.Types.String, required: true },
    label: { type: Schema.Types.String, required: true },
    country: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "CountryManagement",
    },
    userName: { type: Schema.Types.String, required: true },
    password: { type: Schema.Types.String, required: true },
    otpToken: { type: Schema.Types.String },
    created: { type: "Date", default: Date.now },
  },
  { collection: "passwordManagement" }
);

export const PasswordManagement = model<IPasswordManagement>(
  "PasswordManagement",
  passwordManagement
);
