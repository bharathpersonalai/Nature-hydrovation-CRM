import React, { useRef } from 'react';
import { Customer, Referral } from '../../types';
import { GiftIcon, UploadCloudIcon, TicketIcon } from '../Icons';
import { useUI } from '../../contexts/UIContext';

interface ReferralStats {
  count: number;
  earnings: number;
  referrals: Referral[];
}

interface ReferralsTabProps {
  customer: Customer;
  referralStats: ReferralStats;
  customers: Customer[];
  referralSlipBackground: string | null;
  onBackgroundUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onViewSlip: (referral: Referral) => void;
  onViewCustomerSlip: () => void;
}

const ReferralsTab: React.FC<ReferralsTabProps> = ({
  customer,
  referralStats,
  customers,
  referralSlipBackground,
  onBackgroundUpload,
  onViewSlip,
  onViewCustomerSlip,
}) => {
  const { showToast } = useUI();
  const backgroundUploadRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      {/* Referral Code Section */}
      <div className="p-4 bg-slate-50 rounded-lg dark:bg-slate-800/50">
        {customer.referralCode ? (
          <div className="text-center">
            <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              YOUR REFERRAL CODE
            </h4>
            <div className="my-2 p-2 bg-brand-light dark:bg-brand-dark/30 border-2 border-dashed border-brand-primary rounded-lg">
              <code className="text-2xl font-bold text-brand-primary">
                {customer.referralCode}
              </code>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(customer.referralCode || "");
                showToast("Referral code copied to clipboard!");
              }}
              className="text-sm font-medium text-brand-primary hover:underline"
            >
              Copy Code
            </button>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white dark:bg-slate-700 p-3 rounded-lg shadow-sm">
                <div className="font-semibold text-slate-500 dark:text-slate-400">
                  Successful Referrals
                </div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {referralStats.count}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-700 p-3 rounded-lg shadow-sm">
                <div className="font-semibold text-slate-500 dark:text-slate-400">
                  Total Rewards Earned
                </div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  ₹{referralStats.earnings.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <GiftIcon className="w-12 h-12 mx-auto text-slate-400" />
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              This customer will receive a referral code after their first paid order.
            </p>
          </div>
        )}
      </div>

      {/* Customize Referral Slip */}
      <div className="p-4 bg-slate-50 rounded-lg dark:bg-slate-800/50">
        <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          CUSTOMIZE REFERRAL SLIP
        </h4>
        <div className="mt-2 flex items-center gap-4">
          <div className="w-24 h-14 bg-slate-200 dark:bg-slate-700 rounded-md flex items-center justify-center overflow-hidden">
            <img
              src={referralSlipBackground || "/slip.jpg"}
              alt="Referral slip background"
              className="w-full h-full object-cover rounded-md"
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={backgroundUploadRef}
                onChange={onBackgroundUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => backgroundUploadRef.current?.click()}
                className="flex items-center gap-2 text-sm font-medium bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600"
              >
                <UploadCloudIcon className="w-4 h-4" />
                Upload Background
              </button>

              {customer.referralCode && (
                <button
                  onClick={onViewCustomerSlip}
                  className="flex items-center gap-2 text-sm font-medium bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700"
                >
                  <TicketIcon className="w-4 h-4" />
                  View Customer Slip
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Recommended size: 1280x720px.
            </p>
          </div>
        </div>
      </div>

      {/* Referral History */}
      <div>
        <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          REFERRAL HISTORY
        </h4>
        {referralStats.referrals.length > 0 ? (
          <div className="mt-2 border rounded-lg dark:border-slate-700 max-h-48 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-600 dark:text-slate-400 uppercase sticky top-0 bg-slate-50 dark:bg-slate-700/80 backdrop-blur-sm">
                <tr>
                  <th className="px-4 py-2 font-medium text-left">Date</th>
                  <th className="px-4 py-2 font-medium text-left">New Customer</th>
                  <th className="px-4 py-2 font-medium text-left">Status</th>
                  <th className="px-4 py-2 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {referralStats.referrals.map((referral) => (
                  <tr
                    key={referral.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                      {new Date(referral.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300">
                      {customers.find((c) => c.id === referral.refereeId)?.name || "N/A"}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          referral.status === "RewardPaid"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                        }`}
                      >
                        {referral.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => onViewSlip(referral)}
                        className="flex items-center justify-center mx-auto gap-1.5 font-medium text-brand-primary hover:underline"
                      >
                        <TicketIcon className="w-4 h-4" /> View Slip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 mt-2 bg-slate-50 rounded-lg dark:bg-slate-800/50">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No referral history yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralsTab;