export type Category = {
  label: string;
  _id: string;
  code: string;
  name: string;
};

export type Rate = Record<string, number>;

export type PlatformRate = {
  categoryId: string;
  code: string;
  label: string;
  name: string;
  level: number;
  marketplaceIntegrationId: string;
  platform: string;
  rate: Rate;
};

export type TaxRate = {
  categoryId: string;
  code: string;
  name: string;
  level: number;
  countryId: string;
  rate: Rate;
};

export const LOGISTIC_CLASSES = [
  "Small & Non-Heavy",
  "Mid-Heavy",
  "Heavy",
] as const;
export type LogisticClass = typeof LOGISTIC_CLASSES[number];
