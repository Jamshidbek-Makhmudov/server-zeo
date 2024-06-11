export type MarketplaceCategory = {
  name: string;
  attributes: MarketplaceCategoryAttribute[];
};

export type MarketplaceCategoryAttribute = {
  name: string;
  required: boolean;
  title: string;
  description: string;
  tip: string;
  type: string;
  examples: string[];
  minItems: number;
  minUniqueItems: number;
  maxUniqueItems: number;
};
