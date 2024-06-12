import { Schema, model } from "mongoose";
import { imagesToExport } from "../../marketplace-middleware/utils";
import { Marketplace } from "./Marketplace";
import { MarketplaceProduct } from "./MarketplaceProduct";
import { Product, getLatestVersion } from "./ProductInfo";
import { DeliveryTypes } from "./SellerProduct";
import { TaxMapping } from "./TaxMapping";
import { Vendor, wholesalerVendors } from "./Vendor";
import { Shipment, ShipmentObject, updateShipmentLineQtys } from "./Shipment";
import { BOM } from "./BOM";
import { Billing, calculatePayDeadline } from "./VendorBilling";
import {
  calculateNewReversePriceBreakdown,
  calculatePvpAndCostPriceBreakdown,
  calculateDefaultPriceBreakdown,
  calculateReverseWholesalePriceBreakdown,
  calculateWortenSellerPriceBreakdown,
  getProductTaxes,
  getProductTaxes_old,
  calculateD2CPriceBreakdown,
} from "../../routes/product";
import { round, concat, uniq, last } from "lodash";
import { linkDSBillingToShipment } from "../../routes/vendorBilling";
import * as _ from "lodash";
import { User, UserNotification } from "./User";
import {
  sendMail,
  sendOrderCanceledEmail,
  sendOrderReceivedEmail,
} from "../../utils/mail";
import {
  rankingZeoosLastWinner,
  rankingZeoosWinner,
} from "../../utils/marketplace";
import { winnerRankingZeoosDate } from "./RankingZeoos";
import { DateTime } from "luxon";
import { IVA_PT } from "../../marketplace-middleware/odoo";
import { Offer } from "./seller/Offer";
import { getWeight } from "../../services/Product";
import { ID } from "shared";

export enum OrderStatus {
  RESERVED = "reserved",
  APPROVED = "approved",
  AWAITING = "waiting_acceptance", //sai
  ACCEPTED = "accepted", //sai
  PURCHASE = "purchase_order",
  CONFIRM_PURCHASE = "confirmation_purchase_order",
  PICKUP = "pickup_scheduling",
  INVOICE = "customer_invoice",
  SAVE_INVOICE = "save_customer_invoice",
  WAITING_SHIPMENT = "waiting_shipment",
  SHIPPING = "shipping",
  SHIPPED = "shipped", //sai
  DELIVERED = "delivered",
  CANCELED = "canceled",
  CLOSED = "closed",
  REFUSED = "refused",
  RETURNED = "returned",
  REFUNDED = "refunded",
  ACTION = "action_required",
  PROCESSING = "processing",
}

enum OrderStatusValue {
  APPROVED = 0,
  PURCHASE = 1,
  CONFIRM_PURCHASE = 2,
  PICKUP = 3,
  INVOICE = 4,
  SAVE_INVOICE = 5,
  WAITING_SHIPMENT = 6,
  SHIPPING = 7,
  DELIVERED = 8,
  CANCELED = 9,
  CLOSED = 10,
  REFUSED = 11,
  REFUNDED = 12,
  ACTION = 13,
  PROCESSING = 14,
}

export enum OrderTimeline {
  APPROVED = "approved",
  PURCHASE = "purchase",
  PICKUP = "pickup",
  INVOICE = "invoice",
  SHIPPING = "shipping",
  DELIVERED = "delivered",
}

export enum OrderEvents {
  APPROVED = "payment_approved",
  SEND_PURCHASE = "send_purchase",
  CONFIRM_PURCHASE = "confirm_purchase",
  SAVE_PURCHASE_ORDER = "save_purchase",
  CREATE_SHIPPING_LABEL = "create_shipping_label",
  PRINT_SHIPPING_LABEL = "print_shipping_label",
  CREATE_CUSTOMER_INVOICE = "create_customer_invoice",
  SAVE_CUSTOMER_INVOICE = "save_customer_invoice",
  SHIPPING_STATUS = "shipping_status",
  DELIVERED = "order_delivered",
  CONFIRM_SHIPPING = "confirm_shipping",
  UPLOAD_INVOICE = "upload_invoice",
}

export enum OrderActionTypes {
  NEW_ORDER = "NEW_ORDER",
  CANCEL_ORDER = "CANCEL_ORDER",
}

export const OrderTimelineLabels = {
  approved: "Order Approved",
  purchase: "Purchase Order",
  pickup: "Pickup Scheduling",
  invoice: "Customer Invoice",
  shipping: "Shipping",
  delivered: "Delivered",
} as any;

export const Timelines = {
  [DeliveryTypes.FULFILLMENT]: [
    OrderTimeline.APPROVED,
    OrderTimeline.PICKUP,
    OrderTimeline.INVOICE,
    OrderTimeline.SHIPPING,
    OrderTimeline.DELIVERED,
  ],
  [DeliveryTypes.DROPSHIPPING]: [
    OrderTimeline.APPROVED,
    OrderTimeline.PURCHASE,
    OrderTimeline.PICKUP,
    OrderTimeline.INVOICE,
    OrderTimeline.SHIPPING,
    OrderTimeline.DELIVERED,
  ],
  [DeliveryTypes.WHOLESALER]: [
    OrderTimeline.APPROVED,
    OrderTimeline.INVOICE,
    OrderTimeline.SHIPPING,
    OrderTimeline.DELIVERED,
  ],
} as any;

export enum ActionLabel {
  SEND_PURCHASE = "Send Purchase Order",
  WAITING_PURCHASE = "Waiting Purchase Order",
  CONFIRM_PURCHASE = "Confirm Purchase Order",
  WAITING_CONFIRM = "Waiting Confirmation",
  CREATE_SHIPPING_LABEL = "Schedule Pickup",
  WAITING_SHIPPING_LABEL = "Waiting Schedule Pickup",
  CREATE_CUSTOMER_INVOICE = "Create Customer Invoice",
  WAITING_INVOICE = "Waiting Customer Invoice",
  SAVE_CUSTOMER_INVOICE = "Save Customer Invoice",
  WAITING_SAVE_INVOICE = "Waiting Save Invoice",
}

export enum RefundStatus {
  REFUNDED = "refunded",
  REFUNDING = "refunding",
  NOT_REFUNDED = "not_refunded",
}

export enum CancelReasons {
  OUT_OF_STOCK = "Out-of-stock",
  PRICING_ISSUE = "Pricing issue",
}

