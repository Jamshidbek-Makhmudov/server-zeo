import { Schema, model } from "mongoose";
import { MarketplaceProduct } from "./MarketplaceProduct";
import { PimProduct, Product } from "./ProductInfo";
import { Vendor } from "./Vendor";
import { ProductScheme } from "./ProductScheme";
import { CountryManagement } from "./CountryManagement";
import * as _ from "lodash";
import { LogisticClasses } from "./Freight";
import { Marketplace } from "./Marketplace";
import { Offer, updateOfferData } from "./seller/Offer";
import { PlatformProduct } from "./PlatformProduct";
import { CatalogProduct } from "./seller/CatalogProduct";

export enum DeliveryTypes {
  FULFILLMENT = "fulfillment",
  DROPSHIPPING = "dropshipping",
  WHOLESALER = "wholesaler",
}

export const SellerProductSchema = new Schema(
  {
    seller: { type: "Number", required: true },
    sku: { type: "String", required: true },
    sellerSku: { type: "String" },
    stock: { type: "Number", required: true, default: 0 },
    // cost: { type: "Number", required: true },
    // markup: { type: "Number", required: true, default: 0 },
    deliveryType: { type: "String", required: true, enum: DeliveryTypes },
    logisticClass: { type: "String", enum: LogisticClasses },
    countries: [
      {
        name: { type: "String", required: true },
        cost: { type: "Number", required: true },
        markup: { type: "Number", required: true, default: 0 },
        pvp: { type: "Number" },
        stock: { type: "Number" },
        freight: { type: "Number" },
      },
    ],
    marketplaces: { type: Map, of: Object },
    history: [
      {
        // country: { type: "String" },
        cost: { type: Map, of: "Number" },
        markup: { type: Map, of: "Number" },
        stock: { type: "Number" },
        pvp: { type: Map, of: "Number" },
        logisticClass: { type: "String", enum: LogisticClasses },
        freight: { type: Map, of: "Number" },
        active: { type: Map, of: "Boolean" },
        date: { type: "Date", required: true, default: Date.now },
        user: { type: "String", required: true },
      },
    ],
    report: {
      type: Schema.Types.ObjectId,
      ref: "ProductImportReport",
    },
  },
  { collection: "sellerProducts" }
);

export const SellerProduct = model("SellerProduct", SellerProductSchema);

export async function importSellerProducts() {
  console.log("importSellerProducts");
  const products = await MarketplaceProduct.find({
    // seller_id: 2551
    // sku:"1197"
  }).select([
    "sku",
    "seller_id",
    "stock",
    "inventory",
    `marketplaces.Vinuus PT`,
    `marketplaces.Vinuus ES`,
    `marketplaces.Vinuus FR`,
    `marketplaces.Vinuus BE`,
    `marketplaces.Vinuus DE`,
    `marketplaces.Vinuus IT`,
    `marketplaces.Vinuus NL`,
  ]); //.limit(5);

  const countries = (marketplaces: any) => {
    const countries: any[] = [];
    if (marketplaces) {
      const defaultValues = marketplaces["Vinuus PT"] || null;

      Object.keys(marketplaces).map((key: any) => {
        let obj = {
          cost:
            marketplaces[key].vendorPriceStandard ||
            defaultValues?.vendorPriceStandard ||
            0,
          stock: marketplaces[key].stock || defaultValues?.stock || 0,
        } as any;
        if (isNaN(obj.cost)) obj.cost = 0;
        if (isNaN(obj.stock)) obj.stock = 0;
        switch (key) {
          case "Vinuus PT":
            obj = { ...obj, name: "Portugal" };
            break;

          case "Vinuus ES":
            obj = { ...obj, name: "Spain" };
            break;

          case "Vinuus FR":
            obj = { ...obj, name: "France" };
            break;

          case "Vinuus BE":
            obj = { ...obj, name: "Belgium" };
            break;

          case "Vinuus DE":
            obj = { ...obj, name: "Germany" };
            break;

          case "Vinuus IT":
            obj = { ...obj, name: "Italy" };
            break;

          case "Vinuus NL":
            obj = { ...obj, name: "Netherlands" };
            break;

          default:
            break;
        }

        countries.push(obj);
      });
    }

    return countries;
  };

  for (let product of products) {
    product = product?._doc || product;

    const newSellerProd = new SellerProduct({
      sku: product.sku,
      seller: product.seller_id,
      stock: isNaN(product.stock) ? 0 : product.stock,
      deliveryType: product.inventory,
      countries: countries(product.marketplaces),
    });

    if (
      !(await SellerProduct.countDocuments({
        sku: product.sku,
        seller: product.seller_id,
        deliveryType: product.inventory,
      }))
    ) {
      console.log(`saving ${product.sku}`);
      await newSellerProd.save();
    } else {
      console.log(`${product.sku} already in DB`);
    }
  }

  console.log("finish importSellerProducts");
}

