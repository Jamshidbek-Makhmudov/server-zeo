export type PricingEvent = {
  _id: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountAmount: number;
  categories: string[];
  platforms: string[];
  vendors: string[];
  products: {
    sku: string;
    price?: number;
  }[];
  status: EventStatus;
  eventPeriod: {
    start: Date;
    end: Date;
    aborted?: Date;
  };
  eventResult: {
    goal: number;
    sold: number;
  };
  creator: any;
  type: EventType;
  isActive: boolean;
  created: Date;
};

export type EventProductSale = {
  sku: string;
  event: string;
  platform: string;
  order: string;
  soldAt: number;
  created: string;
};

export type StandingRule = {
  _id?: string;
  discountAmount: number;
  category: string;
  platforms: string[];
  product: string;
  isActive: boolean;
  created?: Date;
};

export enum EventStatus {
  SCHEDULED = "SCHEDULED",
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  ABORTED = "ABORTED",
}

export enum EventType {
  CUSTOM = "CUSTOM",
  AUTOMATIC = "AUTOMATIC",
}

export enum DiscountType {
  PERCENTAGE = "PERCENTAGE",
  VALUE = "VALUE",
}
