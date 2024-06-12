import { Schema, model, Document } from "mongoose";

export interface ITaxMapping extends Document {
  name: string;
  countries: ITaxMappingCountry[];
  created?: Date;
}

export interface ITaxMappingCountry {
  id: string;
  // country name
  name: string;
  // tax value (iva in Portugal)
  vat: number;
  // additional tax on alcohol in some countries
  iec: number;
}

const taxMapping = new Schema<ITaxMapping>(
  {
    name: { type: Schema.Types.String, required: true },
    countries: [
      {
        id: {
          type: Schema.Types.String,
        },
        name: {
          type: Schema.Types.String,
        },
        vat: {
          type: Schema.Types.Number,
        },
        iec: {
          type: Schema.Types.Number,
        },
      },
    ],
    created: { type: "Date", required: true, default: Date.now },
  },
  { collection: "taxMappings" }
);

export const TaxMapping = model<ITaxMapping>("TaxMapping", taxMapping);
