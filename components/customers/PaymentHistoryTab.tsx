import React from 'react';
import { Order } from '../../types';

interface PaymentGroup {
  invoiceNumber: string;
  paymentDate: string;
  method: string;
  total: number;
  representativeOrder: Order;
}

interface PaymentHistoryTabProps {
  paymentGroups: PaymentGroup[];
}

const PaymentHistoryTab: React.FC<PaymentHistoryTabProps> = ({ paymentGroups }) => {
  if (paymentGroups.length === 0) {
    return (
      <div className="text-center py-4 bg-slate-50 rounded-lg dark:bg-slate-800/50">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No payment history found.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto max-h-60 border rounded-lg dark:border-slate-700">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-slate-600 dark:text-slate-400 uppercase sticky top-0 bg-slate-50 dark:bg-slate-700/80 backdrop-blur-sm">
          <tr>
            <th className="px-4 py-2 font-medium">Payment Date</th>
            <th className="px-4 py-2 font-medium">Receipt #</th>
            <th className="px-4 py-2 font-medium">Method</th>
            <th className="px-4 py-2 font-medium text-right">Amount Paid</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {paymentGroups.map((group) => (
            <tr
              key={group.invoiceNumber}
              className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <td className="px-4 py-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {new Date(group.paymentDate).toLocaleString()}
              </td>
              <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300">
                {group.invoiceNumber.replace("INV", "RCPT")}
              </td>
              <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                {group.method}
              </td>
              <td className="px-4 py-2 text-right font-semibold text-brand-secondary whitespace-nowrap">
                ₹{(group.total * 1.18).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PaymentHistoryTab;