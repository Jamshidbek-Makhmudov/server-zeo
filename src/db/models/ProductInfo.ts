import { QueryDslQueryContainer } from "@elastic/elasticsearch/lib/api/types";
// import { LOGISTIC_CLASSES } from "types/category";
import Bluebird from "bluebird";
import { Request } from "express";
import * as _ from "lodash";
import mongoose, { Document, FilterQuery, model, Schema } from "mongoose";
import { stringify } from "query-string";
import { CreateProduct } from "types/product";
import validator from "validator";
import { countries } from "../../marketplace-middleware/shopify";
import { imagesToExport } from "../../marketplace-middleware/utils";
import { getUserById } from "../../routes/marketplace";
import {
  alignDataWithSchemeAttrs,
  createImagesObject,
  getClearedData,
} from "../../services/Product";
import elastic from "../../utils/elastic";
import { copyAndResizeProductImages } from "../../utils/image";
import { withCache } from "../../utils/middleware";
import {
  isValidPermission,
  PermissionScope,
  PermissionType,
} from "../../utils/permissions";
import { PaginateParams } from "../../utils/shortcuts";
import { Role } from "../../utils/auth";
import { CountryManagement } from "./CountryManagement";
import { MarketplaceProduct } from "./MarketplaceProduct";
import { IProductScheme, ProductScheme } from "./ProductScheme";
import { CatalogProduct } from "./seller/CatalogProduct";
import { Offer } from "./seller/Offer";
import { UnregisteredProduct } from "./seller/UnregisteredProduct";
import { User } from "./User";
import { ID } from "shared";

export interface IProductInfo extends Document {
  sku: string;
  version: number;
  lang: string;
  productType: Schema.Types.ObjectId;
  details?: any;
  isVariant: boolean;
  variantOfSku?: string;
  isMix: boolean;
  components?: string[];
  created?: Date;
  editor?: string;
  categoryId?: string;
  position?: number;
  product?: string;
}

const productInfo = new Schema<IProductInfo>(
  {
    sku: { type: Schema.Types.String, required: true },
    version: { type: Schema.Types.Number, required: true, default: 1 },
    lang: { type: Schema.Types.String, required: true },

    productType: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "ProductScheme",
    },
    categoryId: { type: Schema.Types.ObjectId, ref: "TaxMapping" },
    editor: { type: Schema.Types.String },

    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
    },

    details: { type: Schema.Types.Mixed },
    isVariant: { type: Schema.Types.Boolean, required: true, default: false },
    variantOfSku: { type: Schema.Types.String },
    isMix: { type: Schema.Types.Boolean, required: true, default: false },
    components: [{ type: Schema.Types.String }],
    created: { type: "Date", required: true, default: Date.now },
  },
  { collection: "productInfos" }
);
productInfo.index({ sku: 1, version: 1, lang: 1 }, { unique: true });

export const ProductInfo = model<IProductInfo>("ProductInfo", productInfo);

export type TPimProduct = Omit<IProductInfo, "version">;
const pimProduct = new Schema<TPimProduct>(
  {
    sku: { type: Schema.Types.String, required: true },
    lang: { type: Schema.Types.String, required: true },

    productType: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "ProductScheme",
    },
    categoryId: { type: Schema.Types.ObjectId, ref: "TaxMapping" },
    editor: { type: Schema.Types.String },

    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
    },

    details: { type: Schema.Types.Mixed },
    isVariant: { type: Schema.Types.Boolean, required: true, default: false },
    variantOfSku: { type: Schema.Types.String },
    isMix: { type: Schema.Types.Boolean, required: true, default: false },
    position: { type: Schema.Types.Number, default: 0 },
    components: [{ type: Schema.Types.String }],
    created: { type: "Date", required: true, default: Date.now },
  },
  { collection: "pimProducts" }
);
pimProduct.index({ sku: 1, lang: 1 }, { unique: true });

export const PimProduct = model<TPimProduct>("PimProduct", pimProduct);

export async function findProductInfo(filter: { sku: string; lang?: string }) {
  const data = await getLatestVersion(filter.sku, filter.lang!);

  if (data) {
    return data;
  }

  const product = await Product.findOne({
    sku: filter.sku,
  });

  if (!product) {
    return null;
  }

  return await createProductInfo({
    sku: product.sku,
    lang: filter.lang || "pt",
    productType: product.scheme,
    details: product.details,
    isVariant: product.isVariant,
    variantOfSku: product.variantOfSku,
    isMix: product.isMix,
    components: product.components,
    version: 1,
    product: product._id,
  } as any);
}

