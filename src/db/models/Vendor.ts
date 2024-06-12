import { Schema, model } from "mongoose";
import { Carrier } from "../../carriers/utils";

export enum ZeoosPLan {
  jumpStart = "Jump Start",
  riseScale = "Rise & Scale",
  ultimate = "Ultimate",
}

export enum Subscription {
  monthly = "Monthly",
  yearly = "Yearly",
}

export enum Status {
  na = "Na",
  awaiting = "Awaiting acceptance",
  accepted = "Accepted",
}

export const VendorSchema = new Schema(
  {
    created: { type: "Date", required: true, default: Date.now },
    name: { type: "String", required: true },
    displayName: { type: "String" },
    city: { type: "String" },
    rate: { type: "Number", default: 50 },
    country: { type: "String" },
    email: { type: "String" },
    phone: { type: "String" },
    salesperson_id: { type: "String" },
    isActive: { type: "Boolean", default: false },
    zeoosClient: { type: "Boolean", default: false },
    id: { type: "Number", unique: true },
    vendorIcon: { type: "String" },
    pricingType: { type: "String" },
    onBoarding: { type: "Boolean", default: false },
    isWorten: { type: "Boolean", default: false },
    releaseProcess: { type: "Boolean", default: false },

    didUploadFile: { type: "Boolean", default: false },

    releaseDate: { type: "Date" },
    contacts: [
      {
        contactName: { type: "String" },
        contactEmail: { type: "String" },
      },
    ],
    contactInfo: {
      sellerName: { type: "String" },
      companyName: { type: "String" },
      vatNumber: { type: "String" },
      phone: { type: "String" },
      emailForOrders: { type: "String" },
      emailForBillings: { type: "String" },
    },
    fiscalAddress: {
      address: { type: "String" },
      complement: { type: "String" },
      city: { type: "String" },
      country: { type: "String" },
      postalCode: { type: "String" },
      region: { type: "String" },
    },
    warehouseAddress: {
      wAddress: { type: "String" },
      wComplement: { type: "String" },
      wCity: { type: "String" },
      wCountry: { type: "String" },
      wPostalCode: { type: "String" },
      wRegion: { type: "String" },
      wContact: { type: "String" },
      wPhone: { type: "String" },
    },

    bankInfoConfirmed: { type: "Boolean", default: false },
    bankInfo: {
      bankName: { type: "String" },
      iban: { type: "String" },
      swiftCode: { type: "String" },
    },

    stripePriceId: { type: "String" },
    stripeCardId: { type: "String" },
    stripeSubscriptionId: { type: "String" },

    zeoosPlan: {
      type: "String",
      enum: ZeoosPLan,
    },
    subscription: {
      type: "String",
      enum: Subscription,
    },
    totalPricing: { type: "String" },
    otherCompliments: { type: "String" },
    contractStatus: {
      type: "String",
      enum: Status,
      default: Status.na,
    },
    paymentStatus: {
      type: "String",
      enum: Status,
      default: Status.na,
    },
    importProductsStatus: {
      type: "String",
      enum: Status,
      default: Status.na,
    },
    platformsStatus: {
      type: "String",
      enum: Status,
      default: Status.na,
    },
    offersStatus: {
      type: "String",
      enum: Status,
      default: Status.na,
    },
    congratulationsFlag: { type: "Boolean", default: false },
    billingDataConfirmed: { type: "Boolean", default: false },

    onBoardingProducts: { type: "String" },
    onBoardingPriceStock: { type: "String" },
    onBoardingPriceStockFilename: { type: "String" },
    onBoardingPriceStockStaging: { type: "String" },
    onBoardingProductsDate: { type: "Date" },
    onBoardingPriceStockDate: { type: "Date" },

    onBoardingImportProductsFile: { type: "String" },
    onboardingReport: {
      type: Schema.Types.ObjectId,
      ref: "ProductImportReport",
    },
    onboardingOfferReport: {
      type: Schema.Types.ObjectId,
      ref: "OfferImportReport",
    },

    categories: [
      {
        scheme: { type: "String", required: true },
        active: { type: "Boolean", default: true },
        productCount: { type: "Number" },
        countries: [
          {
            name: { type: "String", required: true },
            deliveryType: { type: "String", required: true },
            zeoosRate: { type: "Number", required: true },
            active: { type: "Boolean", default: true },
          },
        ],
      },
    ],
    activeMarketplaces: { type: Schema.Types.Array },
    readStockFromMarketplace: {
      type: Schema.Types.ObjectId,
      ref: "Marketplace",
    },
    carrier: { type: Schema.Types.String, enum: Carrier },
  },
  { collection: "vendors" }
);

export const wholesalerVendors = [
  19616, //Bigbuy
];

export const wholesalerCutoffPrice = 50;

export const Vendor = model("Vendor", VendorSchema);

// Vendor.collection.dropIndexes(function (err, results) {});
