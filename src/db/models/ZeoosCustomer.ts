import { Schema, model, Document, ObjectId, Query } from "mongoose";
import type { IZeoosDemoRequest } from "../../package/types";
import { DemoRequestStatus } from "../../package/types";

export interface IZeoosCustomer extends Document {
	email: string;
	isActive: boolean;
	created: Date;
}

const zeoosCustomer = new Schema<IZeoosCustomer>(
	{
		email: { type: "String", required: true, unique: true },
		isActive: { type: "Boolean", required: true, default: true },
		created: { type: "Date", required: true, default: Date.now },
	},
	{ collection: "zeoosCustomers" }
);

export const ZeoosCustomer = model<IZeoosCustomer>(
	"ZeoosCustomer",
	zeoosCustomer
);

const zeoosDemoRequest = new Schema<IZeoosDemoRequest>(
	{
		firstName: { type: "String", required: true, unique: true },
		lastName: { type: "String", required: true, unique: true },
		email: { type: "String", required: true, unique: true },
		companyName: { type: "String", required: true, unique: true },
		phone: { type: "String", required: true, unique: true },
		country: { type: "String", required: true, unique: true },
		message: { type: "String", required: true, unique: true },
		planName: { type: "String", required: true, unique: true },
		interactions: [
			{
				message: { type: "String", required: false },
				messageDate: { type: "Date", required: false },
			},
		],
		status: {
			type: Schema.Types.String,
			enum: DemoRequestStatus,
			required: true,
			default: DemoRequestStatus.NEW,
		},
		actionDate: { type: "Date", required: false },
		created: { type: "Date", required: true, default: Date.now },
	},
	{ collection: "zeoosDemoRequests" }
);

export const ZeoosDemoRequest = model<IZeoosCustomer>(
	"ZeoosDemoRequest",
	zeoosDemoRequest
);

ZeoosDemoRequest.collection.dropIndexes(function (err, results) {});
