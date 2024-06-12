import { Schema, model } from "mongoose";
import { Order } from "./Order";
import { Billing } from "./VendorBilling";
import { round } from "lodash";



export enum SHIPMENT_STATUS {
    OPEN = 'open',
    CLOSED = 'closed'
}

export enum SHIPMENT_PAYMENT_STATUS {
    OPEN = 'open',
    CLOSED = 'closed'
}

export enum BILL_PAYMENT {
    NOTPAID = 'not_paid', 
    PARTIAL = 'partial',
    PAID = 'paid',
    INPAYMENT = 'in_payment'
}

export enum OPERATION_TYPE {
    dropshipping = 'dropshipping',
    fulfillment = 'fulfillment'
}



export interface ShipmentObject extends Document {
    shipment_id: number,
    shipment_name: string,
    operation_type: string,
    partner_id: Schema.Types.ObjectId,
    total_number_of_items_sold:  number,
    total_number_of_items_purchased: number,
    number_of_related_sale_orders: number,
    related_sale_order?: number,
    valor_recebido: number,
    shipment_payment_status: string,
    shipment_status: string, 
    number_of_billings: number,
    count_bills: number,
    bill_payment_state: string,
    bill_amount_residual: number,
    bill_amount_total: number,


    vendor_id: number,
    currency_id: string,
    //Schema.Types.ObjectId, // to add
    date_approve: Date,  
    date_planned: Date,  

    amount_untaxed: number,  
    amount_tax: number,  
    amount_total: number, 

    shipment_lines: [
        {
            //'product_id': line.product_id.default_code,
            //'name': line.product_id.name,

            //product_id: {type: Schema.Types.ObjectId, required: true, ref: "MarketplaceProduct"},
            sku: string, // sku how defined in other modules 
            name: string, 
            product_qty: number,
            valor_recebido_per_product: number, 
            qty_received: number, 
            qty_invoived: number,
            qty_sold: number,
            qty_available: number,

            product_uom: string,
            price_unit: number, 
            first_discount: number, 
            second_discount: number, 
            tax: number,
            price_subtotal: number, 

    }]   

}


export const ShipmentSchema = new Schema(
	{
        shipment_id: { type: "Number", required: true },
        shipment_name: { type: "String", required: true },
        operation_type: { type: "String", required: true, enum: OPERATION_TYPE },

        total_number_of_items_sold:  { type: "Number"},
        total_number_of_items_purchased: { type: "Number"},
        number_of_related_sale_orders: { type: "Number"},
        related_sale_order: { type: "Number"},
        valor_recebido: { type: "Number"},
        shipment_payment_status: { type: "String", enum: SHIPMENT_PAYMENT_STATUS, default: SHIPMENT_PAYMENT_STATUS.OPEN },
        shipment_status: { type: "String", enum: SHIPMENT_STATUS, default: SHIPMENT_STATUS.OPEN }, 
        number_of_billings: { type: "Number"},
       
        count_bills: { type: "Number", default: 0},
        bill_payment_state: { type: "String", enum: BILL_PAYMENT, default: BILL_PAYMENT.NOTPAID },
        bill_amount_residual: { type: "Number", default: 0.0},
        bill_amount_total: { type: "Number", default: 0.0},

        vendor_id: { type: "Number"},
        currency_id: {type: "String"},
        date_approve: { type: "Date"},  
        date_planned: { type: "Date"},  

        amount_untaxed: { type: "Number"},  
        amount_tax: { type: "Number"},  
        amount_total: { type: "Number"}, 
 
        shipment_lines: [
            {
                //'product_id': line.product_id.default_code,
                //'name': line.product_id.name,
                //product_id: {type: Schema.Types.ObjectId, required: true, ref: "MarketplaceProduct"},
                sku: {type: Schema.Types.String, required: true}, // sku how defined in other modules 
                name: { type: "String", required: true }, 
                product_qty: { type: "Number"},
                valor_recebido_per_product: { type: "Number"}, 
                qty_received: { type: "Number"}, 
                qty_invoived: { type: "Number"},
                qty_sold: {type: "Number"},
                qty_available: {type: "Number"},
                product_uom: { type: "String" },
                    //Schema.Types.ObjectId, required: true, ref: "productuom"}, 
                price_unit: { type: "Number"}, 
                first_discount: { type: "Number"}, 
                second_discount: { type: "Number"}, 
        
                tax: { type: "Number" },
                price_subtotal: { type: "Number"}, 

        }]       
    },
    { collection: "shipments" }
);

export const Shipment = model("Shipment", ShipmentSchema);

