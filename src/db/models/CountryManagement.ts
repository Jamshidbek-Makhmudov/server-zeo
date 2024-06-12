import { reduce } from "bluebird";
import { pick } from "lodash";
import { Schema, model, Document } from "mongoose";

export interface ICountryManagement extends Document {
  name: string;
  language: string;
  langCode: string;
  isoCode: string;
  isLang: boolean;
  iconUrl: string;
  created?: Date;
}

const countryManagement = new Schema<ICountryManagement>(
  {
    name: { type: Schema.Types.String, required: true },
    language: { type: Schema.Types.String, required: true },
    langCode: { type: Schema.Types.String, required: true },
    isoCode: { type: Schema.Types.String, required: true },
    isLang: { type: Schema.Types.Boolean, required: true, default: true },
    iconUrl: { type: Schema.Types.String, required: true },
    created: { type: "Date", required: true, default: Date.now },
  },
  { collection: "countriesManagement" }
);

export const CountryManagement = model<ICountryManagement>(
  "CountryManagement",
  countryManagement
);

export async function getCountryLangs() {
  const countries = await CountryManagement.find().select(
    "name language langCode"
  );

  return countries.reduce((prev, curr) => {
    prev[curr.name] = pick(curr, ["language", "langCode"]);

    return prev;
  }, {} as { [key: string]: { language: string; langCode: string } });
}