const ProductSchema = new Schema(
  {
    sku: { type: Schema.Types.String, required: true, unique: true },
    ean: { type: Schema.Types.String, required: true, unique: true },
    name: { type: Schema.Types.String, required: true },
    image: { type: Schema.Types.String },
    images: [{ type: Schema.Types.String }],
    integratedPlatformsCount: { type: Schema.Types.Number, default: 0 },

    existsInOdoo: { type: Schema.Types.Boolean, default: false },

    scheme: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "ProductScheme",
    },
    categoryId: { type: Schema.Types.ObjectId, ref: "TaxMapping" },
    category: { type: Schema.Types.ObjectId, ref: "Category" },
    categoryCode: { type: Schema.Types.String },
    details: { type: Schema.Types.Mixed },

    isVariant: { type: Schema.Types.Boolean, required: true, default: false },
    variantOfSku: { type: Schema.Types.String },
    isMix: { type: Schema.Types.Boolean, required: true, default: false },
    position: { type: Schema.Types.Number, default: 0 },
    components: [{ type: Schema.Types.String }],
    created: { type: "Date", required: true, default: Date.now },
  },
  { collection: "products" }
);

ProductSchema.post("save", async (doc: any) => {
  UnregisteredProduct.updateMany({ ean: doc.ean }, { isCreated: true }).catch(
    console.error
  );
});

export const Product = model("Product", ProductSchema);

const originalUpdateOne = Product.updateOne.bind(Product);

Product.updateOne = async function (this: any, ...args) {
  const data = await originalUpdateOne(...args);

  (async () => {
    if (data.nModified && data.nModified > 0) {
      const result = await Product.findOne(args[0]);

      try {
        const response = await elastic.update({
          index: ELASTIC_SEARCH_INDEX,
          id: result._id,
          body: {
            doc: _.omit(result._doc, "_id"),
          },
        });

        // console.log(response);
      } catch (error) {
        console.error(error);
      }
    }
  })();

  return data;
} as typeof originalUpdateOne;

export async function getAllVersions(sku: string, lang: string) {
  return await ProductInfo.find({ sku, lang })
    .populate("editor", "username", User)
    .sort({ version: "desc" });
}

export async function getLatestVersion(
  sku: string,
  lang: string,
  filter: FilterQuery<IProductInfo> = {}
) {
  return (
    await ProductInfo.find({ sku, lang, ...filter })
      .sort({ version: "desc" })
      .limit(1)
  )?.[0];
}

export async function getLatestVariant(variantOfSku: string, lang: string) {
  return (await PimProduct.find({ variantOfSku, lang }).limit(1))?.[0];
}

export const productInfoWhitelist = [
  "lang",
  "productType",
  "details",
  "isVariant",
  "variantOfSku",
  "isMix",
  "components",
  "sku",
  "editor",
  "product",
];

export function sanitizeProductInfo(
  productInfo: any,
  defaultDtoProperties = productInfoWhitelist
) {
  return _.pick(productInfo, defaultDtoProperties);
}

const DEFAULT_LANG = "pt";

async function getVersion(sku: string, lang: string) {
  return (await ProductInfo.countDocuments({ sku, lang })) + 1;
}

