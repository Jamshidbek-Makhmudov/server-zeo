import { Client } from "@elastic/elasticsearch";

const elastic = new Client({
	node: process.env.ELASTIC_SERVER,
	auth: {
		username: process.env.ELASTIC_USERNAME!,
		password: process.env.ELASTIC_PASSWORD!,
	},
	tls: {
		ca: process.env.ELASTIC_CERT!,
		rejectUnauthorized: false,
	},
});

export default elastic;

export function getSearchFilter(query = "", keys: string[] = []) {
	return {
		bool: {
			filter: [],
			must: query
				? [
					{
						multi_match: {
							query,
							fields: keys,
						},
					},
				]
				: [],
		},
	} as any;
}

export function transformMongoToElasticFilter(mongoFilter: any) {
	const filter: any = {
		query: {
			bool: {
				must: [],
				filter: [],
			},
		},
	};

	let query = "";
	const searchFields = [] as string[];

	(mongoFilter["$or"] || []).forEach((condition: any) => {
		for (const field in condition) {
			if (condition[field].$regex) {
				searchFields.push(field);

				if (!query) {
					query = condition[field].$regex.replaceAll(".*", "");
				}
			}
		}
	});

	if (query) {
		filter.query.bool.must = [
			{
				multi_match: {
					query,
					fields: searchFields,
				},
			},
		];
	}

	const sellerId = mongoFilter.seller_id?.$in?.[0];

	// Handle the stock conditions
	if (mongoFilter.stock) {
		const attribute = sellerId || "total";

		if (mongoFilter.stock.$gt !== undefined) {
			filter.query.bool.filter.push({
				range: {
					[`stock.${attribute}`]: {
						gt: 0,
					},
				},
			});
		}

		if (mongoFilter.stock.$lte !== undefined) {
			filter.query.bool.filter.push({
				range: {
					[`stock.${attribute}`]: {
						lte: 0,
					},
				},
			});
		}
	}

	if (sellerId) {
		filter.query.bool.filter.push({
			terms: { seller_id: mongoFilter.seller_id.$in },
		});
		delete mongoFilter.seller_id;
	}

	// Handle other conditions
	for (const key in mongoFilter) {
		if (key !== "$or" && key !== "stock") {
			if (mongoFilter[key].$in) {
				filter.query.bool.filter.push({
					terms: {
						[key]: mongoFilter[key].$in,
					},
				});
			} else {
				filter.query.bool.filter.push({
					term: {
						[key]: mongoFilter[key],
					},
				});
			}
		}
	}

	return filter;
}

export function transformMongoToLuceneQuery(mongoFilter: any) {
	let queries: string[] = [];
	let q = "";

	// Handle the $or conditions with $regex
	(mongoFilter["$or"] || []).forEach((condition: any) => {
		for (const field in condition) {
			if (condition[field].$regex) {
				const searchString = condition[field].$regex.replaceAll(".*", "");

				queries.push(`${field}:"${searchString}"`);
			}
		}
	});

	const sellerId = mongoFilter.seller_id?.$in?.[0];

	// Handle the stock conditions
	if (mongoFilter.stock) {
		const attribute = sellerId || "total";

		if (mongoFilter.stock.$gt !== undefined) {
			queries.push(`stock.${attribute}:[1 TO *]`);
		}

		if (mongoFilter.stock.$lte !== undefined) {
			queries.push(`stock.${attribute}:0`);
		}
	}

	if (sellerId) {
		q = `seller_id:(${mongoFilter.seller_id.$in.join(" OR ")})`;
		delete mongoFilter.seller_id;
	}

	// Handle other conditions
	for (const key in mongoFilter) {
		if (key !== "$or" && key !== "stock") {
			if (mongoFilter[key].$in) {
				queries.push(`${key}:(${mongoFilter[key].$in.join(" OR ")})`);
			} else {
				queries.push(`${key}:${mongoFilter[key]}`);
			}
		}
	}

	if (queries.length) {
		if (q.length) {
			q += " AND ";
		}

		q += ` (${queries.join(" OR ")})`;
	}

	return q;
}
