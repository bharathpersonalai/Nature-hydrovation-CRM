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
import { getFirestore, doc, getDoc } from "firebase/firestore";


export interface CrmContextType {
  products: Product[];
  leads: Lead[];
  customers: Customer[];
  orders: Order[];
  referrals: Referral[];
  stockHistory: StockHistoryEntry[];

  // Suppliers / Categories (dynamic lists)
  suppliers: string[];
  categories: { name: string; supplier: string }[]; // ProductCategory shape in your codebase
  addSupplier: (name: string) => void;
  updateSupplier: (oldName: string, newName: string) => void;
  removeSupplier: (name: string) => void;
  addCategory: (name: string, supplier: string) => void;
  updateCategory: (oldName: string, supplier: string, newName: string) => void;
  removeCategory: (name: string, supplier: string) => void;

  // Product CRUD
  addProduct: (product: Omit<Product, 'id'>) => Promise<void> | void;
  updateProduct: (product: Product, reason?: string) => Promise<void> | void;
  deleteProduct: (productId: string) => Promise<void> | void;

  // Lead CRUD
addLead: (leadData: Omit<Lead, 'id' | 'createdAt'>, referralCode?: string) => Promise<void>;
updateLead: (lead: Lead) => Promise<void>;
deleteLead: (leadId: string) => Promise<void>;
deleteMultipleLeads: (leadIds: string[]) => Promise<void>;
convertLeadToCustomer: (lead: Lead) => Promise<void>; 



  // Customer CRUD
  addCustomer: (customerData: Omit<Customer, 'id' | 'createdAt'>, referralCode?: string) => Promise<void> | void;
  updateCustomer: (customer: Customer) => Promise<void> | void;

  // Orders / invoices
  addOrder: (newOrder: { customerId: string; productId: string; quantity: number }) => { success: boolean; message: string; order?: Order; newReferralCode?: string };
  updateOrderStatus: (orderId: string, status: 'Paid' | 'Unpaid', paymentMethod: PaymentMethod) => Promise<void> | void;
  updateInvoiceStatus?: (orderId: string, status: 'Paid' | 'Unpaid', paymentMethod: PaymentMethod) => Promise<void> | void;
  markRewardAsPaid: (referralId: string) => void;  

  // UI / theme / toasts
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  toast: { message: string; type: 'success' | 'error' | 'warning'; id: number } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
  brandingSettings: BrandingSettings;

  // Viewing / details
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

  // ... keep logic (handleEmailSignIn etc) exactly the same ...

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 relative overflow-hidden">
      