export const initializeSellerProduct = async (prod: any) => {
  if (
    await SellerProduct.countDocuments({
      sku: prod.sku,
      seller: prod.seller,
      // deliveryType: prod.deliveryType
    })
  ) {
    return;
  }
  const countries = await CountryManagement.find().select("name isoCode");
  const marketplaces = await Marketplace.find({ active: true }).select(
    "zeoosName country"
  );
  const scheme = await ProductScheme.findOne({ _id: prod.scheme }).select(
    "name"
  );
  let bomList: any[] = [];

  if (prod.bom?.lines.length) {
    bomList = [
      ...(await SellerProduct.find({
        sku: { $in: prod.bom.lines },
        seller: prod.seller,
        // deliveryType: prod.deliveryType
      }).select("sku countries marketplaces")),
    ];
  }

  const calculateCost = (product: any, zeoosName: string) => {
    let cost = 0;

    if (product.bom.lines.length === 0) {
      cost = product.cost || 0;
    } else {
      for (let i = 0; i < product.bom.lines.length; i++) {
        const sku = product.bom.lines[i].toString();
        const qty = product.bom.qtys[i];
        const parent = bomList.find((p: any) => p.sku === sku);
        const parentMrkt = parent?.marketplaces[zeoosName];
        cost += (parentMrkt?.cost || 0) * qty;
      }
    }

    return cost;
  };

  const calculateStock = (product: any, zeoosName: string) => {
    let stock = 0;
    if (product.bom.lines.length === 0) {
      stock = product.stock || 0;
    } else {
      for (let i = 0; i < product.bom.lines.length; i++) {
        const sku = product.bom.lines[i].toString();
        const qty = product.bom.qtys[i];
        const parent = bomList.find((p: any) => p.sku === sku);
        const parentMrkt = parent?.marketplaces[zeoosName];
        const stockAux = _.floor((parentMrkt?.stock || 0) / qty);
        if (stock === 0 || stockAux < stock) {
          stock = stockAux;
        }
      }
    }

    return stock;
  };

  const calculateMarkup = (product: any, zeoosName: string) => {
    let markup = 0;
    if (product.bom.lines.length === 0) {
      markup = product.markup || 0;
    } else {
      for (let i = 0; i < product.bom.lines.length; i++) {
        const sku = product.bom.lines[i].toString();
        const qty = product.bom.qtys[i];
        const parent = bomList.find((p: any) => p.sku === sku);
        const parentMrkt = parent?.marketplaces[zeoosName];
        markup += (parentMrkt?.markup || 0) * qty;
      }
    }

    return markup;
  };

  const getCountryPVP = (product: any, country: string) => {
    const isoCode = countries.find((c: any) => c.name === country)?.isoCode;
    const pvp = isoCode ? product.pvp?.[isoCode] : product.pvp?.PT;
    return pvp || 0;
  };

  const mrktList = () => {
    let list = {} as any;
    marketplaces.map((m: any) => {
      if (!_.isUndefined(prod.pvp)) {
        list[m.zeoosName] = {
          pvp: getCountryPVP(prod, m.country),
        };
      } else {
        list[m.zeoosName] = {
          cost: calculateCost(prod, m.zeoosName),
          markup: calculateMarkup(prod, m.zeoosName),
        };
      }
    });
    return list;
  };

  const newProduct = new SellerProduct({
    sku: prod.sku,
    seller: prod.seller,
    deliveryType: prod.deliveryType,
    stock: prod.stock || 0,
    report: prod.report,
    sellerSku: prod.sellerSku,
    // countries: countries.map((c: any) => ({
    //     name: c.name,
    //     stock: calculateStock(prod, c.name),
    //     cost: calculateCost(prod, c.name),
    //     markup: calculateMarkup(prod, c.name)
    // })),
    marketplaces: mrktList(),
  });

  if (await newProduct.save()) {
    await Vendor.updateOne(
      { id: prod.seller, "categories.scheme": scheme?.name },
      { $inc: { "categories.$.productCount": 1 } }
    );
  }

  return newProduct;
};

