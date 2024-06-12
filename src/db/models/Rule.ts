import { Schema, model, Document } from "mongoose";
import { Rule as IRule } from "../../package/types";
import { RuleType, RuleOrientation } from "../../package/types";

export const ruleSchema = new Schema<Document & IRule>(
  {
    name: { type: Schema.Types.String, required: true },
    created: { type: Schema.Types.Date, required: true, default: Date.now },
    list: [
      {
        type: { type: Schema.Types.String, required: true, enum: RuleType },
        orientation: {
          type: Schema.Types.String,
          enum: RuleOrientation,
        },
        content: { type: Schema.Types.String },
        from: { type: Schema.Types.String },
        to: { type: Schema.Types.String },
      },
    ],
  },
  { collection: "rules" }
);

export const Rule = model("Rule", ruleSchema);
