import React, { createContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Product, Lead, Customer, Order, StockHistoryEntry, View, LeadStatus, PaymentMethod, BrandingSettings, Referral, ProductCategory } from './types';
import {
  DashboardIcon, InventoryIcon, LeadsIcon, CustomersIcon, ReportsIcon, SunIcon, MoonIcon, HistoryIcon, BillingIcon, GiftIcon, BellIcon, AlertTriangleIcon
} from './components/Icons';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Leads from './components/Leads';
import Customers from './components/Customers';
import Billing from './components/Billing';
import Reports from './components/Reports';
import Referrals from './components/Referrals';
import { CheckCircleIcon, XCircleIcon } from './components/Icons';
import { User } from "firebase/auth"; 
import { signInWithEmail, signInWithGoogle } from "./firebase/auth";
import { logout } from "./firebase/auth";
import { subscribeToCollection } from "./firebase/firestore";
import { addToCollection } from "./firebase/firestore";
import { updateDocument } from "./firebase/firestore";
import { deleteDocument } from "./firebase/firestore";
import { addStockHistoryEntry } from "./firebase/firestore";
import { getDocumentById } from "./firebase/firestore";
import StockRegistry from './components/StockRegistry'; 

export interface CrmContextType {
  products: Product[];
  leads: Lead[];
  customers: Customer[];
  orders: Order[];
  referrals: Referral[];
  stockHistory: StockHistoryEntry[];

  // Dynamic Lists
  suppliers: string[];
  categories: ProductCategory[]; // { name, supplier }

  addSupplier: (name: string) => void;
  updateSupplier: (oldName: string, newName: string) => void;
  removeSupplier: (name: string) => void;

  addCategory: (name: string, supplier: string) => void;
  updateCategory: (oldName: string, supplier: string, newName: string) => void;
  removeCategory: (name: string, supplier: string) => void;

  // Product functions
  addProduct: (product: Omit<Product, 'id'>) => void | Promise<void>;
  updateProduct: (product: Product, reason?: string) => void | Promise<void>;
  deleteProduct: (productId: string) => void | Promise<void>;

  // Lead / Customer / Order
  addLead: (leadData: Omit<Lead, 'id' | 'createdAt'>, referralCode?: string) => void;
  updateLead: (lead: Lead) => void;
  deleteLead: (leadId: string) => void;
  deleteMultipleLeads: (leadIds: string[]) => void;
  convertLeadToCustomer: (lead: Lead) => void;
  addCustomer: (customerData: Omit<Customer, 'id' | 'createdAt'>, referralCode?: string) => void;
  updateCustomer: (customer: Customer) => void;
  addOrder: (newOrder: { customerId: string, productId: string, quantity: number }) => { success: boolean, message: string, order?: Order, newReferralCode?: string };
  updateOrderStatus: (orderId: string, status: 'Paid' | 'Unpaid', paymentMethod: PaymentMethod) => void;
  markRewardAsPaid: (referralId: string) => void;

  // UI / misc
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  toast: { message: string, type: 'success' | 'error' | 'warning', id: number } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
  brandingSettings: BrandingSettings;
  viewingItem: { type: string; id: string } | null;
  setViewingItem: (item: { type: string; id: string } | null) => void;
  clearViewingItem: () => void;
}


export const CrmContext = createContext<CrmContextType | null>(null);

