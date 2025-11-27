
// FIX: Removed self-import of DistributorSupplier to resolve declaration conflict.

export interface ProductCategory {
  name: string;
  supplier: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  dealer: string; // Changed from Enum to string for dynamic suppliers
  category: string; // Added category field
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  lowStockThreshold: number;
  imageUrl?: string;
}

export enum LeadStatus {
  New = "New",
  Contacted = "Contacted",
  Qualified = "Qualified",
  Lost = "Lost",
  Converted = "Converted",
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  status: LeadStatus;
  createdAt: string;
  referredById?: string;
  followUpDate?: string;
  followUpNotes?: string;
}

export enum PaymentMethod {
  CreditCard = "Credit Card",
  BankTransfer = "Bank Transfer",
  Cash = "Cash",
  UPI = "UPI",
}

export interface Order {
  id:string;
  customerId: string;
  productId: string;
  productName: string;
  quantity: number;
  salePrice: number;
  discount?: number;
  orderDate: string;
  invoiceNumber: string;
  paymentStatus: 'Paid' | 'Unpaid';
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
  sourceLeadId?: string;
  source?: string;
  referralCode?: string;
  referredById?: string;
}

export interface StockHistoryEntry {
  id: string;
  productId: string;
  date: string;
  change: number; // Positive for additions, negative for deductions
  reason: string;
  newQuantity: number;
}

export interface Referral {
  id: string;
  referrerId: string; // Customer who referred
  refereeId: string; // New customer who was referred
  orderId: string; // The order that triggered the completion
  date: string;
  status: 'Completed' | 'RewardPaid';
  rewardAmount: number;
}


export type View = 'dashboard' | 'inventory' | 'stock-registry' | 'leads' | 'customers' | 'billing' | 'reports' | 'referrals';

export interface BrandingSettings {
  companyName: string;
  companyAddress: string;
  companyLogo: string;
  brandColor: string;
  customField: string;
  footerNotes: string;
  taxRate: number; // ← ADD THIS LINE 
}