export const OrderSchema = new Schema(
  {
    // id: { type: "String" },
    order_id: { type: "Number", required: true, unique: true },
    // order_id: { type: "String", required: true, unique: true },
    order_marketplace: { type: "String", required: true },
    order_erp: { type: "String" },
    marketplace: { type: "String" },
    zeoosName: { type: "String" },
    date: { type: "Date", required: true, default: Date.now },
    status: { type: "String", enum: OrderStatus },
    price: { type: "Number", required: true },
    shipping_price: { type: "Number", required: true, default: 0 },
    fulfillment_provider: { type: "String" },
    odoo: { type: "Boolean", default: false },
    reserved: { type: "Boolean", default: false },
    customer: {
      name: { type: "String", required: true },
      address: { type: "String" },
      address2: { type: "String" },
      city: { type: "String" },
      state: { type: "String" },
      zip: { type: "String" },
      country: { type: "String" },
      phone: { type: "String" },
      mobile: { type: "String" },
      email: { type: "String" },
      company: { type: "String" },
      vat: { type: "String" },
    },
    products: [
      {
        order_line_id: { type: "String" },
        product_id: { type: "String" },
        sku: { type: "String" },
        name: { type: "String" },
        quantity: { type: "Number" },
        price: { type: "Number" },
        seller_id: { type: "Number" },
        inventory: { type: "String" },
        weight: { type: "Number" },
        tax: { type: "Number" },
        image: { type: "String" },
        ean: { type: "String" },
        vendor_price: { type: "Number" },
        quantity_done: { type: "Number" },
        shipment_numbers: { type: Array<number> },
      },
    ],
    shipping_address: {
      name: { type: "String", required: true },
      address: { type: "String" },
      address2: { type: "String" },
      country: { type: "String" },
      city: { type: "String" },
      state: { type: "String" },
      customer: { type: "String" },
      phone: { type: "String" },
      mobile: { type: "String" },
      zipcode: { type: "String" },
      vat: { type: "String" },
      company: { type: "String" },
      email: { type: "String" },
    },
    billing_address: {
      name: { type: "String", required: true },
      address: { type: "String" },
      address2: { type: "String" },
      country: { type: "String" },
      city: { type: "String" },
      state: { type: "String" },
      customer: { type: "String" },
      zipcode: { type: "String" },
      vat: { type: "String" },
      phone: { type: "String" },
      mobile: { type: "String" },
      company: { type: "String" },
      email: { type: "String" },
    },
    created: { type: "Date", default: Date.now },
    confirmed: { type: "Date" },
    sale_id: { type: "Number" },
    refund_status: { type: "String", enum: RefundStatus },
    taxPO: { type: "Number" },
    shipping_list: [
      {
        reference: { type: "String" },
        type: { type: "String", required: true, enum: DeliveryTypes },
        products: { type: Schema.Types.Array },
        seller_id: { type: "Number" },
        seller_name: { type: "String" },
        // po_name: { type: "String" },
        carrier: { type: "String" },
        operation_type: { type: "String" },
        weight: { type: "Number" },
        volume: { type: "Number" },
        pickup_date: { type: "Date" },
        pickup_number: { type: "String" },
        tracking: { type: "String" },
        tracking_link: { type: "String" },
        agency: { type: "String" },
        purchase_order: { type: "String" },
        draft_invoice: { type: "Number" },
        invoice: { type: "String" },
        delivery_date: { type: "Date" },
        shipping_price: { type: "Number" },
        timeline: {
          type: "String",
          enum: OrderTimeline,
        },
        history: [
          {
            date: { type: "Date" },
            event: {
              type: "String",
              enum: OrderEvents,
            },
            description: { type: "String" },
          },
        ],
        wholesalerOrder: { type: Schema.Types.Array },
        labels: [
          {
            pdfUrl: { type: "String" },
            zplStr: { type: "String" },
          },
        ],
        label: { type: "String" },
      },
    ],

    invoiceFile: { type: "String" },
    invoiceFilename: { type: "String" },
  },
  { collection: "order" }
);

export const Order = model("Order", OrderSchema);

export const orderCacheSchema = new Schema({
  id: { type: "String", required: true },
  details: { type: Schema.Types.Mixed },
  created: { type: "Date", required: true, default: Date.now },
});

export const OrderCache = model("OrderCache", orderCacheSchema);

function uniqByFilter<T>(array: T[]) {
  return array.filter((value, index) => array.indexOf(value) === index);
}

export const getNextOrderId = async () => {
  const newId = await Order.findOne().sort({ order_id: -1 }).select("order_id");
  return newId.order_id + 1;
};

export const createOrder = async (params: any) => {
  if (
    params.order_status === OrderStatus.CANCELED ||
    (await Order.countDocuments({
      order_marketplace: params.marketplace_order_id,
      marketplace: params.marketplace,
    }))
  ) {
    return;
  }

  let price = 0;
  let products = [] as any;

  const channel = await Marketplace.findOne({
    zeoosName: params.marketplace_name,
  }).select("country");
  for (let i = 0; i < params.sku_list?.length; i++) {
    const sku = `${params.sku_list[i]}`;

    // Might not be the right offer
    // #multi-seller-issues
    let winner = await Offer.findOne({
      sku,
      platform: channel?._id,
      ranking: 1,
    }).populate("seller");

    const info = await Product.findOne({ sku });

    const tax = (
      await TaxMapping.findOne({ _id: info?.details.taxCategory })
    )?.countries.filter((c: any) => c.name === channel?.country)[0]?.vat;

    const weight = getWeight(info);

    // TODO: NOT WORKING
    // if (winner?.price.pvpFinal !== params.product_unit_prices[i]) {
    //   winner = await rankingZeoosLastWinner(winner);
    //   if (winner?.price.pvpFinal !== params.product_unit_prices[i]) {
    //     winner = await winnerRankingZeoosDate(
    //       winner,
    //       params.marketplace_name,
    //       DateTime.fromISO(params.order_date).toJSDate()
    //     );
    //   }
    // }

    if (!winner) {
      throw new Error(`Cannot find seller for sku ${sku}`);
    }

    products[i] = {
      product_id: params.product_data[i].id,
      sku,
      name: params.product_data[i].name,
      quantity: params.product_uom_qtys[i],
      price: params.product_unit_prices[i],
      seller_id: winner.seller.id,
      inventory: winner.deliveryType,
      weight: isNaN(weight) ? null : weight,
      tax,
      image: imagesToExport(info?.details)[0],
      ean: info?.details.ean,
      vendor_price: _.round(
        winner.price.cost ||
          winner.price.vendorPrice ||
          winner.price.purchasePrice,
        2
      ),
      order_line_id: params.product_data[i].line_id,
    };
    price += products[i].quantity * products[i].price;
  }

  const consolidateProducts = (products: any[]) => {
    const consolidate: any[] = [];
    products.map((p: any) => {
      const findSKU = consolidate.findIndex(
        (c: any) => c.sku == p.sku && c.price === p.price
      );
      if (findSKU >= 0) {
        consolidate[findSKU].quantity += p.quantity;
      } else {
        consolidate.push(p);
      }
    });
    return consolidate;
  };

  const order = {
    marketplace: params.marketplace,
    zeoosName: params.marketplace_name,
    order_id: await getNextOrderId(),
    order_marketplace: params.marketplace_order_id,
    fulfillment_provider: params.order_fulfillment_service_provider,
    date: params.order_date,
    price,
    status:
      params.order_status === OrderStatus.RESERVED
        ? OrderStatus.RESERVED
        : OrderStatus.APPROVED,
    shipping_price: params.shipping_price,
    products: consolidateProducts(products),
    customer: {
      name: params.customer_name,
      address: params.customer_street_name,
      address2: params.customer_street2_name,
      city: params.customer_city,
      state: params.customer_state_name,
      zip: `${params.customer_zip}`.replace(/\s/g, ""),
      country: params.customer_country,
      phone: params.customer_phone,
      mobile: params.customer_mobile,
      email: params.customer_email,
      company: params.customer_company_name,
      vat: params.customer_vat,
    },
    shipping_address: {
      name: params.delivery_customer_name,
      address: params.delivery_customer_street,
      address2: params.delivery_customer_street2,
      country: params.delivery_customer_country,
      city: params.delivery_customer_city,
      state: params.delivery_customer_state_name,
      customer: params.delivery_customer_name,
      phone: params.delivery_customer_phone,
      mobile: params.delivery_customer_mobile,
      zipcode: `${params.delivery_customer_zip}`.replace(/\s/g, ""),
      vat: params.delivery_customer_vat,
      company: params.delivery_customer_company_name,
      email: params.delivery_customer_email,
    },
    billing_address: {
      name: params.invoice_customer_name,
      address: params.invoice_customer_street,
      address2: params.invoice_customer_street2,
      country: params.invoice_customer_country,
      city: params.invoice_customer_city,
      state: params.invoice_customer_state_name,
      customer: params.invoice_customer_name,
      zipcode: `${params.invoice_customer_zip}`.replace(/\s/g, ""),
      vat: params.invoice_customer_vat,
      phone: params.invoice_customer_phone,
      mobile: params.invoice_customer_mobile,
      company: params.invoice_customer_company_name,
      email: params.invoice_customer_email,
    },
  };

  await new Order(order).save();

  // assign shipments to sale lines
  const newOrder = await populateOrderShipmentNumber(order);

  if (newOrder.shipmentList.length || newOrder.dropshippingList.length) {
    await saveOrderBillings(newOrder);
  }

  //update shipments
  for (const item of newOrder.shipmentList) {
    await updateShipmentLineQtys(item.id, item.sku, item.qty);
  }

  return newOrder;
};