      {/* Animated Background Layers */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-red-900 via-slate-900 to-black animate-gradient-slow bg-[length:400%_400%]" />
        {/* Floating orbs for effect */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/10 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border border-white/20">
          
          <div className="flex flex-col items-center justify-center mb-8 text-center">
             <img 
               src="/SI.png" 
               alt="SmartGen Logo" 
               className="h-16 w-16 object-contain rounded-xl shadow-lg mb-4 bg-white p-1" 
             />
             <h2 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h2>
             <p className="text-slate-300 text-sm mt-1">SmartgenAI Innovations</p>
          </div>

          <form onSubmit={handleEmailSignIn} className="space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-300 font-semibold mb-1 ml-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-white/10 rounded-xl bg-black/20 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all backdrop-blur-sm"
                placeholder="name@company.com"
                disabled={loading}
              />
              {emailError && <div className="text-xs text-red-400 mt-1 ml-1 font-medium">{emailError}</div>}
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-300 font-semibold mb-1 ml-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-white/10 rounded-xl bg-black/20 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all backdrop-blur-sm"
                placeholder="••••••••"
                disabled={loading}
              />
              {passwordError && <div className="text-xs text-red-400 mt-1 ml-1 font-medium">{passwordError}</div>}
            </div>

            {generalError && <div className="p-3 rounded-lg bg-red-500/20 text-red-200 text-sm border border-red-500/30 text-center">{generalError}</div>}

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? "Authenticating..." : "Sign In to Dashboard"}
            </button>
            
            <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-4 text-slate-400 text-xs">Or continue with</span>
                <div className="flex-grow border-t border-white/10"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 border border-white/20 rounded-xl hover:bg-white/10 transition-colors font-medium text-white text-sm flex items-center justify-center gap-2"
              disabled={loading}
            >
              {/* Google G Icon */}
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.536-6.033-5.696  c0-3.159,2.701-5.696,6.033-5.696c1.482,0,2.846,0.48,3.928,1.264l2.927-2.917c-1.931-1.662-4.532-2.663-7.519-2.663  C6.551,2.398,1.751,6.864,1.751,12.378c0,5.513,4.8,9.979,10.795,9.979c6.218,0,10.129-4.382,10.129-9.889  c0-0.638-0.081-1.252-0.208-1.849h-9.921H12.545z"/></svg>
              Google
            </button>
          </form>
        </div>
      </div>
      
      {/* CSS Animation Styles embedded for this component */}
      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-slow {
          animation: gradient 15s ease infinite;
        }
      `}</style>
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
    const [userRole, setUserRole] = useState("user");

    

// replace the previous addSupplier with this Firestore-backed one
const addSupplier = useCallback(async (name: string) => {
  if (!name) return;
  try {
    await addToCollection("suppliers", { name: name.trim() });
    // don't call setSuppliers here — the real-time listener will update state
  } catch (err) {
    console.error('addSupplier failed:', err);
  }
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
const addCategory = useCallback(async (name: string, supplier: string) => {
  if (!name || !supplier) return;
  
  try {
    // Save directly to Firestore
    await addToCollection("categories", { 
      name: name.trim(), 
      supplier: supplier.trim() 
    });
  } catch (error) {
    console.error("Error adding category:", error);
  }
}, []); 

const updateCategory = useCallback(async (oldName: string, supplier: string, newName: string) => {
  if (!oldName || !newName) return;

  // Find the Firestore ID based on the name/supplier
  const categoryToUpdate = (categories as any[]).find(c => c.name === oldName && c.supplier === supplier);

  if (categoryToUpdate && categoryToUpdate.id) {
    try {
      await updateDocument("categories", categoryToUpdate.id, { name: newName });
    } catch (error) {
      console.error("Error updating category:", error);
    }
  }
}, [categories]);

const removeCategory = useCallback(async (name: string, supplier: string) => {
  if (!name || !supplier) return;

  // Find the Firestore ID
  const categoryToDelete = (categories as any[]).find(c => c.name === name && c.supplier === supplier);

  if (categoryToDelete && categoryToDelete.id) {
    try {
      await deleteDocument("categories", categoryToDelete.id);
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  }
}, [categories]);
// --- end suppliers/categories helpers ---


useEffect(() => {
  async function fetchRoleFromFirestore() {
    if (firebaseUser) {
      const db = getFirestore();
      const ref = doc(db, "admins", firebaseUser.uid);
      const snap = await getDoc(ref);
      setUserRole(snap.exists() ? snap.data().role : "user");
    } else {
      setUserRole("user");
    }
  }
  fetchRoleFromFirestore();
}, [firebaseUser]); 

// Firestore: real-time suppliers listener

useEffect(() => {
  const unsubscribe = subscribeToCollection("suppliers", (items) => {
    const names = (items || []).map((doc: any) => doc.name).filter(Boolean);
    setSuppliers(names);
  });
  return () => unsubscribe();
}, []);

 
// Firestore: real-time categories listener
useEffect(() => {
  const unsubscribe = subscribeToCollection("categories", (items) => {
    if (!items) return;

    // We MUST map the 'id' here so update/delete functions can find it later
    const cats = items.map((c: any) => ({
      id: c.id, // <--- Critical: maps the document ID from Firestore
      name: c.name || c.categoryName || "Unnamed Category",
      supplier: c.supplier || c.vendor || "" 
    }));
    
    setCategories(cats);
  });
  return () => unsubscribe();
}, []);

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
// Firestore: real-time Lead listener
useEffect(() => {
  const unsubscribe = subscribeToCollection("leads", (items) => {
    setLeads(items as Lead[]);
  });
  return () => unsubscribe();
}, []);
// Firestore: real-time Customer listener
useEffect(() => {
  const unsubscribe = subscribeToCollection("customers", (items) => {
    setCustomers(items as Customer[]);
  });
  return () => unsubscribe();
}, []); 
// Firestore: Real-time orders listener
useEffect(() => {
  const unsubscribe = subscribeToCollection("orders", (items) => {
    if (!items) return;
    // Sort by date (newest first) so the dashboard looks good
    const sortedOrders = items.map((doc: any) => ({
       ...doc,
       id: doc.id 
    })).sort((a: any, b: any) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    
    setOrders(sortedOrders);
  });
  return () => unsubscribe();
}, []);

// Firestore: real-time referrals listener
useEffect(() => {
  const unsubscribe = subscribeToCollection("referrals", (items) => {
    setReferrals(items as Referral[]);
  });
  return () => unsubscribe();
}, []);

 const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
        const id = Date.now();
        setToast({ message, type, id });
        setTimeout(() => setToast(prevToast => (prevToast?.id === id ? null : prevToast)), 4000);
    }, []);
// ensure showToast is defined BEFORE this block
// ---- Lead CRUD implementations (single place) ---- 

// Firestore-backed helper: find first customer with matching referralCode
const findCustomerByReferralCode = async (referralCode: string) => {
  if (!referralCode) return null;
  return new Promise<any>((resolve) => {
    try {
      const unsub = subscribeToCollection("customers", (items: any[]) => {
        const match = (items || []).find(c => (c.referralCode || '').trim() === referralCode.trim()) || null;
        try { unsub(); } catch (e) { /* ignore */ }
        resolve(match);
      });
      // safety timeout
      setTimeout(() => {
        try { unsub(); } catch (e) { /* ignore */ }
        resolve(null);
      }, 3000);
    } catch (err) {
      console.error('findCustomerByReferralCode error', err);
      resolve(null);
    }
  });
};


const addLead = useCallback(async (leadData: Omit<Lead, 'id' | 'createdAt'>, referralCode?: string) => {
  try {
    let referredById: string | undefined = undefined;
    let finalSource = leadData.source ?? '';

    if (referralCode && referralCode.trim()) {
  // try local cache first
  let referrer = customers.find(c => c.referralCode === referralCode.trim());

  // if not found locally, check Firestore helper you added
  if (!referrer) {
    referrer = await findCustomerByReferralCode(referralCode.trim());
  }

  if (referrer) {
    referredById = referrer.id;
    finalSource = `Referral by ${referrer.name}`;
    showToast(`Lead referred by ${referrer.name}!`, 'success');
  } else {
    showToast('Invalid referral code entered.', 'warning');
  }
}


   const payload = {
  ...leadData,
  referredById: referredById ?? null,
  source: finalSource,
  createdAt: new Date().toISOString(),
  followUpDate: leadData.followUpDate ?? null,  // <-- FIX
};


    const newId = await addToCollection('leads', payload);
    showToast('Lead added successfully!', 'success');
    return { success: true, id: newId };
  } catch (err) {
    console.error('Failed to add lead:', err);
    showToast('Failed to add lead', 'error');
    return { success: false, error: err };
  }
}, [customers, showToast]);

const updateLead = useCallback(async (lead: Lead) => {
  try {
    if (!lead.id) throw new Error('Lead id missing');
    const { id, ...dataNoId } = lead as any;
    await updateDocument('leads', id, { ...dataNoId });
    showToast('Lead updated successfully.', 'success');
  } catch (err) {
    console.error('Error updating lead:', err);
    showToast('Failed to update lead.', 'error');
    throw err;
  }
}, [showToast]);

const deleteLead = useCallback(async (leadId: string) => {
  try {
    await deleteDocument('leads', leadId);
    showToast('Lead deleted successfully.', 'success');
  } catch (err) {
    console.error('Error deleting lead:', err);
    showToast('Failed to delete lead.', 'error');
    throw err;
  }
}, [showToast]);

const deleteMultipleLeads = useCallback(async (leadIds: string[]) => {
  try {
    await Promise.all(leadIds.map(id => deleteDocument('leads', id)));
    showToast(`${leadIds.length} leads deleted successfully.`, 'success');
  } catch (err) {
    console.error('Error deleting multiple leads:', err);
    showToast('Failed to delete some leads.', 'error');
    throw err;
  }
}, [showToast]);

const convertLeadToCustomer = useCallback(async (lead: Lead) => {
  try {
    if (!lead.id) throw new Error('Lead id missing');

    // Update lead status in Firestore
    await updateDocument('leads', lead.id, { ...lead, status: LeadStatus.Converted });

    // Create customer record in Firestore
    const newCustomerPayload = {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      address: '',
      createdAt: new Date().toISOString(),
      sourceLeadId: lead.id,
      source: lead.source,
      referredById: (lead as any).referredById ?? null,
    };
    await addToCollection('customers', newCustomerPayload);

    showToast('Lead converted to customer!', 'success');
  } catch (err) {
    console.error('Error converting lead to customer:', err);
    showToast('Conversion failed.', 'error');
    throw err;
  }
}, [showToast]);


 
    const brandingSettings: BrandingSettings = {
        companyName: "Nature Hydrovation",
        companyAddress: "Hyderabad",
        companyLogo: "",
        brandColor: "#0284c7",
        customField: "GST: 36BGXPS2557L1ZD",
        footerNotes: "Thank you for your business!",
    };
    
   

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



    // Firestore-backed addCustomer (replace your current addCustomer)
const addCustomer = useCallback(async (customerData: Omit<Customer, 'id' | 'createdAt'>, referralCode?: string) => {
  try {
    let referredById: string | undefined = undefined;
    let finalSource = customerData.source ?? '';

    if (referralCode && referralCode.trim()) {
      // try local cache first
      let referrer = customers.find(c => c.referralCode === referralCode.trim());
      // fallback to Firestore lookup if not local
      if (!referrer) referrer = await findCustomerByReferralCode(referralCode.trim());
      if (referrer) {
        referredById = referrer.id;
        finalSource = `Referral by ${referrer.name}`;
        showToast(`Customer referred by ${referrer.name}!`, 'success');
      } else {
        showToast('Invalid referral code entered.', 'warning');
      }
    }

    // Build payload to write to Firestore (no id)
    const payload = {
      ...customerData,
      createdAt: new Date().toISOString(),
      referredById: referredById ?? null,
      source: finalSource,
      // NOTE: do NOT include id here. addToCollection will return the generated id.
    };

    // Persist to Firestore and get the new doc id
    const newId = await addToCollection('customers', payload);

    // Compose full customer object with Firestore id and add to local state
    const newCustomer: Customer = {
      ...payload,
      id: newId,
    } as Customer;
    showToast('Customer added successfully!', 'success');

    return newId;
  } catch (err: any) {
    console.error('[addCustomer] failed:', err);
    showToast('Failed to add customer.', 'error');
    throw err;
  }
}, [customers, showToast]);


    // Firestore-backed updateCustomer
const updateCustomer = useCallback(async (updatedCustomer: Customer) => {
  try {
    if (!updatedCustomer.id) throw new Error("Customer id missing");

    // remove id before sending to Firestore (we only update fields)
    const { id, ...dataToUpdate } = updatedCustomer as any;

    // write to Firestore
    await updateDocument("customers", id, { ...dataToUpdate });

    // local state will be synced by the customers subscription you added
    showToast("Customer updated successfully!", "success");
  } catch (err: any) {
    console.error("[updateCustomer] error:", err);
    const msg = err?.message || "Failed to update customer";
    showToast(msg, "error");
    throw err;
  }
}, [showToast]); 


    // Order Management
    // Firestore-backed addOrder supporting multiple items
const addOrder = useCallback(async (newOrder: { customerId: string, items: { productId: string, quantity: number }[] }) => {
  console.log('[addOrder] called with:', newOrder);
  try {
    if (!Array.isArray(newOrder.items) || newOrder.items.length === 0) {
      showToast('No items in order.', 'error');
      return { success: false, message: 'No items' };
    }

    // Validate all products first
    const itemDetails = newOrder.items.map(it => {
      const product = products.find(p => p.id === it.productId);
      return { requested: it, product };
    });

    // Check missing products
    const missing = itemDetails.find(d => !d.product);
    if (missing) {
      console.log('[addOrder] product not found for', missing.requested);
      showToast('One or more products not found.', 'error');
      return { success: false, message: 'Product not found' };
    }

    // Check stock availability
    const insufficient = itemDetails.find(d => (d.product!.quantity < d.requested.quantity));
    if (insufficient) {
      console.log('[addOrder] insufficient stock', { productId: insufficient!.product!.id, have: insufficient!.product!.quantity, want: insufficient!.requested.quantity });
      showToast('Insufficient stock for one or more items.', 'error');
      return { success: false, message: 'Insufficient stock' };
    }

    // Build invoice number (same format)
    const datePrefix = new Date().toISOString().slice(0,10).replace(/-/g,'');
    const dailyOrderCount = orders.filter(o => o.invoiceNumber?.startsWith(`INV-${datePrefix}`)).length;
    const sequence = String(dailyOrderCount + 1).padStart(2, '0');
    const invoiceNumber = `INV-${datePrefix}-${sequence}`;

    const orderDate = new Date().toISOString();

    // Build items payload with snapshot of product name & price
    const itemsPayload = itemDetails.map(d => ({
      productId: d.product!.id,
      productName: d.product!.name,
      quantity: d.requested.quantity,
      salePrice: d.product!.sellingPrice,
      lineTotal: (d.product!.sellingPrice || 0) * d.requested.quantity,
    }));

    const totalAmount = itemsPayload.reduce((s, it) => s + (it.lineTotal || 0), 0);

    const orderPayload: any = {
      customerId: newOrder.customerId,
      items: itemsPayload,
      totalAmount,
      invoiceNumber,
      orderDate,
      paymentStatus: 'Unpaid',
      createdAt: new Date().toISOString(),
    };

    console.log('[addOrder] orderPayload ->', orderPayload);

    // Write order document to Firestore
    const createdId = await addToCollection('orders', orderPayload);
    console.log('[addOrder] created order id ->', createdId);

    // For each item: update product quantity and write stock history (best-effort)
    for (const it of itemDetails) {
      const p = it.product!;
      const newQty = p.quantity - it.requested.quantity;
      // update product doc (strip id)
      await updateDocument('products', p.id, ((() => {
        const { id, ...rest } = { ...p, quantity: newQty } as any;
        return rest;
      })()));
      console.log('[addOrder] updated product', p.id, 'newQty=', newQty);

      // write stock history best-effort
      try {
        await addStockHistoryEntry({
          productId: p.id,
          productName: p.name,
          reason: `Sale (Invoice ${invoiceNumber})`,
          change: -it.requested.quantity,
          newQuantity: newQty,
          date: new Date().toISOString(),
        });
        console.log('[addOrder] stock history added for', p.id);
      } catch (e) {
        console.warn('[addOrder] failed to write stock history for', p.id, e);
      }
    }

    showToast(`Order created — Invoice ${invoiceNumber}`, 'success');

    return { success: true, message: `Invoice #${invoiceNumber} created`, order: { id: createdId, ...orderPayload } };
  } catch (err: any) {
    console.error('[addOrder] caught error ->', err);
    const msg = err?.message || 'Failed to create order';
    showToast(msg, 'error');
    return { success: false, message: msg, error: err };
  }
}, [products, orders, showToast]);




