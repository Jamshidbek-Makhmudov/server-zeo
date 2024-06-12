import { Schema, model } from "mongoose";

export interface MarketplaceIntegration extends Document {
  created: Date;
  zeoosName: string;
  marketplaceName: string;
  type: string;
  country: string;
}

const marketplaceIntegration = new Schema(
  {
    // Amazon ES, Cdiscount FR
    name: { type: "String", required: true, unique: true },

    // Kaufland, Amazon, Carrefour, Showroomprive
    family: { type: "String" },

    // Amazon, Mirakl
    type: { type: "String", required: true },
    // ES, PT
    country: { type: "String", required: true },

    credentials: [
      {
        key: { type: "String", required: true },
        label: { type: "String", required: true },
      },
    ],

    // We can also add the status of integrations
    // offers: ok, orders: ok, catalog: ok, etc

    created: { type: "Date", required: true, default: Date.now },
  },
  { collection: "marketplaceIntegrations" }
);

export const MarketplaceIntegration = model<MarketplaceIntegration>(
  "MarketplaceIntegration",
  marketplaceIntegration
);