export async function createProductInfo(productInfo: IProductInfo) {
  const data = sanitizeProductInfo(productInfo);

  const newProductInfo = new ProductInfo({
    ...data,
    version: await getVersion(productInfo.sku, productInfo.lang),
  });
  await newProductInfo.save();

  const pimProduct = (await PimProduct.findOne({
    sku: newProductInfo.sku,
    lang: newProductInfo.lang,
  })) as any;

  if (pimProduct) {
    pimProduct.productType = newProductInfo.productType;
    pimProduct.categoryId = newProductInfo.categoryId;
    pimProduct.editor = newProductInfo.editor;

    pimProduct.details = newProductInfo.details;
    pimProduct.isVariant = newProductInfo.isVariant;
    pimProduct.variantOfSku = newProductInfo.variantOfSku;
    pimProduct.isMix = newProductInfo.isMix;
    pimProduct.components = newProductInfo.components;
    await pimProduct.save();
  } else {
    const newPimProduct = new PimProduct(data);
    await newPimProduct.save();
  }

  if (!pimProduct?.product) {
    (async () => {
      const product = await Product.findOne({ sku: newProductInfo.sku });
      await PimProduct.updateOne(
        { sku: newProductInfo.sku },
        { product: product._id }
      );
    })().catch(console.error);
  }

  updateProductImages(newProductInfo.sku, newProductInfo.details).catch(
    console.error
  );

  if (data.lang !== DEFAULT_LANG) {
    return newProductInfo;
  }

  try {
    const marketplaceProductPIMData = {
      pimBrand: data.details.brand,
      pimScheme: data.productType,
    } as {
      pack?: string;
      image?: string;
      pimBrand?: string;
      pimScheme: string;
    };

    const packImage =
      newProductInfo.details[
        packImageKeys.find((key) => !!newProductInfo.details[key]) as any
      ];

    if (packImage) {
      marketplaceProductPIMData.pack = packImage;
    }

    const primaryImage =
      newProductInfo.details[
        primaryImageKeys.find((key) => !!newProductInfo.details[key]) as any
      ];

    if (primaryImage) {
      marketplaceProductPIMData.image = primaryImage;
    }

    if (Object.keys(marketplaceProductPIMData).length > 0) {
      await MarketplaceProduct.updateOne(
        { sku: newProductInfo.sku },
        marketplaceProductPIMData
      );
    }
  } catch (error) {
    console.error(error);
  }

  return newProductInfo;
}

export async function updateProductImages(sku: string, details: any) {
  const images = imagesToExport(details);
  await Product.updateOne({ sku }, { images, image: images[0], details });
}

const packImageKeys = ["pack", "image_1", "image1", "image"];
const primaryImageKeys = [
  "individual1",
  "image_1",
  "image1",
  "image",
  "main_image",
];

interface IPack {
  [index: string]: string;
}

export const textVariantPack = {
  pt: "Pack",
  es: "Pack",
  fr: "Pack",
  de: "Pack",
  it: "Pack",
  nl: "Pack",
  en: "Pack",
} as IPack;

export async function setVariantOfSkuForAllTheProducts() {
  const products = await ProductInfo.find();
  const distinctProducts = (
    await Promise.all(
      _.uniqBy(products, "sku").map(async (product: any) => {
        return await getLatestVersion(product.sku, "pt");
      })
    )
  ).filter((x) => x);

  await Promise.all(
    distinctProducts.map(async (product: any) => {
      const details = product.details || product._doc?.details;

      if (!details?.title || !product.sku) {
        return;
      }

      if (details.title.toLowerCase().includes("pack")) {
        return;
      }

      const potentialTitles = [product.details.title];

      let titlePieces = details.title.split(" ");

      const wineYearI = titlePieces.length - 2;
      const wineYear = details.title[wineYearI];

      if (!isNaN(wineYear)) {
        titlePieces.splice(wineYearI, 1);
        potentialTitles.push(titlePieces.join(" "));
      }

      const variants = distinctProducts
        .filter(
          (p: any) =>
            potentialTitles.find((t: string) =>
              p.details?.title?.toLowerCase().includes(t.toLowerCase())
            ) && p.sku !== product.sku
        )
        .filter((x: any) => !x.sku.includes(" ")) as any;

      await Promise.all(
        variants.map(async (variant: any) => {
          if (variant.sku === product.sku) {
            return;
          }

          await Promise.all(
            countries.map(async (country) => {
              const currentVersion = await getLatestVersion(
                variant.sku,
                country.code as string
              );

              if (!currentVersion) {
                return;
              }

              await ProductInfo.updateOne(
                {
                  sku: variant.sku,
                  lang: country.code,
                  version: currentVersion.version,
                },
                {
                  isVariant: true,
                  variantOfSku: product.sku,
                }
              );
            })
          );
        })
      );
    })
  );
}

export async function getProductsWithoutParentSku() {
  const products = await ProductInfo.find();
  const distinctProducts = (
    await Promise.all(
      _.uniqBy(products, "sku").map(async (product: any) => {
        return await getLatestVersion(product.sku, "pt");
      })
    )
  ).filter((x) => x);

  await Promise.all(
    distinctProducts.map(async (product: any) => {
      const details = product.details || product._doc?.details;

      if (!details?.title || !product.sku) {
        return;
      }

      if (
        details.title.toLowerCase().includes("pack") &&
        !product.variantOfSku
      ) {
        console.log(product.sku);
      }
    })
  );
}

