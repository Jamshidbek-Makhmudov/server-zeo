import { Schema, model, Document } from "mongoose";

interface ISchemeVersions extends Document {
	schemeId: string;
	name: string;
	version: number;
	details?: any;
	created?: Date;
	username: string;
}

const schemeVersions = new Schema<ISchemeVersions>(
	{
		schemeId: { type: Schema.Types.ObjectId },
		name: { type: Schema.Types.String, required: true },
		version: { type: Schema.Types.Number, required: true, default: 1 },
		details: { type: Schema.Types.Mixed },
		created: { type: "Date", required: true, default: Date.now },
		user: { type: Schema.Types.String },
	},
	{ collection: "schemeVersions" }
);

export const SchemeVersions = model<ISchemeVersions>(
	"SchemeVersions",
	schemeVersions
);

export async function getLatestSchemeVersion(name: string) {
	return await SchemeVersions.findOne({ name }).sort({ version: "desc" });
}