// Firestore-backed updateOrderStatus
const updateOrderStatus = useCallback(
  async (orderId: string, status: 'Paid' | 'Unpaid', paymentMethod: PaymentMethod) => {
    console.log('[updateOrderStatus] called ->', { orderId, status, paymentMethod }); 
    try {
      // find order in local cache (orders listener keeps this up-to-date)
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        showToast('Order not found.', 'error');
        return;
      }

      // prepare update payload for Firestore
      const updatePayload: any = {
        paymentStatus: status,
        paymentMethod: paymentMethod ?? null,
        paymentDate: new Date().toISOString(),
      };

      // update Firestore order
      await updateDocument('orders', orderId, updatePayload);

      // If it was paid, handle referral & possible referral-code generation
      if (status === 'Paid') {
        const customer = customers.find(c => c.id === order.customerId);
        if (customer) {
          // Check if this is the customer's first paid order (based on current local orders list)
          const customerPaidOrders = orders.filter(o => o.customerId === customer.id && o.paymentStatus === 'Paid');
          if (customerPaidOrders.length === 0 && !customer.referralCode) {
            // generate a short referral code
            const uniqueId = Math.random().toString(36).substring(2, 6).toUpperCase();
            const referralCode = `NH-${(customer.id || '').toString().substring(5, 9)}-${uniqueId}`;
            // persist referral code to Firestore customer doc
            await updateDocument('customers', customer.id, { referralCode });
            showToast(`Referral code generated for ${customer.name}!`, 'success');
          }

          // If customer was referred by someone, create a referral record
          if (customer.referredById) {
            const referralPayload = {
              referrerId: customer.referredById,
              refereeId: customer.id,
              orderId: orderId,
              date: new Date().toISOString(),
              status: 'Completed',
              rewardAmount: 500,
            };
            await addToCollection('referrals', referralPayload);
            showToast('Referral recorded and reward queued.', 'success');
          }
        }
      }

      // Final success message
      showToast('Order status updated!', 'success');
    } catch (err: any) {
      console.error('[updateOrderStatus] error:', err);
      const msg = err?.message || 'Failed to update order status';
      showToast(msg, 'error');
    }
  },
  [orders, customers, showToast]
);

   const markRewardAsPaid = useCallback(async (referralId: string) => {
  try {
    // update local state optimistically
    setReferrals(prev => prev.map(r => r.id === referralId ? { ...r, status: 'RewardPaid' } : r));
    // persist
    await updateDocument('referrals', referralId, { status: 'RewardPaid' });
    showToast('Reward marked as paid.');
  } catch (err) {
    console.error('markRewardAsPaid error', err);
    showToast('Failed to mark reward as paid.', 'error');
  }
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
    products,
    leads,
    customers,
    orders,
    stockHistory,
    referrals,
    suppliers,
    categories,

    // Lead functions must be here
    addLead,
    updateLead, 
    deleteLead,
    deleteMultipleLeads,
    convertLeadToCustomer,

    // Customer functions
    addCustomer,
    updateCustomer,

    // Order functions
    addOrder,
    updateInvoiceStatus: updateOrderStatus, 
    updateOrderStatus, 
    markRewardAsPaid,

    // Supplier & category functions
    addSupplier,
    updateSupplier,
    removeSupplier,
    addCategory,
    updateCategory,
    removeCategory,

    // Product functions
    addProduct,
    updateProduct,
    deleteProduct,

    theme,
    toggleTheme,
    toast,
    showToast,
    brandingSettings,
    viewingItem,
    setViewingItem,
    clearViewingItem,
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
  <img 
    src="/logo.png"  
    alt="Nature Hydrovation" 
    className="h-10 w-auto object-contain" 
  />
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
  {/* Show user's actual role */}
  {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
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