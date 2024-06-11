import { LogisticClass } from "./category";
import type { PaginatedRequest, PaginatedResponse } from "./pagination";

export type Product = {
  _id: string;
  name: string;
  sku: string;
  ean: string;
  image: string;
  scheme: string;
  category: string;
  categoryCode: string;
  integratedPlatformsCount: number;
  details?: { brand: string; "product-brand": string };
  brand?: string;
};

export type ProductQuery = {
  category: string;
  categoryCode: string;

  country: string;
  platform: string;

  brand: string;

  search: string;

  type: "integrated" | "non-integrated";
  allCatalog: boolean;
};

export type ProductRequest = Partial<ProductQuery> & PaginatedRequest;

export type ProductResponse = PaginatedResponse<Product>;

export type CreateProduct = {
  sku?:string;
  ean: string;
  name: string;
  description?: string;
  model: string;
  brand: string;
  category: string;
  logisticClass?: LogisticClass;
  images: string[];
  details?: any;
};

export type UnregisteredProduct = {
  _id: string;
  ean: string;
  isCreated: boolean;
  created: string;

  name?: string;
  sku?: string;
  image?: string;
};

export type UnregisteredProductResponse =
  PaginatedResponse<UnregisteredProduct>;
