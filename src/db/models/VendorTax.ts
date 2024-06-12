import { Schema, model, Document} from "mongoose";


export interface IVendorTax extends Document {
    tax_name: string;
    tax_percentage: number;
}

const VendorTaxSchema = new Schema<IVendorTax>(
	{
        tax_name: {type: Schema.Types.String, required: true, unique: true },  
        tax_percentage: {type: Schema.Types.Number, required: true, unique: true},
    },
    { collection: "vendortaxes" }

    );

    export const VendorTax = model("vendortax", VendorTaxSchema);
    