import { Schema, model, Document } from "mongoose";
import { DeliveryTypes } from "./SellerProduct";
import { isUndefined } from "lodash";

export interface IFreight extends Document {
  region: string;
  country: string;
  timeMin: number;
  timeMax: number;
  mapping: Schema.Types.ObjectId[];
  seller?: number;
  group?: boolean;
  created?: Date;
}

const freight = new Schema<IFreight>(
  {
    region: { type: Schema.Types.String, required: true },
    country: { type: Schema.Types.String, required: true },
    timeMin: { type: Schema.Types.Number, required: true },
    timeMax: { type: Schema.Types.Number, required: true },
    vat: { type: Schema.Types.Number, default: 0 },
    seller: { type: Schema.Types.Number },
    group: { type: Schema.Types.Boolean },
    mapping: [
      { type: Schema.Types.ObjectId, required: true, ref: "FreightMapping" },
    ],
    created: { type: "Date", required: true, default: Date.now },
  },
  { collection: "freights" }
);

export const weightList = [
  0.25, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
  19, 20, 25, 30, 40,
];

export const timeList = [12, 24, 36, 48, 72, 96];

export enum LogisticClasses {
  CLASS1 = "LogisticClass1",
  CLASS2 = "LogisticClass2",
  CLASS3 = "LogisticClass3",
  CLASS4 = "LogisticClass4",
  CLASS5 = "LogisticClass5",
  NOSHIP = "NoShipping",
  FREE = "FreeShipping",
}

export const Freight = model<IFreight>("Freight", freight);

export interface IFreightMapping extends Document {
  weight: number;
  price: number;
  freight: string;
  created?: Date;
}

const freightMapping = new Schema<IFreightMapping>(
  {
    weight: { type: Schema.Types.Number, required: true },
    price: { type: Schema.Types.Number, required: true },
    freight: { type: Schema.Types.ObjectId, required: true, ref: "Freight" },
    created: { type: "Date", required: true, default: Date.now },
  },
  { collection: "freightMappings" }
);

export const FreightMapping = model<IFreightMapping>(
  "FreightMapping",
  freightMapping
);

export const getFreightMappings = async (filter?: any) => {
  if (!filter) filter = {} as any;

  if (filter.seller) {
    if ((await Freight.countDocuments(filter)) === 0) {
      filter.seller = null;
    }
  } else {
    filter.seller = null;
  }

  return await Freight.find(filter).populate("mapping").sort({ region: 1 });
};

export const getLogisticKey = (name: string) => {
  for (const [key, value] of Object.entries(LogisticClasses)) {
    if (name === value) return key;
  }
  return "";
};

