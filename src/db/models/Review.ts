import { Schema, model } from "mongoose";

export const ReviewSchema = new Schema(
	{
		created: { type: "Date", required: true, default: Date.now },
		sku: { type: "String", required: true },
		product: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: "MarketplaceProduct",
		},
		origin: { type: "String", required: true },
		name: { type: "String", required: true },
		title: { type: "String"},
		content: { type: "String", required: true },
		country: { type: "String" },
		rating: { type: "Number", required: true },
	},
	{ collection: "reviews" }
);

export const Review = model("Review", ReviewSchema);
