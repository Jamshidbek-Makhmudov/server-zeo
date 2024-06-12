import { Schema, model, Document } from "mongoose";

export interface ICategory extends Document {
  nodeId: number;
  nodeName: string;
  nodeStoreContextName: string;
  pathById: number[];
  hasChildren: boolean;
  childNodes: number[];
  zeoosCategory?: number[];
  langs: any;
}

const category = new Schema(
  {
    nodeId: { type: "Number", required: true, unique: true, index: true },
    nodeName: { type: "String", required: true },
    nodeStoreContextName: { type: "String" },
    pathById: { type: Schema.Types.Array },
    hasChildren: { type: "Boolean", default: false },
    childNodes: { type: Schema.Types.Array },
    zeoosCategory: { type: Schema.Types.Array },
    langs: { type: Schema.Types.Mixed },
  },
  { collection: "categories" }
);

export const Category = model("OldCategory", category);
