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
    const isModern = brandingSettings.template === 'modern';

    return (
        <div
            id="invoice-section-content"
            className={`bg-white p-8 max-w-4xl mx-auto text-slate-800 font-sans ${isModern ? '' : 'grayscale'}`}
        >
            <div className={`flex justify-between items-start border-b ${isModern ? 'border-brand-primary pb-6 mb-6' : 'border-slate-800 pb-4 mb-4'}`}>
                <div>
                    <h1 className={`text-4xl font-bold uppercase tracking-wide ${isModern ? 'text-brand-primary' : 'text-slate-900'}`}>Invoice</h1>
                    <p className="text-slate-500 mt-1">#{invoiceMeta.invoiceNumber}</p>
                </div>
                <div className="text-right">
                    <h2 className={`text-xl font-bold ${isModern ? 'text-slate-800' : 'text-black'}`}>{brandingSettings.companyName}</h2>
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
                        <tr className={`${isModern ? 'bg-slate-50 border-b border-slate-200' : 'border-b-2 border-slate-800'}`}>
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

            <div className="flex justify-between items-end mb-8">
                {/* QR Code Section */}
                <div>
                    {brandingSettings.upiId && (
                        <div className="text-center">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Scan to Pay</p>
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=upi://pay?pa=${brandingSettings.upiId}&pn=${encodeURIComponent(brandingSettings.companyName)}&am=${grandTotal.toFixed(2)}&tn=Invoice${invoiceMeta.invoiceNumber}`}
                                alt="UPI QR Code"
                                className="w-24 h-24 border border-slate-200 p-1 rounded"
                            />
                            <p className="text-xs text-slate-500 mt-1">UPI: {brandingSettings.upiId}</p>
                        </div>
                    )}
                </div>

                <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm text-slate-600">
                        <span>Subtotal</span>
                        <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600">
                        <span>Tax (GST 18%)</span>
                        <span>₹{tax.toFixed(2)}</span>
                    </div>
                    <div className={`flex justify-between text-lg font-bold text-slate-800 border-t pt-2 mt-2 ${isModern ? 'border-slate-200' : 'border-slate-800'}`}>
                        <span>Total Amount</span>
                        <span>₹{grandTotal.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className={`border-t pt-6 text-center ${isModern ? 'border-slate-200' : 'border-slate-800'}`}>
                <p className="text-sm text-slate-500">{brandingSettings.footerNotes}</p>
                <p className="text-xs text-slate-400 mt-2">Thank you for your business!</p>
            </div>
        </div>
    );
};

export default Invoice;
