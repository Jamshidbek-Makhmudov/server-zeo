import { Schema, model } from "mongoose";
import { ICategoryField, ICategoryOdoo } from "../../package/types";

interface ICronJob {
  id: string;
  expression: string;
}

export interface IMarketplaceSchema extends Document {
  created: Date;
  zeoosName: string;
  marketplaceName: string;
  type: string;
  country: string;
  additionalPricePerCountry: number;
  wineVatRate: number;
  champagneVatRate: number;
  wineIecRate: number;
  champagneIecRate: number;
  baseUrl: string;
  hasPromotionalPrice: string;
  credentials: any;
  seller?: number;
  cronJob: ICronJob;
  imgUrl: string;
  createdBy: string;
  isManual: boolean;
  statusMap: { fromLabel: string; toLabel: string }[];
  rates: { scheme: string; rate: number }[];
  rate: { from: number; to: number };
  isFeed: boolean;
  active: boolean;
  marketplaceImg: string;
}

const MarketplaceSchema = new Schema<IMarketplaceSchema>(
  {
    created: { type: "Date", required: true, default: Date.now },
    zeoosName: { type: "String", required: true, unique: true },
    marketplaceName: { type: "String", required: true },
    type: { type: "String" },
    country: { type: "String", required: true, default: "Portugal" },
    additionalPricePerCountry: { type: "Number", required: true, default: 0 },
    wineVatRate: { type: "Number", required: true, default: 0 },
    champagneVatRate: { type: "Number", required: true, default: 0 },
    wineIecRate: { type: "Number", required: true, default: 0 },
    champagneIecRate: { type: "Number", required: true, default: 0 },
    baseUrl: { type: "String" },
    hasPromotionalPrice: { type: "String", required: true, default: false },
    credentials: { type: Schema.Types.Mixed },
    seller: { type: "Number" },
    cronJob: {
      id: { type: "String" },
      expression: { type: "String" },
    },
    imgUrl: { type: "String", required: false },
    createdBy: { type: "String", required: true },
    isManual: { type: "Boolean", required: true, default: false },
    statusMap: [
      {
        fromLabel: { type: "String", required: true },
        toLabel: { type: "String", required: true },
      },
    ],
    rates: [
      {
        scheme: { type: "String", required: true },
        rate: { type: "Number", required: true },
      },
    ],
    rate: {
      from: { type: "Number" },
      to: { type: "Number" },
    },
    isFeed: { type: "Boolean", default: false },
    active: { type: "Boolean", required: true, default: false },
    marketplaceImg: { type: "String", required: false },

    marketplaceIntegration: {
      type: Schema.Types.ObjectId,
      ref: "MarketplaceIntegration",
    },
  },
  { collection: "marketplaces" }
);

export const Marketplace = model<IMarketplaceSchema>(
  "Marketplace",
  MarketplaceSchema
);

type CategoryFieldModel = Document & ICategoryField;

const categoryFieldSchema = new Schema<CategoryFieldModel>(
  {
    created: { type: "Date", required: true, default: Date.now },
    marketplaceName: { type: "String", required: true },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: "true",
    },
    scheme: {
      type: Schema.Types.ObjectId,
      ref: "ProductScheme",
      required: "true",
    },

    // Category on the Marketplace (Amazon, Fnac etc)
    name: { type: "String", required: "true" },
    categoryId: { type: "String" },
  },
  { collection: "categoryFields" }
);

// categoryFieldSchema.index(
// { name: 1, scheme: 1, marketplaceName: 1 },
// 	{ name: 1, scheme: 1 },
// 	{ unique: true }
// );

export const CategoryField = model<CategoryFieldModel>(
  "CategoryField",
  categoryFieldSchema
);

// CategoryField.collection.dropIndexes(function (err, results) {});

type CategoryOnMarketplace = Document & ICategoryOdoo;

const categoryOnMarketplaceSchema = new Schema<CategoryOnMarketplace>(
  {
    created: { type: "Date", required: true, default: Date.now },
    // @ts-ignore
    id: { type: "Number", required: true },
    parentId: { type: "Number", required: false },
    name: { type: "String", required: true },
    sourceName: { type: "String", required: true },
    titleSingular: { type: "String", required: false },
    titlePlural: { type: "String", required: false },
    level: { type: "Number", required: false },
    url: { type: "String", required: true },
    isLeaf: { type: "Boolean", required: false },
    fixedFee: { type: "Number", required: false },
    shippingCategory: { type: "String", required: false },
    variableFee: { type: "Number", required: false },
    vat: { type: "Number", required: false },
    zeoosName: { type: "String", required: true },
  },
  { collection: "categoryOnMarketplace" }
);

categoryOnMarketplaceSchema.index({ id: 1, zeoosName: 1 }, { unique: true });

export const CategoryOnMarketplace = model<CategoryOnMarketplace>(
  "CategoryOnMarketplace",
  categoryOnMarketplaceSchema
);
