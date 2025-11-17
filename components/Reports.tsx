import React, { useContext } from 'react';
import { CrmContext } from '../App';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DistributorSupplier, LeadStatus } from '../types';

const Reports = () => {
    const context = useContext(CrmContext);
    if (!context) return null;
    const { products, leads, orders, theme } = context;

    const salesByProduct = products.map(product => {
        const productOrders = orders.filter(o => o.productId === product.id);
        const totalSales = productOrders.reduce((sum, o) => sum + o.salePrice * o.quantity, 0);
        return { name: product.name, sales: totalSales };
    }).filter(p => p.sales > 0);

    const salesByDistributorSupplier = Object.values(DistributorSupplier).map(distributor => {
        const distributorProducts = products.filter(p => p.supplier === distributor);
        const distributorSales = orders
            .filter(o => distributorProducts.some(p => p.id === o.productId))
            .reduce((sum, o) => sum + o.salePrice * o.quantity, 0);
        return { name: distributor, value: distributorSales };
    }).filter(d => d.value > 0);

    const leadsByStatus = Object.values(LeadStatus).map(status => ({
        name: status,
        count: leads.filter(l => l.status === status).length,
    }));
    
    const COLORS = ['#0ea5e9', '#10b981', '#f97316', '#ef4444', '#8b5cf6', '#ec4899'];
    
    const tooltipStyle = {
        backgroundColor: theme === 'light' ? '#fff' : '#1e293b',
        border: `1px solid ${theme === 'light' ? '#e2e8f0' : '#334155'}`,
        borderRadius: '0.5rem'
    };

    const renderChart = (title: string, data: any[], children: React.ReactNode) => (
        <div className="bg-white p-6 rounded-lg shadow-sm dark:bg-slate-800">
            <h2 className="text-xl font-semibold text-slate-800 mb-4 dark:text-slate-200">{title}</h2>
            {data.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    {children}
                </ResponsiveContainer>
            ) : (
                <div className="flex items-center justify-center h-[300px]">
                    <p className="text-slate-500 dark:text-slate-400">Not enough data to display this chart.</p>
                </div>
            )}
        </div>
    );

    return (
        <div className="p-6 md:p-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-6 dark:text-slate-200">Reports</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {renderChart("Sales by Product", salesByProduct, (
                    <BarChart data={salesByProduct} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme === 'light' ? '#e2e8f0' : '#334155'} />
                        <XAxis type="number" stroke="#94a3b8" />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" width={150} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="sales" fill="#0284c7" />
                    </BarChart>
                ))}
                
                {renderChart("Sales by Distributor/Supplier", salesByDistributorSupplier, (
                     <PieChart>
                        <Pie data={salesByDistributorSupplier} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                            {salesByDistributorSupplier.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend />
                    </PieChart>
                ))}
                
                {renderChart("Leads by Status", leads, (
                    <BarChart data={leadsByStatus}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'light' ? '#e2e8f0' : '#334155'} />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" fill="#059669" />
                    </BarChart>
                ))}
            </div>
        </div>
    );
};

export default Reports;