//deprecated
export const updateProduct = async (
  prod: any,
  country: string,
  values: any,
  user: any
) => {
  const { sku, deliveryType, seller, logisticClass } = prod;
  const product = await SellerProduct.findOne({
    sku,
    deliveryType,
    seller,
  }).select("stock countries logisticClass");
  if (!product) {
    return {
      updated: false,
      product,
    };
  }

  const index = product.countries.findIndex((c: any) => c.name === country);
  const fieldsToUpdate = ["stock", "cost", "markup", "pvp", "freight"];

  let history = {} as any;
  let save = false;

  history.user = user.username;

  if (logisticClass !== undefined && product.logisticClass !== logisticClass) {
    product.logisticClass = logisticClass;
    history.logisticClass = logisticClass;
    save = true;
  }

  if (
    values.stock !== undefined &&
    country === "" &&
    product.stock !== values.stock
  ) {
    product.stock = values.stock;
    history.stock = values.stock;
    save = true;
  }

  if (index >= 0) {
    history.country = country;

    fieldsToUpdate.map((field: string) => {
      if (
        values[field] !== undefined &&
        product.countries[index][field] !== values[field]
      ) {
        product.countries[index][field] = values[field];
        history[field] = values[field];
        save = true;
      }
    });
  } else if (country !== "") {
    product.countries.push({
      ...values,
      stock: product.stock,
      name: country,
    });
    history = {
      ...history,
      ...values,
      stock: product.stock,
      country,
    };
    save = true;
  }

  if (save) {
    await product.save();

    if (
      history.markup !== undefined ||
      history.cost !== undefined ||
      history.stock !== undefined ||
      history.pvp !== undefined ||
      history.freight !== undefined ||
      history.logisticClass !== undefined
    ) {
      await SellerProduct.updateOne(
        { _id: product._id },
        { $push: { history } }
      );
    }
  }

  return {
    updated: save,
    product,
  };
};

interface TProductMatch {
  sku?: string;
  sellerSku?: string;
  ean?: string;
  deliveryType?: string;
  seller: number;
}

interface TProductValues {
  stock?: number;
  logisticClass?: string;
  marketplaces?: any;
}

