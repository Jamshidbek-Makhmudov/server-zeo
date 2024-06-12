import { Schema, model, Document } from "mongoose";

enum targets {
	s3 = "S3",
}

interface IFileUpload extends Document {
	source: string;
	purpose: string;
	target: string;
	created: Date;
}

const fileUpload = new Schema<IFileUpload>(
	{
		// url link - eg. production/marketplace-integrations/vivino/file.xml
		source: { type: Schema.Types.String, required: true },

		// eg. vivino
		purpose: { type: Schema.Types.String, required: true },

		// currently it's only s3
		target: {
			type: Schema.Types.String,
			enum: targets,
			required: true,
			default: targets.s3,
		},

		created: { type: "Date", required: true, default: Date.now },
	},
	{ collection: "fileUploads" }
);

export const FileUpload = model<IFileUpload>("FileUpload", fileUpload);
