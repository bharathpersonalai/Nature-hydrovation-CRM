import React from 'react';
import { Order, Customer, BrandingSettings } from '../types';

interface ReceiptProps {
  orders: Order[];
  customer: Customer;
  brandingSettings: BrandingSettings;
}

const Receipt: React.FC<ReceiptProps> = ({ orders, customer, brandingSettings }) => {

  // SAFELY compute a line-item total (supports items[] or old style)
  const getOrderLineAmount = (order: any) => {
    if (Array.isArray(order.items) && order.items.length > 0) {
      return order.items.reduce((sum: number, it: any) => {
        const unit = Number(it.salePrice ?? it.price ?? 0) || 0;
        const qty = Number(it.quantity ?? it.qty ?? 0) || 0;
        const discount = Number(it.discount ?? 0) || 0;
        return sum + (unit - discount) * qty;
      }, 0);
    }

    const unit = Number(order.salePrice ?? order.price ?? 0) || 0;
    const qty = Number(order.quantity ?? order.qty ?? 0) || 0;
    const discount = Number(order.discount ?? 0) || 0;

    return (unit - discount) * qty;
  };

  // Defensive: always safe array
  const safeOrders = Array.isArray(orders) ? orders : [];
  const subtotal = safeOrders.reduce((s, o) => s + getOrderLineAmount(o), 0);
  const tax = subtotal * 0.18;
  const total = subtotal + tax;

  const brandColor = brandingSettings.brandColor || '#059669';

  const representativeOrder = safeOrders[0] ?? {
    invoiceNumber: 'N/A',
    paymentDate: new Date().toISOString(),
    paymentMethod: 'N/A'
  };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-section-content, #receipt-section-content * { visibility: visible; }
          #receipt-section-content { 
            position: absolute; left: 0; top: 0; width: 100%; 
          }
          .no-print { display: none; }
        }
      `}</style>

      <div id="receipt-section-content" className="text-slate-800 dark:text-slate-200">
        
        {/* HEADER */}
        <header className="flex justify-between items-start pb-6 border-b-2"
          style={{ borderColor: `${brandColor}40` }}>
          
          <div className="flex items-center gap-3">
            {brandingSettings.companyLogo && (
              <img src={brandingSettings.companyLogo} className="w-12 h-12 object-contain" />
            )}
            <div>
              <h1 className="text-2xl font-bold">{brandingSettings.companyName}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{brandingSettings.companyAddress}</p>
              {brandingSettings.customField && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {brandingSettings.customField}
                </p>
              )}
            </div>
          </div>

          <div className="text-right">
            <h2 className="text-3xl font-bold uppercase" style={{ color: brandColor }}>Receipt</h2>
            <p className="font-medium mt-1">
              # {representativeOrder.invoiceNumber?.replace('INV', 'RCPT')}
            </p>
            <p className="text-xs mt-1 text-slate-500">
              For Invoice # {representativeOrder.invoiceNumber}
            </p>
          </div>
        </header>

        {/* CUSTOMER */}
        <section className="flex justify-between mt-8">
          <div>
            <h3 className="text-sm font-semibold uppercase text-slate-500">Paid By</h3>
            <p className="text-lg font-bold mt-1">{customer.name}</p>
            <p className="text-sm">{customer.address}</p>
            <p className="text-sm">{customer.email}</p>
          </div>

          <div className="text-right">
            <div className="mb-2">
              <p className="text-sm font-semibold text-slate-500">Payment Date:</p>
              <p className="font-medium">
                {representativeOrder.paymentDate
                  ? new Date(representativeOrder.paymentDate).toLocaleString()
                  : 'N/A'}
              </p>
            </div>

            <div className="mb-2">
              <p className="text-sm font-semibold text-slate-500">Paid Via:</p>
              <p className="font-medium">{representativeOrder.paymentMethod || 'N/A'}</p>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-500">Payment Status:</p>
              <span className="mt-1 inline-block px-3 py-1 text-xs font-bold rounded-full 
                bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                Paid in Full
              </span>
            </div>
          </div>
        </section>

        {/* TABLE */}
        <section className="mt-8">
          <div className="rounded-lg overflow-hidden border dark:border-slate-700">
            <table className="w-full text-left">

              <thead className="text-white text-sm uppercase" style={{ backgroundColor: brandColor }}>
                <tr>
                  <th className="p-3">Item</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">MRP</th>
                  <th className="p-3 text-right">Discount</th>
                  <th className="p-3 text-right">Net</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">

                {safeOrders.map((order, idx) => {
                  
                  // MULTI-ITEM ORDER
                  if (Array.isArray(order.items) && order.items.length > 0) {
                    return order.items.map((it: any, i: number) => {
                      const qty = Number(it.quantity ?? 0);
                      const unit = Number(it.salePrice ?? 0);
                      const discount = Number(it.discount ?? 0);
                      const net = unit - discount;
                      const totalLine = net * qty;

                      return (
                        <tr key={`${order.id}-item-${i}`} className="dark:bg-slate-800">
                          <td className="p-3">{it.productName ?? it.name ?? 'Item'}</td>
                          <td className="p-3 text-center">{qty}</td>
                          <td className="p-3 text-right">₹{unit.toFixed(2)}</td>
                          <td className="p-3 text-right">{discount ? `₹${discount.toFixed(2)}` : '-'}</td>
                          <td className="p-3 text-right">₹{net.toFixed(2)}</td>
                          <td className="p-3 text-right font-semibold">₹{totalLine.toFixed(2)}</td>
                        </tr>
                      );
                    });
                  }

                  // SINGLE-ITEM ORDER
                  const qty = Number(order.quantity ?? 0);
                  const unit = Number(order.salePrice ?? 0);
                  const discount = Number(order.discount ?? 0);
                  const net = unit - discount;
                  const totalLine = net * qty;

                  return (
                    <tr key={order.id ?? idx} className="dark:bg-slate-800">
                      <td className="p-3">{order.productName ?? 'Item'}</td>
                      <td className="p-3 text-center">{qty}</td>
                      <td className="p-3 text-right">₹{unit.toFixed(2)}</td>
                      <td className="p-3 text-right">{discount ? `₹${discount.toFixed(2)}` : '-'}</td>
                      <td className="p-3 text-right">₹{net.toFixed(2)}</td>
                      <td className="p-3 text-right font-semibold">₹{totalLine.toFixed(2)}</td>
                    </tr>
                  );
                })}

              </tbody>

            </table>
          </div>
        </section>

        {/* TOTALS */}
        <section className="flex justify-end mt-6">
          <div className="w-full max-w-sm bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span>Taxes (18%):</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
              <span>Amount Paid:</span>
              <span style={{ color: brandColor }}>₹{total.toFixed(2)}</span>
            </div>
          </div>
        </section>

        {/* REFERRAL CODE */}
        {customer.referralCode && (
          <div className="mt-8 p-4 text-center rounded-lg"
            style={{ border: `2px dashed ${brandColor}` }}>
            <h3 className="font-bold text-lg" style={{ color: brandColor }}>
              Refer Friends & Earn!
            </h3>
            <p className="text-slate-600 dark:text-slate-300 mt-1">
              Share your unique code to earn rewards:
            </p>
            <div className="mt-2 inline-block bg-slate-100 dark:bg-slate-700 p-2 font-mono text-xl rounded">
              {customer.referralCode}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <footer className="mt-12 text-center text-sm text-slate-500 border-t pt-6">
          <p className="font-semibold">{brandingSettings.footerNotes}</p>
          <p>{brandingSettings.companyName}</p>
        </footer>
      </div>
    </>
  );
};

export default Receipt;