export const updateSellerProductData = async (
  prod: TProductMatch & { seller: number | string },
  values: TProductValues,
  user: any
) => {
  const seller = await Vendor.findOne(
    typeof prod.seller === "string" ? { _id: prod.seller } : { id: prod.seller }
  ).select("pricingType");

  let updated = false;
  let productFilter;
  if (!prod.sku && !prod.sellerSku) {
    const auxProd = await Product.findOne({ ean: prod.ean }).select("_id");
    productFilter = { _id: auxProd?._id };
  } else if (!prod.sku && prod.sellerSku) {
    const auxOffer = await Offer.findOne({
      seller,
      sellerSku: prod.sellerSku,
    }).select("product");
    productFilter = { _id: auxOffer?.product };
  } else {
    productFilter = { sku: prod.sku };
  }

  const product = await Product.findOne(productFilter).select("_id sku ean");
  if (!product || !seller) {
    return {
      updated,
      product,
    };
  }

  const { stock, logisticClass, marketplaces } = values;

  let platforms = [];
  //because stock is shared in all platforms need to update on CatalogProduct
  if (!_.isUndefined(stock)) {
    // console.log('update stock', product._id, seller._id, stock);
    const updateStock = await CatalogProduct.updateOne(
      { product, seller },
      {
        $set: {
          stock: stock < 0 ? 0 : stock,
        },
      }
    );

    //we dont need to update offers here
    //it will be updated when we trigger
    //updateMarketplaceProductList or updateMarketplaceProductStock

    // const catalogProduct = await CatalogProduct.findOne({
    //   product,
    //   seller,
    // }).select("_id");

    // await Offer.updateMany({ catalogProduct }, { $set: { stock } });

    if (updateStock.nModified) {
      updated = true;
    }
  }

  platforms = Object.keys(marketplaces || {});

  // const fieldsToUpdate = ["cost", "markup", "pvp", "freight", "active"]; //at marketplace level
  // console.log(platforms);
  for (const zeoosName of platforms) {
    const platform = await Marketplace.findOne({ zeoosName }).select("_id");
    const platformProduct = await PlatformProduct.findOne({
      platform,
      product,
    }).select("_id");

    if (!platformProduct) {
      console.log(zeoosName, product, "NO INTEGRATION");
      continue;
    }

    const offer = await Offer.findOne({
      seller,
      product,
      platform,
      platformProduct,
    }).select("pricingType logisticClass price active");

    const values = {
      stock,
      logisticClass,
      ...marketplaces[zeoosName],
    };

    if (offer) {
      // console.log('update offer', offer._id, values, zeoosName);
      if (await updateOfferData(offer._id, values, user)) {
        updated = true;
      }
    } else {
      const catalogProduct = await CatalogProduct.findOne({
        product,
        seller,
      }).select("_id");

      await updateOfferData(undefined, values, user, {
        ean: product.ean,
        sku: product.sku,
        catalogProduct,
        seller,
        product,
        // @ts-ignore
        platform,
        platformProduct,
        //TODO: for now force dropshipping
        deliveryType: DeliveryTypes.DROPSHIPPING,
      });

      updated = true;
    }
  }

  const offersCount = await Offer.countDocuments({ product, seller });
  await CatalogProduct.updateOne(
    { product, seller },
    { $set: { offersCount } }
  );

  return {
    updated,
    product,
  };
};

export const updateSellerProductData_old = async (
  prod: TProductMatch,
  values: TProductValues,
  user: any
) => {
  const { seller } = prod;
  const product = await SellerProduct.findOne(prod).select(
    "stock marketplaces logisticClass"
  );
  if (!product) {
    return {
      updated: false,
      product,
    };
  }

  const vendor = await Vendor.findOne({ id: seller }).select("pricingType");

  const { stock, logisticClass, marketplaces } = values;

  const fieldsToUpdate = ["cost", "markup", "pvp", "freight", "active"]; //at marketplace level

  const typesPeC = ["pvpAndCost", "d2c"];

  let history = {} as any;
  let update = {} as any;
  let save = false;

  history.user = user.username;

  if (
    (!["-", undefined].includes(logisticClass) &&
      product.logisticClass !== logisticClass) ||
    (logisticClass === "-" && product.logisticClass)
  ) {
    update.logisticClass = logisticClass === "-" ? undefined : logisticClass;
    history.logisticClass = update.logisticClass;
    save = true;
  }

  if (stock !== undefined && product.stock !== stock) {
    update.stock = stock;
    history.stock = stock;
    save = true;
  }

  if (marketplaces && typeof marketplaces === "object") {
    Object.entries(marketplaces).map((m: any) => {
      const zeoosName = m[0];
      fieldsToUpdate.map((field: string) => {
        if (
          marketplaces[zeoosName]?.[field] !== undefined &&
          marketplaces[zeoosName]?.[field] !==
            product.marketplaces.get(zeoosName)?.[field]
        ) {
          update[`marketplaces.${zeoosName}.${field}`] =
            marketplaces[zeoosName]?.[field];
          history[`${field}.${zeoosName}`] = marketplaces[zeoosName]?.[field];

          if (field === "cost" && !typesPeC.includes(vendor?.pricingType)) {
            update[`marketplaces.${zeoosName}.pvp`] = undefined;
            history[`pvp.${zeoosName}`] = undefined;
          }

          if (field === "pvp" && !typesPeC.includes(vendor?.pricingType)) {
            update[`marketplaces.${zeoosName}.cost`] = undefined;
            history[`cost.${zeoosName}`] = undefined;
          }

          save = true;
        }
      });
    });
  }

  if (save) {
    await SellerProduct.updateOne(
      { _id: product._id },
      {
        $set: update,
        $push: { history },
      }
    );
  } else {
    console.log("No changes made");
  }

  return {
    updated: save,
    product,
  };
};

