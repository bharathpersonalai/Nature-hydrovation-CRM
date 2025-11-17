import React, { useContext, useMemo } from 'react';
import { CrmContext } from '../App';
import { Customer, Referral } from '../types';
import { CheckCircleIcon, GiftIcon } from './Icons';

const StatCard: React.FC<{ title: string; value: string | number; description: string }> = ({ title, value, description }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm dark:bg-slate-800">
    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h3>
    <p className="text-3xl font-bold text-slate-800 mt-1 dark:text-slate-100">{value}</p>
    <p className="text-sm text-slate-400 mt-2 dark:text-slate-500">{description}</p>
  </div>
);


const Referrals = () => {
    const context = useContext(CrmContext);
    if (!context) return null;

    const { referrals, customers, markRewardAsPaid } = context;

    const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c])), [customers]);

    const totalReferrals = referrals.length;
    const totalRewardsPaid = referrals
        .filter(r => r.status === 'RewardPaid')
        .reduce((sum, r) => sum + r.rewardAmount, 0);

    const topReferrers = useMemo(() => {
        const stats: Record<string, { referrer: Customer; count: number; earnings: number }> = {};

        referrals.forEach(referral => {
            const referrer = customerMap.get(referral.referrerId);
            if (referrer) {
                if (!stats[referrer.id]) {
                    stats[referrer.id] = { referrer, count: 0, earnings: 0 };
                }
                stats[referrer.id].count += 1;
                if (referral.status === 'RewardPaid') {
                    stats[referrer.id].earnings += referral.rewardAmount;
                }
            }
        });

        return Object.values(stats)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }, [referrals, customerMap]);

    return (
        <div className="p-6 md:p-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-6 dark:text-slate-200">Referrals</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Referrals" value={totalReferrals} description="Completed referrals" />
                <StatCard title="Total Rewards Paid" value={`₹${totalRewardsPaid.toLocaleString()}`} description="Paid to referrers" />
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-sm dark:bg-slate-800">
                    <h2 className="text-xl font-semibold text-slate-800 mb-4 dark:text-slate-200">🏆 Top Referrers</h2>
                    {topReferrers.length > 0 ? (
                        <ul className="space-y-4">
                            {topReferrers.map((stat, index) => (
                                <li key={stat.referrer.id} className="flex items-center gap-4 p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <span className="text-lg font-bold text-slate-400 dark:text-slate-500">{index + 1}</span>
                                    <div>
                                        <p className="font-semibold text-slate-800 dark:text-slate-200">{stat.referrer.name}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{stat.count} referrals</p>
                                    </div>
                                    <p className="ml-auto font-bold text-brand-secondary">₹{stat.earnings.toLocaleString()}</p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-slate-500 dark:text-slate-400">No referral data yet.</p>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-2 bg-white rounded-lg shadow-sm dark:bg-slate-800 overflow-hidden">
                     <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 p-6">Referral Activity Log</h2>
                     <div className="overflow-x-auto">
                        {referrals.length > 0 ? (
                            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Date</th>
                                        <th scope="col" className="px-6 py-3">Referrer</th>
                                        <th scope="col" className="px-6 py-3">New Customer</th>
                                        <th scope="col" className="px-6 py-3">Reward</th>
                                        <th scope="col" className="px-6 py-3">Status</th>
                                        <th scope="col" className="px-6 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {referrals.map(referral => (
                                        <tr key={referral.id} className="border-b dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700">
                                            <td className="px-6 py-4">{new Date(referral.date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{customerMap.get(referral.referrerId)?.name || 'N/A'}</td>
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{customerMap.get(referral.refereeId)?.name || 'N/A'}</td>
                                            <td className="px-6 py-4 font-semibold text-brand-secondary">₹{referral.rewardAmount.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                                    referral.status === 'RewardPaid' 
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' 
                                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                                                }`}>
                                                    {referral.status === 'RewardPaid' ? 'Paid' : 'Completed'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {referral.status === 'Completed' ? (
                                                    <button onClick={() => markRewardAsPaid(referral.id)} className="font-medium text-brand-primary hover:underline">
                                                        Mark as Paid
                                                    </button>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-slate-400">
                                                        <CheckCircleIcon className="w-4 h-4" /> Paid
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-16">
                                <GiftIcon className="w-12 h-12 mx-auto text-slate-400" />
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-4">No Referrals Yet</h3>
                                <p className="text-slate-500 mt-2 dark:text-slate-400">Referrals from new customers will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Referrals;