export const updateShipmentLineQtys_old = async (name: string, sku: string, qty: number) => {

    // update number_of_related_sale_orders at level of shipment
    const number_of_related_sale_orders = await Order.countDocuments({
        "products.shipment_numbers": name
    });

    await Shipment.updateOne(
		{ shipment_name: name,},
		{ number_of_related_sale_orders: number_of_related_sale_orders }
	);

    //update on line: qty_sold, qty_available
    let shipment, shipment_lines;
    shipment = await Shipment.findOne({ shipment_name: name });
    shipment_lines = shipment.shipment_lines;
    for (const line of shipment_lines) {
        if (line.sku === sku){
            line.qty_sold += qty;
            line.qty_available -= qty;
            break;
        }
    }

    //update on shipping level: total_number_of_items_sold 
    let sold_total;
    for (const line of shipment_lines) {
        sold_total += line.qty_sold
    }

    await Shipment.updateOne(
        { shipment_name: name,},
        { total_number_of_items_sold:  sold_total}
        );
    
    //update at level of line: valor_recebido_per_product.
    //Note: Billings should be created before we update the shipment lines. 

   
    const billings = await Billing.find({state: 'billing', shipment_id : name, "billing_lines.sku": sku, 
    payment_state: 'In Payment' || 'paid'})

    for (const line of shipment_lines){
        for (const billing of billings){
            for (const linha of billing.billing_lines){
                if (linha){
                    if (linha.sku === line.sku){
                        if (linha.price_subtotal > 0){
                            line.valor_recebido_per_product += linha.price_subtotal + linha.price_tax
                        }
                    }
                }
            }
        }
    }

    await Shipment.updateOne(
        { shipment_name: name,},
        { shipment_lines: shipment.shipment_lines }
        );


    // update at level of shipment: shipment_status
    let shipment_status = 'closed'
    for (const line of shipment_lines){
        if (line.qty_sold < line.qty_received){}
            shipment_status = 'open'
    }

    await Shipment.updateOne(
        { shipment_name: name,},
        { shipment_status: shipment_status }
        );      

    // update at level of shipment: shipment_payment_status
    await Billing.find({state: 'billing', shipment_id : name, "billing_lines.sku": sku, 
    payment_state: 'In Payment' || 'paid'})
    
    let Total_billed = 0.0;
    let Total_purchased = 0.0;
    let payment_status = 'open';
    for (const billing of billings){
        for (const line of billing.billing_lines){
            Total_billed += line.product_uom_qty;
        }
    }
    for (const shipment_line of shipment_lines){
        Total_purchased += shipment_line.product_qty
    }

    if (Total_billed != Total_purchased){
        payment_status = 'open';
    }
    else{
        payment_status = 'closed';
    }

    await Shipment.updateOne(
        { shipment_name: name,},
        { shipment_payment_status: payment_status}
        );  

    // update at level of shipment: number_of_billings
    const number_of_billings = await Billing.countDocuments({state: 'billing', shipment_id : name})
    await Shipment.updateOne(
        { shipment_name: name,},
            { number_of_billings: number_of_billings }
        );


}

export const updateShipmentLineQtys = async (id: number, sku: string, qty: number) => {
    const shipment = await Shipment.findOne({ shipment_id: id });
    const lineIndex = shipment.shipment_lines.findIndex((sl: any) => sl.sku === sku);

    if (lineIndex >= 0) {
        //uptades at line level
        shipment.shipment_lines[lineIndex].qty_sold += qty;
        shipment.shipment_lines[lineIndex].qty_available -= qty;
        shipment.shipment_lines[lineIndex].valor_recebido_per_product = 
            await calculateValuePerProduct(id, sku);

        //updates at shipment level
        shipment.total_number_of_items_sold += qty;
        shipment.number_of_related_sale_orders = 
            await Order.countDocuments({ "products.shipment_numbers": id });
        shipment.shipment_status = 
            shipment.total_number_of_items_sold < shipment.total_number_of_items_purchased
                ? SHIPMENT_STATUS.OPEN
                : SHIPMENT_STATUS.CLOSED;
        shipment.number_of_billings = await Billing.countDocuments({ shipment_number : id });
        shipment.valor_recebido = shipment.shipment_lines.reduce(
            (total: number, sl: any) => total + (sl.qty_sold * sl.price_unit * ((sl.tax + 100) / 100)),
            0
        );

        // console.log(shipment);
        await shipment.save();
    }
}

const calculateValuePerProduct = async (shipment: number, sku: string) => {
    const billings = await Billing.find({
        shipment_number: shipment,
        "billing_lines.sku": sku
    }).select('billing_lines');

    let units_sold = 0;
    let total_received = 0;

    if (billings.length) {
        for (const billing of billings) {
            billing.billing_lines.filter((bl: any) => bl.sku === sku)
                .map((bl: any) => {
                    units_sold += bl.product_uom_qty;
                    total_received += bl.price_breakdown.pvpFinal * bl.product_uom_qty;
                });
        }
        
        return round(total_received/units_sold, 3);
    }

    return undefined;
}