//deprecated
export const syncSellerProductStock = async (user?: any) => {
  console.log("syncSellerProductStock");
  const products = await MarketplaceProduct.find().select([
    "sku",
    "seller_id",
    "stock",
    "inventory",
    `marketplaces.Vinuus PT`,
    `marketplaces.Vinuus ES`,
    `marketplaces.Vinuus FR`,
    `marketplaces.Vinuus BE`,
    `marketplaces.Vinuus DE`,
    `marketplaces.Vinuus IT`,
    `marketplaces.Vinuus NL`,
  ]);

  const countries = (marketplaces: any) => {
    const countries: any[] = [];
    if (marketplaces) {
      const defaultValues = marketplaces["Vinuus PT"] || null;

      Object.keys(marketplaces).map((key: any) => {
        let obj = {
          cost:
            marketplaces[key].pricebreakdown?.vendorPrice ||
            defaultValues?.pricebreakdown?.vendorPrice ||
            0,
          stock: marketplaces[key].stock || defaultValues?.stock || 0,
        } as any;
        if (isNaN(obj.cost)) obj.cost = 0;
        if (isNaN(obj.stock)) obj.stock = 0;
        switch (key) {
          case "Vinuus PT":
            obj = { ...obj, name: "Portugal" };
            break;

          case "Vinuus ES":
            obj = { ...obj, name: "Spain" };
            break;

          case "Vinuus FR":
            obj = { ...obj, name: "France" };
            break;

          case "Vinuus BE":
            obj = { ...obj, name: "Belgium" };
            break;

          case "Vinuus DE":
            obj = { ...obj, name: "Germany" };
            break;

          case "Vinuus IT":
            obj = { ...obj, name: "Italy" };
            break;

          case "Vinuus NL":
            obj = { ...obj, name: "Netherlands" };
            break;

          default:
            break;
        }

        countries.push(obj);
      });
    }

    return countries as any;
  };

  for (let product of products) {
    product = product?._doc || product;

    const newSellerProd = new SellerProduct({
      sku: product.sku,
      seller: product.seller_id,
      stock: isNaN(product.stock) ? 0 : product.stock,
      deliveryType: product.inventory,
      countries: countries(product.marketplaces),
    });

    if (
      !(await SellerProduct.countDocuments({
        sku: product.sku,
        seller: product.seller_id,
        // deliveryType: product.inventory
      }))
    ) {
      console.log(`Saving ${product.sku}...`);
      await newSellerProd.save();
    } else {
      console.log(`Updating ${product.sku}...`);
      const prod = {
        sku: product.sku,
        seller: product.seller_id,
        // deliveryType: product.inventory
      };

      await updateSellerProductData(prod, { stock: product.stock }, user);
    }
  }

  console.log("finish syncSellerProducts");
};
