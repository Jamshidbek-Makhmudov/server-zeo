require("dotenv")
import aws from 'aws-sdk';

aws.config.update({
	accessKeyId: process.env.AWS_ACCESS_KEY,
	secretAccessKey: process.env.AWS_ACCESS_SECRET,
});

export * from "aws-sdk";

const BASE_URL = "https://vinuus-portal.s3.eu-west-3.amazonaws.com";
export const s3Bucket = process.env.AWS_BUCKET as string;
export const s3MainFolder = process.env.AWS_PARENT_FOLDER as string;
const s3 = new aws.S3();

export function getS3Config(pathInS3: string, bucket = s3Bucket) {
	return {
		Bucket: bucket,
		Key: pathInS3,
	};
}
export function buildPathInS3(pathToBuild: string) {
	return `${s3MainFolder}/${pathToBuild}`
 }
export function getPathInS3(pathToBuild: string) {
	return `${BASE_URL}/${s3MainFolder}/${pathToBuild}`;
}
// after uploade find the object here:
// https://vinuus-portal.s3.eu-west-3.amazonaws.com/${s3Bucket}/${s3MainFolder}/${config.key}
export async function saveObjectInS3(config: aws.S3.PutObjectRequest) {
	console.info(`Saving object with s3 path: "${config.Key}"`);
	return await s3.putObject(config).promise();
}


export const deleteObectInS3 = async (path: string) => {
	console.info(`Deleting object with s3 path: "${path}"`);
	return await s3.deleteObject(getS3Config(path)).promise();
};