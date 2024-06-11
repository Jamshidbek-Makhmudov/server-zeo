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