export const createOrder_old = async (params: any) => {
  if (
    params.order_status === OrderStatus.CANCELED ||
    (await Order.countDocuments({
      order_marketplace: params.marketplace_order_id,
      marketplace: params.marketplace,
    }))
  ) {
    return;
  }

  let price = 0;
  let products = [] as any;

  const channel = await Marketplace.findOne({
    zeoosName: params.marketplace_name,
  }).select("country");
  for (let i = 0; i < params.sku_list?.length; i++) {
    const sku = params.sku_list[i];
    const mrktProd = await MarketplaceProduct.findOne({ sku }).select([
      // "seller_id",
      // "inventory",
      // "weight",
      // `marketplaces.${params.marketplace_name}.priceBreakdown.vendorPrice`,
      // `marketplaces.${params.marketplace_name}.priceBreakdown.purchasePrice`,
      `marketplaces.${params.marketplace_name}.rankingZeoos`,
    ]);
    const info = await getLatestVersion(sku, "pt");
    const tax = (
      await TaxMapping.findOne({ _id: info?.details.taxCategory })
    )?.countries.filter((c: any) => c.name === channel?.country)[0]?.vat;
    const weight = (
      info?.details?.total_weight ||
      info?.details?.totalWeight ||
      info?.details?.weight ||
      info?.details?.productWeight ||
      info?.details?.["product-weight"]
    )
      ?.toString()
      .replace(",", ".");

    let winner = rankingZeoosWinner(
      mrktProd?._doc.marketplaces[params.marketplace_name]
    );
    if (winner?.price.pvpFinal !== params.product_unit_prices[i]) {
      winner = rankingZeoosLastWinner(
        mrktProd?._doc.marketplaces[params.marketplace_name]
      );
      if (winner?.price.pvpFinal !== params.product_unit_prices[i]) {
        winner = await winnerRankingZeoosDate(
          { sku },
          params.marketplace_name,
          DateTime.fromISO(params.order_date).toJSDate()
        );
      }
    }

    if (!winner) {
      throw new Error(`Cannot find seller for sku ${sku}`);
    }

    products[i] = {
      product_id: params.product_data[i].id,
      sku,
      name: params.product_data[i].name,
      quantity: params.product_uom_qtys[i],
      price: params.product_unit_prices[i],
      seller_id: winner.seller,
      inventory: winner.deliveryType,
      weight: !isNaN(weight) ? Number(weight) : null,
      tax,
      image: imagesToExport(info?.details)[0],
      ean: info?.details.ean,
      vendor_price: _.round(
        (winner.price.vendorPrice || winner.price.purchasePrice) /
          (1 + IVA_PT / 100),
        2
      ),
      order_line_id: params.product_data[i].line_id,
    };
    price += products[i].quantity * products[i].price;
  }

  const consolidateProducts = (products: any[]) => {
    const consolidate: any[] = [];
    products.map((p: any) => {
      const findSKU = consolidate.findIndex(
        (c: any) => c.sku == p.sku && c.price === p.price
      );
      if (findSKU >= 0) {
        consolidate[findSKU].quantity += p.quantity;
      } else {
        consolidate.push(p);
      }
    });
    return consolidate;
  };

  const order = {
    marketplace: params.marketplace,
    zeoosName: params.marketplace_name,
    order_id: await getNextOrderId(),
    order_marketplace: params.marketplace_order_id,
    fulfillment_provider: params.order_fulfillment_service_provider,
    date: params.order_date,
    price,
    status:
      params.order_status === OrderStatus.RESERVED
        ? OrderStatus.RESERVED
        : OrderStatus.APPROVED,
    shipping_price: params.shipping_price,
    products: consolidateProducts(products),
    customer: {
      name: params.customer_name,
      address: params.customer_street_name,
      address2: params.customer_street2_name,
      city: params.customer_city,
      state: params.customer_state_name,
      zip: `${params.customer_zip}`.replace(/\s/g, ""),
      country: params.customer_country,
      phone: params.customer_phone,
      mobile: params.customer_mobile,
      email: params.customer_email,
      company: params.customer_company_name,
      vat: params.customer_vat,
    },
    shipping_address: {
      name: params.delivery_customer_name,
      address: params.delivery_customer_street,
      address2: params.delivery_customer_street2,
      country: params.delivery_customer_country,
      city: params.delivery_customer_city,
      state: params.delivery_customer_state_name,
      customer: params.delivery_customer_name,
      phone: params.delivery_customer_phone,
      mobile: params.delivery_customer_mobile,
      zipcode: `${params.delivery_customer_zip}`.replace(/\s/g, ""),
      vat: params.delivery_customer_vat,
      company: params.delivery_customer_company_name,
      email: params.delivery_customer_email,
    },
    billing_address: {
      name: params.invoice_customer_name,
      address: params.invoice_customer_street,
      address2: params.invoice_customer_street2,
      country: params.invoice_customer_country,
      city: params.invoice_customer_city,
      state: params.invoice_customer_state_name,
      customer: params.invoice_customer_name,
      zipcode: `${params.invoice_customer_zip}`.replace(/\s/g, ""),
      vat: params.invoice_customer_vat,
      phone: params.invoice_customer_phone,
      mobile: params.invoice_customer_mobile,
      company: params.invoice_customer_company_name,
      email: params.invoice_customer_email,
    },
  };

  await new Order(order).save();

  // assign shipments to sale lines
  const newOrder = await populateOrderShipmentNumber(order);

  if (newOrder.shipmentList.length || newOrder.dropshippingList.length) {
    await saveOrderBillings(newOrder);
  }

  //update shipments
  for (const item of newOrder.shipmentList) {
    await updateShipmentLineQtys(item.id, item.sku, item.qty);
  }

  return newOrder;
};

