import { LogisticClasses } from "../Freight";
import mongoose, { Schema, model } from "mongoose";
import { DeliveryTypes } from "../SellerProduct";
import { CatalogProduct } from "./CatalogProduct";
import _ from "lodash";
import { Vendor } from "../Vendor";
import { Marketplace } from "../Marketplace";
import { PlatformProduct } from "../PlatformProduct";

export enum OfferPlatformStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  PAUSED = "paused",
}

export const OfferSchema = new Schema(
  {
    ean: { type: Schema.Types.String, required: true },
    sku: { type: Schema.Types.String },

    sellerSku: { type: Schema.Types.String },

    seller: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    platform: {
      type: Schema.Types.ObjectId,
      ref: "Marketplace",
      required: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    platformProduct: {
      type: Schema.Types.ObjectId,
      ref: "PlatformProduct",
      required: true,
    },
    catalogProduct: {
      type: Schema.Types.ObjectId,
      ref: "PlatformProduct",
      required: true,
    },

    deliveryType: {
      type: Schema.Types.String,
      enum: DeliveryTypes,
    },
    logisticClass: { type: Schema.Types.String, enum: LogisticClasses },

    stock: { type: Schema.Types.Number, required: true, default: 0 },
    pricingType: { type: Schema.Types.String, required: true, default: "pvp" },
    price: {
      cost: { type: Schema.Types.Number },
      transport: { type: Schema.Types.Number },
      paymentCosts: { type: Schema.Types.Number },
      costVAT: { type: Schema.Types.Number },
      costVATValue: { type: Schema.Types.Number },
      purchasePrice: { type: Schema.Types.Number },
      zeoosRate: { type: Schema.Types.Number },
      zeoosValue: { type: Schema.Types.Number },
      pvpBase: { type: Schema.Types.Number },
      platformValue: { type: Schema.Types.Number },
      platformRate: { type: Schema.Types.Number },
      productVATValue: { type: Schema.Types.Number },
      productVAT: { type: Schema.Types.Number },
      pvpFinal: { type: Schema.Types.Number },
      freight: { type: Schema.Types.Number },
      freightName: { type: Schema.Types.String },
      freightAdjust: { type: Schema.Types.Number },
      freightVAT: { type: Schema.Types.Number },
      freightVATValue: { type: Schema.Types.Number },
      freightPlatform: { type: Schema.Types.Number },
      freightFinal: { type: Schema.Types.Number },
      //legacy defaultBreakdown
      vendorPrice: { type: Schema.Types.Number },
      iva: { type: Schema.Types.Number },
      iec: { type: Schema.Types.Number },
      ivaValue: { type: Schema.Types.Number },
      deliveryPrice: { type: Schema.Types.Number },
      price: { type: Schema.Types.Number },
      vinuusPrice: { type: Schema.Types.Number },
      vinuusRate: { type: Schema.Types.Number },
      vendorRate: { type: Schema.Types.Number },
      basePrice: { type: Schema.Types.Number },
      services: { type: Schema.Types.Number },
      vinuusMargin: { type: Schema.Types.Number },
    },
    //change default:true while we dont have a view to update
    active: { type: Schema.Types.Boolean, required: true, default: true },
    ranking: { type: Schema.Types.Number, required: true, default: 0 },
    winSince: { type: Schema.Types.Date },
    winUntil: { type: Schema.Types.Date },

    report: {
      type: Schema.Types.ObjectId,
      ref: "ProductImportReport",
    },

    created: { type: Schema.Types.Date, required: true, default: Date.now },
  },
  { collection: "offers" }
);

OfferSchema.index({ ean: 1, seller: 1, platform: 1 }, { unique: true });

export const Offer = model("Offer", OfferSchema);

const OfferVersionSchema = new Schema({
  offer: {
    type: Schema.Types.ObjectId,
    ref: "Offer",
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  stock: { type: Schema.Types.Number },
  cost: { type: Schema.Types.Number },
  pvp: { type: Schema.Types.Number },
  pricingType: { type: Schema.Types.String },
  logisticClass: { type: Schema.Types.String },
  active: { type: Schema.Types.Boolean },

  created: { type: Schema.Types.Date, required: true, default: Date.now },
});

export const OfferVersion = model("OfferVersion", OfferVersionSchema);

export async function getSellerOfferCounts(seller: string) {
  const vendor = await Vendor.findOne({ _id: seller }).select(
    "activeMarketplaces"
  );

  const platforms = await Marketplace.find({
    zeoosName: { $in: vendor.activeMarketplaces },
    active: true,
  }).select("_id");

  const [all, withoutPrice] = await Promise.all([
    Offer.countDocuments({ seller }),

    // (async () => {
    //   const data = await CatalogProduct.aggregate([
    //     {
    //       $match: {
    //         seller: mongoose.Types.ObjectId(seller),
    //         offersCount: {
    //           $in: [0, null],
    //         },
    //       },
    //     },
    //     {
    //       $lookup: {
    //         from: "platformProducts",
    //         localField: "ean",
    //         foreignField: "ean",
    //         as: "platformProducts",
    //       },
    //     },
    //     {
    //       $match: {
    //         platformProducts: { $ne: [] },
    //       },
    //     },
    //     {
    //       $group: {
    //         _id: null,
    //         count: { $sum: 1 },
    //       },
    //     },
    //   ]);

    //   return data[0]?.count || 0;
    // })(),

    (async () => {
      const catprod = await CatalogProduct.find({ seller }).select(
        "product ean"
      );
      // console.log('CatalogProduct',catprod.length);

      const platprod = await PlatformProduct.find({
        product: { $in: catprod.map((p: any) => p.product) },
        ean: { $in: catprod.map((p: any) => p.ean) },
        platform: { $in: platforms },
        integrated: true,
      }).select("_id platform product sku ean");
      // console.log('PlatformProduct',platprod.length);

      const offer = await Offer.find({
        platformProduct: { $in: platprod },
      }).select("_id sku platform");
      // console.log('Offer',offer.length);

      const count = platprod.length - offer.length;

      return count > 0 ? count : 0;
    })(),
  ]);

  return {
    all,
    withoutPrice,
  };
}

const fieldsToLog = [
  "stock",
  "cost",
  "pvp",
  "pricingType",
  "logisticClass",
  "active",
];

export const updateOfferData = async (
  offer_id: string | undefined,
  values: any,
  user: any,
  creationData?: {
    sku: string;
    ean: string;
    seller: string;
    platform: string;
    product: string;
    platformProduct: string;
    catalogProduct: string;
    deliveryType: string;
  }
) => {
  // console.log(offer_id,values);
  if (values.pvp) {
    values.pricingType = "pvp";
    values[`price.pvpFinal`] = _.round(values.pvp, 2);
    delete values.pvp;
  }

  if (values.cost) {
    values.pricingType = "cost";
    values[`price.cost`] = _.round(values.cost, 2);
    delete values.cost;
  }

  if (values[`price.pvpFinal`] && values[`price.cost`]) {
    values.pricingType = "costpvp";
  }

  Object.keys(values).forEach((att: string) => {
    if (values[att] === undefined) delete values[att];
  });

  if (values.logisticClass === "-") {
    values.logisticClass = undefined;
  }

  if (!offer_id) {
    await Offer.create({
      ...creationData,
      ...values,
    });

    return true;
  }

  const up = await Offer.updateOne({ _id: offer_id }, { $set: values });

  if (up.nModified) {
    if (values[`price.pvpFinal`]) {
      values.pvp = values[`price.pvpFinal`];
      delete values[`price.pvpFinal`];
    }
    if (values[`price.cost`]) {
      values.cost = values[`price.cost`];
      delete values[`price.cost`];
    }

    if (_.intersection(Object.keys(values), fieldsToLog).length) {
      const log = new OfferVersion({
        offer: offer_id,
        ...values,
        user,
      });
      log.save();
    }

    return true;
  }

  return false;
};