export const LogisticClassDef = {
  Portugal: {
    vat: 23,
    default: LogisticClasses.CLASS1,
    [LogisticClasses.CLASS1]: {
      price: 4.2,
      aditional: 1.3,
      rules: [
        { type: "*", weight: 20 },
        { type: DeliveryTypes.DROPSHIPPING, price: 5.95 },
      ],
    },
    [LogisticClasses.CLASS2]: {
      price: 4.1,
      aditional: 2.4,
      rules: [
        { type: "*", weight: 30 },
        { type: DeliveryTypes.DROPSHIPPING, price: 6.78 },
      ],
    },
    [LogisticClasses.CLASS3]: {
      price: 3,
      aditional: 4.5,
      rules: [{ type: DeliveryTypes.DROPSHIPPING, price: 8.1 }],
    },
    [LogisticClasses.CLASS4]: {
      price: 1.5,
      aditional: 7,
      rules: [{ type: DeliveryTypes.DROPSHIPPING, price: 9.2 }],
    },
    [LogisticClasses.CLASS5]: {
      price: 0.5,
      aditional: 9.5,
      rules: [{ type: DeliveryTypes.DROPSHIPPING, price: 10.99 }],
    },
  },
  Spain: {
    vat: 21,
    default: LogisticClasses.CLASS4,
    [LogisticClasses.CLASS1]: {
      price: 4.04,
      aditional: 0.6,
      rules: [{ type: DeliveryTypes.DROPSHIPPING, price: 4.95 }],
    },
    [LogisticClasses.CLASS2]: {
      price: 3.05,
      aditional: 2.3,
      rules: [
        { type: "*", weight: 1 },
        { type: DeliveryTypes.DROPSHIPPING, price: 5.85 },
      ],
    },
    [LogisticClasses.CLASS3]: {
      price: 2.3,
      aditional: 4.2,
      rules: [{ type: DeliveryTypes.DROPSHIPPING, price: 7.1 }],
    },
    [LogisticClasses.CLASS4]: {
      price: 1,
      aditional: 7.55,
      rules: [
        { type: "*", weight: 3 },
        { type: DeliveryTypes.DROPSHIPPING, price: 9.5 },
      ],
    },
    [LogisticClasses.CLASS5]: {
      price: 0.55,
      aditional: 10,
      rules: [
        { type: "*", weight: 5 },
        { type: DeliveryTypes.DROPSHIPPING, price: 10.99 },
      ],
    },
  },
  France: {
    vat: 20,
    default: LogisticClasses.CLASS4,
    [LogisticClasses.CLASS1]: {
      price: 5.31,
      aditional: 2,
      rules: [{ type: DeliveryTypes.DROPSHIPPING, price: 7.65 }],
    },
    [LogisticClasses.CLASS2]: {
      price: 6,
      aditional: 2.5,
      rules: [{ type: DeliveryTypes.DROPSHIPPING, price: 9 }],
    },
    [LogisticClasses.CLASS3]: {
      price: 6.91,
      aditional: 2.99,
      rules: [{ type: DeliveryTypes.DROPSHIPPING, price: 10.5 }],
    },
    [LogisticClasses.CLASS4]: {
      price: 1.99,
      aditional: 12,
      rules: [
        { type: "*", weight: 3 },
        { type: DeliveryTypes.DROPSHIPPING, price: 15 },
      ],
    },
    [LogisticClasses.CLASS5]: {
      price: 0.99,
      aditional: 27,
      rules: [
        { type: "*", weight: 30 },
        { type: DeliveryTypes.DROPSHIPPING, price: 30 },
      ],
    },
  },
  Germany: {
    vat: 19,
    default: LogisticClasses.CLASS4,
    [LogisticClasses.CLASS1]: {
      price: 6.76,
      aditional: 0.55,
      rules: [{ type: DeliveryTypes.DROPSHIPPING, price: 7.31 }],
    },
    [LogisticClasses.CLASS2]: {
      price: 6.95,
      aditional: 1.8,
      rules: [
        { type: "*", weight: 1 },
        { type: DeliveryTypes.DROPSHIPPING, price: 8.75 },
      ],
    },
    [LogisticClasses.CLASS3]: {
      price: 8,
      aditional: 2,
      rules: [{ type: DeliveryTypes.DROPSHIPPING, price: 10.3 }],
    },
    [LogisticClasses.CLASS4]: {
      price: 1.5,
      aditional: 13.5,
      rules: [
        { type: "*", weight: 5 },
        { type: DeliveryTypes.DROPSHIPPING, price: 15.99 },
      ],
    },
    [LogisticClasses.CLASS5]: {
      price: 0.5,
      aditional: 20.5,
      rules: [
        { type: "*", weight: 20 },
        { type: DeliveryTypes.DROPSHIPPING, price: 22.99 },
      ],
    },
  },
  Belgium: {
    vat: 21,
    default: LogisticClasses.CLASS4,
    [LogisticClasses.CLASS1]: {
      price: 8.38,
      aditional: 0.85,
      rules: [{ type: DeliveryTypes.DROPSHIPPING, price: 9.23 }],
    },
    [LogisticClasses.CLASS2]: {
      price: 8.58,
      aditional: 1.3,
      rules: [{ type: DeliveryTypes.DROPSHIPPING, price: 10 }],
    },
    [LogisticClasses.CLASS3]: {
      price: 8.95,
      aditional: 2.55,
      rules: [
        { type: "*", weight: 1 },
        { type: DeliveryTypes.DROPSHIPPING, price: 12 },
      ],
    },
    [LogisticClasses.CLASS4]: {
      price: 1.5,
      aditional: 13,
      rules: [
        { type: "*", weight: 3 },
        { type: DeliveryTypes.DROPSHIPPING, price: 15 },
      ],
    },
    [LogisticClasses.CLASS5]: {
      price: 0.5,
      aditional: 16.5,
      rules: [
        { type: "*", weight: 5 },
        { type: DeliveryTypes.DROPSHIPPING, price: 17.5 },
      ],
    },
  },
} as any;

export interface IMatchLogisticClass {
  weight?: number;
  price?: number;
  name?: string;
  country: string;
  type?: string;
}

export const matchLogisticClass = (data: IMatchLogisticClass) => {
  const { weight, price, name, country, type } = data;
  if (!country) return;

  const freight = LogisticClassDef[country];
  let logisticClass: any;

  if (!freight) return;

  if (!isUndefined(price) && isNaN(price)) {
    logisticClass = { name: LogisticClasses.NOSHIP };
  }

  if (name) {
    if (!(Object.values(LogisticClasses) as string[]).includes(name)) return;

    logisticClass =
      name === LogisticClasses.FREE
        ? {
            name,
            vat: freight.vat,
            price: 0,
            aditional: 0,
          }
        : {
            name,
            vat: freight.vat,
            price: freight[name].price,
            aditional: freight[name].aditional,
          };
  }

  Object.keys(freight).map((lc: any) => {
    const ruleType = freight[lc].rules?.filter(
      (r: any) => type && (r.type === type || r.type === "*")
    );
    if (!logisticClass && ruleType?.length) {
      const rule = ruleType.find(
        (r: any) =>
          (price && !isUndefined(r.price) && r.price >= price) ||
          (weight && !isUndefined(r.weight) && r.weight >= weight)
      );

      if (rule) {
        logisticClass = {
          name: lc,
          vat: freight.vat,
          price: freight[lc].price,
          aditional: freight[lc].aditional,
        };
      }
    }
  });

  if (!logisticClass && ((price && price >= 0) || (weight && weight > 0))) {
    logisticClass = {
      name: LogisticClasses.FREE,
      vat: freight.vat,
      price: 0,
      aditional: 0,
    };
  }

  return logisticClass;
};

export const CategoryClassWeight = {
  "Small & Non-Heavy": 5,
  "Mid-Heavy": 20,
  Heavy: 40,
} as any;

export const getWeightFromCategoryLogistic = (categoryCode: string) => {
  return CategoryClassWeight[categoryCode];
};
