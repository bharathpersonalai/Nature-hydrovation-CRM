import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';
import { Order, Customer, Product, Lead } from '../types';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LeadStatus } from '../types';

const Reports = () => {
    const { 
        orders, 
        customers,  
        products, 
        leads,
        suppliers 
    } = useData();
    const { theme } = useUI();
    
    // ✅ FILTER: Only use PAID orders for all calculations
    const paidOrders = useMemo(() => {
        return (orders || []).filter(o => o.paymentStatus === 'Paid');
    }, [orders]);
    
    // ----- Helper functions that handle both single-item and multi-item orders -----
    const getOrderItems = (order: any) => {
        if (Array.isArray(order.items) && order.items.length > 0) {
            return order.items.map((it: any) => ({
                productId: it.productId,
                quantity: Number(it.quantity ?? it.qty ?? 0) || 0,
                salePrice: Number(it.salePrice ?? it.price ?? 0) || 0,
                discount: Number(it.discount ?? 0) || 0
            }));
        }
        return [{
            productId: order.productId,
            quantity: Number(order.quantity ?? order.qty ?? 0) || 0,
            salePrice: Number(order.salePrice ?? order.price ?? 0) || 0,
            discount: Number(order.discount ?? 0) || 0
        }];
    };

    const getOrderAmount = (order: any) => {
        const items = getOrderItems(order);
        return items.reduce((s: number, it: any) => s + ((it.salePrice - (it.discount || 0)) * it.quantity), 0);
    };

    const getOrderQuantity = (order: any) => {
        const items = getOrderItems(order);
        return items.reduce((s: number, it: any) => s + (it.quantity || 0), 0);
    };

    // --- Data Calculations (Using PAID orders only) ---

    // 1. Sales by Product (top products) - ✅ USES paidOrders
    const salesByProduct = useMemo(() => {
        const map: Record<string, { name: string, sales: number }> = {};
        products.forEach(product => {
            map[product.id] = { name: product.name || 'Unknown', sales: 0 }; 
        });

        paidOrders.forEach(order => {  // ✅ CHANGED: orders → paidOrders
            const items = getOrderItems(order);
            items.forEach((it: any) => {
                if (!it.productId) return;
                if (!map[it.productId]) {
                    map[it.productId] = { name: 'Unknown Product', sales: 0 };
                }
                map[it.productId].sales += (Number(it.salePrice || 0) - Number(it.discount || 0)) * Number(it.quantity || 0);
            });
        });

        return Object.values(map)
            .filter(p => p.sales > 0)
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 10);
    }, [products, paidOrders]);  // ✅ CHANGED: orders → paidOrders

    // 2. Leads by Status (unchanged - not related to orders)
    const leadsByStatus = useMemo(() => {
        return Object.values(LeadStatus).map(status => ({
            name: status,
            count: leads.filter(l => l.status === status).length,
        }));
    }, [leads]);

    // 3. Supplier Analytics - ✅ USES paidOrders
    const supplierStats = useMemo(() => {
        const activeSuppliers = new Set<string>([
            ...(Array.isArray(suppliers) ? suppliers : []),
            ...products.map(p => (p.dealer || '').toString()).filter(Boolean)
        ]);

        const stats = Array.from(activeSuppliers).map(supplier => {
            const supplierProducts = products.filter(p => p.dealer === supplier);

            // Stock Metrics
            const productCount = supplierProducts.length;
            const stockQuantity = supplierProducts.reduce((sum, p) => sum + (Number(p.quantity ?? 0) || 0), 0);
            const stockValue = supplierProducts.reduce((sum, p) => sum + ((Number(p.costPrice ?? 0) || 0) * (Number(p.quantity ?? 0) || 0)), 0);

            // Sales Metrics - ✅ USES paidOrders
            let salesQuantity = 0;
            let salesValue = 0;

            paidOrders.forEach(order => {  // ✅ CHANGED: orders → paidOrders
                const items = getOrderItems(order);
                items.forEach((it: any) => {
                    if (!it.productId) return;
                    const product = products.find(p => p.id === it.productId);
                    const prodSupplier = (product?.dealer || '');
                    if (prodSupplier === supplier) {
                        const qty = Number(it.quantity || 0) || 0;
                        const unit = Number(it.salePrice || 0) || 0;
                        const disc = Number(it.discount || 0) || 0;
                        salesQuantity += qty;
                        salesValue += (unit - disc) * qty;
                    }
                });
            });

            return {
                name: supplier,
                productCount,
                stockQuantity,
                stockValue,
                salesQuantity,
                salesValue
            };
        });

        return stats.filter(s => s.productCount > 0 || s.salesValue > 0 || s.stockQuantity > 0)
                    .sort((a, b) => b.salesValue - a.salesValue);
    }, [products, paidOrders, suppliers]);  // ✅ CHANGED: orders → paidOrders

    // Chart data
    const salesBySupplierChartData = supplierStats.filter(s => s.salesValue > 0).map(s => ({ name: s.name, value: s.salesValue }));
    const supplierFinancials = supplierStats.map(s => ({ name: s.name, stockValue: s.stockValue, salesValue: s.salesValue }));

    // Colors and tooltip style
    const COLORS = ['#0ea5e9', '#10b981', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];
    const tooltipStyle = {
        backgroundColor: theme === 'light' ? '#fff' : '#1e293b',
        border: `1px solid ${theme === 'light' ? '#e2e8f0' : '#334155'}`,
        borderRadius: '0.5rem',
        color: theme === 'light' ? '#0f172a' : '#f8fafc'
    }; 

    const renderChartContainer = (title: string, data: any[], children: React.ReactNode) => (
        <div className="bg-white p-6 rounded-lg shadow-sm dark:bg-slate-800 flex flex-col">
            <h2 className="text-lg font-semibold text-slate-800 mb-6 dark:text-slate-200">{title}</h2>
            {data.length > 0 ? (
                <div className="flex-grow min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        {children}
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="flex items-center justify-center h-[300px] bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                    <p className="text-slate-500 dark:text-slate-400">No paid sales data available</p>  {/* ✅ UPDATED message */}
                </div>
            )}
        </div>
    );

    return (
        <div className="p-6 md:p-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-8 dark:text-slate-200">Reports & Analytics</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {renderChartContainer("Supplier Financials (Stock vs Sales)", supplierFinancials, (
                    <BarChart data={supplierFinancials}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'light' ? '#e2e8f0' : '#334155'} />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" tickFormatter={(value) => `₹${Math.round(value/1000)}k`} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`₹${value.toLocaleString()}`, '']} />
                        <Legend />
                        <Bar dataKey="stockValue" name="Stock Value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="salesValue" name="Sales Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                ))}

                {renderChartContainer("Sales Distribution by Supplier", salesBySupplierChartData, (
                    <PieChart>
                        <Pie
                            data={salesBySupplierChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            innerRadius={60}
                            paddingAngle={2}
                            fill="#8884d8"
                        >
                            {salesBySupplierChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']} />
                        <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                ))}

                {renderChartContainer("Top Products by Sales", salesByProduct, (
                    <BarChart data={salesByProduct} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={theme === 'light' ? '#e2e8f0' : '#334155'} />
                        <XAxis type="number" stroke="#94a3b8" tickFormatter={(value) => `₹${value}`} />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" width={120} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Sales']} />
                        <Bar dataKey="sales" fill="#0284c7" radius={[0, 4, 4, 0]} barSize={24} />
                    </BarChart>
                ))}

                {renderChartContainer("Leads Pipeline Status", leadsByStatus, (
                    <BarChart data={leadsByStatus}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'light' ? '#e2e8f0' : '#334155'} />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                ))}

            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden dark:bg-slate-800">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Supplier Performance Details</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                            <tr>
                                <th scope="col" className="px-6 py-3">Supplier</th>
                                <th scope="col" className="px-6 py-3 text-center">Products</th>
                                <th scope="col" className="px-6 py-3 text-right">Stock Qty</th>
                                <th scope="col" className="px-6 py-3 text-right">Stock Value (Cost)</th>
                                <th scope="col" className="px-6 py-3 text-right">Units Sold</th>
                                <th scope="col" className="px-6 py-3 text-right">Total Revenue</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {supplierStats.map((stat, index) => (
                                <tr key={stat.name || index} className="bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700">
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{stat.name}</td>
                                    <td className="px-6 py-4 text-center">{stat.productCount}</td>
                                    <td className="px-6 py-4 text-right">{stat.stockQuantity}</td>
                                    <td className="px-6 py-4 text-right font-medium text-purple-600 dark:text-purple-400">₹{stat.stockValue.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">{stat.salesQuantity}</td>
                                    <td className="px-6 py-4 text-right font-bold text-brand-secondary">₹{stat.salesValue.toLocaleString()}</td>
                                </tr>
                            ))}
                            {supplierStats.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        No supplier data available. Add products and assign suppliers to see analytics.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Reports;
