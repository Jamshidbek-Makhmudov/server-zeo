export type StripeProduct = {
  stripeId: string;
  name: string;
  description: string;
  prices: StripePrice[];
  created: string;
};

export type Interval = "month" | "year";

export type StripePrice = {
  stripeId: string;
  price: number;
  interval: Interval;
  currency: string;
};