export async function getNonlocalizedData(version: any) {
  const scheme = (await ProductScheme.findOne({
    _id: version.productType as any,
  })) as any;

  const fields = scheme.details.tabs
    .flatMap((tab: any) =>
      tab.fields.flatMap((fieldset: any) => fieldset.fields)
    )
    .filter((field: any) => !field.localized);

  // from the costs tab - not from the scheme
  fields.push({ name: "taxCategory" });
  fields.push({ name: "stock" });

  const data = {} as any;

  fields.forEach((field: any) => {
    data[field.name] = version.details?.[field.name];
  });

  return data;
}

export async function initializeProductInfo(product: any) {
  if ((await PimProduct.countDocuments({ sku: product.sku })) === 0) {
    const countries = await CountryManagement.find().select("langCode");

    let productType: any;
    if (
      product.category_id.indexOf("Vinho") === 0 ||
      product.category_id.indexOf("Bebidas Alcoólicas / Vinho") === 0 ||
      (product.category_id.indexOf("All") === 0 && !isNaN(product.sku))
    ) {
      productType = (
        await ProductScheme.findOne({ name: "WINE" }).select("_id")
      )?._id;
    }
    if (
      product.category_id.indexOf("Destilado") === 0 ||
      product.category_id.indexOf("Bebidas Alcoólicas / Destilado") === 0
    ) {
      productType = (
        await ProductScheme.findOne({ name: "DISTILLATE" }).select("_id")
      )?._id;
    }
    if (product.category_id.indexOf("Acessório") === 0) {
      productType = (
        await ProductScheme.findOne({ name: "ACCESSORY" }).select("_id")
      )?._id;
    }
    if (!productType) return;

    _.uniqBy(countries, "langCode").map(async (country) => {
      const { sku, barcode, weight } = product;
      const lang = country.langCode;
      const isVariant = product.components?.length === 1 ? true : false;
      const isMix = product.components?.length > 1 ? true : false;
      const variantOfSku = isVariant ? product.components[0]?.sku : null;
      const components = product.components?.map((p: any) => {
        return p.sku;
      });
      const details = {
        ean: barcode,
        weight,
        sku,
      };

      await createProductInfo({
        productType,
        isVariant,
        isMix,
        components,
        sku,
        lang,
        details,
        variantOfSku,
      } as IProductInfo);
    });
  }
}

export async function getMarketplacePriceRange(sku: string) {
  const offers = await Offer.find({ sku, active: true }).select("price");

  const min = _.minBy(offers, (p: any) => p?._doc?.price?.pvpFinal)?._doc?.price
    ?.pvpFinal;
  const max = _.maxBy(offers, (p: any) => p?._doc?.price?.pvpFinal)?._doc?.price
    ?.pvpFinal;

  return {
    min,
    max,
  };
}

export async function getPlatformPriceRange(
  platform: string,
  filter: any = {}
) {
  const products = await withCache(
    `marletplaceProducts.marketplaces?${stringify(filter)}`,
    async () =>
      await MarketplaceProduct.find(filter).select(`sku marketplaces`),
    1_000_000
  );

  if (platform === "All Marketplaces") {
    const prices = products
      .flatMap((p: any) => {
        return Object.keys(p._doc?.marketplaces).map((zeoosName: string) => {
          return +p._doc?.marketplaces[zeoosName]?.price;
        });
      })
      .filter((p: any) => !isNaN(p)) as number[];

    const maxValue = _.max(prices);
    const minValue = _.min(prices);

    return {
      min: minValue,
      max: maxValue,
    };
  }

  const max = _.maxBy(
    products,
    (p: any) => p._doc?.marketplaces?.[platform]?.price
  )._doc?.marketplaces?.[platform]?.price as number;
  const min = _.minBy(
    products,
    (p: any) => p._doc?.marketplaces?.[platform]?.price
  )._doc?.marketplaces?.[platform]?.price as number;

  return {
    min,
    max,
  };
}

