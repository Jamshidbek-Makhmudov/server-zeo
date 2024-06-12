import { Schema, model } from "mongoose";
import * as T from "../../package/types";

type ITicket = T.Ticket & Document;

export const ticketSchema = new Schema<ITicket>(
	{
		created: { type: "Date", required: true, default: Date.now },
		updated: { type: "Date", required: true, default: Date.now },

		status: {
			type: Schema.Types.String,
			required: true,
			enum: T.TicketStatus,
			default: T.TicketStatus.OPEN,
		},
		reason: { type: Schema.Types.String, required: true },
		description: { type: Schema.Types.String, required: true },
		seller: { type: Schema.Types.ObjectId, ref: "Vendor" },
		users: [{ type: Schema.Types.ObjectId, ref: "User" }],
		initiator: { type: Schema.Types.ObjectId, required: true, ref: "User" },
	},
	{ collection: "tickets" }
);

ticketSchema.pre("save", function (next: any) {
	(this as any).updated = Date.now();
	return next();
});

export const Ticket = model<ITicket>("Ticket", ticketSchema);

type ITicketMessage = T.TicketMessage & Document;

export const ticketMessageSchema = new Schema<ITicketMessage>(
	{
		created: { type: "Date", required: true, default: Date.now },

		ticketId: { type: Schema.Types.String, required: true, ref: "Ticket" },
		sender: { type: Schema.Types.String, required: true, ref: "User" },

		text: { type: Schema.Types.String, required: true },

		file: { type: Schema.Types.String },
		fileName: { type: Schema.Types.String },
	},
	{ collection: "ticketMessages" }
);

ticketMessageSchema.post("save", async (doc: T.TicketMessage) => {
	await Ticket.updateOne({ _id: doc.ticketId }, { updated: Date.now() as any });
});

export const TicketMessage = model<ITicketMessage>(
	"TicketMessage",
	ticketMessageSchema
);

// type ITicketNotification = T.TicketNotification & Document;

export const ticketNotificationSchema = new Schema<any>(
	{
		created: { type: "Date", required: true, default: Date.now },
		user: { type: Schema.Types.ObjectId, ref: "User" },
		wasRead: { type: "Boolean", required: true, default: false },
		wasReadByAdmin: { type: "Boolean", required: true, default: false },
		ticket: { type: Schema.Types.ObjectId, ref: "Ticket" },
	},
	{ collection: "ticketNotification" }
);

export const TicketNotification = model<any>(
	"TicketNotification",
	ticketNotificationSchema
);
