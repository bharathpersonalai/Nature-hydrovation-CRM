import React, { createContext, useState, useEffect, useCallback } from "react";
import {
  Product,
  Lead,
  Customer,
  Order,
  StockHistoryEntry,
  Referral,
  ProductCategory,
  BrandingSettings,
  OrderResult,
} from "../types";
// Import Firestore helpers
import { subscribeToCollection } from "../firebase/firestore";
// Import DB instance and methods for Role Fetching
import { db } from "../firebase/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { useAuth } from "./AuthContext";

// Import Services
import { useListService } from "../services/ListService";
import { useProductService } from "../services/ProductService";
import { useLeadService } from "../services/LeadService";
import { useOrderService } from "../services/OrderService";

// --- 1. Define the Interface ---
export interface DataContextType {
  // Data State
  products: Product[];
  leads: Lead[];
  customers: Customer[];
  orders: Order[];
  referrals: Referral[];
  stockHistory: StockHistoryEntry[];
  suppliers: string[];
  categories: ProductCategory[];
  brandingSettings: BrandingSettings;
  updateBrandingSettings: (settings: BrandingSettings) => Promise<void>;

  // Auth State
  userRole: string | null; // <--- Admin/User Role

  // Functions
  addProduct: (product: Omit<Product, "id">) => Promise<void>;
  updateProduct: (product: Product, reason?: string) => Promise<void> | void;
  deleteProduct: (productId: string) => Promise<void> | void;
  addLead: (
    leadData: Omit<Lead, "id" | "createdAt">,
    referralCode?: string
  ) => Promise<void>;
  updateLead: (lead: Lead) => Promise<void>;
  deleteLead: (leadId: string) => Promise<void>;
  deleteMultipleLeads: (leadIds: string[]) => Promise<void>;
  convertLeadToCustomer: (lead: Lead) => Promise<void>;
  addCustomer: (
    customerData: Omit<Customer, "id" | "createdAt">,
    referralCode?: string
  ) => Promise<void> | void;
  updateCustomer: (customer: Customer) => Promise<void> | void;
  deleteCustomer: (customerId: string) => Promise<void>;
  addOrder: (newOrder: {
    customerId: string;
    items: { productId: string; quantity: number; discount: number }[];
    serviceFee?: number;  // ✅ ADD THIS   
  }) => Promise<OrderResult>;
  updateOrderStatus: (
    orderId: string,
    status: "Paid" | "Unpaid",
    paymentMethod: string
  ) => Promise<void> | void;
  updateInvoiceStatus?: (
    orderId: string,
    status: "Paid" | "Unpaid",
    paymentMethod: string
  ) => Promise<void> | void;
  markRewardAsPaid: (referralId: string) => void;
  deleteOrder: (orderId: string) => Promise<void>;
  addSupplier: (name: string) => void;
  updateSupplier: (oldName: string, newName: string) => void;
  removeSupplier: (name: string) => void;
  addCategory: (name: string, supplier: string) => void;
  updateCategory: (oldName: string, supplier: string, newName: string) => void;
  removeCategory: (name: string, supplier: string) => void;

  // Viewing
  viewingItem: { type: string; id: string } | null;
  setViewingItem: (item: { type: string; id: string } | null) => void;
  clearViewingItem: () => void;
}

// --- 2. Create Context ---
export const DataContext = createContext<DataContextType | null>(null);

