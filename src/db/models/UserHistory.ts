import { Schema, model } from "mongoose";
import { IUserSchema } from "./User";

export interface IUserHistorySchema extends Document {
	user: IUserSchema;
	text: string;
	type: string;
	data: string | unknown;
	created: Date;
}

export const userHistorySchema = new Schema<IUserHistorySchema>(
	{
		user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
		text: { type: "String" },
		type: { type: "String" },
		data: { type: "String" },
		created: { type: "Date", required: true, default: Date.now },
	},
	{ collection: "userHistory" }
);

export const UserHistory = model<IUserHistorySchema>(
	"History",
	userHistorySchema
);
