import React from 'react';
import { Order } from '../../types';

interface OrderGroup {
  invoiceNumber: string;
  date: string;
  status: string;
  method: string;
  total: number;
  representativeOrder: Order;
}

interface OrderHistoryTabProps {
  orderGroups: OrderGroup[];
  onViewInvoice: (order: Order) => void;
  onViewReceipt: (order: Order) => void;
}

const OrderHistoryTab: React.FC<OrderHistoryTabProps> = ({
  orderGroups,
  onViewInvoice,
  onViewReceipt,
}) => {
  if (orderGroups.length === 0) {
    return (
      <div className="text-center py-4 bg-slate-50 rounded-lg dark:bg-slate-800/50">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No orders yet for this customer.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto max-h-60 border rounded-lg dark:border-slate-700">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-slate-600 dark:text-slate-400 uppercase sticky top-0 bg-slate-50 dark:bg-slate-700/80 backdrop-blur-sm">
          <tr>
            <th className="px-2 py-2 font-medium">Invoice #</th>
            <th className="px-2 py-2 font-medium">Status</th>
            <th className="px-2 py-2 font-medium">Method</th>
            <th className="px-2 py-2 font-medium text-right">Total</th>
            <th className="px-2 py-2 font-medium text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {orderGroups.map((group) => (
            <tr
              key={group.invoiceNumber}
              className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <td className="px-2 py-2 whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
                {group.invoiceNumber}
              </td>
              <td className="px-2 py-2">
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    group.status === "Paid"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
                      : "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300"
                  }`}
                >
                  {group.status}
                </span>
              </td>
              <td className="px-2 py-2 text-slate-500 dark:text-slate-400 text-xs">
                {group.method}
              </td>
              <td className="px-2 py-2 text-right font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                ₹{(group.total * 1.18).toFixed(2)}
              </td>
              <td className="px-2 py-2 text-center">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => onViewInvoice(group.representativeOrder)}
                    className="text-brand-primary hover:underline text-xs font-semibold"
                  >
                    Invoice
                  </button>
                  {group.status === "Paid" && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <button
                        onClick={() => onViewReceipt(group.representativeOrder)}
                        className="text-brand-secondary hover:underline text-xs font-semibold"
                      >
                        Receipt
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrderHistoryTab;