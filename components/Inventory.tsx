import React, { useState, useMemo, useRef, useEffect } from "react";
import { useData } from "../contexts/DataContext"; // New Data Access
import { useUI } from "../contexts/UIContext"; // UI Access (showToast)
import { Product, StockHistoryEntry } from '../types';
import Modal from './Modal';
import { PlusCircleIcon, DownloadIcon, CheckCircleIcon, AlertTriangleIcon, XCircleIcon, ImageIcon, TrashIcon, PencilIcon } from './Icons';

const emptyProduct = {
    name: '',
    sku: '',
    supplier: '',
    category: '',
    costPrice: 0,
    sellingPrice: 0,
    quantity: 0,
    lowStockThreshold: '', // Default to empty as requested
    imageUrl: '',
};

const Inventory = () => {
    // 1. Retrieve all data states AND business functions from the DataContext
    const {
        products, suppliers, categories, viewingItem, clearViewingItem,
        addProduct, updateProduct, deleteProduct, // Product Service functions
        addSupplier, updateSupplier, removeSupplier, addCategory, updateCategory, removeCategory // List Service functions
    } = useData();

    // 2. Retrieve UI functions
    const { showToast } = useUI();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isListManagerOpen, setIsListManagerOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState<any>(emptyProduct);
    const [searchQuery, setSearchQuery] = useState('');
    const [distributorFilter, setDistributorFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [stockStatusFilter, setStockStatusFilter] = useState<string>('all');
    const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    // Stock Update State
    const [updateReason, setUpdateReason] = useState('');
    const [stockUpdateCategory, setStockUpdateCategory] = useState('');
    const [stockChange, setStockChange] = useState<number | string>('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // List Manager Input States
    const [newSupplierName, setNewSupplierName] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [selectedSupplierForCategory, setSelectedSupplierForCategory] = useState('');

    // List Manager Edit & Delete States
    const [editingSupplier, setEditingSupplier] = useState<{ original: string, current: string } | null>(null);
    const [editingCategory, setEditingCategory] = useState<{ originalName: string, supplier: string, current: string } | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: 'supplier' | 'category', name: string, supplier?: string } | null>(null);


    const openDetailModal = (product: Product) => {
        setViewingProduct(product);
    };

    useEffect(() => {
        if (viewingItem?.type === 'product') {
            const productToView = products.find(p => p.id === viewingItem.id);
            if (productToView) {
                openDetailModal(productToView);
                clearViewingItem();
            }
        }
    }, [viewingItem, products, clearViewingItem]);

    const filteredProducts = useMemo(() => {
        let tempProducts = [...products];

        // Text search
        if (searchQuery) {
            tempProducts = tempProducts.filter(product =>
                product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.sku.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Distributor/Supplier filter
        if (distributorFilter !== 'all') {
            tempProducts = tempProducts.filter(product => product.dealer === distributorFilter);
        }

        // Category filter
        if (categoryFilter !== 'all') {
            tempProducts = tempProducts.filter(product => product.category === categoryFilter);
        }

        // Stock status filter
        if (stockStatusFilter !== 'all') {
            tempProducts = tempProducts.filter(product => {
                switch (stockStatusFilter) {
                    case 'inStock':
                        return product.quantity > product.lowStockThreshold;
                    case 'lowStock':
                        return product.quantity <= product.lowStockThreshold && product.quantity > 0;
                    case 'outOfStock':
                        return product.quantity === 0;
                    default:
                        return true;
                }
            });
        }

        return tempProducts;
    }, [products, searchQuery, distributorFilter, categoryFilter, stockStatusFilter]);

    // Categories available for filter dropdown based on selected distributor
    const availableFilterCategories = useMemo(() => {
        if (distributorFilter === 'all') {
            // Return all unique category names
            return Array.from(new Set(categories.map(c => c.name)));
        }
        // Return categories for the selected distributor
        return categories.filter(c => c.supplier === distributorFilter).map(c => c.name);
    }, [categories, distributorFilter]);

    // Categories available in Add/Edit form based on selected supplier
    const availableFormCategories = useMemo(() => {
        if (!formData.dealer) return [];
        return categories.filter(c => c.supplier === formData.dealer);
    }, [categories, formData.dealer]);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const isNumericField = ['costPrice', 'sellingPrice', 'quantity', 'lowStockThreshold'].includes(name);

        setFormData(prev => {
            // Handle empty string for numeric fields to avoid NaN and allow clearing input
            const newValue = isNumericField ? (value === '' ? '' : parseFloat(value)) : value;

            const updated = { ...prev, [name]: newValue };

            // If dealer changes, reset category if it's not valid for the new dealer
            if (name === 'dealer') {
                const isValidCategory = categories.some(c => c.supplier === value && c.name === prev.category);
                if (!isValidCategory) {
                    updated.category = '';
                }
            }
            return updated;
        });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
            if (file.size > MAX_FILE_SIZE) {
                setFormError('Image size cannot exceed 2MB. Please choose a smaller file.');
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
                return;
            }

            setFormError(null);

            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setFormData(prev => ({ ...prev, imageUrl: '' }));
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const openAddModal = () => {
        setEditingProduct(null);
        // Default to first supplier if available
        const defaultSupplier = suppliers.length > 0 ? suppliers[0] : '';
        setFormData({
            ...emptyProduct,
            dealer: defaultSupplier,
            category: '' // Reset category, user must select
        });
        setFormError(null);
        setUpdateReason('');
        setStockUpdateCategory('');
        setIsModalOpen(true);
    };

    const openEditModal = (product: Product) => {
        setEditingProduct(product);
        setFormData(product);
        setFormError(null);
        setUpdateReason('');
        setStockUpdateCategory('');
        setStockChange('');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setEditingProduct(null);
            setFormData(emptyProduct);
            setFormError(null);
            setUpdateReason('');
            setStockUpdateCategory('');
            setStockChange('');
        }, 300);
    };

    const closeDetailModal = () => {
        setViewingProduct(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        const submittedData = {
            ...formData,
            costPrice: Number(formData.costPrice) || 0,
            sellingPrice: Number(formData.sellingPrice) || 0,
            quantity: Number(formData.quantity) || 0,
            lowStockThreshold: Number(formData.lowStockThreshold) || 0,
        };

        if (submittedData.sellingPrice <= submittedData.costPrice) {
            setFormError('Selling Price must be greater than Purchase Price.');
            return;
        }

        if (editingProduct) {
            const changeAmount = Number(stockChange) || 0;
            let finalReason: string | undefined = undefined;

            const productToUpdate = { ...submittedData } as Product;

            if (changeAmount !== 0) {
                if (!stockUpdateCategory) {
                    setFormError('Please select a transaction category.');
                    return;
                }

                const newQuantity = editingProduct.quantity + changeAmount;
                if (newQuantity < 0) {
                    setFormError('Stock quantity cannot be negative.');
                    return;
                }
                productToUpdate.quantity = newQuantity;

                // Construct the final reason string: "Category: Note"
                finalReason = `${stockUpdateCategory}${updateReason ? `: ${updateReason}` : ''}`;
            }

            updateProduct(productToUpdate, finalReason);
        } else {
            addProduct({ ...submittedData, id: `prod_${Date.now()}` } as Product);
        }
        closeModal();
    };

    const getStockIndicator = (product: Product) => {
        const iconClasses = "w-4 h-4 mr-1.5";
        if (product.quantity === 0) {
            return {
                classes: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
                icon: <XCircleIcon className={iconClasses} />,
                label: 'Out of Stock'
            };
        }
        if (product.quantity <= product.lowStockThreshold) {
            return {
                classes: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
                icon: <AlertTriangleIcon className={iconClasses} />,
                label: `${product.quantity} units`
            };
        }
        return {
            classes: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
            icon: <CheckCircleIcon className={iconClasses} />,
            label: `${product.quantity} units`
        };
    };

    const handleExport = () => {
        if (filteredProducts.length === 0) {
            showToast("No products to export.", "error");
            return;
        }

        const headers = ["SKU", "Name", "Category", "Dealer", "Purchase Price", "Selling Price", "Quantity", "Low Stock Threshold"];

        const escapeCsvField = (field: any) => {
            const str = String(field);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const rows = filteredProducts.map(product => [
            product.sku,
            product.name,
            product.category || '',
            product.dealer,
            product.costPrice,
            product.sellingPrice,
            product.quantity,
            product.lowStockThreshold
        ].map(escapeCsvField).join(','));

        const csvContent = [headers.join(','), ...rows].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "inventory.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // List Manager Handlers
    const handleAddSupplier = (e: React.FormEvent) => {
        e.preventDefault();
        if (newSupplierName.trim()) {
            addSupplier(newSupplierName.trim());
            setNewSupplierName('');
        }
    };

    const handleAddCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (newCategoryName.trim() && selectedSupplierForCategory) {
            addCategory(newCategoryName.trim(), selectedSupplierForCategory);
            setNewCategoryName('');
        } else if (!selectedSupplierForCategory) {
            showToast('Please select a supplier for the new category.', 'warning');
        }
    };


    return (
        <div className="p-4 md:p-6 lg:p-8">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200">Inventory</h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-slate-600 text-white font-semibold py-2 px-3 md:px-4 rounded-lg shadow-sm hover:bg-slate-700 transition-colors"
                        title="Export Inventory"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">Export</span>
                    </button>
                    <button
                        onClick={() => setIsListManagerOpen(true)}
                        className="hidden sm:flex items-center gap-2 bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-brand-dark transition-colors"
                    >
                        Manage
                    </button>
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-2 bg-brand-secondary text-white font-semibold py-2 px-3 md:px-4 rounded-lg shadow-sm hover:opacity-90 transition-colors"
                        title="Add Product"
                    >
                        <PlusCircleIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">Add</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-4">
                <input
                    type="search"
                    placeholder="Search by product name or SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-grow block w-full px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                />
                <select
                    value={distributorFilter}
                    onChange={(e) => {
                        setDistributorFilter(e.target.value);
                        setCategoryFilter('all'); // Reset category filter when distributor changes
                    }}
                    className="block w-full md:w-auto px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                >
                    <option value="all">All Suppliers</option>
                    {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="block w-full md:w-auto px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                >
                    <option value="all">All Categories</option>
                    {availableFilterCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                    value={stockStatusFilter}
                    onChange={(e) => setStockStatusFilter(e.target.value)}
                    className="block w-full md:w-auto px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                >
                    <option value="all">All Stock Statuses</option>
                    <option value="inStock">In Stock</option>
                    <option value="lowStock">Low Stock</option>
                    <option value="outOfStock">Out of Stock</option>
                </select>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden dark:bg-slate-800">
                <div className="overflow-x-auto">
                    {products.length > 0 ? (
                        filteredProducts.length > 0 ? (
                            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Product</th>
                                        <th scope="col" className="px-6 py-3">Category</th>
                                        <th scope="col" className="px-6 py-3">Supplier</th>
                                        <th scope="col" className="px-6 py-3">Purchase Price</th>
                                        <th scope="col" className="px-6 py-3">Selling Price</th>
                                        <th scope="col" className="px-6 py-3">Stock</th>
                                        <th scope="col" className="px-6 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map(product => {
                                        const stockInfo = getStockIndicator(product);
                                        return (
                                            <tr key={product.id} className="bg-white border-b hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700">
                                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 flex-shrink-0 bg-slate-100 dark:bg-slate-700 rounded-md flex items-center justify-center overflow-hidden">
                                                            {product.imageUrl ? (
                                                                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <ImageIcon className="w-6 h-6 text-slate-400" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold">{product.name}</div>
                                                            <div className="text-xs text-slate-400">{product.sku}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">{product.category || '-'}</td>
                                                <td className="px-6 py-4">{product.dealer}</td>
                                                <td className="px-6 py-4">₹{product.costPrice.toFixed(2)}</td>
                                                <td className="px-6 py-4 font-semibold text-brand-secondary">₹{product.sellingPrice.toFixed(2)}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${stockInfo.classes}`}>
                                                        {stockInfo.icon} {stockInfo.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <button onClick={() => openDetailModal(product)} className="font-medium text-brand-primary hover:underline">View</button>
                                                        <button onClick={() => openEditModal(product)} className="font-medium text-brand-primary hover:underline">Edit</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-16">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">No Products Found</h3>
                                <p className="text-slate-500 mt-2 dark:text-slate-400">Your search and filter combination did not return any results.</p>
                            </div>
                        )
                    ) : (
                        <div className="text-center py-16">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">No products in inventory</h3>
                            <p className="text-slate-500 mt-2 dark:text-slate-400">Click "Add Product" to get started.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Manage Lists Modal */}
            <Modal isOpen={isListManagerOpen} onClose={() => setIsListManagerOpen(false)} title="Manage Suppliers & Categories" size="2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Suppliers Section */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">Suppliers / Dealers</h3>
                        <form onSubmit={handleAddSupplier} className="flex gap-2 items-stretch">
                            <input
                                type="text"
                                placeholder="New Supplier Name"
                                value={newSupplierName}
                                onChange={(e) => setNewSupplierName(e.target.value)}
                                className="flex-grow px-3 py-2 text-sm bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                            />
                            <button type="submit" disabled={!newSupplierName.trim()} className="flex-shrink-0 px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap font-medium">
                                Add
                            </button>
                        </form>
                        <div className="border rounded-md dark:border-slate-700 max-h-64 overflow-y-auto bg-slate-50 dark:bg-slate-900/30">
                            <ul className="divide-y dark:divide-slate-700">
                                {suppliers.map(supplier => (
                                    <li key={supplier} className="flex justify-between items-center px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                                        {editingSupplier?.original === supplier ? (
                                            <div className="flex items-center gap-2 flex-grow">
                                                <input
                                                    type="text"
                                                    value={editingSupplier.current}
                                                    onChange={(e) => setEditingSupplier({ ...editingSupplier, current: e.target.value })}
                                                    className="flex-grow px-2 py-1 text-sm border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                                                    autoFocus
                                                />
                                                <button onClick={() => { updateSupplier(editingSupplier.original, editingSupplier.current); setEditingSupplier(null); }}>
                                                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                                                </button>
                                                <button onClick={() => setEditingSupplier(null)}>
                                                    <XCircleIcon className="w-4 h-4 text-red-500" />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="text-sm text-slate-700 dark:text-slate-300">{supplier}</span>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => setEditingSupplier({ original: supplier, current: supplier })} className="text-slate-400 hover:text-brand-primary p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                                        <PencilIcon className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setDeleteConfirmation({ type: 'supplier', name: supplier })} className="text-slate-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </li>
                                ))}
                                {suppliers.length === 0 && <li className="px-3 py-4 text-sm text-slate-500 italic text-center">No suppliers added yet.</li>}
                            </ul>
                        </div>
                    </div>

                    {/* Categories Section */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">Categories</h3>
                        <form onSubmit={handleAddCategory} className="space-y-2">
                            <select
                                value={selectedSupplierForCategory}
                                onChange={(e) => setSelectedSupplierForCategory(e.target.value)}
                                className="block w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                            >
                                <option value="">Select Supplier</option>
                                {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <div className="flex gap-2 items-stretch">
                                <input
                                    type="text"
                                    placeholder="New Category Name"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    className="flex-grow px-3 py-2 text-sm bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                                />
                                <button type="submit" disabled={!newCategoryName.trim() || !selectedSupplierForCategory} className="flex-shrink-0 px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap font-medium">
                                    Add
                                </button>
                            </div>
                        </form>
                        <div className="border rounded-md dark:border-slate-700 max-h-64 overflow-y-auto bg-slate-50 dark:bg-slate-900/30">
                            <ul className="divide-y dark:divide-slate-700">
                                {categories.map((cat, index) => (
                                    <li key={`${cat.supplier}-${cat.name}-${index}`} className="flex justify-between items-center px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                                        {editingCategory?.originalName === cat.name && editingCategory.supplier === cat.supplier ? (
                                            <div className="flex items-center gap-2 flex-grow">
                                                <input
                                                    type="text"
                                                    value={editingCategory.current}
                                                    onChange={(e) => setEditingCategory({ ...editingCategory, current: e.target.value })}
                                                    className="flex-grow px-2 py-1 text-sm border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                                                    autoFocus
                                                />
                                                <button onClick={() => { updateCategory(editingCategory.originalName, editingCategory.supplier, editingCategory.current); setEditingCategory(null); }}>
                                                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                                                </button>
                                                <button onClick={() => setEditingCategory(null)}>
                                                    <XCircleIcon className="w-4 h-4 text-red-500" />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{cat.name}</span>
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">for {cat.supplier}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => setEditingCategory({ originalName: cat.name, supplier: cat.supplier, current: cat.name })} className="text-slate-400 hover:text-brand-primary p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                                        <PencilIcon className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setDeleteConfirmation({ type: 'category', name: cat.name, supplier: cat.supplier })} className="text-slate-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </li>
                                ))}
                                {categories.length === 0 && <li className="px-3 py-4 text-sm text-slate-500 italic text-center">No categories added yet.</li>}
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="mt-8 pt-4 border-t dark:border-slate-700 text-right">
                    <button onClick={() => setIsListManagerOpen(false)} className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-300 transition-colors dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">
                        Done
                    </button>
                </div>

                {/* Confirmation Overlay */}
                {deleteConfirmation && (
                    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 rounded-xl p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm w-full shadow-xl border dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Confirm Deletion</h3>
                            <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
                                Are you sure you want to delete {deleteConfirmation.type} <span className="font-semibold">"{deleteConfirmation.name}"</span>?
                                {deleteConfirmation.type === 'supplier' && " This will also delete all associated categories."}
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setDeleteConfirmation(null)}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (deleteConfirmation.type === 'supplier') {
                                            removeSupplier(deleteConfirmation.name);
                                        } else {
                                            removeCategory(deleteConfirmation.name, deleteConfirmation.supplier!);
                                        }
                                        setDeleteConfirmation(null);
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 shadow-sm"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Add/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingProduct ? 'Edit Product' : 'Add New Product'} size="2xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Product Name</label>
                            <input id="name" type="text" name="name" value={formData.name} onChange={handleInputChange} className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" required />
                        </div>
                        <div>
                            <label htmlFor="sku" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">SKU</label>
                            <input id="sku" type="text" name="sku" value={formData.sku} onChange={handleInputChange} className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" required />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <label htmlFor="imageUrl" className="cursor-pointer">
                            <div className="w-24 h-24 flex-shrink-0 bg-slate-100 dark:bg-slate-700 rounded-md flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-brand-primary dark:hover:border-brand-primary transition-colors overflow-hidden">
                                {(formData.imageUrl) ? (
                                    <img src={formData.imageUrl} alt="Product" className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon className="w-8 h-8 text-slate-400" />
                                )}
                            </div>
                        </label>
                        <input type="file" ref={fileInputRef} name="imageUrl" id="imageUrl" accept="image/*" onChange={handleImageChange} className="hidden" />
                        <div>
                            <p className="block text-sm font-medium text-slate-700 dark:text-slate-300">Product Image</p>
                            <p className="text-xs text-slate-400 mt-1">Max file size: 2MB.</p>
                            {formData.imageUrl && (
                                <button
                                    type="button"
                                    onClick={handleRemoveImage}
                                    className="mt-2 w-fit flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                >
                                    <TrashIcon className="w-3 h-3" />
                                    Remove Image
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="dealer" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Supplier</label>
                            <select name="dealer" id="dealer" value={formData.dealer} onChange={handleInputChange} className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                                <option value="" disabled>Select Supplier</option>
                                {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                            <select name="category" id="category" value={formData.category} onChange={handleInputChange} disabled={!formData.dealer || availableFormCategories.length === 0} className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed">
                                <option value="" disabled>Select Category</option>
                                {availableFormCategories.map((c, idx) => <option key={`${c.name}-${idx}`} value={c.name}>{c.name}</option>)}
                            </select>
                            {(!formData.dealer) && <p className="text-xs text-slate-400 mt-1">Select a supplier first</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="costPrice" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Purchase Price</label>
                            <input type="number" id="costPrice" name="costPrice" step="0.01" value={formData.costPrice || ''} onChange={handleInputChange} className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" required />
                        </div>
                        <div>
                            <label htmlFor="sellingPrice" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Selling Price</label>
                            <input type="number" id="sellingPrice" name="sellingPrice" step="0.01" value={formData.sellingPrice || ''} onChange={handleInputChange} className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" required />
                        </div>
                    </div>
                    {!editingProduct && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="quantity" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Initial Quantity</label>
                                <input id="quantity" type="number" name="quantity" value={formData.quantity || ''} onChange={handleInputChange} className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" required />
                            </div>
                            <div>
                                <label htmlFor="lowStockThreshold" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Low Stock Threshold</label>
                                <input id="lowStockThreshold" type="number" name="lowStockThreshold" value={formData.lowStockThreshold || ''} onChange={handleInputChange} className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" required />
                            </div>
                        </div>
                    )}
                    {editingProduct && (
                        <div className="border-t pt-4 space-y-4 dark:border-slate-700">
                            {/* Low Stock Threshold - Editable in Edit Mode */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="lowStockThreshold" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Low Stock Threshold</label>
                                    <input
                                        id="lowStockThreshold"
                                        type="number"
                                        name="lowStockThreshold"
                                        value={formData.lowStockThreshold ?? ''}
                                        onChange={handleInputChange}
                                        className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                                        placeholder="e.g., 10"
                                    />
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Products at or below this quantity will show as "Low Stock"</p>
                                </div>
                            </div>

                            {/* Stock Update Section */}
                            <div className="pt-2">
                                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Update Stock</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Current stock: {editingProduct.quantity}. Enter a positive number to add stock, a negative number to remove.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                                <div className="col-span-1">
                                    <label htmlFor="stockChange" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Change Amount</label>
                                    <input type="number" id="stockChange" placeholder="e.g., -5 or 10" value={stockChange} onChange={(e) => {
                                        setStockChange(e.target.value);
                                        // Reset category when sign changes or clears
                                        if (!e.target.value) setStockUpdateCategory('');
                                    }} className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                                </div>

                                {stockChange !== '' && Number(stockChange) !== 0 && (
                                    <div className="col-span-1">
                                        <label htmlFor="updateCategory" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Transaction Type</label>
                                        <select
                                            id="updateCategory"
                                            value={stockUpdateCategory}
                                            onChange={(e) => setStockUpdateCategory(e.target.value)}
                                            className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                                            required
                                        >
                                            <option value="">Select Type</option>
                                            {Number(stockChange) > 0 ? (
                                                <>
                                                    <option value="Stock Received">Stock Received</option>
                                                    <option value="Customer Return">Customer Return</option>
                                                    <option value="Adjustment">Adjustment</option>
                                                </>
                                            ) : (
                                                <>
                                                    <option value="Purchase">Purchase (Sale)</option>
                                                    <option value="Return">Return (Damage/Defect)</option>
                                                    <option value="Adjustment">Adjustment</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                )}

                                <div className="col-span-1">
                                    <label htmlFor="updateReason" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Note (Optional)</label>
                                    <input type="text" id="updateReason" placeholder="Details..." value={updateReason} onChange={(e) => setUpdateReason(e.target.value)} className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                                </div>
                            </div>
                        </div>
                    )}
                    {formError && (
                        <div className="flex items-center gap-2 p-3 text-sm text-red-800 bg-red-100 rounded-lg dark:bg-red-900/50 dark:text-red-300">
                            <AlertTriangleIcon className="w-5 h-5" />
                            <span>{formError}</span>
                        </div>
                    )}
                    <div className="flex justify-end pt-4">
                        <button type="submit" className="bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-brand-dark transition-colors">{editingProduct ? 'Save Changes' : 'Add Product'}</button>
                    </div>
                </form>
            </Modal>

            {/* Detail Modal */}
            <Modal isOpen={!!viewingProduct} onClose={closeDetailModal} title={viewingProduct?.name || ''} size="xl">
                {viewingProduct && (
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            {viewingProduct.imageUrl && (
                                <img src={viewingProduct.imageUrl} alt={viewingProduct.name} className="w-24 h-24 object-cover rounded-lg border dark:border-slate-700" />
                            )}
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{viewingProduct.sku}</p>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">{viewingProduct.name}</h3>
                                <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full dark:bg-slate-700 dark:text-slate-300">{viewingProduct.category}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4 dark:border-slate-700">
                            <p><span className="font-semibold text-slate-500 dark:text-slate-400">Supplier:</span> {viewingProduct.dealer}</p>
                            <p><span className="font-semibold text-slate-500 dark:text-slate-400">Purchase Price:</span> ₹{viewingProduct.costPrice.toFixed(2)}</p>
                            <p><span className="font-semibold text-slate-500 dark:text-slate-400">Selling Price:</span> ₹{viewingProduct.sellingPrice.toFixed(2)}</p>
                            <p><span className="font-semibold text-slate-500 dark:text-slate-400">In Stock:</span> {viewingProduct.quantity}</p>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Inventory;