export const saveOrderBillings = async (order: any) => {
  const billings = {} as any;
  for (const line of order.products) {
    const skusToBill: any[] = [];

    const seller = await Vendor.findOne({ id: line.seller_id }).select(
      "_id pricingType"
    );
    const platform = await Marketplace.findOne({
      zeoosName: order.zeoosName,
    }).select("_id");
    const product = await Product.findOne({ sku: line.sku }).select("name");

    const mrktProd = await Offer.findOne({ sku: line.sku, seller, platform });

    let breakdown = mrktProd.price;

    const taxesPT = (await getProductTaxes(line.sku, "Portugal")) as any;

    if (breakdown.pvpFinal !== line.price) {
      switch (seller?.pricingType) {
        case "fullBreakdown":
          breakdown = calculateNewReversePriceBreakdown({
            platformRate: breakdown.platformRate,
            productVAT: breakdown.productVAT,
            freightVAT: breakdown.freightVAT,
            freight: breakdown.freight,
            duty: breakdown.duty || 0,
            fulfillCost: breakdown.fulfillCost || 0,
            zeoosRate: breakdown.zeoosRate,
            cost: breakdown.cost,
            pvpFinal: line.price,
            markup: breakdown.markup,
          });
          break;

        case "wholesaler":
          breakdown = calculateReverseWholesalePriceBreakdown({
            cost: breakdown.cost,
            costVAT: breakdown.costVAT,
            transport: breakdown.transport,
            zeoosRate: breakdown.zeoosRate,
            platformRate: breakdown.platformRate,
            productVAT: breakdown.productVAT,
            pvpFinal: line.price,
            freight: breakdown.freight,
            freightName: breakdown.freightName,
            freightVAT: breakdown.freightVAT,
            freightVATValue: breakdown.freightVATValue,
            freightPlatform: breakdown.platformFreight,
            freightFinal: breakdown.freightFinal,
          });
          break;

        case "wortenSeller":
          breakdown = calculateWortenSellerPriceBreakdown({
            pvpFinal: line.price,
            zeoosRate: breakdown.zeoosRate,
            platformRate: breakdown.platformRate,
            productVAT: breakdown.productVAT,
            freight: breakdown.freight,
            freightName: breakdown.freightName,
            freightVAT: breakdown.freightVAT,
            transport: breakdown.transport,
          });
          break;

        case "pvpAndCost":
          breakdown = calculatePvpAndCostPriceBreakdown({
            cost: breakdown.cost,
            transport: breakdown.transport,
            platformRate: breakdown.platformRate,
            productVAT: breakdown.productVAT,
            pvpFinal: line.price,
            freight: breakdown.freight,
            freightName: breakdown.freightName,
            freightVAT: breakdown.freightVAT,
          });
          break;

        case "d2c":
          breakdown = calculateD2CPriceBreakdown({
            cost: breakdown.cost,
            pvpFinal: line.price,
            platformRate: breakdown.platformRate,
            productVAT: breakdown.productVAT,
            transport: breakdown.transport,
            freight: breakdown.freight,
            freightName: breakdown.freightName,
            freightVAT: breakdown.freightVAT,
          });
          break;

        default:
          breakdown = calculateDefaultPriceBreakdown({
            price: line.price,
            vendorRate: breakdown.vendorRate,
            deliveryPrice: breakdown.deliveryPrice,
            iec: breakdown.iec,
            iva: breakdown.iva,
            vendorPrice: breakdown.vendorPrice,
          });
          break;
      }
    }

    if (!line.bom?.length) {
      //single product
      if (!skusToBill.find((p: any) => p.sku === line.sku)) {
        skusToBill.push({
          sku: line.sku,
          name: product.name,
          price: breakdown,
          taxes: {
            iva: taxesPT?.vat,
            iec: taxesPT?.iec,
          },
        });
      }
    } else {
      //packs
      const newBreaks = await explodePackPrice(
        breakdown,
        platform,
        seller,
        line.bom
      );

      for (const component of newBreaks) {
        if (!skusToBill.find((p: any) => p.sku === component.sku)) {
          const compTaxesPT = (await getProductTaxes(
            component.sku,
            "Portugal"
          )) as any;
          skusToBill.push({
            sku: component.sku,
            name: component.name,
            price: component.newPrice,
            taxes: {
              iva: compTaxesPT?.vat,
              iec: compTaxesPT?.iec,
            },
          });
        }
      }
    }

    // console.log('skusToBill',skusToBill);
    for (const prod of skusToBill) {
      const items = concat(order.shipmentList, order.dropshippingList).filter(
        (s: any) => s.sku === prod.sku
      );
      for (const item of items) {
        if (!billings[item.name]) {
          billings[item.name] = {
            partner_id: line.seller_id,
            shipment_number: item.id,
            billing_lines: [],
          };
        }

        let price_unit;
        switch (seller?.pricingType) {
          case "wholesaler":
          case "fullBreakdown":
          case "wortenSeller":
          case "pvpAndCost":
            price_unit = prod.price.purchasePrice;
            break;

          case "d2c":
            price_unit = prod.price.cost;
            break;

          default:
            price_unit = prod.price.vendorPrice;
            break;
        }

        // price_unit = _.round(price_unit / (1 + IVA_PT / 100), 2); //price - iva

        const price_iva_unit =
          ((price_unit + prod.taxes.iec) / 100) * prod.taxes.iva;
        const price_subtotal = price_unit * item.qty;
        const price_tax = round(
          price_iva_unit * item.qty + prod.taxes.iec * item.qty,
          2
        );

        billings[item.name].billing_lines.push({
          sku: prod.sku,
          name: prod.name,
          product_uom_qty: item.qty,
          price_unit,
          iva: prod.taxes.iva,
          iec: prod.taxes.iec,
          price_subtotal,
          price_tax,
          price_total: round(price_subtotal + price_tax, 2),
          price_breakdown: prod.price,
        });
      }
    }

    // console.log(billings);
    for (const shipment of Object.keys(billings)) {
      const billing_name = billings[shipment].shipment_number
        ? `BILLING_${billings[shipment].partner_id}-${order.order_id}-${billings[shipment].shipment_number}`
        : `BILLING_${shipment}-${order.order_id}`;

      const shipment_number = billings[shipment].shipment_number
        ? billings[shipment].shipment_number
        : undefined;

      const newBilling = new Billing({
        billing_name,
        related_sale_order: order.order_id,
        shipment_number,
        partner_id: billings[shipment].partner_id,
        billing_lines: billings[shipment].billing_lines,
        pay_deadline: calculatePayDeadline(new Date()),
      });

      // console.log(newBilling);
      try {
        await newBilling.save();
      } catch (error) {
        const upBilling = await Billing.findOne({ billing_name });
        if (upBilling) {
          newBilling.billing_lines.map((bl: any) => {
            if (
              !upBilling.billing_lines.find((upbl: any) => upbl.sku === bl.sku)
            ) {
              upBilling?.billing_lines.push(bl);
            }
          });
          await upBilling.save();
        }
      }
    }
  }
};

export const saveOrderBillings_old = async (order: any) => {
  const billings = {} as any;
  for (const line of order.products) {
    const skusToBill: any[] = [];

    const mrktProd = (
      await MarketplaceProduct.findOne({ sku: line.sku }).select([
        "name",
        `marketplaces.${order.zeoosName}`,
      ])
    )._doc;

    let breakdown =
      mrktProd.marketplaces[order.zeoosName].rankingZeoos[line.seller_id]
        .breakdownPromotional ||
      mrktProd.marketplaces[order.zeoosName].rankingZeoos[line.seller_id]
        .breakdownCustom ||
      mrktProd.marketplaces[order.zeoosName].rankingZeoos[line.seller_id]
        .breakdown;
    // let breakdown =
    // 	mrktProd.marketplaces[order.zeoosName].priceBreakdownPromotional ||
    // 	mrktProd.marketplaces[order.zeoosName].priceBreakdownCustom ||
    // 	mrktProd.marketplaces[order.zeoosName].priceBreakdown;

    const taxesPT = await getProductTaxes_old(line.sku, "Portugal");

    const vendor = await Vendor.findOne({ id: line.seller_id }).select(
      "pricingType"
    );

    if (breakdown.pvpFinal !== line.price) {
      switch (vendor?.pricingType) {
        case "fullBreakdown":
          breakdown = calculateNewReversePriceBreakdown({
            platformRate: breakdown.platformRate,
            productVAT: breakdown.productVAT,
            freightVAT: breakdown.freightVAT,
            freight: breakdown.freight,
            duty: breakdown.duty,
            fulfillCost: breakdown.fulfillCost,
            zeoosRate: breakdown.zeoosRate,
            cost: breakdown.cost,
            pvpFinal: line.price,
            markup: breakdown.markup,
          });
          break;

        case "wholesaler":
          breakdown = calculateReverseWholesalePriceBreakdown({
            cost: breakdown.cost,
            costVAT: breakdown.costVAT,
            transport: breakdown.transport,
            zeoosRate: breakdown.zeoosRate,
            platformRate: breakdown.platformRate,
            productVAT: breakdown.productVAT,
            pvpFinal: line.price,
            freight: breakdown.freight,
            freightName: breakdown.freightName,
            freightVAT: breakdown.freightVAT,
            freightVATValue: breakdown.freightVATValue,
            freightPlatform: breakdown.platformFreight,
            freightFinal: breakdown.freightFinal,
          });
          break;

        case "wortenSeller":
          breakdown = calculateWortenSellerPriceBreakdown({
            pvpFinal: line.price,
            zeoosRate: breakdown.zeoosRate,
            platformRate: breakdown.platformRate,
            productVAT: breakdown.productVAT,
            freight: breakdown.freight,
            freightName: breakdown.freightName,
            freightVAT: breakdown.freightVAT,
            transport: breakdown.transport,
          });
          break;

        case "pvpAndCost":
          breakdown = calculatePvpAndCostPriceBreakdown({
            cost: breakdown.cost,
            transport: breakdown.transport,
            platformRate: breakdown.platformRate,
            productVAT: breakdown.productVAT,
            pvpFinal: line.price,
            freight: breakdown.freight,
            freightName: breakdown.freightName,
            freightVAT: breakdown.freightVAT,
          });
          break;

        case "d2c":
          breakdown = calculateD2CPriceBreakdown({
            cost: breakdown.cost,
            pvpFinal: line.price,
            platformRate: breakdown.platformRate,
            productVAT: breakdown.productVAT,
            transport: breakdown.transport,
            freight: breakdown.freight,
            freightName: breakdown.freightName,
            freightVAT: breakdown.freightVAT,
          });
          break;

        default:
          breakdown = calculateDefaultPriceBreakdown({
            price: line.price,
            vendorRate: breakdown.vendorRate,
            deliveryPrice: breakdown.deliveryPrice,
            iec: breakdown.iec,
            iva: breakdown.iva,
            vendorPrice: breakdown.vendorPrice,
          });
          break;
      }
    }

    if (!line.bom?.length) {
      //single product
      if (!skusToBill.find((p: any) => p.sku === line.sku)) {
        skusToBill.push({
          sku: line.sku,
          name: mrktProd.name,
          price: breakdown,
          taxes: {
            iva: taxesPT?.vat,
            iec: taxesPT?.iec,
          },
        });
      }
    } else {
      //packs
      const newBreaks = await explodePackPrice_old(
        breakdown,
        order.zeoosName,
        line.bom
      );

      for (const component of newBreaks) {
        if (!skusToBill.find((p: any) => p.sku === component.sku)) {
          const compTaxesPT = await getProductTaxes_old(
            component.sku,
            "Portugal"
          );
          skusToBill.push({
            sku: component.sku,
            name: component.name,
            price: component.newPrice,
            taxes: {
              iva: compTaxesPT?.vat,
              iec: compTaxesPT?.iec,
            },
          });
        }
      }
    }

    // console.log('skusToBill',skusToBill);
    for (const prod of skusToBill) {
      const items = concat(order.shipmentList, order.dropshippingList).filter(
        (s: any) => s.sku === prod.sku
      );
      for (const item of items) {
        if (!billings[item.name]) {
          billings[item.name] = {
            partner_id: line.seller_id,
            shipment_number: item.id,
            billing_lines: [],
          };
        }

        let price_unit;
        switch (vendor?.pricingType) {
          case "wholesaler":
          case "fullBreakdown":
          case "wortenSeller":
          case "pvpAndCost":
            price_unit = prod.price.purchasePrice;
            break;

          case "d2c":
            price_unit = prod.price.cost;
            break;

          default:
            price_unit = prod.price.vendorPrice;
            break;
        }

        price_unit = price_unit / (1 + IVA_PT / 100); //price - iva

        const price_iva_unit =
          ((price_unit + prod.taxes.iec) / 100) * prod.taxes.iva;
        const price_subtotal = price_unit * item.qty;
        const price_tax = round(
          price_iva_unit * item.qty + prod.taxes.iec * item.qty,
          2
        );

        billings[item.name].billing_lines.push({
          sku: prod.sku,
          name: prod.name,
          product_uom_qty: item.qty,
          price_unit,
          iva: prod.taxes.iva,
          iec: prod.taxes.iec,
          price_subtotal,
          price_tax,
          price_total: round(price_subtotal + price_tax, 2),
          price_breakdown: prod.price,
        });
      }
    }

    // console.log(billings);
    for (const shipment of Object.keys(billings)) {
      const billing_name = billings[shipment].shipment_number
        ? `BILLING_${billings[shipment].partner_id}-${order.order_id}-${billings[shipment].shipment_number}`
        : `BILLING_${shipment}-${order.order_id}`;

      const shipment_number = billings[shipment].shipment_number
        ? billings[shipment].shipment_number
        : undefined;

      const newBilling = new Billing({
        billing_name,
        related_sale_order: order.order_id,
        shipment_number,
        partner_id: billings[shipment].partner_id,
        billing_lines: billings[shipment].billing_lines,
        pay_deadline: calculatePayDeadline(new Date()),
      });

      // console.log(newBilling);
      try {
        await newBilling.save();
      } catch (error) {
        const upBilling = await Billing.findOne({ billing_name });
        if (upBilling) {
          newBilling.billing_lines.map((bl: any) => {
            if (
              !upBilling.billing_lines.find((upbl: any) => upbl.sku === bl.sku)
            ) {
              upBilling?.billing_lines.push(bl);
            }
          });
          await upBilling.save();
        }
      }
    }
  }
};

