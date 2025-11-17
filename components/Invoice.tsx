import React from 'react';
import { Order, Customer, BrandingSettings } from '../types';
import { WaterDropIcon } from './Icons';

interface InvoiceProps {
  order: Order & { newReferralCode?: string };
  customer: Customer;
  brandingSettings: BrandingSettings;
}

const Invoice: React.FC<InvoiceProps> = ({ order, customer, brandingSettings }) => {
  const subtotal = order.salePrice * order.quantity;
  const tax = subtotal * 0.05;
  const total = subtotal + tax;
  const brandColor = brandingSettings.brandColor || '#0284c7';
  const newReferralCode = customer.referralCode;

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
            {brandingSettings.companyLogo ? (
                <img src={brandingSettings.companyLogo} alt="Company Logo" className="w-12 h-12 object-contain"/>
            ) : (
                <WaterDropIcon className="w-10 h-10" style={{ color: brandColor }} />
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{brandingSettings.companyName}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{brandingSettings.companyAddress}</p>
              {brandingSettings.customField && <p className="text-sm text-slate-500 dark:text-slate-400">{brandingSettings.customField}</p>}
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold uppercase tracking-widest" style={{ color: brandColor }}>Invoice</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1"># {order.invoiceNumber}</p>
          </div>
        </header>

        <section className="flex justify-between mt-8">
          <div>
            <h3 className="text-sm font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Bill To</h3>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{customer.name}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{customer.address}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{customer.email}</p>
          </div>
          <div className="text-right">
            <div className="mb-2">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Invoice Date:</p>
              <p className="font-medium text-slate-700 dark:text-slate-300">{new Date(order.orderDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Payment Status:</p>
              <span className={`mt-1 inline-block px-3 py-1 text-xs font-bold rounded-full ${order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300'}`}>
                {order.paymentStatus}
              </span>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="rounded-lg overflow-hidden border dark:border-slate-700">
            <table className="w-full text-left">
              <thead className="text-white text-sm uppercase" style={{ backgroundColor: brandColor }}>
                <tr>
                  <th className="p-3 font-semibold tracking-wider">Item</th>
                  <th className="p-3 font-semibold tracking-wider text-center">Qty</th>
                  <th className="p-3 font-semibold tracking-wider text-right">Unit Price</th>
                  <th className="p-3 font-semibold tracking-wider text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                <tr className="dark:bg-slate-800">
                  <td className="p-3 font-medium text-slate-900 dark:text-slate-100">{order.productName}</td>
                  <td className="p-3 text-center text-slate-600 dark:text-slate-300">{order.quantity}</td>
                  <td className="p-3 text-right text-slate-600 dark:text-slate-300">₹{order.salePrice.toFixed(2)}</td>
                  <td className="p-3 text-right font-semibold text-slate-800 dark:text-slate-200">₹{subtotal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex justify-end mt-6">
          <div className="w-full max-w-sm bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Subtotal:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Taxes (5%):</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">₹{tax.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2 dark:border-slate-600">
              <span>Grand Total:</span>
              <span style={{ color: brandColor }}>₹{total.toFixed(2)}</span>
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