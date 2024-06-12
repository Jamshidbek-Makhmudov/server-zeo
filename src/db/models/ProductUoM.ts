import { Schema, model, Document} from "mongoose";


export interface IProductUoM extends Document {
    uom_name: string;
}

const ProductUoMSchema = new Schema<IProductUoM>(
	{
        uom_name: {type: Schema.Types.String, required: true, unique: true },
        
    },
    { collection: "productuoms" }
    );


    export const ProductUoM = model("productuom", ProductUoMSchema);
    