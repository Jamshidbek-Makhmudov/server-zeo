import { Request, Response } from "express";
import geoip from "geoip-lite";
import { Review } from "../db/models/Review";
import { promises as asyncFs } from "fs";
import csv from "csvtojson";
 import { paginator } from "../utils/shortcuts";
import { MarketplaceProduct } from "../db/models/MarketplaceProduct";

export const ratingValues = [1, 2, 3, 4, 5];

export async function addReview(req: Request, res: Response) {
	const { sku, origin, name, title, content, rating } = req.body;

	if (
		!sku ||
		!origin ||
		!name ||
		!content ||
		!rating ||
		!ratingValues.includes(rating)
	) {
		return res.sendStatus(500);
	}

	let { country } = req.body;

	if (!country) {
		try {
			const geo = geoip.lookup(req.clientIp || "");

			if (geo?.country) {
				country = geo?.country;
			}
		} catch (error) {
			console.info("The following error can be ignored");
			console.error(error);
		}
	}

	const product = await MarketplaceProduct.findOne({ sku });

	if (!product) {
		return res.sendStatus(404);
	}

	const review = new Review({
		sku,
		product,
		origin,
		name,
		title,
		content,
		rating,
		country,
	});

	await review.save();

	return res.json({
		success: true,
		message: "Review added",
		review,
	});
}
export async function getReviewsWithConfig(req: Request) {
	const {  filter, perPage, page } = await paginator(req, [
		"sku",
		"origin",
		"name",
		"title",
		"country",
	])
	const { sku} =req.params;
	const { ratingStar, origin, country } = req.query;
	if (typeof ratingStar === "string" && ratingValues.includes(parseInt(ratingStar)) && ratingStar !== "All stars") {
		filter.rating=parseInt(ratingStar)
	}
	if (typeof origin === "string" && origin !== "All origins") {
		filter.origin = origin;
	}

	if (typeof country === "string" && country !== "All countries") {
		filter.country = country;
	}
	const filterConfig = sku ? { sku, ...filter } : filter;

	const reviews = await Review.find(filterConfig as any);

	const ratings = ratingValues.map((x, i) => ({
		[x]: reviews.filter((y: any) => y.rating === x).length,
	}));

	const total = await Review.countDocuments(filterConfig as any);

	const data = await Review.find(filterConfig as any)
		.sort({ created: -1 })
		.limit(perPage)
		.skip(perPage * page);

	return {
		data,
		ratings,
		perPage,
		page,
		total,
		lastPage: Math.round(total / Number(perPage)),
	};
}

export async function getReviewsBySky(req: Request, res: Response) { 
	return res.json(await getReviewsWithConfig(req))
}
export async function updateReview(req: Request, res: Response) {
	const { id } = req.params;
	const review = (await Review.findOne({ _id: id })) as any;
	if (!review) {
		return res.sendStatus(404);
	}
	const { sku, origin, name, title, content, rating } = req.body;
	if (
		!sku ||
		!origin ||
		!name ||
		!content ||
		!rating ||
		!ratingValues.includes(rating)
	) {
		return res.sendStatus(500);
	}

	let { country } = req.body;

	if (!country) {
		try {
			const geo = geoip.lookup(req.clientIp || "");

			if (geo?.country) {
				country = geo?.country;
			}
		} catch (error) {
			console.info("The following error can be ignored");
			console.error(error);
		}
	}

	const product = await MarketplaceProduct.findOne({ sku });

	if (!product) {
		return res.sendStatus(404);
	}

	review.sku = sku;
	review.origin = origin;
	review.name = name;
	review.title = title;
	review.content = content;
	review.rating = rating;
	review.country = country;
	review.product = product;

	await review.save();
	return res.json({
		success: true,
		message: "Review updated",
		review,
	});
	
	
}
 
export async function deleteReview(req: Request, res: Response) {
	const { id } = req.params;

	const review = (await Review.findOne({ _id: id })) as any;

	if (!review) {
		return res.sendStatus(404);
	}

	await review.remove();

	return res.sendStatus(200);
}
export const reviewWhitelist = [
	"sku",
	"origin",
	"name",
	"title",
	"content",
	"rating",
	"country",
];
export function isReview(review: any) {
	try {
		const keys = Object.keys(review);
		reviewWhitelist.forEach((x) => {
			if (!keys.includes(x)) {
				return false;
			}
		});
	} catch (error) {
		return false;
	}
	return true;
}
export async function BulkImport(req: Request, res: Response) {
	const { file } = req;

	if (!["image/svg+xml", "text/csv"].includes(file!.mimetype)) {
		return res.status(500).json({
			message: "File mimetype rejected",
		});
	}

	const reviews = await csv({ delimiter: ";" }).fromFile(file!.path);
	const report = {
		uploaded: reviews.length,
		succeded: 0,
		rejected: 0,
	};

	await Promise.all(
		reviews.map(async (review: any) => {
			try {
				if (!isReview(review)) {
					throw new Error("Review rejected");
				}

				const reviewObject = {} as any;
				reviewWhitelist.map((key) => (reviewObject[key] = review[key]));
				const reviewToStore = new Review(reviewObject);
				await reviewToStore.save();
				report.succeded++;
			} catch (error) {
				console.error(error);
				report.rejected++;
			}
		})
	);
	asyncFs.unlink(file!.path);
	return res.json({
		success: true,
		report,
	});

}
export async function getReviews(req: Request, res: Response) {
	return res.json(await getReviewsWithConfig(req));
}