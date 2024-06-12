import { Schema, model, Document} from "mongoose";


export interface ICurrency extends Document {
    currency_name: string;
}

const CurrencySchema = new Schema<ICurrency>(
	{
        currency_name: {type: Schema.Types.String, required: true, unique: true },  
    },
    { collection: "currencies" }

    );

    export const Currency = model("currency", CurrencySchema);
