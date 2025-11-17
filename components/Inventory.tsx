import React, { useState, useContext, useMemo, useRef, useEffect } from 'react';
import { CrmContext } from '../App';
import { Product, DistributorSupplier } from '../types';
import Modal from './Modal';
import { PlusCircleIcon, DownloadIcon, CheckCircleIcon, AlertTriangleIcon, XCircleIcon, ImageIcon, TrashIcon } from './Icons';

const emptyProductData: Omit<Product, 'id'> = {
    name: '',
    supplier: DistributorSupplier.Globexi,
    sku: '',
    costPrice: 0,
    sellingPrice: 0,
    quantity: 0,
    lowStockThreshold: 10,
    imageUrl: '',
};

const inputStyles = "mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200";
const labelStyles = "block text-sm font-medium text-slate-700 dark:text-slate-300";


const Inventory = () => {
    const context = useContext(CrmContext);
    if (!context) return null;
    const { products, orders, addProduct, updateProduct, deleteProduct, stockHistory, viewingItem, clearViewingItem, showToast } = context;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState<Omit<Product, 'id'>>(emptyProductData);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [supplierFilter, setSupplierFilter] = useState<string>('all');
    const [stockStatusFilter, setStockStatusFilter] = useState<string>('all');
    const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [updateReason, setUpdateReason] = useState('');
    const [stockChange, setStockChange] = useState<number | string>('');
    const [productToDelete, setProductToDelete] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        if (viewingItem?.type === 'product') {
            const productToView = products.find(p => p.id === viewingItem.id);
            if (productToView) {
                setViewingProduct(productToView);
                clearViewingItem();
            }
        }
    }, [viewingItem, products, clearViewingItem]);

    const productsWithOrderData = useMemo(() => {
        const productOrderMap = new Map<string, boolean>();
        orders.forEach(order => {
            productOrderMap.set(order.productId, true);
        });
        return products.map(product => ({
            ...product,
            hasOrders: productOrderMap.has(product.id)
        }));
    }, [products, orders]);

    const filteredProducts = useMemo(() => {
        let tempProducts = [...productsWithOrderData];

        if (searchQuery) {
            tempProducts = tempProducts.filter(product =>
                product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.sku.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (supplierFilter !== 'all') {
            tempProducts = tempProducts.filter(product => product.supplier === supplierFilter);
        }

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
    }, [productsWithOrderData, searchQuery, supplierFilter, stockStatusFilter]);

    const productHistory = useMemo(() => {
        if (!viewingProduct) return [];
        return stockHistory
            .filter(entry => entry.productId === viewingProduct.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [stockHistory, viewingProduct]);
    
    const handleFormInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const isNumericField = ['costPrice', 'sellingPrice', 'quantity', 'lowStockThreshold'].includes(name);
        setFormData(prev => ({ ...prev, [name]: isNumericField ? parseFloat(value) : value }));
    };
    
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
            if (file.size > MAX_FILE_SIZE) {
                setFormError('Image size cannot exceed 2MB.');
                if (fileInputRef.current) fileInputRef.current.value = "";
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
    
    const openModal = (product?: Product) => {
        setFormError(null);
        setUpdateReason('');
        setStockChange('');
        if (product) {
            setEditingProduct(product);
            setFormData(product);
        } else {
            setEditingProduct(null);
            setFormData(emptyProductData);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setEditingProduct(null);
        }, 300);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (formData.sellingPrice <= formData.costPrice) {
            setFormError('Unit Price must be greater than Cost Price.');
            return;
        }

        if (editingProduct) {
            const changeAmount = Number(stockChange) || 0;
            let reasonForUpdate: string | undefined = undefined;
            const productToUpdate = { ...formData } as Product;

            if (changeAmount !== 0) {
                if (!updateReason.trim()) {
                    setFormError('Please provide a reason for the stock change.');
                    return;
                }
                const newQuantity = editingProduct.quantity + changeAmount;
                if (newQuantity < 0) {
                    setFormError('Stock quantity cannot be negative.');
                    return;
                }
                productToUpdate.quantity = newQuantity;
                reasonForUpdate = updateReason;
            }
            updateProduct(productToUpdate, reasonForUpdate);
        } else {
            addProduct(formData);
        }
        closeModal();
    };

    const handleConfirmDelete = () => {
        if (productToDelete) {
            deleteProduct(productToDelete);
            setProductToDelete(null);
        }
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
        const headers = ["Product Name", "SKU", "Supplier", "Cost Price", "Selling Price", "Quantity", "Low Stock Threshold"];
        const escapeCsvField = (field: any) => `"${String(field).replace(/"/g, '""')}"`;
        
        const rows = filteredProducts.map(p => [
            p.name, p.sku, p.supplier, p.costPrice, p.sellingPrice, p.quantity, p.lowStockThreshold
        ].map(escapeCsvField).join(','));

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "inventory.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Inventory Management</h1>
                <div className="flex items-center gap-2">
                    <button onClick={handleExport} className="flex items-center gap-2 bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-700 transition-colors">
                        <DownloadIcon className="w-5 h-5" />
                        Export CSV
                    </button>
                    <button onClick={() => openModal()} className="flex items-center gap-2 bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-brand-dark transition-colors">
                        <PlusCircleIcon className="w-5 h-5" />
                        Add Product
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
                <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className="block w-full md:w-auto px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                    <option value="all">All Suppliers</option>
                    {Object.values(DistributorSupplier).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={stockStatusFilter} onChange={(e) => setStockStatusFilter(e.target.value)} className="block w-full md:w-auto px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
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
                                        <th scope="col" className="px-6 py-3">SKU</th>
                                        <th scope="col" className="px-6 py-3">Supplier</th>
                                        <th scope="col" className="px-6 py-3">Unit Price</th>
                                        <th scope="col" className="px-6 py-3">Stock Status</th>
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
                                                        <div className="w-12 h-12 flex-shrink-0 bg-slate-100 dark:bg-slate-700 rounded-md flex items-center justify-center">
                                                            {product.imageUrl ? (
                                                                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-md" />
                                                            ) : (
                                                                <ImageIcon className="w-6 h-6 text-slate-400" />
                                                            )}
                                                        </div>
                                                        <span className="font-semibold">{product.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-400">{product.sku}</td>
                                                <td className="px-6 py-4">{product.supplier}</td>
                                                <td className="px-6 py-4 font-semibold text-brand-secondary">₹{product.sellingPrice.toFixed(2)}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${stockInfo.classes}`}>
                                                        {stockInfo.icon} {stockInfo.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <button onClick={() => setViewingProduct(product)} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">View</button>
                                                        <button onClick={() => openModal(product)} className="font-medium text-brand-primary hover:underline">Edit</button>
                                                        <button 
                                                            onClick={() => setProductToDelete(product.id)} 
                                                            className="text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-slate-400" 
                                                            title={product.hasOrders ? "Cannot delete product with existing orders" : "Delete Product"}
                                                            disabled={product.hasOrders}
                                                        >
                                                          <TrashIcon className="w-5 h-5"/>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : ( <div className="text-center py-16"><h3 className="text-lg font-semibold">No Products Found</h3><p className="mt-2">Your search and filter combination did not return any results.</p></div> )
                    ) : ( <div className="text-center py-16"><h3 className="text-lg font-semibold">No products in inventory</h3><p className="mt-2">Click "Add Product" to get started.</p></div> )}
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingProduct ? 'Edit Product' : 'Add New Product'} size="2xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex items-start gap-6">
                         <div className="space-y-1 text-center">
                            <label htmlFor="imageUrl" className="cursor-pointer">
                                <div className="w-28 h-28 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-brand-primary dark:hover:border-brand-primary transition-colors">
                                    {formData.imageUrl ? <img src={formData.imageUrl} alt="Product" className="w-full h-full object-cover rounded-md" /> : <ImageIcon className="w-10 h-10 text-slate-400 dark:text-slate-500" />}
                                </div>
                            </label>
                            <input type="file" ref={fileInputRef} name="imageUrl" id="imageUrl" accept="image/*" onChange={handleImageChange} className="hidden" />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Product Image</p>
                        </div>
                        <div className="flex-grow space-y-4">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="name" className={labelStyles}>Product Name</label>
                                    <input id="name" type="text" name="name" value={formData.name} onChange={handleFormInputChange} className={inputStyles} required />
                                </div>
                                 <div>
                                    <label htmlFor="sku" className={labelStyles}>SKU</label>
                                    <input id="sku" type="text" name="sku" value={formData.sku} onChange={handleFormInputChange} className={inputStyles} required />
                                </div>
                            </div>
                             <div>
                                <label htmlFor="supplier" className={labelStyles}>Supplier</label>
                                <select name="supplier" id="supplier" value={formData.supplier} onChange={handleFormInputChange} className={inputStyles}>
                                    {Object.values(DistributorSupplier).map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label htmlFor="costPrice" className={labelStyles}>Cost Price</label><input type="number" id="costPrice" name="costPrice" step="0.01" value={formData.costPrice || ''} onChange={handleFormInputChange} className={inputStyles} required /></div>
                        <div><label htmlFor="sellingPrice" className={labelStyles}>Unit Price</label><input type="number" id="sellingPrice" name="sellingPrice" step="0.01" value={formData.sellingPrice || ''} onChange={handleFormInputChange} className={inputStyles} required /></div>
                    </div>

                    {!editingProduct && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label htmlFor="quantity" className={labelStyles}>Initial Quantity</label><input id="quantity" type="number" name="quantity" value={formData.quantity || ''} onChange={handleFormInputChange} className={inputStyles} required /></div>
                            <div><label htmlFor="lowStockThreshold" className={labelStyles}>Low Stock Threshold</label><input id="lowStockThreshold" type="number" name="lowStockThreshold" value={formData.lowStockThreshold || ''} onChange={handleFormInputChange} className={inputStyles} required /></div>
                        </div>
                    )}
                     {editingProduct && (
                        <div className="border-t pt-4 space-y-2 dark:border-slate-700">
                            <h4 className="text-base font-medium text-slate-800 dark:text-slate-200">Update Stock</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Current stock: {editingProduct?.quantity} units. Use positive values to add stock, negative to remove.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div><label htmlFor="stockChange" className={labelStyles}>Stock Change</label><input type="number" id="stockChange" placeholder="e.g., -5 or 10" value={stockChange} onChange={(e) => setStockChange(e.target.value)} className={inputStyles} /></div>
                                <div><label htmlFor="updateReason" className={labelStyles}>Reason for Change</label><input type="text" id="updateReason" value={updateReason} onChange={(e) => setUpdateReason(e.target.value)} className={inputStyles} /></div>
                            </div>
                        </div>
                    )}
                    
                     {formError && ( <div className="flex items-center gap-2 p-3 text-sm text-red-800 bg-red-100 rounded-lg dark:bg-red-900/50 dark:text-red-300"><AlertTriangleIcon className="w-5 h-5" /><span>{formError}</span></div> )}
                    <div className="flex justify-end pt-4"><button type="submit" className="bg-brand-primary text-white font-semibold py-2 px-6 rounded-lg shadow-sm hover:bg-brand-dark transition-colors">{editingProduct ? 'Save Changes' : 'Add Product'}</button></div>
                </form>
            </Modal>

            <Modal isOpen={!!viewingProduct} onClose={() => setViewingProduct(null)} title={`Product Details: ${viewingProduct?.name || ''}`} size="2xl">
                {viewingProduct && (
                    <div className="space-y-6">
                        <div className="flex items-start gap-6">
                            <div className="w-24 h-24 flex-shrink-0 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                                {viewingProduct.imageUrl ? (
                                    <img src={viewingProduct.imageUrl} alt={viewingProduct.name} className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                    <ImageIcon className="w-10 h-10 text-slate-400" />
                                )}
                            </div>
                            <div className="flex-grow">
                                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{viewingProduct.name}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">SKU: {viewingProduct.sku}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Supplier: {viewingProduct.supplier}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Cost Price</p>
                                <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">₹{viewingProduct.costPrice.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Unit Price</p>
                                <p className="text-lg font-semibold text-brand-secondary">₹{viewingProduct.sellingPrice.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Quantity</p>
                                <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">{viewingProduct.quantity}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Low Stock At</p>
                                <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">{viewingProduct.lowStockThreshold}</p>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-2">Stock History</h4>
                            <div className="max-h-60 overflow-y-auto border rounded-lg dark:border-slate-700">
                                {productHistory.length > 0 ? (
                                    <table className="w-full text-sm">
                                        <thead className="text-xs uppercase text-slate-500 dark:text-slate-400 sticky top-0 bg-slate-50/80 backdrop-blur-sm dark:bg-slate-700/80">
                                            <tr className="text-left">
                                                <th className="p-2 font-medium">Date</th>
                                                <th className="p-2 font-medium">Change</th>
                                                <th className="p-2 font-medium">Reason</th>
                                                <th className="p-2 font-medium">New Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {productHistory.map(entry => (
                                                <tr key={entry.id} className="text-slate-700 dark:text-slate-300">
                                                    <td className="p-2">{new Date(entry.date).toLocaleString()}</td>
                                                    <td className={`p-2 font-semibold ${entry.change > 0 ? 'text-green-600' : 'text-red-600'}`}>{entry.change > 0 ? `+${entry.change}` : entry.change}</td>
                                                    <td className="p-2">{entry.reason}</td>
                                                    <td className="p-2 font-medium text-slate-800 dark:text-slate-100">{entry.newQuantity}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="p-4 text-center text-slate-500 dark:text-slate-400">No history for this product.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
            
            <Modal isOpen={!!productToDelete} onClose={() => setProductToDelete(null)} title="Confirm Deletion">
                <div>
                    <p className="text-slate-600 dark:text-slate-300">
                        Are you sure you want to delete this product? All associated stock history will be removed. This action cannot be undone.
                    </p>
                    <div className="flex justify-end pt-6 gap-2">
                        <button onClick={() => setProductToDelete(null)} className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-300 transition-colors dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">
                            Cancel
                        </button>
                        <button onClick={handleConfirmDelete} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-red-700 transition-colors">
                            Delete Product
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Inventory;