const App: React.FC<{ firebaseUser: User | null }> = ({ firebaseUser }) => {
      // If user is not logged in, show placeholder login screen (temporary)
  if (!firebaseUser) {
  return <SignIn />;
}

/* ---------- Insert this SignIn component somewhere above the default export (near other helpers) ---------- */

function SignIn() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [generalError, setGeneralError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleEmailSignIn(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setEmailError(null);
    setPasswordError(null);
    setGeneralError(null);
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      // on success, index.tsx onAuthState will re-render App with user
    } catch (err: any) {
      // err is AuthFieldError: { field, message }
      if (err?.field === "email") setEmailError(err.message);
      else if (err?.field === "password") setPasswordError(err.message);
      else setGeneralError(err?.message || "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setEmailError(null);
    setPasswordError(null);
    setGeneralError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setGeneralError(err?.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-900">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-brand-primary rounded-md" />
            <div>
              <div className="text-lg font-semibold">NatureHydrovation</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Sign in to continue</div>
            </div>
          </div>

          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded bg-slate-50 dark:bg-slate-900"
                placeholder="your@email.com"
                disabled={loading}
              />
              {emailError && <div className="text-xs text-red-500 mt-1">{emailError}</div>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded bg-slate-50 dark:bg-slate-900"
                placeholder="••••••••"
                disabled={loading}
              />
              {passwordError && <div className="text-xs text-red-500 mt-1">{passwordError}</div>}
            </div>

            {generalError && <div className="text-sm text-red-500">{generalError}</div>}

            <div className="flex gap-2 items-center">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-brand-primary text-white rounded"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="px-3 py-2 border rounded"
                disabled={loading}
              >
                Google
              </button>
            </div>
          </form>

          <div className="mt-4 text-xs text-slate-500">
            Need an account? Ask the admin to create one.
          </div>
        </div>
      </div>
    </div>
  );
}

    const [products, setProducts] = useState<Product[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [suppliers, setSuppliers] = useState<string[]>([]);
    const [categories, setCategories] = useState<{ name: string; supplier: string }[]>([]);
    const [stockHistory, setStockHistory] = useState<StockHistoryEntry[]>([]);   
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'warning', id: number } | null>(null);
    const [viewingItem, setViewingItem] = useState<{ type: string; id: string } | null>(null);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const notificationsRef = useRef<HTMLDivElement>(null);
   

    

// Supplier helpers
const addSupplier = useCallback((name: string) => {
  if (!name) return;
  setSuppliers(prev => prev.includes(name) ? prev : [...prev, name]);
  // optional: also add default category placeholder if you want
  // showToast? If you want user feedback call showToast('Supplier added')
}, []);

const updateSupplier = useCallback((oldName: string, newName: string) => {
  if (!oldName || !newName || oldName === newName) return;
  setSuppliers(prev => prev.map(s => s === oldName ? newName : s));
  // update categories that referenced the old supplier
  setCategories(prev => prev.map(c => c.supplier === oldName ? { ...c, supplier: newName } : c));
}, []);

const removeSupplier = useCallback((name: string) => {
  if (!name) return;
  setSuppliers(prev => prev.filter(s => s !== name));
  // remove categories that belonged to this supplier
  setCategories(prev => prev.filter(c => c.supplier !== name));
}, []);

// Category helpers
const addCategory = useCallback((name: string, supplier: string) => {
  if (!name || !supplier) return;
  // prevent duplicates for same supplier
  if (categories.some(c => c.name === name && c.supplier === supplier)) return;
  setCategories(prev => [...prev, { name, supplier }]);
}, [categories]);

const updateCategory = useCallback((oldName: string, supplier: string, newName: string) => {
  if (!oldName || !newName) return;
  setCategories(prev => prev.map(c => (c.name === oldName && c.supplier === supplier) ? { ...c, name: newName } : c));
}, []);

const removeCategory = useCallback((name: string, supplier: string) => {
  if (!name || !supplier) return;
  setCategories(prev => prev.filter(c => !(c.name === name && c.supplier === supplier)));
}, []);
// --- end suppliers/categories helpers ---


// Firestore: real-time products listener
useEffect(() => {
  const unsubscribe = subscribeToCollection("products", (items) => {
    setProducts(items as Product[]);
  });

  return () => unsubscribe();
}, []); 
// Firestore: real-time stockHistory listener
useEffect(() => {
  const unsubscribe = subscribeToCollection("stockHistory", (items) => {
    setStockHistory(items as StockHistoryEntry[]);
  });
  return () => unsubscribe();
}, []);


    const brandingSettings: BrandingSettings = {
        companyName: "Nature Hydrovation",
        companyAddress: "Hyderabad",
        companyLogo: "",
        brandColor: "#0284c7",
        customField: "GST: 36BGXPS2557L1ZD",
        footerNotes: "Thank you for your business!",
    };
    
    const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
        const id = Date.now();
        setToast({ message, type, id });
        setTimeout(() => setToast(prevToast => (prevToast?.id === id ? null : prevToast)), 4000);
    }, []);

   const addProduct = useCallback(async (productData: Omit<Product, 'id'>) => {
  try {
    // 1) create product in Firestore and get its ID
    const newProductId = await addToCollection("products", productData);

    // 2) if initial quantity provided, record it in stockHistory
    if (typeof productData.quantity === "number" && productData.quantity !== 0) {
      try {
        await addStockHistoryEntry({
          productId: newProductId,
          productName: productData.name,
          reason: "Initial Stock",
          change: productData.quantity,
          newQuantity: productData.quantity,
        });
      } catch (err) {
        console.error("Failed to write initial stock history:", err);
        // don't fail the whole product creation just because history write failed
      }
    }

    showToast("Product added successfully!");
  } catch (error) {
    console.error("Error adding product:", error);
    showToast("Failed to add product", "error");
  }
}, [showToast]);


   const updateProduct = useCallback(
  async (updatedProduct: Product, reason?: string) => {
    try {
      const { id, ...dataWithoutId } = updatedProduct;

      // 1) Get old product from Firestore
      const oldProduct: any = await getDocumentById("products", id);

      // Fallback if old product doesn't exist
      const oldQty = oldProduct?.quantity ?? 0;
      const newQty = updatedProduct.quantity;

      // 2) Calculate change
      const change = newQty - oldQty;

      // 3) Update the product in Firestore
      await updateDocument("products", id, dataWithoutId);

      // 4) Only write stock history if quantity changed
      if (change !== 0 && reason) {
        await addStockHistoryEntry({
          productId: id,
          productName: updatedProduct.name,
          reason: reason,
          change: change,
          newQuantity: newQty,
        });
      }

      showToast("Product updated successfully!");
    } catch (error) {
      console.error("Error updating product:", error);
      showToast("Failed to update product", "error");
    }
  },
  [showToast]
);




    const deleteProduct = useCallback(async (productId: string) => {
  try {
    await deleteDocument("products", productId);
    // optionally delete related stock history documents later (separate step)
    showToast('Product deleted successfully.', 'success');
  } catch (error) {
    console.error("Error deleting product:", error);
    showToast('Failed to delete product.', 'error');
  }
}, [showToast]);



    // Lead Management
    const addLead = useCallback((leadData: Omit<Lead, 'id' | 'createdAt'>, referralCode?: string) => {
        let referredById: string | undefined = undefined;
        let finalSource = leadData.source;

        if (referralCode && referralCode.trim()) {
            const referrer = customers.find(c => c.referralCode === referralCode.trim());
            if (referrer) {
                referredById = referrer.id;
                finalSource = `Referral by ${referrer.name}`;
                showToast(`Lead referred by ${referrer.name}!`);
            } else {
                showToast('Invalid referral code entered.', 'warning');
            }
        }

        const newLead: Lead = {
            ...leadData,
            id: `lead_${Date.now()}`,
            createdAt: new Date().toISOString(),
            referredById: referredById,
            source: finalSource,
        };

        setLeads(prev => [newLead, ...prev]);
        showToast('Lead added successfully!');
    }, [customers, showToast]);
    
    const updateLead = useCallback((updatedLead: Lead) => {
        setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
        showToast('Lead updated successfully.');
    }, [showToast]);

    const deleteLead = useCallback((leadId: string) => {
        setLeads(prevLeads => prevLeads.filter(lead => lead.id !== leadId));
        showToast('Lead deleted successfully.');
    }, [showToast]);

    const deleteMultipleLeads = useCallback((leadIds: string[]) => {
        setLeads(prevLeads => prevLeads.filter(lead => !leadIds.includes(lead.id)));
        showToast(`${leadIds.length} leads deleted successfully.`);
    }, [showToast]);

    const convertLeadToCustomer = useCallback((lead: Lead) => {
        if (lead.status !== LeadStatus.Qualified) {
            showToast("Only 'Qualified' leads can be converted.", 'warning');
            return;
        }
        updateLead({ ...lead, status: LeadStatus.Converted });
        const newCustomer: Customer = {
            id: `cust_${Date.now()}`, name: lead.name, email: lead.email, phone: lead.phone, address: '',
            createdAt: new Date().toISOString(), sourceLeadId: lead.id, source: lead.source, referredById: lead.referredById,
        };
        setCustomers(prev => [newCustomer, ...prev]);
        showToast('Lead converted to customer!');
    }, [showToast, updateLead]);

    // Customer Management
    const addCustomer = useCallback((customerData: Omit<Customer, 'id' | 'createdAt'>, referralCode?: string) => {
        let referredById: string | undefined = undefined;
        let finalSource = customerData.source;
        if (referralCode?.trim()) {
            const referrer = customers.find(c => c.referralCode === referralCode.trim());
            if (referrer) {
                referredById = referrer.id;
                finalSource = `Referral by ${referrer.name}`;
                showToast(`Customer referred by ${referrer.name}!`);
            } else {
                showToast('Invalid referral code entered.', 'warning');
            }
        }
        const newCustomer: Customer = {
            ...customerData, id: `cust_${Date.now()}`, createdAt: new Date().toISOString(), referredById, source: finalSource,
        };
        setCustomers(prev => [newCustomer, ...prev]);
        showToast('Customer added successfully!');
    }, [customers, showToast]);

    const updateCustomer = useCallback((updatedCustomer: Customer) => {
        setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
        showToast('Customer updated successfully.');
    }, [showToast]);

    // Order Management
    const addOrder = useCallback((newOrder: { customerId: string, productId: string, quantity: number }) => {
        const product = products.find(p => p.id === newOrder.productId);

        if (!product || product.quantity < newOrder.quantity) {
            return { success: false, message: 'Insufficient stock or product not found.' };
        }

        const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const dailyOrderCount = orders.filter(o => o.invoiceNumber.startsWith(`INV-${datePrefix}`)).length;
        const sequence = String(dailyOrderCount + 1).padStart(2, '0');
        const invoiceNumber = `INV-${datePrefix}-${sequence}`;

        const order: Order = {
            id: `ord_${Date.now()}`,
            customerId: newOrder.customerId,
            productId: newOrder.productId,
            productName: product.name,
            quantity: newOrder.quantity,
            salePrice: product.sellingPrice,
            orderDate: new Date().toISOString(),
            invoiceNumber,
            paymentStatus: 'Unpaid',
        };
        setOrders(prev => [order, ...prev]);
        const updatedProduct = { ...product, quantity: product.quantity - newOrder.quantity };
        updateProduct(updatedProduct, `Sale (Invoice ${invoiceNumber})`);
        
        return { success: true, message: `Order #${invoiceNumber} placed successfully!`, order };
    }, [products, orders, updateProduct]);

    const updateOrderStatus = useCallback((orderId: string, status: 'Paid' | 'Unpaid', paymentMethod: PaymentMethod) => {
        let updatedOrder: Order | null = null;
        let newReferralCode: string | undefined = undefined;

        setOrders(prevOrders => prevOrders.map(o => {
            if (o.id === orderId) {
                updatedOrder = { ...o, paymentStatus: status, paymentMethod, paymentDate: new Date().toISOString() };
                return updatedOrder;
            }
            return o;
        }));

        if (status === 'Paid' && updatedOrder) {
            const customer = customers.find(c => c.id === updatedOrder!.customerId);
            if (!customer) return;

            const customerPaidOrders = orders.filter(o => o.customerId === customer.id && o.paymentStatus === 'Paid');
            if (customerPaidOrders.length === 0 && !customer.referralCode) {
                 const uniqueId = Math.random().toString(36).substring(2, 6).toUpperCase();
                const referralCode = `NH-${customer.id.substring(5, 9)}-${uniqueId}`;
                const updatedCustomer = { ...customer, referralCode };
                setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
                showToast(`Referral code generated for ${customer.name}!`, 'success');
                newReferralCode = referralCode;
            }

            if (customer.referredById) {
                const newReferral: Referral = {
                    id: `ref_${Date.now()}`, referrerId: customer.referredById, refereeId: customer.id, orderId: updatedOrder.id,
                    date: new Date().toISOString(), status: 'Completed', rewardAmount: 500,
                };
                setReferrals(prev => [newReferral, ...prev]);
                const referrer = customers.find(c => c.id === customer.referredById);
                if (referrer) showToast(`Referral complete! ${referrer.name} earned a reward.`, 'success');
            }
        }
    }, [orders, customers, showToast]);

    const markRewardAsPaid = useCallback((referralId: string) => {
        setReferrals(prev => prev.map(r => r.id === referralId ? { ...r, status: 'RewardPaid' } : r));
        showToast('Reward marked as paid.');
    }, [showToast]);
    
    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };
    
    const overdueFollowUps = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return leads.filter(lead => lead.followUpDate && new Date(lead.followUpDate) < today);
    }, [leads]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) setIsNotificationsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const clearViewingItem = () => setViewingItem(null);

    const contextValue: CrmContextType = {
        products, leads, customers, orders, stockHistory, referrals, suppliers,
       categories,
  addSupplier,
  updateSupplier,
  removeSupplier,
  addCategory,
  updateCategory,
  removeCategory,

        addProduct, updateProduct, deleteProduct, 
        addLead, updateLead, deleteLead, deleteMultipleLeads, convertLeadToCustomer,
        addCustomer, updateCustomer, addOrder, updateOrderStatus, markRewardAsPaid,
        theme, toggleTheme, toast, showToast, brandingSettings,
        viewingItem, setViewingItem, clearViewingItem 
    };

    const renderView = () => {
        switch (currentView) {
            case 'dashboard': return <Dashboard />;
            case 'inventory': return <Inventory />;
            case 'stock-registry': return <StockRegistry />; 
            case 'leads': return <Leads />;
            case 'customers': return <Customers />;
            case 'billing': return <Billing />;
            case 'reports': return <Reports />;
            case 'referrals': return <Referrals />;
            default: return <Dashboard />;
        }
    };
    
    const ToastComponent = () => {
        if (!toast) return null;
        const icons = { success: <CheckCircleIcon className="w-6 h-6 text-green-500" />, error: <XCircleIcon className="w-6 h-6 text-red-500" />, warning: <AlertTriangleIcon className="w-6 h-6 text-orange-500" />, };
        const colors = { success: 'border-green-500', error: 'border-red-500', warning: 'border-orange-500', };
        return ( <div className={`fixed bottom-5 right-5 bg-white dark:bg-slate-800 shadow-lg rounded-lg p-4 border-l-4 ${colors[toast.type]} flex items-center gap-3 z-[100] animate-fade-in-up`}> {icons[toast.type]} <p className="text-slate-800 dark:text-slate-200">{toast.message}</p> </div> );
    };

    return (
        <CrmContext.Provider value={contextValue}>
            <div className={`flex h-screen bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100 font-sans`}>
                <aside className="w-64 bg-white dark:bg-slate-800 flex flex-col flex-shrink-0 shadow-md">
                    <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-700">
                        
                        <h1 className="text-xl font-bold ml-2 text-slate-800 dark:text-slate-200">NatureHydrovation</h1>
                    </div>
                    <nav className="flex-1 p-4 space-y-2">
                        {(Object.keys(VIEWS) as View[]).map(view => {
                            const viewConfig = VIEWS[view];
                            const isActive = currentView === view;
                            const icon = React.cloneElement(viewConfig.icon, {
                                className: `w-5 h-5 ${isActive ? viewConfig.color : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'}`
                            });
                            return (
                                <button key={view} onClick={() => setCurrentView(view)} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors group ${ isActive ? `${viewConfig.activeColor}` : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700' }`} >
                                    {icon}
                                    <span>{viewConfig.label}</span>
                                </button>
                            )
                        })}
                    </nav>
                     <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                         <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700">
                            {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
                            <span>Switch to {theme === 'light' ? 'Dark' : 'Light'}</span>
                        </button>
                    </div>
                </aside>
                <main className="flex-1 flex flex-col overflow-hidden">
                     <header className="h-16 bg-white dark:bg-slate-800 flex-shrink-0 flex items-center justify-end px-6 border-b border-slate-200 dark:border-slate-700">
                        <div ref={notificationsRef} className="relative">
                            <button onClick={() => setIsNotificationsOpen(prev => !prev)} className="relative text-slate-500 hover:text-brand-primary dark:text-slate-400 dark:hover:text-brand-primary transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Notifications" >
                                <BellIcon className="w-6 h-6" />
                                {overdueFollowUps.length > 0 && ( <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-800" /> )}
                            </button>
                            {isNotificationsOpen && (
                                <div className="absolute z-20 mt-2 w-72 origin-top-right right-0 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-slate-800 dark:ring-slate-700">
                                    <div className="p-2">
                                        <h3 className="px-2 py-1 text-sm font-semibold text-slate-800 dark:text-slate-200">Overdue Follow-ups ({overdueFollowUps.length})</h3>
                                    </div>
                                    <div className="py-1 max-h-80 overflow-y-auto">
                                        {overdueFollowUps.length > 0 ? (
                                            overdueFollowUps.map(lead => (
                                                <button key={lead.id} onClick={() => { setCurrentView('leads'); setViewingItem({ type: 'lead', id: lead.id }); setIsNotificationsOpen(false); }} className="w-full text-left flex items-start gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700" >
                                                    <AlertTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="font-semibold">{lead.name}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400"> Due on {new Date(lead.followUpDate!).toLocaleDateString()} </p>
                                                    </div>
                                                </button>
                                            ))
                                        ) : ( <p className="px-3 py-4 text-sm text-center text-slate-500 dark:text-slate-400">No overdue follow-ups. Great job!</p> )}
                                    </div>
                                </div>
                            )}
                        </div>
                          {/* --- User area: email + sign out --- */}
                        <div className="ml-4 flex items-center gap-3">
                          {/* show user email if available - safe optional chaining */}
                          <div className="text-right mr-2">
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                              { /* firebaseUser is passed into App; show email if present */ }
                              {firebaseUser?.email ?? "User"}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {/* optional role label */}
                              Admin
                            </div>
                          </div>

                          <button
                            onClick={async () => {
                              try {
                                await logout();
                                showToast && showToast("Signed out successfully.", "success");
                              } catch (err) {
                                console.error("Logout failed", err);
                                showToast && showToast("Sign out failed. Check console.", "error");
                              }
                            }}
                            className="px-3 py-1 rounded bg-red-500 text-white text-sm"
                            aria-label="Sign out"
                          >
                            Sign out
                          </button>
                        </div> 
                    </header>
                    <div className="flex-1 overflow-y-auto">
                        {renderView()}
                    </div>
                </main>
            </div>
            <ToastComponent />
        </CrmContext.Provider>
    );
};

const VIEWS: Record<View, { label: string; icon: React.ReactElement<{ className?: string }>; color: string; activeColor: string; }> = {
    dashboard: { label: 'Dashboard', icon: <DashboardIcon />, color: 'text-sky-500', activeColor: 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300' },
    inventory: { label: 'Inventory', icon: <InventoryIcon />, color: 'text-emerald-500', activeColor: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300' },
    'stock-registry': { label: 'Stock Registry', icon: <HistoryIcon />, color: 'text-violet-500', activeColor: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300' },
    leads: { label: 'Leads', icon: <LeadsIcon />, color: 'text-amber-500', activeColor: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300' },
    customers: { label: 'Customers', icon: <CustomersIcon />, color: 'text-blue-500', activeColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300' },
    referrals: { label: 'Referrals', icon: <GiftIcon />, color: 'text-pink-500', activeColor: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300' },
    billing: { label: 'Billing', icon: <BillingIcon />, color: 'text-indigo-500', activeColor: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300' },
    reports: { label: 'Reports', icon: <ReportsIcon />, color: 'text-purple-500', activeColor: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300' },
};

export default App;