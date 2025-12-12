import React from 'react';
import { Customer, BrandingSettings } from '../types';

interface InvoiceLineItem {
    id: string;
    productName: string;
    quantity: number;
    salePrice: number;
    discount: number;
    invoiceNumber: string;
    orderDate: string;
}

interface InvoiceProps {
    orders: InvoiceLineItem[];
    customer: Customer;
    brandingSettings: BrandingSettings;
}

const Invoice: React.FC<InvoiceProps> = ({ orders, customer, brandingSettings }) => {
    // Safely calculate totals
    const subtotal = orders.reduce((sum, item) => {
        const qty = item.quantity || 0;
        const price = item.salePrice || 0;
        const discount = item.discount || 0;
        return sum + ((price - discount) * qty);
    }, 0);

    const tax = subtotal * 0.18;
    const grandTotal = subtotal + tax;

    const invoiceMeta = orders.length > 0 ? orders[0] : { invoiceNumber: '-', orderDate: '' };

    return (
        <div id="invoice-section-content" className="bg-white p-8 max-w-4xl mx-auto text-slate-800 font-sans">
            <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
                <div>
                    {/* ✅ CHANGED: Invoice → Invoice / Estimate */}
                    <h1 className="text-4xl font-bold text-slate-800 uppercase tracking-wide">Invoice / Estimate</h1>
                    <p className="text-slate-500 mt-1">#{invoiceMeta.invoiceNumber}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-bold text-brand-primary">{brandingSettings.companyName}</h2>
                    <p className="text-sm text-slate-500 whitespace-pre-line">{brandingSettings.companyAddress}</p>
                    {brandingSettings.customField && <p className="text-sm text-slate-500 mt-1 font-medium">{brandingSettings.customField}</p>}
                </div>
            </div>

            <div className="flex justify-between mb-8">
                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Bill To</h3>
                    <div className="text-sm font-medium text-slate-800">
                        <p className="text-lg">{customer.name}</p>
                        <p>{customer.address}</p>
                        <p>{customer.phone}</p>
                        <p>{customer.email}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="mb-2">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Invoice Date</h3>
                        <p className="text-sm font-medium">
                            {invoiceMeta.orderDate ? new Date(invoiceMeta.orderDate).toLocaleDateString() : 'N/A'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="mb-8">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="py-3 px-4 text-left font-semibold text-slate-600">Item</th>
                            <th className="py-3 px-4 text-right font-semibold text-slate-600">Qty</th>
                            <th className="py-3 px-4 text-right font-semibold text-slate-600">Rate</th>
                            <th className="py-3 px-4 text-right font-semibold text-slate-600">Disc.</th>
                            <th className="py-3 px-4 text-right font-semibold text-slate-600">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {orders.map((item, index) => {
                            const qty = item.quantity || 0;
                            const price = item.salePrice || 0;
                            const disc = item.discount || 0;
                            const lineTotal = (price - disc) * qty;
                            return (
                                <tr key={`${item.id}-${index}`}>
                                    <td className="py-3 px-4 text-slate-800">{item.productName || 'Item'}</td>
                                    <td className="py-3 px-4 text-right text-slate-600">{qty}</td>
                                    <td className="py-3 px-4 text-right text-slate-600">₹{price.toFixed(2)}</td>
                                    <td className="py-3 px-4 text-right text-slate-600">{disc > 0 ? `₹${disc}` : '-'}</td>
                                    <td className="py-3 px-4 text-right font-medium text-slate-800">₹{lineTotal.toFixed(2)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end mb-8">
                <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm text-slate-600">
                        <span>Subtotal</span>
                        <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600">
                        {/* ✅ CHANGED: Tax (18%) → Tax (GST 18%) */}
                        <span>Tax (GST 18%)</span>
                        <span>₹{tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-slate-800 border-t border-slate-200 pt-2 mt-2">
                        {/* ✅ CHANGED: Total → Estimated Total */}
                        <span>Estimated Total</span>
                        <span>₹{grandTotal.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className="border-t border-slate-200 pt-6 text-center">
                {/* ✅ CHANGED: Added estimate note */}
                <p className="text-sm text-slate-600 font-medium mb-2">This is an estimated quotation for your reference.</p>
                <p className="text-sm text-slate-500">{brandingSettings.footerNotes}</p>
                <p className="text-xs text-slate-400 mt-2">Thank you for your business!</p>
            </div>
        </div>
    );
};

export default Invoice;
 