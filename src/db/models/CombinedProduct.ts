import { Schema, model } from "mongoose";

const combinedProduct = new Schema({}, { collection: "combinedProducts", strict: false });

const productReport = new Schema({
    created: { type: "Date", required: true, default: Date.now },
    userId: { type: "String", required: true },
    reportCount: { type: "Number", required: true, default: 0 },
}, { collection: "combinedProductReports" });

const productDetailsPerMarketplace = new Schema({
    created: { type: "Date", required: true, default: Date.now },
    sku: { type: "String", required: true },
    zeoosName: { type: "String", required: true },
    additionalPricePerCountry: { type: "Number", required: true, default: 0 },
}, { collection: "productDetailsPerMarketplace" });
productDetailsPerMarketplace.index({ sku: 1, zeoosName: 1 }, { unique: true });

export const ProductReport = model("ProductReport", productReport);
export const CombinedProduct = model("CombinedProduct", combinedProduct);
export const ProductDetailsPerMarketplace = model("ProductDetailsPerMarketplace", productDetailsPerMarketplace);

export async function getLatestReport(user: any) {
    return (await ProductReport.find({ userId: user._id }).sort({ created: -1 }).limit(1))[0] as any;
}

export async function getLatestProduct(sku: string) {
    return (await CombinedProduct.findOne({ sku }).sort({ _id: 'desc' }) as any)?._doc;
}

export async function createNewReport(user: any) {
    const latestReport = await getLatestReport(user);
    const newCount = latestReport?.reportCount ? latestReport?.reportCount + 1 : 0;

    const newReport = new ProductReport({
        userId: user._id,
        reportCount: newCount
    });

    await newReport.save();
    return newReport;
}

const manualProduct = new Schema({
    zeoosName: { type: "String" },
    marketplaceName: { type: "String" },
    compareAtPrice: { type: "Number" },
    extraId: { type: "String" },
    id: { type: "String" },
    price: { type: "String", required: true },
    sku: { type: "String", required: true },
    stock: { type: "Number", required: true },
}, { collection: "manualProducts" });
manualProduct.index({ sku: 1, zeoosName: 1 }, { unique: true });

export const ManualProduct = model("ManualProduct", manualProduct);
