import { Marketplace } from "../db/models/Marketplace";
import { MarketplaceProduct } from "../db/models/MarketplaceProduct";
import { User } from "../db/models/User";
import {
  getAmazonEnv,
  saveOrdersAmazon,
  getProductsAmazon,
  cancelOrderAmazon,
} from "../marketplace-middleware/amazon";
import * as Amazon from "../marketplace-middleware/amazon";
import {
  getCDiscountEnv,
  getCDiscountOffers,
  saveOrdersCdiscount,
} from "../marketplace-middleware/cdiscount";
import * as Cdiscount from "../marketplace-middleware/cdiscount";
import {
  getFnacEnv,
  getFnacOffers,
  saveOrdersFnac,
  updateOrderByIdOnFnac,
} from "../marketplace-middleware/fnac";
import * as Fnac from "../marketplace-middleware/fnac";
import {
  cancelOrderKK,
  getKKEnv,
  getProductsKK,
  saveOrdersKK,
} from "../marketplace-middleware/kk";
import * as KK from "../marketplace-middleware/kk";
import {
  fetchOdooProducts,
  productWarehouse,
  cancelMarketplaceOrder,
} from "../marketplace-middleware/odoo";
import {
  fetchProductsFromShopify,
  getShopifyEnv,
  createProductOnShopify,
  updateProductDataOnShopify,
  handleErrorShopify,
} from "../marketplace-middleware/shopify";
import { getKauflandOffers } from "../marketplace-middleware/kaufland";
import { sendMail } from "../utils/mail";
import * as Mirakl from "../marketplace-middleware/mirakl";
import * as _ from "lodash";
import {
  getVivinoEnv,
  saveOrdersVivino,
} from "../marketplace-middleware/vivino";
import * as Vivino from "../marketplace-middleware/vivino";
import { getMarketplaceEnv } from "../marketplace-middleware/utils";
import * as ProductInfoController from "../db/models/ProductInfo";
import { CountryManagement } from "../db/models/CountryManagement";
import * as Kaufland from "../marketplace-middleware/kaufland";
import * as Shopify from "../marketplace-middleware/shopify";
import * as Privalia from "../marketplace-middleware/privalia";
import * as Rakuten from "../marketplace-middleware/rakuten";
import * as Ebay from "../marketplace-middleware/ebay";
import {
  calculateNewPriceBreakdown,
  pushProductToAll,
  reserveOrders,
  calculateWholesalePriceBreakdown,
  calculateWortenSellerPriceBreakdown,
  calculatePvpAndCostPriceBreakdown,
  calculateDefaultPriceBreakdown,
  calculateFullBreakdownPriceBreakdown,
  calculateD2CPriceBreakdown,
} from "../routes/product";
import {
  DeliveryTypes,
  SellerProduct,
  updateSellerProductData,
} from "../db/models/SellerProduct";
import {
  Vendor,
  wholesalerCutoffPrice,
  wholesalerVendors,
} from "../db/models/Vendor";
import { TaxMapping } from "../db/models/TaxMapping";
import { ProductScheme } from "../db/models/ProductScheme";
import {
  Freight,
  LogisticClassDef,
  LogisticClasses,
  getWeightFromCategoryLogistic,
  matchLogisticClass,
} from "../db/models/Freight";
import { LogisticWarehouse, DefaultServices } from "../db/models/Logistic";
import {
  Order,
  OrderEvents,
  OrderStatus,
  OrderTimeline,
  createOrder,
  updateOrderReservedStatus,
} from "../db/models/Order";
import * as BigBuy from "../marketplace-middleware/bigbuy";
import { StagingProduct } from "../db/models/StagingProduct";
import {
  getCurrentWinnerLog,
  logRankingZeoos,
} from "../db/models/RankingZeoos";
import { isAdmin } from "../routes/user";
import { OfferImportReport } from "../db/models/seller/OfferImportReport";
// @ts-ignore
import { DateTime } from "luxon-business-days";
import {
  _confirmPurchaseOrder,
  _createCustomerInvoice,
  _downloadCustomerInvoice,
  _saveCustomerInvoice,
  _schedulePickup,
} from "../routes/order";
import { DPD_PARAMS } from "../carriers/dpd";
import Bluebird from "bluebird";
import { Offer, updateOfferData } from "../db/models/seller/Offer";
import { CatalogProduct } from "../db/models/seller/CatalogProduct";
import {
  Category,
  CategoryPlatformRate,
  CategoryTaxRate,
} from "../db/models/Category";
import { PlatformProduct } from "../db/models/PlatformProduct";
import { syncIntegratedPlatformsCount } from "../services/Product";
import { v4 } from "uuid";
export const replicateMarketplacePrices = async (userId?: string) => {
  const products = (await MarketplaceProduct.find()).map(
    (p: any) => p?._doc || p
  );

  const marketplaces = await Marketplace.find();

  const vinuusMarketplaces = marketplaces.filter(
    (m: any) =>
      m.marketplaceName === "shopify" && m.zeoosName.indexOf("Vinuus") === 0
  );

  const log = await Promise.all(
    products.map(async (product: any) => {
      let log = [] as string[];
      let update = false;
      let error = false;

      if (isNaN(Number(product.sku))) {
        log.push(`<hr>SKU: ${product.sku} IS INVALID`);
        return log;
      }

      log.push(`<hr>SKU: ${product.sku}`);
      console.log(`SKU: ${product.sku}`);

      vinuusMarketplaces.map((vm: any) => {
        if (product.marketplaces[vm.zeoosName]) {
          const price = Number(product.marketplaces[vm.zeoosName].price);
          const vendorPrice = Number(
            product.marketplaces[vm.zeoosName].vendorPrice
          );
          const priceStandard = Number(
            product.marketplaces[vm.zeoosName].priceStandard
          );
          const vendorPriceStandard = Number(
            product.marketplaces[vm.zeoosName].vendorPriceStandard
          );

          if (isNaN(price)) {
            log.push(`${vm.zeoosName}: PRICE IS NOT FOUND!`);
            console.log(`${vm.zeoosName}: PRICE IS NOT FOUND!`);
            error = true;
            return;
          }

          if (isNaN(vendorPrice)) {
            log.push(`${vm.zeoosName}: VENDOR PRICE IS NOT FOUND!`);
            console.log(`${vm.zeoosName}: VENDOR PRICE IS NOT FOUND!`);
            error = true;
            return;
          }

          console.log(
            vm.zeoosName,
            price,
            vendorPrice,
            priceStandard,
            vendorPriceStandard
          );

          const otherMarketplaces = marketplaces.filter(
            (m: any) =>
              (m.marketplaceName !== "shopify" ||
                m.zeoosName.indexOf("Vinuus") !== 0) &&
              m.country === vm.country
          );

          otherMarketplaces.map((om: any) => {
            const otherPrice = Number(
              product.marketplaces[om.zeoosName]?.price
            );
            const otherVendorPrice = Number(
              product.marketplaces[om.zeoosName]?.vendorPrice
            );
            const otherPriceStandard = Number(
              product.marketplaces[om.zeoosName]?.priceStandard
            );
            const otherVendorPriceStandard = Number(
              product.marketplaces[om.zeoosName]?.vendorPriceStandard
            );
            console.log(
              om.zeoosName,
              otherPrice,
              otherVendorPrice,
              otherPriceStandard,
              otherVendorPriceStandard
            );

            if (
              price !== otherPrice ||
              vendorPrice !== otherVendorPrice ||
              (!isNaN(priceStandard) && priceStandard !== otherPriceStandard) ||
              (!isNaN(vendorPriceStandard) &&
                vendorPriceStandard !== otherVendorPriceStandard)
            ) {
              let logPriceStd = priceStandard
                ? `, PriceStandard = ${otherPriceStandard} -> ${priceStandard}`
                : "";
              let logVendorPriceStd = vendorPriceStandard
                ? `, VendorPriceStandard = ${otherVendorPriceStandard} -> ${vendorPriceStandard}`
                : "";
              console.log(
                `${om.zeoosName}: Price = ${otherPrice} -> ${price}, VendorPrice = ${otherVendorPrice} -> ${vendorPrice} ${logPriceStd} ${logVendorPriceStd}`
              );
              log.push(
                `${om.zeoosName}: Price = ${otherPrice} -> ${price}, VendorPrice = ${otherVendorPrice} -> ${vendorPrice} ${logPriceStd} ${logVendorPriceStd}`
              );

              if (!product.marketplaces[om.zeoosName]) {
                product.marketplaces[om.zeoosName] = {};
              }

              product.marketplaces[om.zeoosName].price = price;
              product.marketplaces[om.zeoosName].vendorPrice = vendorPrice;
              if (priceStandard) {
                product.marketplaces[om.zeoosName].priceStandard =
                  priceStandard;
              }
              if (vendorPriceStandard) {
                product.marketplaces[om.zeoosName].vendorPriceStandard =
                  vendorPriceStandard;
              }
              update = true;
            }
          });
        } else {
          console.log(`${vm.zeoosName}: NOT FOUND!`);
          log.push(`${vm.zeoosName}: NOT FOUND!`);
        }

        console.log("-------");
      });

      if (update) {
        const productMarketplaces = product.marketplaces;
        const res = await MarketplaceProduct.updateOne(
          { sku: product.sku },
          { marketplaces: productMarketplaces }
        );
        log.push(`Updated: ${res.nModified}`);
      }

      if (error || update) {
        return log;
      }
    })
  );

  if (userId) {
    const user = await User.findOne({ _id: userId }).select("email");
    sendMail(
      user!.email,
      `Replicate webstores prices`,
      `
			<h3>Price update have finished</h3>
			${log
        .filter((l) => l != undefined)
        .flat(2)
        .join("<br>")}
			`
    );
  }
};