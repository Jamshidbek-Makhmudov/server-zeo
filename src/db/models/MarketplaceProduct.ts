import { Schema, model } from "mongoose";
import { Marketplace } from "./Marketplace"; //check
import elastic, { transformMongoToElasticFilter } from "../../utils/elastic";
import { UnregisteredProduct } from "./seller/UnregisteredProduct"; //check
import { omit } from "lodash";
import { Product } from "./ProductInfo"; //check

const marketplaceProduct = new Schema(
  {},
  { collection: "marketplaceProducts", strict: false }
);

marketplaceProduct.index({ sku: 1 });
marketplaceProduct.index({ "$**": "text" });

export const MarketplaceProduct = model(
  "MarketplaceProduct",
  marketplaceProduct
);

const originalUpdateOne = MarketplaceProduct.updateOne.bind(MarketplaceProduct);

MarketplaceProduct.updateOne = async function (this: any, ...args) {
  const data = await originalUpdateOne(...args);

  (async () => {
    if (data.nModified && data.nModified > 0) {
      const result = await MarketplaceProduct.findOne(args[0]);

      try {
        const response = await elastic.update({
          index: ELASTIC_SEARCH_INDEX,
          id: result._id,
          body: {
            doc: omit(result._doc, "_id"),
          },
        });

        console.log(response);
      } catch (error) {
        console.error(error);
      }
    }
  })();

  return data;
} as typeof originalUpdateOne;

export async function initializeMarketplaceProduct(product: any) {
  if (
    await MarketplaceProduct.countDocuments({
      sku: product.sku,
      seller_id: product.seller_id[0],
    })
  ) {
    return;
  }

  const match = {
    sku: product.sku,
    inventory: product.inventory,
  };

  if (await MarketplaceProduct.countDocuments(match)) {
    await MarketplaceProduct.updateOne(match, {
      $push: { seller_id: product.seller_id[0] },
    });
  } else {
    const zeoosNames = await Marketplace.find({ active: true }).select(
      "zeoosName"
    );
    const marketplaces = {} as any;
    zeoosNames.map(
      (m: any) => (marketplaces[m.zeoosName] = { available: false })
    );

    await MarketplaceProduct.create({
      ...product,
      marketplaces,
      inOdoo: true,
    });
  }
}

const ELASTIC_SEARCH_INDEX = process.env.MARKETPLACE_PRODUCT_INDEX_NAME!;

export async function findMarketplaceProducts(
  filter: any,
  { perPage, page }: { perPage: number; page: number },
  fields?: string[],
  sort?: any,
  type:
    | "integrated"
    | "non-integrated"
    | "all"
    | "non-competitive"
    | "without-price" = "all"
): Promise<{ data: any; total: number }> {
  try {
    let elasticSort: any;

    if (sort) {
      Object.entries(sort).forEach(([key, value]) => {
        elasticSort = {
          ...elasticSort,
          [key]: value === 1 ? "asc" : "desc",
        };
      });
    }

    let isAllSellersCatalog = false;
    if (filter.seller_id === "all") {
      delete filter.seller_id;
      isAllSellersCatalog = true;
    }

    const search: any = transformMongoToElasticFilter(filter);
    const sellerId = filter?.seller_id?.$in?.[0];

    switch (type) {
      case "all":
      case "non-integrated":
      case "integrated": {
        const integrated = type === "integrated" || type === "all";
        const zeoosNames = await Marketplace.find({ active: true }).select(
          "zeoosName"
        );
        const fields = zeoosNames.map(
          (m: any) => `marketplaces.${m.zeoosName}.integrated`
        );

        const queries = fields.map((field) => ({ term: { [field]: true } }));

        search.query = {
          ...(search.query || {}),
          bool: {
            ...(search.query.bool || {}),
            ...(isAllSellersCatalog
              ? {
                  must: [
                    ...(search.query.bool?.must || []),
                    { exists: { field: "seller_id" } },
                  ],
                }
              : {}),
            ...(integrated
              ? {
                  should: queries,
                }
              : {
                  must_not: queries,
                }),
            minimum_should_match: +integrated,
          },
        };

        break;
      }

      case "non-competitive": {
        if (!sellerId) {
          break;
        }

        const zeoosNames = await Marketplace.find({ active: true }).select(
          "zeoosName"
        );
        const fields = zeoosNames.map((m: any) => ({
          term: {
            [`marketplaces.${m.zeoosName}.rankingZeoos.${sellerId}.ranking`]: 1,
          },
        }));

        search.query = {
          ...(search.query || {}),
          bool: {
            ...(search.query.bool || {}),
            must_not: fields,
            should: zeoosNames
              .map((m: any) => `marketplaces.${m.zeoosName}.integrated`)
              .map((field) => ({ term: { [field]: true } })),
            minimum_should_match: 1,
          },
        };

        break;
      }

      case "without-price": {
        if (!sellerId) {
          break;
        }

        const zeoosNames = await Marketplace.find({ active: true }).select(
          "zeoosName"
        );
        const fields = zeoosNames.map((m: any) => ({
          exists: {
            field: `marketplaces.${m.zeoosName}.rankingZeoos.${sellerId}`,
          },
        }));

        search.query = {
          ...(search.query || {}),
          bool: {
            ...(search.query.bool || {}),
            must_not: fields,
            should: zeoosNames
              .map((m: any) => `marketplaces.${m.zeoosName}.integrated`)
              .map((field) => ({ term: { [field]: true } })),
            minimum_should_match: 1,
          },
        };

        break;
      }
    }

    const results = await elastic.search({
      index: ELASTIC_SEARCH_INDEX,
      sort: [sort ? elasticSort : { position: "asc" }],
      from: page * perPage,
      size: perPage,
      _source: fields,
      track_total_hits: true,
      ...search,
    });

    return {
      data: results.hits.hits.map((hit) => ({
        ...(hit._source || {}),
        _id: hit._id,
      })),
      total: (results.hits.total as any)?.value || 0,
    };
  } catch (error) {
    console.error("ELASTIC ERROR", error);

    const [data, total] = await Promise.all([
      MarketplaceProduct.find(filter)
        .sort(sort ? sort : { position: 1 })
        .collation({ locale: "en_US", numericOrdering: true })
        .limit(perPage)
        .skip(perPage * page)
        .select(fields ? fields.join(" ") : ""),
      MarketplaceProduct.countDocuments(filter),
    ]);

    return { data, total };
  }
}

