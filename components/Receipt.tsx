import React from 'react';
import { Customer, BrandingSettings } from '../types';

// Define the shape of the data passed from Customers.tsx
interface InvoiceLineItem {
    id: string;
    productName: string;
    quantity: number;
    salePrice: number;
    discount: number;
    invoiceNumber: string;
    orderDate: string;
}

interface ReceiptProps {
    orders: InvoiceLineItem[];
    customer: Customer;
    brandingSettings: BrandingSettings;
}

const Receipt: React.FC<ReceiptProps> = ({ orders, customer, brandingSettings }) => {
    // 1. Safe Calculation of Totals (Prevents NaN)
    const subtotal = orders.reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.salePrice) || 0;
        const discount = Number(item.discount) || 0;
        const itemTotal = (price - discount) * qty;
        return sum + itemTotal;
    }, 0);

    const tax = subtotal * 0.18; // 18% Tax
    const grandTotal = subtotal + tax;

    // 2. Safe Meta Data Extraction
    const invoiceMeta = orders.length > 0 ? orders[0] : { invoiceNumber: '-', orderDate: '' };
    const receiptNumber = invoiceMeta.invoiceNumber ? invoiceMeta.invoiceNumber.replace('INV', 'RCPT') : 'RCPT-####';
    const displayDate = invoiceMeta.orderDate ? new Date(invoiceMeta.orderDate).toLocaleDateString() : new Date().toLocaleDateString();

    return (
        <div id="receipt-section-content" className="bg-white p-8 max-w-xl mx-auto text-slate-800 font-mono border-2 border-dashed border-slate-300">
            {/* Header */}
            <div className="text-center mb-6 border-b-2 border-slate-200 pb-4">
                <h2 className="text-2xl font-bold uppercase tracking-widest text-slate-900">{brandingSettings.companyName}</h2>
                <p className="text-sm text-slate-500 mt-1">{brandingSettings.companyAddress}</p>
                {brandingSettings.customField && (
                    <p className="text-xs text-slate-400 mt-1">{brandingSettings.customField}</p>
                )}
            </div>

            {/* Receipt Info */}
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 uppercase">Payment Receipt</h1>
                    <p className="text-sm text-slate-500">#{receiptNumber}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold text-slate-700">Date: {displayDate}</p>
                    <p className="text-xs text-green-600 font-bold uppercase border border-green-600 px-2 py-0.5 rounded mt-1 inline-block">
                        PAID
                    </p>
                </div>
            </div>

            {/* Received From */}
            <div className="mb-6 p-4 bg-slate-50 rounded">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Received From</p>
                <p className="font-bold text-lg text-slate-800">{customer.name}</p>
                <p className="text-sm text-slate-600">{customer.phone}</p>
            </div>

            {/* Line Items */}
            <div className="mb-6">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-300">
                            <th className="py-2 text-left">Description</th>
                            <th className="py-2 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {orders.map((item, index) => {
                            const qty = Number(item.quantity) || 0;
                            const price = Number(item.salePrice) || 0;
                            const discount = Number(item.discount) || 0;
                            const lineTotal = (price - discount) * qty;

                            return (
                                <tr key={`${item.id}-${index}`}>
                                    <td className="py-2">
                                        <div className="font-medium">{item.productName || 'Item'}</div>
                                        <div className="text-xs text-slate-500">
                                            Qty: {qty} x ₹{price.toFixed(2)}
                                            {discount > 0 && ` (Disc: ₹${discount})`}
                                        </div>
                                    </td>
                                    <td className="py-2 text-right font-medium">₹{lineTotal.toFixed(2)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Summary */}
            <div className="border-t-2 border-slate-800 pt-4 mb-8">
                <div className="flex justify-between mb-1">
                    <span className="text-sm">Subtotal</span>
                    <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-2">
                    <span className="text-sm">Tax (18%)</span>
                    <span className="font-medium">₹{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold">
                    <span>Total Paid</span>
                    <span>₹{grandTotal.toFixed(2)}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-slate-400">
                <p>{brandingSettings.footerNotes}</p>
                <p className="mt-1">Generated electronically.</p>
            </div>
        </div>
    );
};

export default Receipt; 