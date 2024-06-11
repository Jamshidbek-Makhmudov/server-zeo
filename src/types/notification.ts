export type FromUser = {
  userId: string;
  username: string;
  email: string;
};
export enum Type {
  ORDERS = "ORDERS",
  PRICE_AND_STOCK_UPDATES = "PRICE_AND_STOCK_UPDATES",
  INTEGRATED_PRODUCT = "INTEGRATED_PRODUCT",
  IMPORTED_PRODUCT = "IMPORTED_PRODUCT",
  BUYBOX = "BUYBOX",
  RANKING_ZEOOS = "RANKING_ZEOOS",
  DEFAULT_NOTIFICATION = "DEFAULT_NOTIFICATION",
}
export type AlertType = {
  platform: boolean;
  email: boolean;
  topbar: boolean;
  push: boolean;
  sms: boolean;
  popup: boolean;
};
export type Notification = {
  _id: string;

  // ISO Date
  created: string;
  user: string;
  fromUser: FromUser;

  alertType: AlertType;
  isClosable: boolean;
  isClosed: boolean;

  type: Type;

  title: string;
  lineText: string;
  url: string;
  data: string;

  wasRead: boolean;
  path: string;

  // ISO Date
  relevantUntil: string;
};