export const explodePackPrice = async (
  packPrice: any,
  platform: any,
  seller: any,
  bom: any
) => {
  const newBom: any[] = [];
  for (const component of bom) {
    const mrktProd = await Offer.findOne({
      sku: component.component_sku,
      platform,
      seller,
    }).select("price");

    const name = (
      await Product.findOne({ sku: component.component_sku }).select("name")
    )?.name;

    const breakdown = mrktProd.price;

    newBom.push({
      sku: component.component_sku,
      name,
      qty: component.component_qty,
      price: breakdown,
    });
  }

  let total = 0;
  newBom.map((c: any) => (total += c.price.pvpFinal * c.qty));

  const applyPerc = (breakdown: any, perc: number, qty: number) => {
    const newBreak = {} as any;
    Object.keys(breakdown).map((k: string) => {
      if (
        [
          "cost",
          "markup",
          "purchasePrice",
          "zeoosValue",
          "fulfillCost",
          "pvpBase",
          "platformValue",
          "productVATValue",
          "freight",
          "freightVATValue",
          "freightFinal",
          "duty",
          "pvpFinal",
          "vendorPrice",
          "iec",
          "ivaValue",
          "deliveryPrice",
          "price",
          "vinuusPrice",
          "basePrice",
          "services",
          "vinuusMargin",
        ].includes(k)
      ) {
        newBreak[k] = round((breakdown[k] / qty / 100) * perc, 2);
      } else {
        newBreak[k] = breakdown[k];
      }
    });

    return newBreak;
  };

  newBom.map((c: any, i: number) => {
    newBom[i].perc = ((c.price.pvpFinal * c.qty) / total) * 100;
    newBom[i].newPrice = applyPerc(packPrice, newBom[i].perc, newBom[i].qty);
  });

  return newBom;
};

export const explodePackPrice_old = async (
  packPrice: any,
  zeoosName: string,
  bom: any
) => {
  const newBom: any[] = [];
  for (const component of bom) {
    const mrktProd = (
      await MarketplaceProduct.findOne({ sku: component.component_sku }).select(
        ["name", `marketplaces.${zeoosName}`]
      )
    )._doc;

    const breakdown =
      mrktProd.marketplaces[zeoosName].priceBreakdownPromotional ||
      mrktProd.marketplaces[zeoosName].priceBreakdownCustom ||
      mrktProd.marketplaces[zeoosName].priceBreakdown;

    newBom.push({
      sku: component.component_sku,
      name: mrktProd.name,
      qty: component.component_qty,
      price: breakdown,
    });
  }

  let total = 0;
  newBom.map((c: any) => (total += c.price.pvpFinal * c.qty));

  const applyPerc = (breakdown: any, perc: number, qty: number) => {
    const newBreak = {} as any;
    Object.keys(breakdown).map((k: string) => {
      if (
        [
          "cost",
          "markup",
          "purchasePrice",
          "zeoosValue",
          "fulfillCost",
          "pvpBase",
          "platformValue",
          "productVATValue",
          "freight",
          "freightVATValue",
          "freightFinal",
          "duty",
          "pvpFinal",
          "vendorPrice",
          "iec",
          "ivaValue",
          "deliveryPrice",
          "price",
          "vinuusPrice",
          "basePrice",
          "services",
          "vinuusMargin",
        ].includes(k)
      ) {
        newBreak[k] = round((breakdown[k] / qty / 100) * perc, 2);
      } else {
        newBreak[k] = breakdown[k];
      }
    });

    return newBreak;
  };

  newBom.map((c: any, i: number) => {
    newBom[i].perc = ((c.price.pvpFinal * c.qty) / total) * 100;
    newBom[i].newPrice = applyPerc(packPrice, newBom[i].perc, newBom[i].qty);
  });

  return newBom;
};

export const populateShipmentSingle = async (
  shipments_references: ShipmentObject[],
  sku: string,
  sale_line_qty: number
) => {
  let list_shipment: any[] = [];

  for (const shipment of shipments_references) {
    let po_lines = shipment.shipment_lines;
    for (const po_line of po_lines) {
      if (po_line.sku === sku) {
        if (po_line.qty_available > 0) {
          if (po_line.qty_available >= sale_line_qty) {
            list_shipment.push({
              name: shipment.shipment_name,
              id: shipment.shipment_id,
              sku: sku,
              qty: sale_line_qty,
            });
            sale_line_qty = 0;
            break;
          } else {
            list_shipment.push({
              name: shipment.shipment_name,
              id: shipment.shipment_id,
              sku: sku,
              qty: po_line.qty_available,
            });
            sale_line_qty -= po_line.qty_available;
          }
        }
      }
    }
    if (sale_line_qty <= 0) {
      break;
    }
  }

  return sale_line_qty > 0 ? false : list_shipment;
};

