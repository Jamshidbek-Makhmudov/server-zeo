import { createConnection } from "..";
import { createJobType } from "../models/Job";

const jobTypes = [
  {
    name: "generateAllFeeds",
    description: "Generates feeds for supported marketplaces",
  },
  {
    name: "sendOrdersToOdoo",
    description: "Creates orders in Odoo for supported marketplaces",
    fields: [
      { marketplaceName: { label: "Marketplace Name", type: "text" } },
      { zeoosName: { label: "Store Name on Zeoos", type: "text" } },
    ],
  },
  {
    name: "replicatePrices",
    description:
      "Replicate prices from Vinuus stores to other marketplaces in the same country",
    fields: [
      {
        sendReportByEmail: {
          label:
            "Check this if you would like to receive a report after each job",
          type: "checkbox",
        },
      },
    ],
  },
  {
    name: "updateOdooInventory",
    description: "Reads stock from Odoo and updates all products",
    fields: [
      {
        sendReportByEmail: {
          label:
            "Check this if you would like to receive a report after each job",
          type: "checkbox",
        },
      },
    ],
  },
  {
    name: "updateOdooPrices",
    description: "Reads price from Odoo and updates all products",
    fields: [
      {
        sendReportByEmail: {
          label:
            "Check this if you would like to receive a report after each job",
          type: "checkbox",
        },
      },
    ],
  },
  {
    name: "syncMarketplace",
    description:
      "Gets products from specified marketplace and links them to VP",
    fields: [
      { marketplace: { label: "Marketplace Name", type: "text" } },
      { zeoosName: { label: "Store Name on Zeoos", type: "text" } },
      {
        filterProductor: {
          label: "Comma separated list of Vendor ID",
          type: "text",
        },
      },
      {
        filterSKU: {
          label: "Comma separated list of product SKU",
          type: "text",
        },
      },
      {
        sendReportByEmail: {
          label:
            "Check this if you would like to receive a report after each job",
          type: "checkbox",
        },
      },
      {
        email: {
          label: "Email to send report (if blank, logged user email)",
          type: "text",
        },
      },
    ],
  },
  {
    name: "pushAllToMarketplace",
    description:
      "Updates stock and price from integrated products to all stores from specified marketplace",
    fields: [
      { marketplaceName: { label: "Marketplace Name", type: "text" } },
      { zeoosName: { label: "Store Name on Zeoos", type: "text" } },
      {
        sendReportByEmail: {
          label:
            "Check this if you would like to receive a report after each job",
          type: "checkbox",
        },
      },
      {
        filterProductor: {
          label: "Comma separated list of Vendor ID",
          type: "text",
        },
      },
      {
        filterSKU: {
          label: "Comma separated list of product SKU",
          type: "text",
        },
      },
    ],
  },
  {
    name: "createMarketplaceProduct",
    description:
      "Check for products that arent integrated and create them in all stores from specified marketplace",
    fields: [
      { marketplaceName: { label: "Marketplace Name", type: "text" } },
      { zeoosName: { label: "Store Name on Zeoos", type: "text" } },
      {
        filterProductor: {
          label: "Comma separated list of Vendor ID",
          type: "text",
        },
      },
      {
        filterSKU: {
          label: "Comma separated list of product SKU",
          type: "text",
        },
      },
      {
        sendReportByEmail: {
          label:
            "Check this if you would like to receive a report after each job",
          type: "checkbox",
        },
      },
    ],
  },
  {
    name: "updateMarketplaceProductData",
    description:
      "Updates data for integrated products to all stores from specified marketplace",
    fields: [
      { marketplaceName: { label: "Marketplace Name", type: "text" } },
      { zeoosName: { label: "Store Name on Zeoos", type: "text" } },
      {
        filterProductor: {
          label: "Comma separated list of Vendor ID",
          type: "text",
        },
      },
      {
        filterSKU: {
          label: "Comma separated list of product SKU",
          type: "text",
        },
      },
      {
        sendReportByEmail: {
          label:
            "Check this if you would like to receive a report after each job",
          type: "checkbox",
        },
      },
    ],
  },
  {
    name: "pushTaxCollection",
    description: "Updates tax collection in Shopify stores",
    fields: [
      { marketplaceName: { label: "Marketplace Name", type: "text" } },
      { zeoosName: { label: "Store Name on Zeoos", type: "text" } },
      {
        sendReportByEmail: {
          label:
            "Check this if you would like to receive a report after each job",
          type: "checkbox",
        },
      },
    ],
  },
  {
    name: "loadBillingDataFromOdoo",
    description: "Load billings shipments from Odoo",
  },
  {
    name: "pushStockToMarketplace",
    description:
      "Updates stock from integrated products to all stores from specified marketplace",
    fields: [
      { marketplaceName: { label: "Marketplace Name", type: "text" } },
      { zeoosName: { label: "Store Name on Zeoos", type: "text" } },
      {
        sendReportByEmail: {
          label:
            "Check this if you would like to receive a report after each job",
          type: "checkbox",
        },
      },
      {
        filterProductor: {
          label: "Comma separated list of Vendor ID",
          type: "text",
        },
      },
      {
        filterSKU: {
          label: "Comma separated list of product SKU",
          type: "text",
        },
      },
    ],
  },
  {
    name: "sortProducts",
    description: "Sorts product by parent",
  },
  {
    name: "createOrders",
    description: "Creates orders in Zeoos for supported marketplaces",
    fields: [
      { marketplaceName: { label: "Marketplace Name", type: "text" } },
      { zeoosName: { label: "Store Name on Zeoos", type: "text" } },
    ],
  },
  {
    name: "updateMarketplaceProductList",
    description:
      "Read cost/markup data from SellerProducts and update priceBreakdown in MarketplaceProduct",
    fields: [
      { marketplaceName: { label: "Marketplace Name", type: "text" } },
      {
        zeoosName: {
          label: "Comma separated list of store name on Zeoos",
          type: "text",
        },
      },
      {
        filterProductor: {
          label: "Comma separated list of Vendor ID",
          type: "text",
        },
      },
      {
        filterSKU: {
          label: "Comma separated list of product SKU",
          type: "text",
        },
      },
      {
        sendReportByEmail: {
          label:
            "Check this if you would like to receive a report after each job",
          type: "checkbox",
        },
      },
      {
        triggerPushAll: {
          label:
            "Check this if you want to trigger Push All to updated products",
          type: "checkbox",
        },
      },
      {
        email: {
          label: "Email to send report (if blank, logged user email)",
          type: "text",
        },
      },
    ],
  },
  {
    name: "syncOrderOdoo",
    description: "Sync orders status from Odoo and create Odoo orders in Zeoos",
    fields: [
      { days: { label: "Search orders in the last N days", type: "text" } },
    ],
  },
  {
    name: "initSellerCategories",
    description: "Initialize seller categories attribute",
    fields: [
      {
        filterProductor: {
          label: "Comma separated list of Vendor ID",
          type: "text",
        },
      },
    ],
  },
  {
    name: "checkDeliveryStatus",
    description: "Updates the delivery status of shipping orders",
    fields: [
      {
        carrierName: { label: "Carrier in charge for delivery", type: "text" },
      },
      { zeoosName: { label: "Store Name on Zeoos", type: "text" } },
    ],
  },
  {
    name: "importExternalProducts",
    description: "Import products from external sources",
    fields: [
      { origin: { label: "Products origin", type: "text" } },
      {
        createdAfter: {
          label: "Filter products created after date [AAAA-MM-DD]",
          type: "text",
        },
      },
      {
        lang: { label: "Language of the products (when needed)", type: "text" },
      },
    ],
  },
  {
    name: "externalProductsToPIM",
    description: "Send products from staging to PIM",
    fields: [
      { origin: { label: "Products origin", type: "text" } },
      {
        skus: { label: "Comma separated sku (from origin) list", type: "text" },
      },
      { category: { label: "Category to import products into", type: "text" } },
      {
        freight: { label: "Freight group for imported products", type: "text" },
      },
      { seller: { label: "Seller ID", type: "text" } },
    ],
  },
  {
    name: "importAmazonCategories",
    description: "Import category tree in English from Amazon",
    fields: [],
  },
  {
    name: "updatePriceStockExternalProducts",
    description:
      "Reads origin and Update price/stock for staging products already on PIM",
    fields: [
      { origin: { label: "Products origin", type: "text" } },
      {
        triggerPushAll: {
          label:
            "Check this if you want to trigger Push All/Update Lists to updated products",
          type: "checkbox",
        },
      },
    ],
  },
  {
    name: "matchPIMtoStagingProducts",
    description: "Link PIM products with staging products for selected seller",
    fields: [
      { origin: { label: "Products origin", type: "text" } },
      { seller: { label: "Seller  ID", type: "text" } },
    ],
  },
  {
    name: "importShipments",
    description: "Import shipments from Odoo",
    fields: [
      {
        numberOfDays: {
          label: "Look for shipments < X days old",
          type: "text",
        },
      },
    ],
  },
  {
    name: "importBOMs",
    description: "Import BOMs from Odoo",
    fields: [],
  },
  {
    name: "importBillings",
    description: "Import billings from Odoo",
    fields: [],
  },
  {
    name: "sendOrderWholesaler",
    description: "Creates order in wholesaler platform",
    fields: [
      { seller: { label: "Seller ID for wholesaler", type: "text" } },
      { orders: { label: "Comma separated list of Order IDs", type: "text" } },
      {
        sendReportByEmail: {
          label:
            "Check this if you would like to receive a report after each job",
          type: "checkbox",
        },
      },
    ],
  },
  {
    name: "checkOrderInfoWholesaler",
    description: "Check order on wholesaler platform for tracking code",
    fields: [
      { seller: { label: "Seller ID for wholesaler", type: "text" } },
      { orders: { label: "Comma separated list of Order IDs", type: "text" } },
      {
        sendReportByEmail: {
          label:
            "Check this if you would like to receive a report after each job",
          type: "checkbox",
        },
      },
    ],
  },
  {
    name: "syncStagingProductsPIM",
    description:
      "Check staging products for updates (price/stock) and send them to PIM",
    fields: [
      { origin: { label: "Products origin", type: "text" } },
      {
        updatedAfter: {
          label: "Filter products updated after date [AAAA-MM-DD]",
          type: "text",
        },
      },
      {
        sendReportByEmail: {
          label:
            "Check this if you would like to receive a report after each job",
          type: "checkbox",
        },
      },
      {
        triggerPushAll: {
          label:
            "Check this if you want to trigger Push All/Update Lists to updated products",
          type: "checkbox",
        },
      },
      { updatePrice: { label: "Updates the product price", type: "checkbox" } },
      { updateStock: { label: "Updates the product stock", type: "checkbox" } },
    ],
  },
  {
    name: "generateInventoryThumbs",
    description: "Updates inventory thumb image for all products",
    fields: [{ skus: { label: "Comma separated sku list", type: "text" } }],
  },
  {
    name: "checkPIMIntegrity",
    description: "Compare PIM with staging products",
    fields: [
      { origin: { label: "Products origin", type: "text" } },
      {
        updatedAfter: {
          label: "Filter products updated after date [AAAA-MM-DD]",
          type: "text",
        },
      },
      {
        sendReportByEmail: {
          label:
            "Check this if you would like to receive a report after each job",
          type: "checkbox",
        },
      },
    ],
  },
  {
    name: "setFreightGroup",
    description: "Set a freight group to products",
    fields: [
      { skus: { label: "Comma separated sku list", type: "text" } },
      { freight: { label: "New freight group for products", type: "text" } },
    ],
  },
  {
    name: "updateRankingZeoos",
    description: "Update Ranking zeOOs for selected products",
    fields: [
      { marketplaceName: { label: "Marketplace Name", type: "text" } },
      {
        zeoosName: {
          label: "Comma separated list of store name on Zeoos",
          type: "text",
        },
      },
      {
        filterProductor: {
          label: "Comma separated list of Vendor ID",
          type: "text",
        },
      },
      {
        filterSKU: {
          label: "Comma separated list of product SKU",
          type: "text",
        },
      },
      {
        sendReportByEmail: {
          label:
            "Check this if you would like to receive a report after each job",
          type: "checkbox",
        },
      },
      {
        triggerPushAll: {
          label:
            "Check this if you want to trigger Push All to updated products",
          type: "checkbox",
        },
      },
    ],
  },
  {
    name: "updateSellerProductDB",
    description: "Update SellerProduct DB model from contry to marketplaces",
    fields: [],
  },
  {
    name: "updateMarketplaceProductStock",
    description:
      "Read stock data from SellerProducts and update MarketplaceProduct",
    fields: [
      { marketplaceName: { label: "Marketplace Name", type: "text" } },
      {
        zeoosName: {
          label: "Comma separated list of store name on Zeoos",
          type: "text",
        },
      },
      {
        filterProductor: {
          label: "Comma separated list of Vendor ID",
          type: "text",
        },
      },
      {
        filterSKU: {
          label: "Comma separated list of product SKU",
          type: "text",
        },
      },
      {
        sendReportByEmail: {
          label:
            "Check this if you would like to receive a report after each job",
          type: "checkbox",
        },
      },
      {
        triggerPushAll: {
          label:
            "Check this if you want to trigger Push All to updated products",
          type: "checkbox",
        },
      },
    ],
  },
  {
    name: "preMatchProduct",
    description:
      "Search products from specified marketplace and set the pre-match flag",
    fields: [
      { marketplace: { label: "Marketplace Name", type: "text" } },
      { zeoosName: { label: "Store Name on Zeoos", type: "text" } },
      {
        filterEAN: {
          label: "Comma separated list of product EAN",
          type: "text",
        },
      },
      {
        sendReportByEmail: {
          label:
            "Check this if you would like to receive a report after each job",
          type: "checkbox",
        },
      },
      {
        email: {
          label: "Email to send report (if blank, logged user email)",
          type: "text",
        },
      },
    ],
  },
  {
    name: "autoPreMatchProduct",
    description:
      "Search PIM products on each marketplace and set the pre-match flag",
    fields: [
      {
        productCount: {
          label: "Number of products to search on each marketplace",
          type: "text",
        },
      },
      {
        days: {
          label: "Number of days to retry in case of not found",
          type: "text",
        },
      },
      {
        sendReportByEmail: {
          label:
            "Check this if you would like to receive a report after each job",
          type: "checkbox",
        },
      },
      {
        email: {
          label: "Email to send report (if blank, logged user email)",
          type: "text",
        },
      },
    ],
  },
  {
    name: "generateDataStudioReports",
    description: "Generate XLS reports to feed Data Studio",
    fields: [
      {
        reports: {
          label:
            "Comma seprated list of report names, leave blank to run all reports",
          type: "text",
        },
      },
      {
        sendReportByEmail: {
          label:
            "Check this if you would like to receive a report after each job",
          type: "checkbox",
        },
      },
    ],
  },
  {
    name: "acceptOrders",
    description: "Accept new orders on Marketplaces",
    fields: [
      { marketplaceName: { label: "Marketplace Name", type: "text" } },
      {
        zeoosName: {
          label: "Comma separated list of store name on Zeoos",
          type: "text",
        },
      },
      {
        orders: {
          label: "Comma separated list of Order IDs on Zeoos",
          type: "text",
        },
      },
      {
        sendReportByEmail: {
          label:
            "Check this if you would like to receive a report after each job",
          type: "checkbox",
        },
      },
    ],
  },
  {
    name: "schedulePickup",
    description: "Triggers the pickup scheduling for orders",
    fields: [
      { marketplaceName: { label: "Marketplace Name", type: "text" } },
      {
        zeoosName: {
          label: "Comma separated list of store name on Zeoos",
          type: "text",
        },
      },
      {
        orders: {
          label: "Comma separated list of Order IDs on Zeoos",
          type: "text",
        },
      },
      {
        sendReportByEmail: {
          label:
            "Check this if you would like to receive a report after each job",
          type: "checkbox",
        },
      },
      {
        email: {
          label: "Email to send report (if blank, logged user email)",
          type: "text",
        },
      },
    ],
  },
  {
    name: "shipOrders",
    description: "Confirm order shipping on marketplaces",
    fields: [
      { marketplaceName: { label: "Marketplace Name", type: "text" } },
      {
        zeoosName: {
          label: "Comma separated list of store name on Zeoos",
          type: "text",
        },
      },
      {
        orders: {
          label: "Comma separated list of Order IDs on Zeoos",
          type: "text",
        },
      },
      {
        sendReportByEmail: {
          label:
            "Check this if you would like to receive a report after each job",
          type: "checkbox",
        },
      },
      {
        email: {
          label: "Email to send report (if blank, logged user email)",
          type: "text",
        },
      },
    ],
  },
  {
    name: "uploadInvoice",
    description: "Upload order invoice to marketplaces",
    fields: [
      { marketplaceName: { label: "Marketplace Name", type: "text" } },
      {
        zeoosName: {
          label: "Comma separated list of store name on Zeoos",
          type: "text",
        },
      },
      {
        orders: {
          label: "Comma separated list of Order IDs on Zeoos",
          type: "text",
        },
      },
      {
        sendReportByEmail: {
          label:
            "Check this if you would like to receive a report after each job",
          type: "checkbox",
        },
      },
      {
        email: {
          label: "Email to send report (if blank, logged user email)",
          type: "text",
        },
      },
    ],
  },
  {
    name: "sendPurchaseOrder",
    description: "Send PO to vendor/seller for dropshipping orders",
    fields: [
      {
        sellers: {
          label: "Comma separated list of Vendor/Seller IDs on Zeoos",
          type: "text",
        },
      },
      {
        orders: {
          label: "Comma separated list of Order IDs on Zeoos",
          type: "text",
        },
      },
      {
        sendReportByEmail: {
          label:
            "Check this if you would like to receive a report after each job",
          type: "checkbox",
        },
      },
      {
        email: {
          label: "Email to send report (if blank, logged user email)",
          type: "text",
        },
      },
    ],
  },
  {
    name: "updateStockFromMarketplace",
    description:
      "Read stock from a marketplace and update Zeoos. Vendor/seller must have this option enabled",
    fields: [
      { seller: { label: "Comma separated list of Seller ID", type: "text" } },
      {
        sendReportByEmail: {
          label:
            "Check this if you would like to receive a report after each job",
          type: "checkbox",
        },
      },
      {
        email: {
          label: "Email to send report (if blank, logged user email)",
          type: "text",
        },
      },
      {
        triggerPushAll: {
          label:
            "Check this if you want to trigger Push All to updated products",
          type: "checkbox",
        },
      },
    ],
  },
];

createConnection().then(async () => {
  for (const jobType of jobTypes) {
    try {
      await createJobType(jobType);
      console.log(`${jobType.name} has been created`);
    } catch (error) {
      console.error(error);
    }
  }

  process.exit();
});
