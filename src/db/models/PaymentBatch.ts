import { Schema, model } from "mongoose";

export const payment_batch_type: any = {
    'outbound':  'Send Money',
    'inbound': 'Receive Money',
}

export enum PaymentBatchStatus {
  PAID = "paid",
  PROCESSING = "processing"
}

export enum PaymentBatchTypes {
  OUT = "outbound",//send money
  IN = "inbound"//receive money
}

export const payment_partner_type: any = {
    'customer': 'Customer',
    'supplier': 'Vendor',
}

export enum PaymentBatchPartnerTypes {
  CUSTOMER = "customer",
  SELLER = "seller"
}

export const PaymentBatchSchema = new Schema(
	{
    payment_id: { type: "Number", required: true, unique: true },
    name: {type: "String", required: true }, 
    type: {type: "String", enum: PaymentBatchTypes}, 
    partnerType: {type: "String", enum: PaymentBatchPartnerTypes}, 
    // partner_id: {type: Schema.Types.ObjectId, required: true, ref: "Vendor"},
    billings: [{ type: Schema.Types.ObjectId, required: true, ref: "VendorBilling" }],
    products: { type: "Number" },
    amount: { type: "Number" },
    date: { type: "Date", default: Date.now },
    memo: { type: "String" },
    status: { type: "String", enum: PaymentBatchStatus, default: PaymentBatchStatus.PROCESSING } 
  },
  { collection: "paymentbatches" }
);

export const PaymentBatch = model("paymentbatch", PaymentBatchSchema);

export const getNextPaymentId = async () => {
  const newId = await PaymentBatch.findOne().sort({ payment_id: -1 }).select("payment_id");
  return (newId.payment_id||0) + 1;
};