export const populateOrderShipmentNumber = async (sale_order: any) => {
  const order_list: any[] = [];
  const drop_list: any[] = [];
  if (sale_order) {
    for (const line of sale_order.products) {
      let line_list: any[] = [];
      if (!line.shipment_numbers || !line.shipment_numbers.length) {
        const bom = await BOM.findOne({ sku: line.sku });
        if (!bom) {
          //single
          if (line.inventory === "dropshipping") {
            drop_list.push({
              name: `DS_${line.seller_id}`,
              sku: line.sku,
              qty: line.quantity,
            });
          } else {
            const shipments_references = await Shipment.find({
              vendor_id: line.seller_id,
              "shipment_lines.sku": line.sku,
              shipment_status: "open",
            }).sort({ date_approve: 1 });

            const shortlisted_candidates = await populateShipmentSingle(
              shipments_references,
              line.sku,
              line.quantity
            );
            if (shortlisted_candidates) {
              line_list.push(...shortlisted_candidates);
            }
          }
        } else {
          //pack
          for (const bom_line of bom.bom_lines) {
            if (line.inventory === "dropshipping") {
              drop_list.push({
                name: `DS_${line.seller_id}`,
                sku: bom_line.component_sku,
                qty: bom_line.component_qty * line.quantity,
              });
            } else {
              const shipments_references = await Shipment.find({
                vendor_id: line.seller_id,
                "shipment_lines.sku": bom_line.component_sku,
                shipment_status: "open",
              }).sort({ date_approve: 1 });

              const shortlisted_candidates = await populateShipmentSingle(
                shipments_references,
                bom_line.component_sku,
                bom_line.component_qty * line.quantity
              );

              if (!shortlisted_candidates) {
                line_list = [];
                break;
              } else {
                line_list.push(...shortlisted_candidates);
              }
            }
          }
        }
        line.shipment_numbers = uniq(line_list.map((ship: any) => ship.id));
        line.bom = bom?.bom_lines; //for later use
        if (line_list.length) {
          order_list.push(...line_list);
        }
      }
    }
  }

  //update order line with shipping numbers
  await Order.updateOne(
    { order_id: sale_order.order_id },
    { products: sale_order.products }
  );

  // populate this field to later use
  sale_order.shipmentList = order_list;
  sale_order.dropshippingList = drop_list;

  if (!order_list.length && !drop_list.length) {
    // throw new Error(`No shipment found to fulfill order ${sale_order.order_id}`);
  }

  return sale_order;
};

//deprecated
export const initShippingList = async (order: any) => {
  const items: any = {};

  order.products.map((p: any) => {
    if (p.inventory === DeliveryTypes.FULFILLMENT) {
      if (!items[DeliveryTypes.FULFILLMENT])
        items[DeliveryTypes.FULFILLMENT] = [];
      items[DeliveryTypes.FULFILLMENT].push(p._id);
    }

    if (p.inventory === DeliveryTypes.DROPSHIPPING) {
      if (!items[`${DeliveryTypes.DROPSHIPPING}_${p.seller_id}`])
        items[`${DeliveryTypes.DROPSHIPPING}_${p.seller_id}`] = [];
      items[`${DeliveryTypes.DROPSHIPPING}_${p.seller_id}`].push(p._id);
    }
  });

  let shipping_list: any = [];
  for (const key of Object.keys(items)) {
    const aux = key.split("_");
    let weight = 0;
    let seller_id, seller_name;

    items[key].map((id: string) => {
      weight += order.products.filter((p: any) => p._id === id)[0]?.weight || 0;
    });

    if (aux[0] === DeliveryTypes.DROPSHIPPING) {
      seller_id = Number(aux[1]);
      seller_name = (await Vendor.findOne({ id: seller_id }).select("name"))
        .name;
    }

    shipping_list.push({
      type: aux[0],
      products: items[key],
      seller_id,
      seller_name,
      weight,
      timeline: OrderTimeline.APPROVED,
      history: [
        {
          date: Date.now(),
          event: OrderEvents.APPROVED,
          description: "Order approved",
        },
      ],
    });
  }

  order.shipping_list = shipping_list;

  // await Order.updateOne({ _id: order._id }, { shipping_list } );
  return shipping_list;

  return order;
};

export async function initializeShippingList(
  order: any,
  ignoreSkus: string[] = []
) {
  const products = order.products.filter(
    (p: any) => !ignoreSkus.includes(p.sku)
  );
  const groupedBySeller = _.groupBy(products, "seller_id");

  const shippingList = [];

  for (const sellerId of Object.keys(groupedBySeller)) {
    const seller = await Vendor.findOne({ id: sellerId }).select(
      "name carrier"
    );
    const products = groupedBySeller[sellerId];
    const weight = products.reduce((acc, p: any) => acc + (p.weight || 0), 0);

    shippingList.push({
      reference: ID.generateReadableID(),
      // TODO: confirm with Carlos what this should be
      purchase_order: `???`,
      // TODO: define a carrier for the seller
      carrier: seller.carrier,
      type: DeliveryTypes.DROPSHIPPING,
      operation_type: `${DeliveryTypes.DROPSHIPPING} via ${seller.carrier}`,
      products: products.map((p: any) => p._id),
      seller_id: sellerId,
      seller_name: seller.name,
      weight,
      timeline: OrderTimeline.APPROVED,
      history: [
        {
          date: Date.now(),
          event: OrderEvents.APPROVED,
          description: "Order approved",
        },
      ],
    });
  }

  return shippingList;
}

export const initShippingListOdoo = async (order: any, odooResponse: any) => {
  let shipping_list: any = [];

  const deliveries = odooResponse.deliveries_list || odooResponse.deliveries;
  const deliveries_details = odooResponse.deliveries_details;

  const linkDSBilling: any[] = [];

  await Promise.all(
    deliveries.map(async (delivery: any) => {
      let weight = 0;
      let seller_id, seller_name, purchase_order;
      const products: any = [];
      let type =
        delivery.delivery_name.substring(0, 2) == "DS"
          ? DeliveryTypes.DROPSHIPPING
          : DeliveryTypes.FULFILLMENT;
      const details = deliveries_details?.find(
        (d: any) => d.delivery_name === delivery.delivery_name
      );

      delivery.delivery_line_ids.map((line: any) => {
        const order_line = order.products.find(
          (p: any) => p.sku === line.sku //&& p.quantity === (line.qty_reserved || line.qty_done)
        );
        weight += (order_line?.weight || 0) * (order_line?.quantity || 1);
      });

      if (type === DeliveryTypes.DROPSHIPPING) {
        const po_list =
          odooResponse.dropshipping_po_list || odooResponse.dropshipping_pos;
        const po = po_list.find(
          (po: any) => po.po_name === delivery.source_document
        );

        seller_id = po.seller_id;
        seller_name = po.vendor_name;
        purchase_order = delivery.source_document;

        //TODO: define another way to check this. Maybe an attribute for carrier/seller
        if (wholesalerVendors.includes(po.seller_id)) {
          type = DeliveryTypes.WHOLESALER;
        }

        if (purchase_order) {
          linkDSBilling.push({
            purchase: purchase_order,
            order: order.order_id,
            seller: seller_id,
          });
        }
      }

      delivery.delivery_line_ids.map((line: any) => {
        // console.log(line);
        //lines totally reserverd
        let delivery_prod = order.products.find(
          (p: any) =>
            p.sku === line.sku &&
            !products.includes(p._id) &&
            // && line.virtual_available >= 0
            p.quantity === line.qty_done
        )?._id;

        if (!delivery_prod) {
          //lines partially reserverd
          delivery_prod = order.products.find(
            (p: any) =>
              p.sku === line.sku &&
              !products.includes(p._id) &&
              p.quantity > line.qty_done
            // && line.virtual_available < 0
          )?._id;
        }

        if (delivery_prod) {
          products.push(delivery_prod);
          const index = order.products.findIndex(
            (p: any) => p._id === delivery_prod
          );
          order.products[index].quantity_done = line.qty_done;
        }
      });

      const timeline =
        order.status === OrderStatus.SHIPPING
          ? OrderTimeline.INVOICE
          : OrderTimeline.APPROVED;

      const seller = await Vendor.findOne({ id: seller_id }).select("carrier");

      shipping_list.push({
        type,
        reference: delivery.delivery_name,
        products,
        carrier: seller?.carrier || details?.carrier_name,
        operation_type: seller?.carrier
          ? `Dropshipping via ${seller.carrier}`
          : details?.operation_type,
        seller_id,
        seller_name,
        purchase_order,
        weight,
        timeline,
        history: [
          {
            date: Date.now(),
            event: OrderEvents.APPROVED,
            description: "Order approved",
          },
        ],
      });
    })
  );

  order.shipping_list = shipping_list;

  // TODO: For now even SEUR shipping list is managed by ODOO
  // const productsTreatedByOdoo = shipping_list.flatMap((s: any) => s.products);

  // if (order.products.length !== productsTreatedByOdoo.length) {
  //   // Products that we take care of with Zeoos
  //   // currently powered by SEUR carrier
  //   // and is available for Klack and Quad
  //   const shippingList = await initializeShippingList(
  //     order,
  //     productsTreatedByOdoo.map((p: any) => p.sku)
  //   );
  //   order.shipping_list = order.shipping_list.concat(shippingList);
  // }

  const details = odooResponse.sale_details || odooResponse;

  const status = calculateOrderStatus(order);
  if (status === OrderStatus.DELIVERED) {
    shipping_list = shipping_list.map((s: any) => {
      return {
        ...s,
        timeline: OrderTimeline.DELIVERED,
      };
    });
  }

  await Order.updateOne(
    { _id: order.id },
    {
      odoo: true,
      status,
      sale_id: details.sale_id,
      order_erp: details.order_id,
      products: order.products,
      shipping_list,
      confirmed: details.sale_date,
    }
  );

  //link dropshiping billings to PO
  for (const link of linkDSBilling) {
    await linkDSBillingToShipment(link.purchase, link.order, link.seller);
  }

  return order;
};

