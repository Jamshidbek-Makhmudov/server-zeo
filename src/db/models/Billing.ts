import { Schema, model } from "mongoose";

export interface IBilling extends Document {
	shipment_id: number;
	partner_id: string;
	total_number_of_items_sold: number;
	total_number_of_items_purchased: number;
	number_of_related_sale_orders: number;
	valor_recebido: number;
	shipment_payment_status: string;
	bill_ref: string;
	total_amount: number;
	number_of_billings: number;
	name_of_note: string;
	vendor_id: number;
}

const BillingSchema = new Schema<IBilling>(
	{
		shipment_id: { type: "Number", unique: true },
		partner_id: { type: "String" },
		total_number_of_items_sold: { type: "Number" },
		total_number_of_items_purchased: { type: "Number" },
		number_of_related_sale_orders: { type: "Number" },
		valor_recebido: { type: "Number" },
		shipment_payment_status: { type: "String" },
		bill_ref: { type: "String", required: false },
		total_amount: { type: "Number", required: false },
		number_of_billings: { type: "Number" },
		name_of_note: { type: "String" },
		vendor_id: { type: "Number" },
	},
	{ collection: "billing" }
);

export const Billing = model<IBilling>("Billing", BillingSchema);