// --- 3. Create Provider Component ---
export const DataContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth(); // <--- Get current user

  // State Declarations
  const [products, setProducts] = useState<Product[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [categories, setCategories] = useState<{ name: string; supplier: string }[]>([]);
  const [stockHistory, setStockHistory] = useState<StockHistoryEntry[]>([]);
  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings>({
    companyName: "Nature Hydrovation",
    companyAddress: "Hyderabad",
    companyLogo: "",
    brandColor: "#0284c7",
    customField: "GST: 36BGXPS2557L1ZD",
    footerNotes: "Thank you for your business!",
    template: 'modern',
    upiId: ''
  });

  // Role State
  const [userRole, setUserRole] = useState<string | null>(null);

  // Initialize Services
  const listService = useListService(categories, setCategories);
  const productService = useProductService(setProducts);
  const leadService = useLeadService(customers);
  const orderService = useOrderService(orders, products, customers);

  // Branding and UI State
  const [viewingItem, setViewingItem] = useState<{ type: string; id: string } | null>(null);
  const clearViewingItem = useCallback(() => setViewingItem(null), []);

  // Update Branding Function
  const updateBrandingSettings = async (settings: BrandingSettings) => {
    try {
      if (!user) throw new Error("Not authenticated");
      const settingsRef = doc(db, 'settings', 'branding');
      await setDoc(settingsRef, settings, { merge: true });
      setBrandingSettings(settings); // Optimistic update
    } catch (error) {
      console.error("Error updating branding settings:", error);
      throw error;
    }
  };

  // --- 4. FETCH USER ROLE & BRANDING & CLEANUP (The "White Screen" Fix) ---
  useEffect(() => {
    if (!user) {
      // If logged out, clear EVERYTHING to prevent crashes
      setProducts([]);
      setLeads([]);
      setCustomers([]);
      setOrders([]);
      setReferrals([]);
      setSuppliers([]);
      setCategories([]);
      setStockHistory([]);
      setUserRole(null);
      return;
    }

    const loadInitialData = async () => {
      try {
        // Fetch User Role
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRole(userData.role || 'user');
        } else {
          console.warn('User document not found in Firestore. Access denied.');
          setUserRole(null);
        }

        // Fetch Branding Settings
        const brandingDocRef = doc(db, 'settings', 'branding');
        const brandingDoc = await getDoc(brandingDocRef);
        if (brandingDoc.exists()) {
          setBrandingSettings(brandingDoc.data() as BrandingSettings);
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
        setUserRole(null);
      }
    };

    loadInitialData();
  }, [user]);

  // --- 5. Real-Time Listeners (With Safety Guards) ---

  // Listener 1: Suppliers
  useEffect(() => {
    if (!user) return; // <--- Safety Guard
    const unsubscribe = subscribeToCollection("suppliers", (items) => {
      const names = (items || []).map((doc: any) => doc.name).filter(Boolean);
      setSuppliers(names);
    });
    return () => unsubscribe();
  }, [user]);

  // Listener 2: Categories
  useEffect(() => {
    if (!user) return; // <--- Safety Guard
    const unsubscribe = subscribeToCollection("categories", (items) => {
      if (!items) return;
      const cats = items.map((c: any) => ({
        id: c.id,
        name: c.name || c.categoryName || "Unnamed Category",
        supplier: c.supplier || c.vendor || "",
      }));
      setCategories(cats);
    });
    return () => unsubscribe();
  }, [user]);

  // Listener 3: Products
  useEffect(() => {
    if (!user) return; // <--- Safety Guard
    const unsubscribe = subscribeToCollection("products", (items) => {
      setProducts(items as Product[]);
    });
    return () => unsubscribe();
  }, [user]);

  // Listener 4: Stock History
  useEffect(() => {
    if (!user) return; // <--- Safety Guard
    const unsubscribe = subscribeToCollection("stockHistory", (items) => {
      setStockHistory(items as StockHistoryEntry[]);
    });
    return () => unsubscribe();
  }, [user]);

  // Listener 5: Leads
  useEffect(() => {
    if (!user) return; // <--- Safety Guard
    const unsubscribe = subscribeToCollection("leads", (items) => {
      setLeads(items as Lead[]);
    });
    return () => unsubscribe();
  }, [user]);

  // Listener 6: Customers
  useEffect(() => {
    if (!user) return; // <--- Safety Guard
    const unsubscribe = subscribeToCollection("customers", (items) => {
      setCustomers(items as Customer[]);
    });
    return () => unsubscribe();
  }, [user]);

  // Listener 7: Orders
  useEffect(() => {
    if (!user) return; // <--- Safety Guard
    const unsubscribe = subscribeToCollection("orders", (items) => {
      if (!items) return;
      const sortedOrders = items
        .map((doc: any) => ({
          ...doc,
          id: doc.id,
        }))
        .sort(
          (a: any, b: any) =>
            new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
        );

      setOrders(sortedOrders);
    });
    return () => unsubscribe();
  }, [user]);

  // Listener 8: Referrals
  useEffect(() => {
    if (!user) return; // <--- Safety Guard
    const unsubscribe = subscribeToCollection("referrals", (items) => {
      setReferrals(items as Referral[]);
    });
    return () => unsubscribe();
  }, [user]);

  // --- Context Value ---
  const contextValue: DataContextType = {
    products,
    leads,
    customers,
    orders,
    stockHistory,
    referrals,
    suppliers,
    categories,
    brandingSettings,
    updateBrandingSettings,
    userRole, // <--- Exposed Role
    viewingItem,
    setViewingItem,
    clearViewingItem,

    // Service Functions
    addSupplier: listService.addSupplier,
    updateSupplier: listService.updateSupplier,
    removeSupplier: listService.removeSupplier,
    addCategory: listService.addCategory,
    updateCategory: listService.updateCategory,
    removeCategory: listService.removeCategory,

    addProduct: productService.addProduct,
    updateProduct: productService.updateProduct,
    deleteProduct: productService.deleteProduct,

    addLead: leadService.addLead,
    updateLead: leadService.updateLead,
    deleteLead: leadService.deleteLead,
    deleteMultipleLeads: leadService.deleteMultipleLeads,
    convertLeadToCustomer: leadService.convertLeadToCustomer,
    addCustomer: leadService.addCustomer,
    updateCustomer: leadService.updateCustomer,
    deleteCustomer: leadService.deleteCustomer,

    addOrder: orderService.addOrder,
    updateOrderStatus: orderService.updateOrderStatus,
    updateInvoiceStatus: orderService.updateOrderStatus,
    markRewardAsPaid: orderService.markRewardAsPaid,
    deleteOrder: orderService.deleteOrder,
  };

  return (
    <DataContext.Provider value={contextValue}>{children}</DataContext.Provider>
  );
};

// --- 4. Export hook ---
export const useData = () => {
  const context = React.useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataContextProvider");
  }
  return context;
};