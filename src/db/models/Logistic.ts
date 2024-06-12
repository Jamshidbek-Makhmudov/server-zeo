import { Schema, model, Document } from "mongoose";
import type { ILogisticPartner, ILogisticWarehouse } from "../../package/types";

type LogisticPartnerModel = Document & ILogisticPartner;
type LogisticWarehouseModel = Document & ILogisticWarehouse;

export enum DefaultServices {
  PICK1 = "Picking and Packing (1 un)",
  PICKPLUS1 = "Picking and Packing (+1)",
  PICKPLUSREF = "Picking and Packing (+1 ref)",
}

export enum FeeUnit {
  SKU,
  EAN,
  GTIN,
  UPC,
}

const logisticPartnerSchema = new Schema<LogisticPartnerModel>(
  {
    partnerName: { type: Schema.Types.String, required: true },
    country: { type: Schema.Types.String, required: true },
    contactName: { type: Schema.Types.String, required: true },
    phone: { type: Schema.Types.String, required: true },
    email: { type: Schema.Types.String, required: true },
    logo: { type: Schema.Types.String, required: false },
    warehouses: { type: Schema.Types.Number, required: false, default: 0 },
    isActive: { type: Schema.Types.Boolean, default: false },
    created: { type: Schema.Types.Date, default: Date.now },
  },
  { collection: "logisticPartner" }
);

export const LogisticPartner = model<LogisticPartnerModel>(
  "LogisticPartner",
  logisticPartnerSchema
);

const logicServices = {
  service: { type: Schema.Types.String },
  amount: { type: Schema.Types.Number },
  unit: { type: Schema.Types.String },
  note: { type: Schema.Types.String },
};

const logisticWarehouseSchema = new Schema<LogisticWarehouseModel>(
  {
    warehouseName: { type: Schema.Types.String, required: true },
    logisticPartner: {
      type: Schema.Types.ObjectId,
      ref: "LogisticPartner",
      required: true,
    },
    country: { type: Schema.Types.String, required: true },
    contactName: { type: Schema.Types.String, required: true },
    phone: { type: Schema.Types.String, required: true },
    email: { type: Schema.Types.String, required: true },
    postalCode: { type: Schema.Types.String, required: true },
    address: { type: Schema.Types.String, required: true },
    isActive: { type: Schema.Types.Boolean, default: false },
    fulfillmentCosts: [logicServices],
    otherServices: [logicServices],
    created: { type: Schema.Types.Date, default: Date.now },
    // @ts-ignore
    warehouseOdooID: { type: Schema.Types.Number },
  },
  { collection: "logisticWarehouse" }
);

export const LogisticWarehouse = model<LogisticWarehouseModel>(
  "LogisticWarehouse",
  logisticWarehouseSchema
);
