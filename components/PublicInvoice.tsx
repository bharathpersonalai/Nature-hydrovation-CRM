import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { Customer, BrandingSettings, Order } from '../types';

interface InvoiceLineItem {
    id: string;
    productName: string;
    quantity: number;
    salePrice: number;
    discount: number;
    invoiceNumber: string;
    orderDate: string;
}

interface PublicInvoiceData {
    customer: Customer;
    orders: InvoiceLineItem[];
    brandingSettings: BrandingSettings;
    paymentStatus: 'Paid' | 'Unpaid';
    serviceFee?: number;
}

declare var html2pdf: any;

const PublicInvoice: React.FC = () => {

    const [invoiceData, setInvoiceData] = useState<PublicInvoiceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handleDownloadPdf = () => {
        const element = document.getElementById('invoice-card');
        if (!element || !invoiceData) return;

        const invoiceNumber = invoiceData.orders.length > 0 ? invoiceData.orders[0].invoiceNumber : 'Invoice';

        const opt = {
            margin: 0.5,
            filename: `Invoice-${invoiceNumber}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        html2pdf().from(element).set(opt).save();
    };


    // Get invoice number from URL
    const getInvoiceNumberFromUrl = (): string | null => {
        const path = window.location.pathname;
        const match = path.match(/\/invoice\/(.+)/);
        return match ? decodeURIComponent(match[1]) : null;
    };

    useEffect(() => {
        const loadInvoiceData = async () => {

            const invoiceNumber = getInvoiceNumberFromUrl();

            if (!invoiceNumber) {
                setError('Invalid invoice link');
                setLoading(false);
                return;
            }

            try {
                // Fetch orders - try shareToken first, then fallback to invoiceNumber
                const ordersRef = collection(db, 'orders');
                let q = query(ordersRef, where('shareToken', '==', invoiceNumber));
                let ordersSnapshot = await getDocs(q);

                if (ordersSnapshot.empty) {
                    // Fallback for old links or direct invoice number access
                    q = query(ordersRef, where('invoiceNumber', '==', invoiceNumber));
                    ordersSnapshot = await getDocs(q);
                }

                if (ordersSnapshot.empty) {
                    setError('Invoice not found');
                    setLoading(false);
                    return;
                }

                const orders: any[] = [];
                let customerId = '';
                let paymentStatus: 'Paid' | 'Unpaid' = 'Unpaid';
                let serviceFee = 0;

                ordersSnapshot.forEach((doc) => {
                    const orderData = doc.data();
                    customerId = orderData.customerId;
                    paymentStatus = orderData.paymentStatus || 'Unpaid';
                    serviceFee = orderData.serviceFee || 0;

                    // Handle multi-item orders
                    if (Array.isArray(orderData.items) && orderData.items.length > 0) {
                        orderData.items.forEach((item: any, idx: number) => {
                            orders.push({
                                id: `${doc.id}_${idx}`,
                                productName: item.productName || item.name || 'Item',
                                quantity: Number(item.quantity || 0),
                                salePrice: Number(item.salePrice || item.price || 0),
                                discount: Number(item.discount || 0),
                                invoiceNumber: orderData.invoiceNumber,
                                orderDate: orderData.orderDate,
                            });
                        });
                    } else {
                        // Single item order
                        orders.push({
                            id: doc.id,
                            productName: orderData.productName || 'Product',
                            quantity: Number(orderData.quantity || 0),
                            salePrice: Number(orderData.salePrice || 0),
                            discount: Number(orderData.discount || 0),
                            invoiceNumber: orderData.invoiceNumber,
                            orderDate: orderData.orderDate,
                        });
                    }
                });

                // Fetch customer
                const customerDoc = await getDoc(doc(db, 'customers', customerId));
                if (!customerDoc.exists()) {
                    setError('Customer not found');
                    setLoading(false);
                    return;
                }
                const customer = { id: customerDoc.id, ...customerDoc.data() } as Customer;

                // Fetch branding settings
                const brandingDoc = await getDoc(doc(db, 'settings', 'branding'));
                const brandingSettings: BrandingSettings = brandingDoc.exists()
                    ? brandingDoc.data() as BrandingSettings
                    : {
                        companyName: 'Nature Hydrovation',
                        companyAddress: '',
                        companyLogo: '',
                        brandColor: '#0284c7',
                        customField: '',
                        footerNotes: 'Thank you for your business!'
                    };

                setInvoiceData({
                    customer,
                    orders,
                    brandingSettings,
                    paymentStatus,
                    serviceFee
                });
            } catch (err) {
                console.error('Error loading invoice:', err);
                setError('Failed to load invoice');
            } finally {
                setLoading(false);
            }
        };

        loadInvoiceData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !invoiceData) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
                    <div className="text-6xl mb-4">📄</div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Invoice Not Found</h1>
                    <p className="text-slate-500">{error || 'The invoice you are looking for does not exist or has been removed.'}</p>
                </div>
            </div>
        );
    }

    const { customer, orders, brandingSettings, paymentStatus, serviceFee } = invoiceData;
    const invoiceMeta = orders.length > 0 ? orders[0] : { invoiceNumber: '-', orderDate: '' };

    // Calculate totals
    const subtotal = orders.reduce((sum, item) => {
        const qty = item.quantity || 0;
        const price = item.salePrice || 0;
        const discount = item.discount || 0;
        return sum + ((price - discount) * qty);
    }, 0);

    const totalServiceFee = serviceFee || 0;
    const taxableAmount = subtotal + totalServiceFee;
    const tax = taxableAmount * 0.18;
    const grandTotal = taxableAmount + tax;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="flex justify-end mb-4">
                    <button
                        onClick={handleDownloadPdf}
                        className="flex items-center gap-2 bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-slate-800 transition-transform hover:scale-105 active:scale-95"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Download PDF
                    </button>
                </div>

                {/* Status Badge */}
                <div className="flex justify-center mb-4">
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold ${paymentStatus === 'Paid'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                        }`}>
                        {paymentStatus === 'Paid' ? '✓ Paid' : '⏳ Payment Pending'}
                    </span>
                </div>

                {/* Invoice Card */}
                <div id="invoice-card" className="bg-white rounded-xl shadow-xl overflow-hidden">

                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-bold">{brandingSettings.companyName}</h1>
                                <p className="text-blue-100 text-sm mt-1 whitespace-pre-line">{brandingSettings.companyAddress}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-blue-100 text-sm">Invoice</p>
                                <p className="font-bold text-lg">#{invoiceMeta.invoiceNumber}</p>
                            </div>
                        </div>
                    </div>

                    {/* Customer & Date */}
                    <div className="p-6 border-b border-slate-100">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Bill To</p>
                                <p className="font-semibold text-slate-800">{customer.name}</p>
                                <p className="text-sm text-slate-500">{customer.phone}</p>
                                {customer.address && <p className="text-sm text-slate-500">{customer.address}</p>}
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Date</p>
                                <p className="text-sm text-slate-600">
                                    {invoiceMeta.orderDate ? new Date(invoiceMeta.orderDate).toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    }) : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="p-6">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="py-2 text-left font-semibold text-slate-600">Item</th>
                                    <th className="py-2 text-right font-semibold text-slate-600">Qty</th>
                                    <th className="py-2 text-right font-semibold text-slate-600">Rate</th>
                                    <th className="py-2 text-right font-semibold text-slate-600">Amount</th>
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
                                            <td className="py-3 text-slate-800">
                                                {item.productName}
                                                {disc > 0 && <span className="text-xs text-green-600 ml-2">(-₹{disc}/unit)</span>}
                                            </td>
                                            <td className="py-3 text-right text-slate-600">{qty}</td>
                                            <td className="py-3 text-right text-slate-600">₹{price.toFixed(0)}</td>
                                            <td className="py-3 text-right font-medium text-slate-800">₹{lineTotal.toFixed(0)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="bg-slate-50 p-6">
                        <div className="max-w-xs ml-auto space-y-2">
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>Subtotal</span>
                                <span>₹{subtotal.toFixed(2)}</span>
                            </div>
                            {totalServiceFee > 0 && (
                                <div className="flex justify-between text-sm text-slate-600">
                                    <span>Service Fee</span>
                                    <span>₹{totalServiceFee.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>GST (18%)</span>
                                <span>₹{tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xl font-bold text-slate-800 border-t border-slate-200 pt-3 mt-3">
                                <span>Total</span>
                                <span>₹{grandTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 text-center border-t border-slate-100">
                        {brandingSettings.footerNotes && (
                            <p className="text-sm text-slate-500 mb-2">{brandingSettings.footerNotes}</p>
                        )}
                        <p className="text-xs text-slate-400">Thank you for your business! 🙏</p>
                    </div>
                </div>

                {/* Powered By */}
                <p className="text-center text-xs text-slate-400 mt-6">
                    Powered by SmartgenAI Innovations LLP
                </p>
            </div>
        </div>
    );
};

export default PublicInvoice;
