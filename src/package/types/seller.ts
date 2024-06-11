export type ProductImportReport = {
  _id: string;
  created: string;
  sellerId: number;
  user: string;
  seller: string;
  wasRead: boolean;

  platformCounter: {
    [key: string]: {
      productsCount: number;
      marketplaceName: string;
    };
  };
  total: number;
  integrated: number;
  nonIntegrated: number;
  unregistered: number;

  competitive: number;
  nonCompetitive: number;
  buyboxWinner: number;
  buyboxPlatforms?: {
    zeoosName: string;
    buyboxWinner: number;
    total: number;
  }[];
  errorMessages: string[];
  offerImport?: any;
};

export type OfferImportReport = {
  _id: string;
  created: string;
  sellerId: number;
  user: string;
  seller: string;
  wasRead: boolean;

  platformCounter: {
    [key: string]: {
      offers: number,
      competitive: number,
      nonCompetitive: number
    };
  };
  offers: number;
  
  competitive: number;
  nonCompetitive: number;
  buyboxWinner: number;
  buyboxPlatforms?: {
    zeoosName: string;
    buyboxWinner: number;
    total: number;
  }[];
  errorMessages: string[];
  uploadFile?: string;
};