export const getActionOrder = (order: any, role: string) => {
  const findEvent = (event: string, history: []) => {
    return history.find((e: any) => e.event === event) ? true : false;
  };

  const zeoosSide = ["ADMIN"];
  const sellerSide = ["SELLER_ADMIN", "SELLER_USER", "USER", "ADMIN"]; //allow ADMIN to take actions as seller

  let actions: any = [];
  order.shipping_list.map((shipping: any) => {
    let action, label, timeline;
    switch (shipping.timeline) {
      case OrderTimeline.APPROVED:
        switch (shipping.type) {
          case DeliveryTypes.FULFILLMENT:
            if (
              !findEvent(OrderEvents.CREATE_SHIPPING_LABEL, shipping.history)
            ) {
              if (zeoosSide.includes(role)) {
                action = OrderEvents.CREATE_SHIPPING_LABEL;
                label = ActionLabel.CREATE_SHIPPING_LABEL;
              } else {
                action = null;
                label = ActionLabel.WAITING_SHIPPING_LABEL;
              }

              timeline = OrderTimeline.PICKUP;
            }
            break;

          case DeliveryTypes.DROPSHIPPING:
            if (!findEvent(OrderEvents.SEND_PURCHASE, shipping.history)) {
              if (zeoosSide.includes(role)) {
                action = OrderEvents.SEND_PURCHASE;
                label = ActionLabel.SEND_PURCHASE;
              } else {
                action = null;
                label = ActionLabel.WAITING_PURCHASE;
              }
            } else if (
              !findEvent(OrderEvents.CONFIRM_PURCHASE, shipping.history)
            ) {
              if (sellerSide.includes(role)) {
                action = OrderEvents.CONFIRM_PURCHASE;
                label = ActionLabel.CONFIRM_PURCHASE;
              } else {
                action = null;
                label = ActionLabel.WAITING_CONFIRM;
              }
            }
            timeline = OrderTimeline.PURCHASE;
            break;

          case DeliveryTypes.WHOLESALER:
            if (
              !findEvent(OrderEvents.CREATE_CUSTOMER_INVOICE, shipping.history)
            ) {
              if (zeoosSide.includes(role)) {
                action = OrderEvents.CREATE_CUSTOMER_INVOICE;
                label = ActionLabel.CREATE_CUSTOMER_INVOICE;
              } else {
                action = null;
                label = ActionLabel.WAITING_INVOICE;
              }
            } else if (
              !findEvent(OrderEvents.SAVE_CUSTOMER_INVOICE, shipping.history)
            ) {
              if (sellerSide.includes(role)) {
                action = OrderEvents.SAVE_CUSTOMER_INVOICE;
                label = ActionLabel.SAVE_CUSTOMER_INVOICE;
              } else {
                action = null;
                label = ActionLabel.WAITING_SAVE_INVOICE;
              }
            }
            timeline = OrderTimeline.INVOICE;

            break;
        }
        break;

      case OrderTimeline.PURCHASE:
        if (!findEvent(OrderEvents.CREATE_SHIPPING_LABEL, shipping.history)) {
          if (sellerSide.includes(role)) {
            action = OrderEvents.CREATE_SHIPPING_LABEL;
            label = ActionLabel.CREATE_SHIPPING_LABEL;
          } else {
            action = null;
            label = ActionLabel.WAITING_SHIPPING_LABEL;
          }

          timeline = OrderTimeline.PICKUP;
        }

        break;

      case OrderTimeline.PICKUP:
        if (!findEvent(OrderEvents.CREATE_CUSTOMER_INVOICE, shipping.history)) {
          if (zeoosSide.includes(role)) {
            action = OrderEvents.CREATE_CUSTOMER_INVOICE;
            label = ActionLabel.CREATE_CUSTOMER_INVOICE;
          } else {
            action = null;
            label = ActionLabel.WAITING_INVOICE;
          }
        } else if (
          !findEvent(OrderEvents.SAVE_CUSTOMER_INVOICE, shipping.history)
        ) {
          if (sellerSide.includes(role)) {
            action = OrderEvents.SAVE_CUSTOMER_INVOICE;
            label = ActionLabel.SAVE_CUSTOMER_INVOICE;
          } else {
            action = null;
            label = ActionLabel.WAITING_SAVE_INVOICE;
          }
        }
        timeline = OrderTimeline.INVOICE;

        break;

      case OrderTimeline.INVOICE:
        label = getShippingMessage(shipping.history);
        timeline = OrderTimeline.SHIPPING;
        break;

      case OrderTimeline.SHIPPING:
      case OrderTimeline.DELIVERED:
        label = "Delivered";
        timeline = OrderTimeline.DELIVERED;
        break;

      default:
        break;
    }

    switch (order.status) {
      case OrderStatus.DELIVERED:
        action = null;
        label = "Delivered";
        timeline = OrderTimeline.DELIVERED;
        break;

      case OrderStatus.SHIPPING:
        action = null;
        label = getShippingMessage(shipping.history);
        timeline = OrderTimeline.SHIPPING;
        shipping.timeline = OrderTimeline.INVOICE;
        break;

      case OrderStatus.CANCELED:
        action = null;
        label = "Canceled";
        // timeline = OrderTimeline.DELIVERED;
        break;
    }

    actions.push({ id: shipping._id, action, label, timeline });
  });
  // console.log(actions);

  return actions;
};

