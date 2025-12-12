import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DownloadIcon, PlusCircleIcon, FileTextIcon, PackageIcon } from './Icons';
import Modal from './Modal';
import { Product, StockHistoryEntry } from '../types'; // Ensure types are imported 

const StockRegistry = () => {
    const { 
    stockHistory, 
    products, 
    suppliers,
    updateProduct // Business logic for stock adjustment is needed here
} = useData();
const { theme, showToast } = useUI(); // UI theme and notifications 

    // Optimize product lookup
    const productMap = useMemo(() => {
        return new Map(products.map(p => [p.id, p]));
    }, [products]);

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'log' | 'summary'>('log');
    const [supplierFilter, setSupplierFilter] = useState('all');
    const [productFilter, setProductFilter] = useState('all'); // New Product Filter
    const [typeFilter, setTypeFilter] = useState('all');
    
    const today = new Date();
    // Format YYYY-MM for input type="month"
    const [selectedMonth, setSelectedMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);

    // Adjustment Modal State
    const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
    const [adjForm, setAdjForm] = useState({
        productId: '',
        type: 'remove', // 'add' or 'remove'
        category: '',
        quantity: '',
        notes: ''
    });

    // Helper to get product name by ID using Map
    const getProductName = (id: string) => productMap.get(id)?.name || 'Unknown Product';
    const getProductSku = (id: string) => productMap.get(id)?.sku || '';

    // Filter Data based on selection
    const filteredHistory = useMemo(() => {
        const [year, month] = selectedMonth.split('-');
        
        return stockHistory.filter(entry => {
            const entryDate = new Date(entry.date);
            const matchesMonth = entryDate.getFullYear() === parseInt(year) && (entryDate.getMonth() + 1) === parseInt(month);
            
            const product = productMap.get(entry.productId);
            const productName = product?.name.toLowerCase() || '';
            const productSku = product?.sku.toLowerCase() || '';
            const productDealer = product?.dealer || '';

            const matchesSearch = !searchQuery || productName.includes(searchQuery.toLowerCase()) || productSku.includes(searchQuery.toLowerCase());
            const matchesSupplier = supplierFilter === 'all' || productDealer === supplierFilter;
            const matchesProduct = productFilter === 'all' || entry.productId === productFilter;

            let matchesType = true;
            if (typeFilter !== 'all') {
                const isIn = entry.change > 0;
                const reasonLower = entry.reason.toLowerCase();
                const isSale = !isIn && (reasonLower.includes('sale') || reasonLower.includes('invoice') || reasonLower.includes('purchase') || reasonLower.includes('receipt'));

                if (typeFilter === 'in') {
                    matchesType = isIn;
                } else if (typeFilter === 'out-purchase') {
                    matchesType = isSale;
                } else if (typeFilter === 'out-return') {
                    matchesType = !isIn && !isSale;
                }
            }

            return matchesMonth && matchesSearch && matchesSupplier && matchesType && matchesProduct;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first
    }, [stockHistory, selectedMonth, searchQuery, supplierFilter, productFilter, productMap, typeFilter]);

    // Product-wise Summary Calculation
    const productSummary = useMemo(() => {
        const summary = new Map<string, { 
            id: string, 
            name: string, 
            sku: string, 
            dealer: string,
            stockIn: number, 
            salesOut: number, 
            returnsOut: number, 
            netChange: number 
        }>();

        filteredHistory.forEach(entry => {
            if (!summary.has(entry.productId)) {
                const p = productMap.get(entry.productId);
                summary.set(entry.productId, { 
                    id: entry.productId, 
                    name: p?.name || 'Unknown', 
                    sku: p?.sku || '', 
                    dealer: p?.dealer || '',
                    stockIn: 0, 
                    salesOut: 0,
                    returnsOut: 0,
                    netChange: 0
                });
            }

            const stat = summary.get(entry.productId)!;
            
            if (entry.change > 0) {
                stat.stockIn += entry.change;
            } else {
                const reasonLower = entry.reason.toLowerCase();
                const isSale = reasonLower.includes('sale') || reasonLower.includes('invoice') || reasonLower.includes('purchase') || reasonLower.includes('receipt');
                
                if (isSale) {
                    stat.salesOut += Math.abs(entry.change);
                } else {
                    stat.returnsOut += Math.abs(entry.change);
                }
            }
            stat.netChange += entry.change;
        });

        return Array.from(summary.values()).sort((a, b) => (b.stockIn + b.salesOut + b.returnsOut) - (a.stockIn + a.salesOut + a.returnsOut));
    }, [filteredHistory, productMap]);

    // Calculate Monthly Stats
    const monthlyStats = useMemo(() => {
        let totalIn = 0;
        let totalOutSales = 0;
        let totalOutReturns = 0;

        filteredHistory.forEach(entry => {
            if (entry.change > 0) {
                totalIn += entry.change;
            } else {
                // Classify Stock Out
                // If reason includes 'Sale', 'Invoice', or 'Purchase' (manual entry), it's a customer purchase (Sale)
                // Otherwise, it's a manual removal (Return/Damage/Adjustment)
                const reasonLower = entry.reason.toLowerCase();
                const isSale = reasonLower.includes('sale') || reasonLower.includes('invoice') || reasonLower.includes('purchase') || reasonLower.includes('receipt');
                
                if (isSale) {
                    totalOutSales += Math.abs(entry.change);
                } else {
                    totalOutReturns += Math.abs(entry.change);
                }
            }
        });

        return { 
            totalIn, 
            totalOutSales, 
            totalOutReturns, 
            net: totalIn - (totalOutSales + totalOutReturns) 
        };
    }, [filteredHistory]);

    // Chart Data
    const chartData = [
        { name: 'Stock In', value: monthlyStats.totalIn, fill: '#10b981', label: 'In' },
        { name: 'Purchase', value: monthlyStats.totalOutSales, fill: '#3b82f6', label: 'Sales' }, // Blue for Sales
        { name: 'Returns', value: monthlyStats.totalOutReturns, fill: '#ef4444', label: 'Returns' }  // Red for Returns/Damages
    ];

    const handleExport = () => {
        if (filteredHistory.length === 0) {
            showToast("No data to export.", "error");
            return;
        }

        let csvContent = "";
        let filename = "";

        if (viewMode === 'log') {
            const headers = ["Date", "Product Name", "SKU", "Supplier", "Type", "Quantity Change", "Category", "Reason", "Resulting Stock"];
            const rows = filteredHistory.map(entry => {
                const product = productMap.get(entry.productId);
                const isIn = entry.change > 0;
                const reasonLower = entry.reason.toLowerCase();
                const isSale = !isIn && (reasonLower.includes('sale') || reasonLower.includes('invoice') || reasonLower.includes('purchase') || reasonLower.includes('receipt'));
                const category = isIn ? 'Stock In' : (isSale ? 'Purchase/Sale' : 'Return/Adjustment');
                // Ensure visuals match what is requested (Receipt instead of Invoice)
                const displayReason = entry.reason.replace('Invoice', 'Receipt');

                return [
                    new Date(entry.date).toLocaleDateString(),
                    product?.name || 'Unknown',
                    product?.sku || '',
                    product?.dealer || '',
                    isIn ? 'In' : 'Out',
                    Math.abs(entry.change),
                    category,
                    displayReason,
                    entry.newQuantity
                ].map(field => `"${field}"`).join(',');
            });
            csvContent = [headers.join(','), ...rows].join('\n');
            filename = `stock_registry_log_${selectedMonth}.csv`;
        } else {
            const headers = ["Product Name", "SKU", "Supplier", "Stock In", "Sales (Purchase)", "Returns (Out)", "Net Change"];
            const rows = productSummary.map(item => [
                item.name,
                item.sku,
                item.dealer,
                item.stockIn,
                item.salesOut,
                item.returnsOut,
                item.netChange
            ].map(field => `"${field}"`).join(','));
            csvContent = [headers.join(','), ...rows].join('\n');
            filename = `stock_summary_${selectedMonth}.csv`;
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleOpenAdjustmentModal = () => {
        setAdjForm({
            productId: '',
            type: 'remove',
            category: '',
            quantity: '',
            notes: ''
        });
        setIsAdjustmentModalOpen(true);
    };

    const handleAdjustmentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { productId, type, category, quantity, notes } = adjForm;
        
        const product = products.find(p => p.id === productId);
        if (!product) {
            showToast("Please select a product.", "error");
            return;
        }

        const qtyNum = parseInt(quantity);
        if (isNaN(qtyNum) || qtyNum <= 0) {
            showToast("Please enter a valid positive quantity.", "error");
            return;
        }

        let newQuantity = product.quantity;
        let changeAmount = 0;

        if (type === 'add') {
            changeAmount = qtyNum;
            newQuantity += qtyNum;
        } else {
            changeAmount = -qtyNum;
            newQuantity -= qtyNum;
            if (newQuantity < 0) {
                showToast("Insufficient stock for this deduction.", "error");
                return;
            }
        }

        const finalReason = `${category}${notes ? `: ${notes}` : ''}`;
        updateProduct({ ...product, quantity: newQuantity }, finalReason);
        
        setIsAdjustmentModalOpen(false);
    };

    return (
        <div className="p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Stock Registry</h1>
                <div className="flex items-center gap-2">
                    <button onClick={handleOpenAdjustmentModal} className="flex items-center gap-2 bg-brand-secondary text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90 transition-colors">
                        <PlusCircleIcon className="w-5 h-5" />
                        Record Adjustment
                    </button>
                    <button onClick={handleExport} className="flex items-center gap-2 bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-700 transition-colors">
                        <DownloadIcon className="w-5 h-5" />
                        Export {viewMode === 'log' ? 'Log' : 'Summary'}
                    </button>
                </div>
            </div>

            {/* Stats Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500 dark:bg-slate-800">
                    <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Stock In</h3>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-2">+{monthlyStats.totalIn}</p>
                    <p className="text-xs text-slate-400 mt-1">Added to inventory</p>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500 dark:bg-slate-800">
                    <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Purchase (Sales)</h3>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-2">{monthlyStats.totalOutSales}</p>
                    <p className="text-xs text-slate-400 mt-1">Sold to customers</p>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-500 dark:bg-slate-800">
                    <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Returns (Out)</h3>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-2">{monthlyStats.totalOutReturns}</p>
                    <p className="text-xs text-slate-400 mt-1">Manual / Damage</p>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-purple-500 dark:bg-slate-800">
                    <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Net Movement</h3>
                    <p className={`text-2xl font-bold mt-2 ${monthlyStats.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {monthlyStats.net > 0 ? '+' : ''}{monthlyStats.net}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Total change</p>
                </div>
            </div>
            
            {/* Chart Section - Full Width Below */}
            <div className="bg-white p-6 rounded-lg shadow-sm dark:bg-slate-800 mb-8">
                 <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Monthly Stock Flow</h4>
                 <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'light' ? '#e2e8f0' : '#334155'} />
                            <XAxis dataKey="name" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip 
                                cursor={{fill: theme === 'light' ? '#f1f5f9' : '#334155'}}
                                contentStyle={{ backgroundColor: theme === 'light' ? '#fff' : '#1e293b', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="value" barSize={60} radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                 </div>
            </div>

            {/* Filters & Toggle */}
            <div className="flex flex-col lg:flex-row gap-4 mb-4 bg-slate-50 p-4 rounded-lg border dark:bg-slate-800 dark:border-slate-700 items-end">
                <div className="flex-grow w-full lg:w-auto">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Search Product</label>
                    <input
                        type="search"
                        placeholder="Search by name or SKU..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                    />
                </div>
                <div className="w-full lg:w-auto">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Select Product</label>
                    <select
                        value={productFilter}
                        onChange={(e) => setProductFilter(e.target.value)}
                        className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                    >
                        <option value="all">All Products</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div className="w-full lg:w-auto">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Select Supplier</label>
                    <select
                        value={supplierFilter}
                        onChange={(e) => setSupplierFilter(e.target.value)}
                        className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                    >
                        <option value="all">All Suppliers</option>
                        {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="w-full lg:w-auto">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Transaction Type</label>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                    >
                        <option value="all">All Types</option>
                        <option value="in">Stock In</option>
                        <option value="out-purchase">Out (Sales)</option>
                        <option value="out-return">Out (Returns/Adj)</option>
                    </select>
                </div>
                <div className="w-full lg:w-auto">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Select Month</label>
                    <input 
                        type="month" 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                    />
                </div>
                <div className="w-full lg:w-auto flex bg-white dark:bg-slate-700 rounded-md border border-slate-300 dark:border-slate-600 p-1">
                    <button 
                        onClick={() => setViewMode('log')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-1.5 rounded text-sm font-medium transition-colors ${viewMode === 'log' ? 'bg-slate-200 text-slate-900 dark:bg-slate-600 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        <FileTextIcon className="w-4 h-4" />
                        Detailed Log
                    </button>
                    <button 
                        onClick={() => setViewMode('summary')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-1.5 rounded text-sm font-medium transition-colors ${viewMode === 'summary' ? 'bg-slate-200 text-slate-900 dark:bg-slate-600 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        <PackageIcon className="w-4 h-4" />
                        Product Summary
                    </button>
                </div>
            </div>

            {/* View Content */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden dark:bg-slate-800">
                <div className="overflow-x-auto">
                    {viewMode === 'log' ? (
                        filteredHistory.length > 0 ? (
                            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Date</th>
                                        <th scope="col" className="px-6 py-3">Product Details</th>
                                        <th scope="col" className="px-6 py-3 text-center">Type</th>
                                        <th scope="col" className="px-6 py-3 text-right">Quantity</th>
                                        <th scope="col" className="px-6 py-3">Reason</th>
                                        <th scope="col" className="px-6 py-3 text-right">Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {filteredHistory.map(entry => {
                                        const product = productMap.get(entry.productId);
                                        const reasonLower = entry.reason.toLowerCase();
                                        const isSale = reasonLower.includes('sale') || reasonLower.includes('invoice') || reasonLower.includes('purchase') || reasonLower.includes('receipt');
                                        
                                        return (
                                        <tr key={entry.id} className="bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {new Date(entry.date).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900 dark:text-slate-100">{product ? product.name : 'Unknown Product'}</div>
                                                <div className="text-xs text-slate-500">{product ? product.sku : ''}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {entry.change > 0 ? (
                                                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                                                        IN
                                                    </span>
                                                ) : isSale ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                                                        SALE
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
                                                        RETURN
                                                    </span>
                                                )}
                                            </td>
                                            <td className={`px-6 py-4 text-right font-bold ${entry.change > 0 ? 'text-green-600' : (isSale ? 'text-blue-600' : 'text-red-600')}`}>
                                                {entry.change > 0 ? '+' : ''}{entry.change}
                                            </td>
                                            <td className="px-6 py-4 max-w-xs truncate" title={entry.reason}>
                                                {entry.reason.replace('Invoice', 'Receipt')}
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-slate-300">
                                                {entry.newQuantity}
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        ) : (
                             <div className="text-center py-16">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">No Records Found</h3>
                                <p className="text-slate-500 mt-2 dark:text-slate-400">No stock movements found for this period.</p>
                            </div>
                        )
                    ) : (
                        // Product Summary View
                         productSummary.length > 0 ? (
                            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Product</th>
                                        <th scope="col" className="px-6 py-3 text-right">Stock In</th>
                                        <th scope="col" className="px-6 py-3 text-right">Sales (Purchase)</th>
                                        <th scope="col" className="px-6 py-3 text-right">Returns (Out)</th>
                                        <th scope="col" className="px-6 py-3 text-right">Net Change</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {productSummary.map(item => (
                                        <tr key={item.id} className="bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900 dark:text-slate-100">{item.name}</div>
                                                <div className="text-xs text-slate-500">{item.sku} • {item.dealer}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-green-600 dark:text-green-400">
                                                {item.stockIn > 0 ? `+${item.stockIn}` : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-blue-600 dark:text-blue-400">
                                                {item.salesOut > 0 ? `${item.salesOut}` : '-'}
                                            </td>
                                             <td className="px-6 py-4 text-right font-medium text-red-600 dark:text-red-400">
                                                {item.returnsOut > 0 ? `${item.returnsOut}` : '-'}
                                            </td>
                                            <td className={`px-6 py-4 text-right font-bold ${item.netChange > 0 ? 'text-green-600' : item.netChange < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                                                {item.netChange > 0 ? '+' : ''}{item.netChange}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                         ) : (
                             <div className="text-center py-16">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">No Activity</h3>
                                <p className="text-slate-500 mt-2 dark:text-slate-400">No products had stock movement in this period.</p>
                            </div>
                         )
                    )}
                </div>
            </div>

            <Modal isOpen={isAdjustmentModalOpen} onClose={() => setIsAdjustmentModalOpen(false)} title="Record Stock Adjustment">
                <form onSubmit={handleAdjustmentSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Product</label>
                        <select 
                            value={adjForm.productId} 
                            onChange={(e) => setAdjForm({...adjForm, productId: e.target.value})}
                            className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                            required
                        >
                            <option value="">Select a product...</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name} (Current Stock: {p.quantity})</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Adjustment Type</label>
                            <select 
                                value={adjForm.type} 
                                onChange={(e) => setAdjForm({...adjForm, type: e.target.value, category: ''})}
                                className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                            >
                                <option value="remove">Remove Stock (-)</option>
                                <option value="add">Add Stock (+)</option>
                            </select>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                            <select 
                                value={adjForm.category} 
                                onChange={(e) => setAdjForm({...adjForm, category: e.target.value})}
                                className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                                required
                            >
                                <option value="">Select Category...</option>
                                {adjForm.type === 'remove' ? (
                                    <>
                                        <option value="Damaged">Damaged</option>
                                        <option value="Lost">Lost</option>
                                        <option value="Internal Use">Internal Use</option>
                                        <option value="Expired">Expired</option>
                                        <option value="Adjustment">Adjustment</option>
                                        <option value="Other">Other</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="Stock Received">Stock Received</option>
                                        <option value="Found">Found</option>
                                        <option value="Customer Return">Customer Return</option>
                                        <option value="Adjustment">Adjustment</option>
                                        <option value="Other">Other</option>
                                    </>
                                )}
                            </select>
                        </div>
                    </div>

                    <div>
                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quantity</label>
                        <input 
                            type="number" 
                            min="1"
                            value={adjForm.quantity}
                            onChange={(e) => setAdjForm({...adjForm, quantity: e.target.value})}
                            className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                            placeholder="Enter quantity..."
                            required
                        />
                    </div>

                    <div>
                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes (Optional)</label>
                        <textarea 
                            value={adjForm.notes}
                            onChange={(e) => setAdjForm({...adjForm, notes: e.target.value})}
                            className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                            placeholder="Explain the reason..."
                            rows={3}
                        />
                    </div>

                    <div className="flex justify-end pt-4 gap-2">
                         <button type="button" onClick={() => setIsAdjustmentModalOpen(false)} className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-300 transition-colors dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">
                            Cancel
                        </button>
                        <button type="submit" className="bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-brand-dark transition-colors">
                            Submit Adjustment
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default StockRegistry;
