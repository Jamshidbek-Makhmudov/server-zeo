import { Category } from "./category";

interface IBatchList {
  _id: string;
  name: string;
  products: [
    {
      sku: string;
    }
  ];
  marketplaces: [
    {
      marketplace: string;
      products: [
        {
          sku: string;
          error: string;
          uploaded: boolean;
        }
      ];
      status: BatchListStatus;
    }
  ];
  user: string;
  status: BatchListStatus;
  updated: string;
  created: string;
}

interface ICategoryField {
  _id: string;
  marketplaceName: string;
  name: string;
  scheme: string;
  created: string;
  rates: { country: string; rate: number }[];
  categoryId: string | number;
  category: Category | string;
}

interface ICategoryOdoo {
  _id: string;
  created: Date;
  categoryId: number;
  parentCategoryId: number;
  name: string;
  parentCategoryName: number;
  titleSingular: string;
  titlePlural: string;
  level: number;
  url: string;
  isLeaf: boolean;
  fixedFee: number;
  shippingCategory: string;
  variableFee: number;
  vat: number;
}

interface ISchemeCategoryItem {
  _id: string;
  value: string;
  title: string;
  label: string;
  description?: string;
  categoryField: string;
  rule?: string | Rule;
  created: string;
}

interface Rule {
  _id: string;
  created: string;
  name: string;
  list: RuleItem[];
}

interface RuleItem {
  type: RuleType;
  orientation?: RuleOrientation;
  content?: string;
  from?: string;
  to?: string;
}

interface ILogisticPartner {
  _id: string;
  partnerName: string;
  country: string;
  contactName: string;
  phone: string;
  email: string;
  logo: string;
  warehouses: number;
  isActive: boolean;
  created: Date;
}

interface ILogisticServices {
  _id: string;
  service: string;
  amount: string;
  unit: string;
  note: string;
}

interface ILogisticWarehouse {
  _id: string;
  warehouseName: string;
  logisticPartner: ILogisticPartner;
  country: string;
  contactName: string;
  phone: string;
  email: string;
  postalCode: string;
  address: string;
  isActive: boolean;
  fulfillmentCosts: ILogisticServices[];
  otherServices: ILogisticServices[];
  created: Date;
}

interface IDemoRequestInteraction {
  message: string;
  messageDate: Date;
}

interface IZeoosDemoRequest {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  phone: string;
  country: string;
  message: string;
  planName: string;
  interactions: IDemoRequestInteraction[];
  status: DemoRequestStatus;
  actionDate: Date;
  created: Date;
}

export type {
  IBatchList,
  ICategoryField,
  ICategoryOdoo,
  ISchemeCategoryItem,
  Rule,
  RuleItem,
  ILogisticPartner,
  ILogisticWarehouse,
  ILogisticServices,
  IZeoosDemoRequest,
};

export enum RuleType {
  ADD_CONTENT = "ADD_CONTENT",
  CAPITALIZE = "CAPITALIZE",
  LOWERCASE = "LOWERCASE",
  UPPERCASE = "UPPERCASE",
  REPLACE = "REPLACE",
  MAKE_ARRAY = "MAKE_ARRAY",
  SPLIT = "SPLIT",
}

export enum RuleOrientation {
  START = "START",
  END = "END",
}

export enum BatchListStatus {
  WAITING = "WAITING",
  RUNNING = "RUNNING",
  FINISHED = "FINISHED",
  ERROR = "ERROR",
}

export enum DemoRequestStatus {
  NEW = "NEW",
  ARCHIVED = "ARCHIVED",
  ONBOARDING = "ONBOARDING",
}

export { STOCK_CONDITIONS } from "./inventory";
export type { StockCondition } from "./inventory";

export type {
  MarketplaceCategory,
  MarketplaceCategoryAttribute,
} from "./marketplaceCategory";

export type {
  PricingEvent,
  StandingRule,
  EventProductSale,
} from "./pricingEvent";

export { EventStatus, EventType, DiscountType } from "./pricingEvent";

export type { ServiceToken } from "./serviceToken";
export type { Notification } from "./notification";
export { Type } from "./notification";
export type { Ticket, TicketMessage } from "./ticket";
export { TicketStatus } from "./ticket";