export const calculateOrderStatus = (order: any) => {
  const status: string[] = [];

  if ([OrderStatus.DELIVERED, OrderStatus.CANCELED].includes(order.status)) {
    return order.status;
  }

  order.shipping_list.map((shipping: any) => {
    let shippingStatus;
    switch (shipping.timeline) {
      case OrderTimeline.APPROVED:
        shippingStatus =
          shipping.type === DeliveryTypes.DROPSHIPPING
            ? OrderStatus.PURCHASE
            : shipping.type === DeliveryTypes.WHOLESALER
            ? OrderStatus.INVOICE
            : OrderStatus.PICKUP;
        if (shipping.type === DeliveryTypes.DROPSHIPPING) {
          shippingStatus = !shipping.history.find(
            (h: any) => h.event === OrderEvents.SEND_PURCHASE
          )
            ? OrderStatus.PURCHASE
            : OrderStatus.CONFIRM_PURCHASE;
        } else if (shipping.type === DeliveryTypes.WHOLESALER) {
          shippingStatus = !shipping.history.find(
            (h: any) => h.event === OrderEvents.CREATE_CUSTOMER_INVOICE
          )
            ? OrderStatus.INVOICE
            : OrderStatus.SAVE_INVOICE;
        } else {
          shippingStatus = OrderStatus.PICKUP;
        }
        break;

      case OrderTimeline.PURCHASE:
        shippingStatus = OrderStatus.PICKUP;
        break;

      case OrderTimeline.PICKUP:
        shippingStatus = !shipping.history.find(
          (h: any) => h.event === OrderEvents.CREATE_CUSTOMER_INVOICE
        )
          ? OrderStatus.INVOICE
          : OrderStatus.SAVE_INVOICE;
        break;

      case OrderTimeline.INVOICE:
        shippingStatus = OrderStatus.SHIPPING;
        break;

      case OrderTimeline.SHIPPING:
      case OrderTimeline.DELIVERED:
        shippingStatus = OrderStatus.DELIVERED;
        break;

      default:
        shippingStatus = "";
        break;
    }

    if (!status.includes(shippingStatus)) {
      status.push(shippingStatus);
    }
  });

  if (status.length === 1) {
    return status[0];
  } else {
    //TODO test if admin or seller to determine if is WAITING or PROCESSING
    return multiStatus(status);
  }
};

const multiStatus = (status: string[]) => {
  let statusVal = -1;
  let ret = "";
  status.map((s: string) => {
    const val = evalStatus(s);
    if (ret === "" || val < statusVal) {
      ret = s;
      statusVal = val;
    }
  });
  return ret;
};

const evalStatus = (status: string) => {
  for (const key of Object.keys(OrderStatus)) {
    // @ts-ignore
    if (status === OrderStatus[key]) {
      // @ts-ignore
      return OrderStatusValue[key];
    }
  }
  return 0;
};

const getShippingMessage = (history: any) => {
  const message = last(
    history.filter((h: any) => h.event === "shipping_status")
  ) as any;
  return message?.description || "Waiting for Carrier...";
};

export async function sendOrderNotification(
  type: OrderActionTypes,
  order: any
) {
  const products = _.uniq(
    _.filter(order.products, (x: any) => x.seller_id)
  ) as any;

  const orderUrl = `${process.env.WORTEN_PORTAL_URL}/orders/${order._id}`;

  await Promise.all(
    products.map(async (product: any) => {
      let title;
      let emailContent;

      const seller = await Vendor.findOne({ id: product.seller_id });
      const user = await User.findOne({
        seller: seller._id,
      }).select("_id username");

      if (user) {
        const notification = new UserNotification({
          user: user!._id,
          title,
        }) as any;

        await notification.save();
      }

      seller.contactInfo = seller.contactInfo || {};
      if (!seller.isActive) {
        seller.contactInfo.emailForOrders = "german+orders@aconite.io";
      }
      const email = seller.contactInfo?.emailForOrders || seller.email;

      if (!email) {
        return;
      }

      switch (type) {
        case "NEW_ORDER":
          sendOrderReceivedEmail(email, seller.isWorten ? "Worten" : "Zeoos", {
            name: user?.username || "",
            path: `/orders/${order._id}`,
            order: order.order_id,
            store: seller.name,
            platformName: order.zeoosName,
          }).catch(console.error);
          // title = `You have received an order with number ${order.order_id} from ${order.zeoosName}.`;
          // emailContent = `
          //                <p>Hello <strong>${seller.contactInfo?.sellerName||seller.name}</strong>,</p>

          //                <p>We would like to inform you that You Like it Store has received an order placed on ${order.zeoosName} on ${order.created}. Please log in to the Worten World platform to view the order and proceed with the product delivery.</p>

          //                <p><b>Sales channel:</b> ${order.zeoosName}</p>
          //                <p><b>Order number:</b> ${order.order_id}</p>

          //                <p><a style="color: red; text-decoration: none" href="${orderUrl}" target="_blank"><b>VIEW ORDER</b></a> (BUTTON)</p>
          //                <br />

          //                <p>If the above link doesn't work, please copy and paste the address into your browser:
          //               <br /><a style="text-decoration: none" href="${orderUrl}">${orderUrl}</a></p>

          //               <p>Thank you,</p>
          //               <p>The Zeoos Customer Support Team</p>
          //           `;
          break;

        case "CANCEL_ORDER":
          sendOrderCanceledEmail(email, seller.isWorten ? "Worten" : "Zeoos", {
            name: user?.username || "",
            path: `/orders/${order._id}`,
            order: order.order_id,
            store: seller.name,
            platformName: order.zeoosName,
          }).catch(console.error);
          // title = `Order number ${order.order_id} placed on ${order.zeoosName} has been canceled.`;
          // emailContent = `
          //                  <p>Hello,</p>

          //                  <p>Order number ${order.order_id} for You Like it Store placed on ${order.zeoosName} has been canceled on 12/07/2023.</p>

          //                  <p><b>Sales channel:</b> ${order.zeoosName}</p>
          //                  <p><b>Canceled order number:</b> ${order.order_id}</p>

          //                  <p><a style="color: red; text-decoration: none" href="${orderUrl}" target="_blank"><b>VIEW ORDER</b></a> (BUTTON)</p>
          //                  <br />

          //                  <p>If the above link doesn't work, please copy and paste the address into your browser:
          //                  <br /><a style="text-decoration: none" href="${orderUrl}">${orderUrl}</a></p>

          //                 <p>Best regards,</p>
          //                 <p>The Zeoos Customer Support Team</p>
          //             `;
          break;

        default:
          return;
      }
    })
  );
}

export const updateOrderReservedStatus = async (params: any) => {
  const orderUp = await Order.findOne({
    order_marketplace: params.marketplace_order_id,
    marketplace: params.marketplace,
    status: OrderStatus.RESERVED,
  }).select("order_id status");

  let update = {} as any;

  if (orderUp && params.order_status !== orderUp.status) {
    update.status =
      params.order_status === OrderStatus.CANCELED
        ? OrderStatus.CANCELED
        : OrderStatus.APPROVED;
    console.log(
      `Update order (${orderUp.order_id}) status to ${update.status}`
    );

    if (["mirakl", "cdiscount", "rakuten"].includes(params.marketplace)) {
      update.customer = {
        name: params.customer_name,
        address: params.customer_street_name,
        address2: params.customer_street2_name,
        city: params.customer_city,
        state: params.customer_state_name,
        zip: `${params.customer_zip}`.replace(/\s/g, ""),
        country: params.customer_country,
        phone: params.customer_phone,
        mobile: params.customer_mobile,
        email: params.customer_email,
        company: params.customer_company_name,
        vat: params.customer_vat,
      };

      update.shipping_address = {
        name: params.delivery_customer_name,
        address: params.delivery_customer_street,
        address2: params.delivery_customer_street2,
        country: params.delivery_customer_country,
        city: params.delivery_customer_city,
        state: params.delivery_customer_state_name,
        customer: params.delivery_customer_name,
        phone: params.delivery_customer_phone,
        mobile: params.delivery_customer_mobile,
        zipcode: `${params.delivery_customer_zip}`.replace(/\s/g, ""),
        vat: params.delivery_customer_vat,
        company: params.delivery_customer_company_name,
        email: params.delivery_customer_email,
      };

      update.billing_address = {
        name: params.invoice_customer_name,
        address: params.invoice_customer_street,
        address2: params.invoice_customer_street2,
        country: params.invoice_customer_country,
        city: params.invoice_customer_city,
        state: params.invoice_customer_state_name,
        customer: params.invoice_customer_name,
        zipcode: `${params.invoice_customer_zip}`.replace(/\s/g, ""),
        vat: params.invoice_customer_vat,
        phone: params.invoice_customer_phone,
        mobile: params.invoice_customer_mobile,
        company: params.invoice_customer_company_name,
        email: params.invoice_customer_email,
      };
    }

    await Order.updateOne({ _id: orderUp._id }, { $set: update });
  }
};
