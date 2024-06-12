import { uniq } from "lodash";
import { Schema, model, Document } from "mongoose";
import type {
  EventProductSale as TEventProductSale,
  PricingEvent as TPricingEvent,
  StandingRule as TStandingRule,
} from "../../package/types";
import { EventStatus, EventType, DiscountType } from "../../package/types";
import { Marketplace } from "./Marketplace";

const eventSchema = new Schema<Document & TPricingEvent>(
  {
    name: { type: Schema.Types.String, required: true },
    description: { type: Schema.Types.String },
    discountType: {
      type: Schema.Types.String,
      enum: DiscountType,
      default: DiscountType.PERCENTAGE,
    },
    discountAmount: { type: Schema.Types.Number },
    categories: [
      { type: Schema.Types.ObjectId, required: true, ref: "ProductScheme" },
    ],
    platforms: [
      { type: Schema.Types.ObjectId, required: true, ref: "Marketplace" },
    ],
    vendors: [{ type: Schema.Types.ObjectId, required: true, ref: "Vendor" }],
    products: [
      {
        sku: { type: Schema.Types.String, required: true },
        price: { type: Schema.Types.Number },
      },
    ],
    status: {
      type: Schema.Types.String,
      enum: EventStatus,
      required: true,
      default: EventStatus.ACTIVE,
    },
    eventPeriod: {
      start: { type: Schema.Types.Date, required: true, default: Date.now },
      end: { type: Schema.Types.Date, required: true },
      aborted: { type: Schema.Types.Date },
    },
    eventResult: {
      goal: { type: Schema.Types.Number, required: true },
      sold: { type: Schema.Types.Number, required: true, default: 0 },
    },
    creator: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    type: {
      type: Schema.Types.String,
      enum: EventType,
      required: true,
      default: EventType.AUTOMATIC,
    },
    isActive: { type: Schema.Types.Boolean, required: true, default: true },
    created: { type: Schema.Types.Date, required: true, default: Date.now },
  },
  { collection: "events" }
);

export const PricingEvent = model("Event", eventSchema);

const eventProductSaleSchema = new Schema<Document & TEventProductSale>(
  {
    isActive: { type: Schema.Types.Boolean, required: true, default: true },
    sku: { type: Schema.Types.String, required: true },
    event: { type: Schema.Types.ObjectId, required: true, ref: "Event" },
    platform: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Marketplace",
    },
    order: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Order",
    },
    soldAt: { type: Schema.Types.Number, required: true },
    created: { type: Schema.Types.Date, required: true, default: Date.now },
  },
  { collection: "eventProductSales" }
);

export const EventProductSale = model(
  "EventProductSale",
  eventProductSaleSchema
);

const standingRuleSchema = new Schema<Document & TStandingRule>(
  {
    discountAmount: { type: Schema.Types.Number },
    category: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "ProductScheme",
    },
    platforms: [
      { type: Schema.Types.ObjectId, required: true, ref: "Marketplace" },
    ],
    product: { type: Schema.Types.String, required: true },
    created: { type: Schema.Types.Date, default: Date.now },
  },
  { collection: "standingRules" }
);

export const StandingRule = model("StandingRule", standingRuleSchema);

export async function getActivePricingEventSaleMetrics() {
  const { goal, sold } = ((
    await PricingEvent.aggregate([
      {
        $match: {
          status: EventStatus.ACTIVE,
        },
      },

      {
        $group: {
          _id: null,
          goal: { $sum: "$eventResult.goal" },
          sold: { $sum: "$eventResult.sold" },
        },
      },
    ])
  )?.[0] as { goal: number; sold: number }) || { goal: 0, sold: 0 };

  return {
    goal,
    sold,
  };
}

export async function getActivePricingEventSaleMetricsByPlatform() {
  const activeEventsPlatforms = (
    await PricingEvent.find({
      status: EventStatus.ACTIVE,
    }).select("platforms")
  ).flatMap((item: any) => item._doc.platforms);

  const results = await EventProductSale.aggregate([
    {
      $match: {
        platform: {
          $in: activeEventsPlatforms,
        },
      },
    },

    {
      $group: {
        _id: { platform: "$" },
        total: { $sum: "$soldAt" },
        count: { $sum: 1 },
      },
    },

    {
      $lookup: {
        from: "marketplaces",
        localField: "_id.platform",
        foreignField: "_id",
        as: "marketplace",
      },
    },

    {
      $sort: {
        total: -1,
      },
    },
  ]);

  return results.map((item) => ({
    platformId: item._id.platform as string,
    total: item.total as number,
    zeoosName: item.marketplace[0].zeoosName,
    country: item.marketplace[0].country as string,
    count: item.count as number,
  }));
}
