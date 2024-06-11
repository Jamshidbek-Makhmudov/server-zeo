import { StockCondition } from "./inventory";
import type { PaginatedRequest, PaginatedResponse } from "./pagination";

export type Price = {
  cost?: number;
  transport?: number;
  paymentCosts?: number;
  costVAT?: number;
  costVATValue?: number;
  purchasePrice?: number;
  zeoosRate?: number;
  zeoosValue?: number;
  pvpBase?: number;
  platformValue?: number;
  platformRate?: number;
  productVATValue?: number;
  productVAT?: number;
  pvpFinal?: number;
  freight?: number;
  freightName?: string;
  freightAdjust?: number;
  freightVAT?: number;
  freightVATValue?: number;
  freightPlatform?: number;
  freightFinal?: number;
};

export type Offer = {
  _id: string;
  ean: string;
  sku?: string;
  sellerSku?: string;
  seller: string;
  platform: string;
  product: string;
  platformProduct: string;
  catalogProduct: string;
  deliveryType?: string;
  logisticClass?: string;
  stock: number;
  pricingType: string;
  price: Price;
  active: boolean;
  ranking: number;
  winSince?: Date;
  winUntil?: Date;
  report?: string;
  created: Date;
};

export type OfferProduct = {
  stock: number;
  price: Price;
  pricingType: string;
  logisticClass: string;
  active: boolean;
  winSince: string;
  winUntil: string;
  ranking: number;

  seller: any;

  name: string;
  sku: string;
  ean: string;
  image: string;
  productId: string;
  integratedPlatformsCount: number;

  platform: string;
  platformId: string;
};

export type OfferGroup = {
  _id: string;
  name: string;
  sku: string;
  ean: string;
  image: string;
  integratedPlatformsCount: number;

  offers?: OfferProduct[];
};

export type OfferQuery = {
  category: string;
  categoryCode: string;

  country: string;
  platform: string;
  brand: string;

  search: string;
  seller: string;

  stock?: StockCondition;

  type: "all" | "without-price";
};

export type OfferRequest = Partial<OfferQuery> & PaginatedRequest;

export type OfferResponse = PaginatedResponse<OfferGroup>;

export type PlatformOfferStat = {
  _id: string;
  name: string;
  offersCount: number;
  price?: Price;
  stock?: number;
  ranking?: number;
  active?: boolean;
  integrated: boolean;
};

export type ModalOffer = {
  name: string;
  ean: string;
  sku: string;
  image: string;
  platformId: string;
  seller?: string;
  price?: Price;
};

export type SellerOffer = {
  ean: string;
  sku: string;
  stock: number;
  price: Price;
  pricingType: string;
  logisticClass: string;
  active: boolean;
  winSince: string;
  winUntil: string;
  ranking: number;

  seller: string;
  sellerName: string;

  platform: string;
  platformId: string;
};
