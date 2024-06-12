import { Schema, model } from "mongoose";

export interface BomObject extends Document {
    bom_id: number,
    sku: string, 

    bom_lines: [
        {
            component_sku: string, 
            component_qty: number,
    }]
}

export const BillOfMaterialsSchema = new Schema<BomObject>(
	{
        bom_id: { type: "Number", required: true },
        sku: {type: Schema.Types.String, required: true}, 

        bom_lines: [
            {
                component_sku: {type: Schema.Types.String, required: true}, 
                component_qty: { type: "Number"},
        }]
    },  

     {collection: "BOMs" }
    );

    export const BOM = model("BOM", BillOfMaterialsSchema);     
    
