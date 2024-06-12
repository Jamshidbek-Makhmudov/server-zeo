import { Schema, model, Document } from "mongoose";
import { ISchemeCategoryItem } from "../../package/types";
import { SchemeVersions } from "./SchemeVersions";

export interface IProductScheme extends Document {
  name: string;
  details?: any;
  created?: Date;
  version: number;
  category: any;
}

const productScheme = new Schema<IProductScheme>(
  {
    name: { type: Schema.Types.String, required: true, unique: true },
    version: { type: Schema.Types.Number, required: true, default: 1 },
    details: { type: Schema.Types.Mixed },
    created: { type: Schema.Types.Date, required: true, default: Date.now },

    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
    },
    code: { type: Schema.Types.String },

    imported: { type: Schema.Types.Boolean },
    importedAt: { type: Schema.Types.Date },
  },
  { collection: "productSchemes" }
);

productScheme.pre("deleteOne", async function (next) {
  const scheme = await ProductScheme.findOne({
    _id: (this as any)?._conditions?._id,
  });

  if (scheme) {
    await SchemeVersions.deleteMany({ name: scheme.name });
  }

  next();
});

export const ProductScheme = model<IProductScheme>(
  "ProductScheme",
  productScheme
);

type SchemeCategoryItemModel = Document & ISchemeCategoryItem;

const schemeCategoryItemSchema = new Schema<SchemeCategoryItemModel>(
  {
    value: { type: Schema.Types.String },
    title: { type: Schema.Types.String, required: true },
    label: { type: Schema.Types.String, required: true },
    description: { type: Schema.Types.String },
    categoryField: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "CategoryField",
    },
    rule: { type: Schema.Types.ObjectId, ref: "Rule" },
    created: { type: Schema.Types.Date, required: true, default: Date.now },
  },
  { collection: "schemeCategoryItems" }
);

schemeCategoryItemSchema.index(
  { categoryField: 1, label: 1 },
  { unique: true }
);

export const SchemeCategoryItem = model<SchemeCategoryItemModel>(
  "SchemeCategoryItem",
  schemeCategoryItemSchema
);

// TODO: Check if we should send a full report of the product
// Meaning: explain all the fields that lack / do not correspond to the schema
export function validateProduct(scheme: IProductScheme, product: any) {
  for (const tab of scheme.details.tabs) {
    for (const fieldset of tab.fields) {
      for (const field of fieldset.fields) {
        if (field.requiredField && !product[field.label]) {
          throw new Error(`${product.ean}: Field Required ${field.label}`);
        }
      }
    }
  }
}
