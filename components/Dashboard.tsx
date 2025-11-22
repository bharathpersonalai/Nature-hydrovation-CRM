import React, { useContext } from 'react';
import { CrmContext } from '../App';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Product, Lead, Order } from '../types';
import { RupeeIcon, UsersIcon, PackageIcon, AlertCircleIcon } from './Icons';

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, description, icon, color }) => {
  const colorClasses = {
    'green': {
      bg: 'bg-green-100 dark:bg-green-900/40',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-500',
    },
    'orange': {
      bg: 'bg-orange-100 dark:bg-orange-900/40',
      text: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-500',
    },
    'blue': {
      bg: 'bg-blue-100 dark:bg-blue-900/40',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-500',
    },
    'red': {
      bg: 'bg-red-100 dark:bg-red-900/40',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-500',
    },
  }[color] || { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-500' };

  return (
    <div className={`bg-white p-5 rounded-xl shadow-sm dark:bg-slate-800 border-t-4 ${colorClasses.border}`}>
      <div className="flex items-center gap-4">
        <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full ${colorClasses.bg}`}>
            {icon}
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h3>
          <p className="text-2xl font-bold text-slate-800 mt-1 dark:text-slate-100">{value}</p>
        </div>
      </div>
      <p className="text-sm text-slate-400 mt-3 dark:text-slate-500 truncate">{description}</p>
    </div>
  );
};


const Dashboard = () => {
    const context = useContext(CrmContext);
    if (!context) return null;

    const { products, leads, orders, theme } = context;

    const totalRevenue = orders.reduce((sum, order) => sum + order.salePrice * order.quantity, 0);
    const lowStockItems = products.filter(p => p.quantity <= p.lowStockThreshold).length;

    const salesData = orders.reduce((acc, order) => {
        const date = new Date(order.orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!acc[date]) {
            acc[date] = 0;
        }
        acc[date] += order.salePrice * order.quantity;
        return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(salesData).map(([name, sales]) => ({ name, sales })).slice(-7);
    const tooltipStyle = {
        backgroundColor: theme === 'light' ? '#fff' : '#1e293b',
        border: `1px solid ${theme === 'light' ? '#e2e8f0' : '#334155'}`,
        borderRadius: '0.5rem'
    };


    return (
        <div className="p-6 md:p-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-6 dark:text-slate-200">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Total Revenue" 
                    value={`₹${totalRevenue.toLocaleString()}`} 
                    description="All-time sales" 
                    icon={<RupeeIcon className="w-6 h-6 text-green-600 dark:text-green-400" />}
                    color="green"
                />
                <StatCard 
                    title="New Leads" 
                    value={leads.length} 
                    description="Total leads in pipeline"
                    icon={<UsersIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />}
                    color="orange"
                />
                <StatCard 
                    title="Total Products" 
                    value={products.length} 
                    description="Unique products in inventory" 
                    icon={<PackageIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
                    color="blue"
                />
                <StatCard 
                    title="Low Stock Alerts" 
                    value={lowStockItems} 
                    description="Items needing restock" 
                    icon={<AlertCircleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />}
                    color="red"
                />
            </div>

            <div className="mt-8 bg-white p-6 rounded-lg shadow-sm dark:bg-slate-800">
                <h2 className="text-xl font-semibold text-slate-800 mb-4 dark:text-slate-200">Recent Sales Performance</h2>
                {orders.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'light' ? '#e2e8f0' : '#334155'} />
                            <XAxis dataKey="name" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend />
                            <Line type="monotone" dataKey="sales" stroke="#0284c7" strokeWidth={2} dot={{ r: 4, fill: '#0284c7' }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="text-center py-16">
                        <p className="text-slate-500 dark:text-slate-400">No sales data yet. Record a sale to see performance charts.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;