export async function getDistinctBrands(req: Request) {
  let filterConfig: any = {};

  if (
    (req.userRole !== Role.admin &&
      !isValidPermission(
        { scope: PermissionScope.pim, type: PermissionType.read },
        req.userPermissions
      ) &&
      !isValidPermission(
        { scope: PermissionScope.inventory, type: PermissionType.read },
        req.userPermissions
      )) ||
    req.userRole === Role.sellerAdmin ||
    req.userRole === Role.sellerUser ||
    req.userRole === Role.user
  ) {
    const user = await getUserById(req.userId, false);

    const marketplaceProducts = await MarketplaceProduct.find({
      seller_id: {
        $in: user.vendorPermissions.map((p: any) => p.id),
      },
    }).select("sku");

    filterConfig.sku = { $in: marketplaceProducts.map((x: any) => x._doc.sku) };
  }

  const { productType } = req.query;

  return await withCache(
    `pimProductsBrands/${req.userId}/${productType}`,
    async () =>
      _.compact(
        await PimProduct.find({
          ...filterConfig,
          lang: "pt",
          ...(productType && typeof productType === "string"
            ? { productType }
            : {}),
        }).distinct(`details.brand`)
      ),
    1_000_000
  );
}

export async function getDistinctSchemesBySellerId(
  sellerId: number
): Promise<string[]> {
  return await MarketplaceProduct.distinct("pimScheme", {
    seller_id: +sellerId,
  });
}

export function getProductUrl(product: TPimProduct) {
  return `https://preview.zeoos.com/pt/${product.sku}`;
}

const ELASTIC_SEARCH_INDEX =
  process.env.PRODUCT_INDEX_NAME || "search-production-products";