export async function getProductCountsBySellerId(sellerIds?: number[]) {
  // const filter = sellerIds
  //   ? {
  //       filter: [
  //         {
  //           terms: { seller_id: sellerIds },
  //         },
  //       ],
  //     }
  //   : {};

  // const zeoosNames = await Marketplace.find({ active: true }).select(
  //   "zeoosName"
  // );
  // const fields = zeoosNames.map(
  //   (m: any) => `marketplaces.${m.zeoosName}.integrated`
  // );

  // const queries = fields.map((field) => ({ term: { [field]: true } }));

  const [integrated, nonIntegrated, unregistered] = await Promise.all([
    // elastic.count({
    //   index: ELASTIC_SEARCH_INDEX,
    //   query: {
    //     bool: {
    //       ...filter,
    //       should: queries,
    //       minimum_should_match: 1,
    //     },
    //   },
    // }),
    // elastic.count({
    //   index: ELASTIC_SEARCH_INDEX,
    //   query: {
    //     bool: {
    //       ...filter,
    //       must_not: queries,
    //     },
    //   },
    // }),
    Product.count({ integratedPlatformsCount: { $gt: 0 } }),
    Product.count({ integratedPlatformsCount: 0 }),
    (async () => {
      const data = await UnregisteredProduct.aggregate([
        {
          $match: {
            ...(sellerIds ? { sellerId: { $in: sellerIds } } : {}),
            isCreated: false,
          },
        },
        {
          $group: {
            _id: "$ean",
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
          },
        },
      ]);

      return data[0]?.count || 0;
    })(),
  ]);

  return {
    integrated,
    nonIntegrated,
    unregistered,
  };
}

export async function getOfferCountsBySellerId(sellerId: number) {
  const zeoosNames = await Marketplace.find({ active: true }).select(
    "zeoosName"
  );

  const filter = {
    filter: [
      {
        terms: { seller_id: [sellerId] },
      },
    ],
    should: zeoosNames
      .map((m: any) => `marketplaces.${m.zeoosName}.integrated`)
      .map((field) => ({ term: { [field]: true } })),
    minimum_should_match: 1,
  };

  const [all, nonCompetitive, withoutPrice] = await Promise.all([
    elastic.count({
      index: ELASTIC_SEARCH_INDEX,
      query: {
        bool: {
          ...filter,
        },
      },
    }),
    elastic.count({
      index: ELASTIC_SEARCH_INDEX,
      query: {
        bool: {
          ...filter,
          must_not: zeoosNames.map((m: any) => ({
            term: {
              [`marketplaces.${m.zeoosName}.rankingZeoos.${sellerId}.ranking`]: 1,
            },
          })),
        },
      },
    }),
    elastic.count({
      index: ELASTIC_SEARCH_INDEX,
      query: {
        bool: {
          ...filter,
          must_not: zeoosNames.map((m: any) => ({
            exists: {
              field: `marketplaces.${m.zeoosName}.rankingZeoos.${sellerId}`,
            },
          })),
        },
      },
    }),
  ]);

  return {
    all: all.count,
    nonCompetitive: nonCompetitive.count,
    withoutPrice: withoutPrice.count,
  };
}
