import { extname } from "path";
import { v4 } from "uuid";
import {
	buildPathInS3,
	getS3Config,
	saveObjectInS3,
} from "../utils/aws";
import fs from "fs";
export async function getPath(
	file: Express.Multer.File | undefined,
	prefix = "app",
	zeoosName?: string | undefined
) {
	let fileName;

	if (zeoosName) {
		fileName = `${zeoosName}${extname(file!.filename)}`;
	} else {
		fileName = `${v4()}${extname(file!.filename)}`;
	}

	const path = `${prefix}/${fileName}`;
	const destination = buildPathInS3(path);

	await saveObjectInS3({
		...getS3Config(destination),
		Body: await fs.promises.readFile(file!.path),
		Metadata: {
			ContentType: file!.mimetype,
		},
		ContentType: file!.mimetype,
	});
	fs.promises.unlink(file!.path);

	return path;
}