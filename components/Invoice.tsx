import React from 'react';
import { Order, Customer, BrandingSettings } from '../types';

interface InvoiceProps {
  orders: Order[];
  customer: Customer;
  brandingSettings: BrandingSettings;
}

const Invoice: React.FC<InvoiceProps> = ({ orders, customer, brandingSettings }) => {
  // Helper: compute amount for a single order row (supports items[] or legacy fields)
  const getOrderLineAmount = (order: any) => {
    // If this order has an items[] array (multi-item order)
    if (Array.isArray(order.items) && order.items.length > 0) {
      return order.items.reduce((sum: number, it: any) => {
        const unit = Number(it.salePrice ?? it.price ?? 0) || 0;
        const qty = Number(it.quantity ?? it.qty ?? 0) || 0;
        const discount = Number(it.discount ?? 0) || 0;
        return sum + (unit - discount) * qty;
      }, 0);
    }

    // Fallback to single-order fields
    const unit = Number(order.salePrice ?? order.price ?? 0) || 0;
    const qty = Number(order.quantity ?? order.qty ?? 0) || 0;
    const discount = Number(order.discount ?? 0) || 0;
    return (unit - discount) * qty;
  };

  // Defensive: if orders is empty, use a safe placeholder
  const safeOrders = Array.isArray(orders) ? orders : [];
  const subtotal = safeOrders.reduce((sum, o) => sum + getOrderLineAmount(o), 0);
  const tax = subtotal * 0.18;
  const total = subtotal + tax;
  const brandColor = brandingSettings.brandColor || '#0284c7';
  const newReferralCode = customer?.referralCode;

  // representativeOrder: pick first order if present, else a safe fallback
  const representativeOrder = safeOrders[0] ?? {
    invoiceNumber: 'N/A',
    orderDate: new Date().toISOString(),
    paymentStatus: 'Unpaid'
  };

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-section-content, #invoice-section-content * {
            visibility: visible;
          }
          #invoice-section-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none;
          }
        }
      `}</style>

      <div id="invoice-section-content" className="text-slate-800 dark:text-slate-200">
        <header className="flex justify-between items-start pb-6 border-b-2" style={{ borderColor: `${brandColor}40`}}>
          <div className="flex items-center gap-3">
            {brandingSettings.companyLogo && (
              <img src={brandingSettings.companyLogo} alt="Company Logo" className="w-12 h-12 object-contain"/>
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{brandingSettings.companyName}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{brandingSettings.companyAddress}</p>
              {brandingSettings.customField && <p className="text-sm text-slate-500 dark:text-slate-400">{brandingSettings.customField}</p>}
            </div>
          </div>

          <div className="text-right">
            <h2 className="text-3xl font-bold uppercase tracking-widest" style={{ color: brandColor }}>Invoice</h2>
            <p className="font-medium text-slate-700 dark:text-slate-300 mt-1"># {representativeOrder.invoiceNumber}</p>
          </div>
        </header>

        <section className="flex justify-between mt-8">
          <div>
            <h3 className="text-sm font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Bill To</h3>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{customer?.name ?? 'Customer'}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{customer?.address ?? ''}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{customer?.email ?? ''}</p>
          </div>

          <div className="text-right">
            <div className="mb-2">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Invoice Date:</p>
              <p className="font-medium text-slate-700 dark:text-slate-300">{new Date(representativeOrder.orderDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Payment Status:</p>
              <span className={`mt-1 inline-block px-3 py-1 text-xs font-bold rounded-full ${representativeOrder.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300'}`}>
                {representativeOrder.paymentStatus}
              </span>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="rounded-lg overflow-hidden border dark:border-slate-700">
            <table className="w-full text-left">
              <thead className="text-white text-sm uppercase" style={{ backgroundColor: brandColor }}>
                <tr>
                  <th className="p-3 font-semibold tracking-wider text-left">Item</th>
                  <th className="p-3 font-semibold tracking-wider text-center w-20">Qty</th>
                  <th className="p-3 font-semibold tracking-wider text-right w-28">MRP</th>
                  <th className="p-3 font-semibold tracking-wider text-right w-28">Discount</th>
                  <th className="p-3 font-semibold tracking-wider text-right w-28">Net</th>
                  <th className="p-3 font-semibold tracking-wider text-right w-32">Total</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {safeOrders.length === 0 ? (
                  <tr>
                    <td className="p-3" colSpan={6}>No items</td>
                  </tr>
                ) : (
                  // Each "order" might itself be a single product row OR an order containing items[]
                  safeOrders.map((order, idx) => {
                    // If order contains items[] display each item as its own row
                    if (Array.isArray(order.items) && order.items.length > 0) {
                      return order.items.map((it: any, i: number) => {
                        const qty = Number(it.quantity ?? it.qty ?? 0) || 0;
                        const unit = Number(it.salePrice ?? it.price ?? 0) || 0;
                        const discount = Number(it.discount ?? 0) || 0;
                        const net = unit - discount;
                        const totalLine = net * qty;
                        return (
                          <tr key={`${order.id ?? idx}-item-${i}`} className="dark:bg-slate-800">
                            <td className="p-3 font-medium text-slate-900 dark:text-slate-100">{it.productName ?? it.name ?? 'Item'}</td>
                            <td className="p-3 text-center text-slate-600 dark:text-slate-300">{qty}</td>
                            <td className="p-3 text-right text-slate-600 dark:text-slate-300">₹{unit.toFixed(2)}</td>
                            <td className="p-3 text-right text-slate-600 dark:text-slate-300">{discount ? `₹${discount.toFixed(2)}` : '-'}</td>
                            <td className="p-3 text-right text-slate-600 dark:text-slate-300">₹{net.toFixed(2)}</td>
                            <td className="p-3 text-right font-semibold text-slate-800 dark:text-slate-200">₹{totalLine.toFixed(2)}</td>
                          </tr>
                        );
                      });
                    }

                    // Otherwise show the order as a single line item
                    const qty = Number(order.quantity ?? order.qty ?? 0) || 0;
                    const unit = Number(order.salePrice ?? order.price ?? 0) || 0;
                    const discount = Number(order.discount ?? 0) || 0;
                    const net = unit - discount;
                    const totalLine = net * qty;

                    return (
                      <tr key={order.id ?? idx} className="dark:bg-slate-800">
                        <td className="p-3 font-medium text-slate-900 dark:text-slate-100">{order.productName ?? order.name ?? 'Item'}</td>
                        <td className="p-3 text-center text-slate-600 dark:text-slate-300">{qty}</td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-300">₹{unit.toFixed(2)}</td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-300">{discount ? `₹${discount.toFixed(2)}` : '-'}</td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-300">₹{net.toFixed(2)}</td>
                        <td className="p-3 text-right font-semibold text-slate-800 dark:text-slate-200">₹{totalLine.toFixed(2)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex justify-end mt-6">
          <div className="w-full max-w-sm bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Subtotal:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">₹{Number(subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Taxes (18%):</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">₹{Number(tax || 0).toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2 dark:border-slate-600">
              <span>Grand Total:</span>
              <span style={{ color: brandColor }}>₹{Number(total || 0).toFixed(2)}</span>
            </div>
          </div>
        </section>

        {newReferralCode && (
          <div className="mt-8 p-4 text-center rounded-lg" style={{ border: `2px dashed ${brandColor}`}}>
            <h3 className="font-bold text-lg" style={{ color: brandColor }}>You've Unlocked Referrals!</h3>
            <p className="text-slate-600 dark:text-slate-300 mt-1">Share this code with friends to earn rewards.</p>
            <div className="mt-2 inline-block bg-slate-100 dark:bg-slate-700 font-mono text-xl p-2 rounded">
              {newReferralCode}
            </div>
          </div>
        )}

        <footer className="mt-12 text-center text-sm text-slate-500 dark:text-slate-400 border-t pt-6 dark:border-slate-700">
          <p className="font-semibold">{brandingSettings.footerNotes}</p>
          <p>{brandingSettings.companyName}</p>
        </footer>
      </div>
    </>
  );
};

export default Invoice;