export async function getProductCounts() {
  const [integrated, nonIntegrated, unregistered] = await Promise.all([
    elastic.count({
      index: ELASTIC_SEARCH_INDEX,
      query: {
        bool: {
          must_not: {
            term: { integratedPlatformsCount: 0 },
          },
        },
      },
    }),
    elastic.count({
      index: ELASTIC_SEARCH_INDEX,
      query: {
        term: { integratedPlatformsCount: 0 },
      },
    }),
    (async () => {
      const data = await UnregisteredProduct.aggregate([
        {
          $match: {
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
    integrated: integrated.count,
    nonIntegrated: nonIntegrated.count,
    unregistered,
  };
}

function getCatalogProductCountPipelines(
  seller: mongoose.Types.ObjectId,
  condition: any = { $gt: 0 }
) {
  return [
    {
      $match: {
        seller,
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "product",
        foreignField: "_id",
        as: "product",
      },
    },
    {
      $unwind: "$product",
    },
    {
      $match: {
        "product.integratedPlatformsCount": condition,
      },
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
      },
    },
  ];
}

export async function getSellerProductCounts(sellerId: string) {
  const seller = mongoose.Types.ObjectId(sellerId);

  const [integrated, nonIntegrated, unregistered] = await Promise.all([
    (async () => {
      const data = await CatalogProduct.aggregate(
        getCatalogProductCountPipelines(seller)
      );
      return data[0]?.count || 0;
    })(),
    (async () => {
      const data = await CatalogProduct.aggregate(
        getCatalogProductCountPipelines(seller, 0)
      );

      return data[0]?.count || 0;
    })(),
    (async () => {
      const data = await UnregisteredProduct.aggregate([
        {
          $match: {
            seller,
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

export async function getProducts(
  { page, perPage }: PaginateParams,
  query: QueryDslQueryContainer,
  fields = [
    "sku",
    "ean",
    "name",
    "image",
    "productType",
    "category",
    "categoryCode",
    "_id",
    "integratedPlatformsCount",
  ]
) {
  const results = await elastic.search({
    index: ELASTIC_SEARCH_INDEX,
    from: page * perPage,
    size: perPage,
    _source: fields,
    track_total_hits: true,
    query,
  });

  return {
    data: results.hits.hits.map((hit) => ({
      ...(hit._source || {}),
      _id: hit._id,
    })),
    total: (results.hits.total as any)?.value || 0,
  };
}

export async function getBrandOptions(category?: string, limit = 500) {
  return await withCache(
    `product-brand-options${category ? `-${category}` : ""}`,
    async () =>
      _.compact(await Product.find(category ? { category } : {})).slice(
        0,
        limit
      ),
    1_000_000
  );
}

export async function findProductScheme(code: string) {
  let tries = 3,
    scheme: IProductScheme | null = null,
    searchCode = code;

  while (tries > 0 && !scheme) {
    scheme = await ProductScheme.findOne({
      code: searchCode,
    }).populate("category");

    tries--;
    searchCode = searchCode.slice(0, -2);
  }

  return scheme;
}

export async function findAllProductSchemes() {
  try {
    const schemes = await ProductScheme.find({
      category: { $exists: true },
    }).populate("category");
    return schemes;
  } catch (error) {
    console.error("Error fetching product schemes:", error);
    throw error;
  }
}

export async function createSingleProduct(data: CreateProduct) {
  const scheme = await findProductScheme(data.category);

  return await createProduct(data, scheme!);
}

export async function createProductsForCategory(
  category: string,
  products: Omit<CreateProduct, "category">[]
) {
  const scheme = await ProductScheme.findOne({
    code: category,
  }).populate("category");

  if (!scheme) {
    throw new Error("Category not found");
  }

  const errors: { ean: string; error: string }[] = [];
  const newProducts: any = [];

  await Bluebird.map(
    products,
    async (p) => {
      try {
        newProducts.push(await createProduct(p, scheme));
      } catch (error: any) {
        console.error(error);
        errors.push({ ean: p.ean, error: error.message });
      }
    },
    {
      concurrency: 5,
    }
  );

  return {
    products: newProducts,
    errors,
  };
}

export async function createProduct(
  data: Omit<CreateProduct, "category">,
  scheme: IProductScheme
) {
  if (!validator.isEAN(data.ean)) {
    throw new Error("Invalid EAN");
  }

  data.images = data.images.filter((i) => validator.isURL(i));

  if (!data.images.length) {
    throw new Error("No images provided");
  }

  if (
    data.logisticClass &&
    !["Small & Non-Heavy", "Mid-Heavy", "Heavy"].includes(data.logisticClass)
  ) {
    throw new Error("Invalid logistic class");
  }

  if (!scheme || !scheme.category) {
    throw new Error("Category not found");
  }

  const images = await copyAndResizeProductImages(data.ean, data.images);

  const details = alignDataWithSchemeAttrs(
    getClearedData(data.details || {}),
    scheme.details
  );
  const common = {
    name: data.name,
    category: scheme.category._id,
    categoryCode: scheme.category.code,
    scheme: scheme._id,

    details: {
      mp_category: scheme.category.code,
      "product-brand": data.brand,
      product_name: data.name,
      product_description: data.description,
      logistic_class: data.logisticClass,
      ...createImagesObject(images),
    },

    images,
    image: images[0],
  };

  const existingProduct = await Product.exists({ ean: data.ean });
  if (existingProduct) {
    // Update the existing product
    const product = await Product.updateOne({ ean: data.ean }, common);
    return product as any;
  } else {
    const sku = ID.randomUUID();
    const product = new Product({
      sku,
      ean: data.ean,
      ...common,

      details: {
        ...details,
        ean: data.ean,
        product_id: sku,
        ...common.details,
      },
    });

    await product.save();

    elastic
      .index({
        index: ELASTIC_SEARCH_INDEX,
        body: {
          id: product._id,
          doc: _.omit(product, "_id"),
        },
      })
      .catch(console.error);

    return product as any;
  }
}

export async function createProductManualTranslation(
  category: string,
  products: Omit<CreateProduct, "category">[],
  lang: string
) {
  const scheme = await ProductScheme.findOne({
    code: category,
  }).populate("category");

  if (!scheme) {
    throw new Error("Category not found");
  }
  const errors: { ean: string; error: string }[] = [];
  const newProducts: any = [];

  await Bluebird.map(
    products,
    async (p) => {
      try {
        newProducts.push(await manualTranslation(p, scheme, lang));
      } catch (error: any) {
        console.error(error);
        errors.push({ ean: p.ean, error: error.message });
      }
    },
    {
      concurrency: 5,
    }
  );
  return {
    products: newProducts,
    errors,
  };
}
export async function manualTranslation(
  data: Omit<CreateProduct, "category">,
  scheme: IProductScheme,
  lang: string
) {
  const details = alignDataWithSchemeAttrs(
    getClearedData(data.details || {}),
    scheme.details
  );

  const findProducts = await findProductInfo({
    sku: details.sku as string,
    lang: lang,
  }); //this returns null
  const newProducts = await createProductInfo({
    sku: details.sku,
    lang: lang,

    productType: details.scheme,
    details: details.details,

    isVariant: details.isVariant,
    variantOfSku: details.variantOfSku,
    isMix: details.isMix,
    components: details.components,

    version: scheme.version || 1,
    product: scheme._id,
  } as any);

  return newProducts;
}
