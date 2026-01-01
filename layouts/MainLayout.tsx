import React, { useState, useMemo, useRef, useEffect, useContext } from "react";
import { DataContext } from "../contexts/DataContext";
import {
  DashboardIcon,
  InventoryIcon,
  LeadsIcon,
  CustomersIcon,
  ReportsIcon,
  SunIcon,
  MoonIcon,
  HistoryIcon,
  BillingIcon,
  GiftIcon,
  BellIcon,
  AlertTriangleIcon,
  XCircleIcon,
} from "../components/Icons";
import Dashboard from "../components/Dashboard";
import Inventory from "../components/Inventory";
import Leads from "../components/Leads";
import Customers from "../components/Customers";
import Billing from "../components/Billing";
import Reports from "../components/Reports";
import Referrals from "../components/Referrals";
import StockRegistry from "../components/StockRegistry";
import { useAuth, SignIn } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";
import { Lead, Product, Order } from "../types";
import { isAdminEmail } from "../config";

// Notification tab type
type NotificationTab = 'followups' | 'lowstock' | 'invoices' | 'newleads';

// ✅ NEW: Hamburger Menu Icon Component
const MenuIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

// ✅ NEW: Close Icon Component
const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// --- 1. ACCESS RESTRICTED COMPONENT ---
const AccessRestricted = () => (
  <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-slate-50 dark:bg-slate-900/50">
    <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full mb-4">
      <AlertTriangleIcon className="w-12 h-12 text-red-600 dark:text-red-400" />
    </div>
    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
      Access Restricted
    </h2>
    <p className="text-slate-500 dark:text-slate-400 max-w-md">
      You do not have permission to view this module. This section is restricted to Administrators only.
    </p>
  </div>
);

type View =
  | "dashboard"
  | "inventory"
  | "stock-registry"
  | "leads"
  | "customers"
  | "referrals"
  | "billing"
  | "reports";

const VIEWS: Record<
  View,
  {
    label: string;
    icon: React.ReactElement<{ className?: string }>;
    color: string;
    activeColor: string;
  }
> = {
  dashboard: {
    label: "Dashboard",
    icon: <DashboardIcon />,
    color: "text-sky-500",
    activeColor: "bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300",
  },
  inventory: {
    label: "Inventory",
    icon: <InventoryIcon />,
    color: "text-emerald-500",
    activeColor:
      "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300",
  },
  "stock-registry": {
    label: "Stock Registry",
    icon: <HistoryIcon />,
    color: "text-violet-500",
    activeColor:
      "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300",
  },
  leads: {
    label: "Leads",
    icon: <LeadsIcon />,
    color: "text-amber-500",
    activeColor:
      "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300",
  },
  customers: {
    label: "Customers",
    icon: <CustomersIcon />,
    color: "text-blue-500",
    activeColor:
      "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300",
  },
  referrals: {
    label: "Referrals",
    icon: <GiftIcon />,
    color: "text-pink-500",
    activeColor:
      "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300",
  },
  billing: {
    label: "Billing",
    icon: <BillingIcon />,
    color: "text-indigo-500",
    activeColor:
      "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300",
  },
  reports: {
    label: "Reports",
    icon: <ReportsIcon />,
    color: "text-purple-500",
    activeColor:
      "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300",
  },
};

const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useUI();

  const dataContext = useContext(DataContext);
  const leads = dataContext?.leads || [];
  const products = dataContext?.products || [];
  const orders = dataContext?.orders || [];

  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [activeNotificationTab, setActiveNotificationTab] = useState<NotificationTab>('followups');

  // Dismissed notifications state (cleared on page reload)
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());

  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // Use centralized admin check from config
  const isAdmin = isAdminEmail(user?.email);
  const RESTRICTED_TABS: View[] = ["dashboard", "inventory", "stock-registry", "reports"];

  if (!user) {
    return <SignIn />;
  }

  // 1. Overdue Follow-ups
  const overdueFollowUps = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return leads.filter(
      (lead: Lead) =>
        lead.followUpDate &&
        new Date(lead.followUpDate) < today &&
        !dismissedNotifications.has(`followup_${lead.id}`)
    );
  }, [leads, dismissedNotifications]);

  // 2. Low Stock Alerts
  const lowStockProducts = useMemo(() => {
    return products.filter(
      (product: Product) =>
        product.quantity <= product.lowStockThreshold &&
        !dismissedNotifications.has(`lowstock_${product.id}`)
    );
  }, [products, dismissedNotifications]);

  // 3. Unpaid Invoices (older than 7 days)
  const unpaidInvoices = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return orders.filter(
      (order: Order) =>
        order.paymentStatus === 'Unpaid' &&
        new Date(order.orderDate) < sevenDaysAgo &&
        !dismissedNotifications.has(`invoice_${order.id}`)
    );
  }, [orders, dismissedNotifications]);

  // 4. New Leads Today
  const newLeadsToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return leads.filter(
      (lead: Lead) =>
        new Date(lead.createdAt) >= today &&
        !dismissedNotifications.has(`newlead_${lead.id}`)
    );
  }, [leads, dismissedNotifications]);

  // Total notification count
  const totalNotifications = overdueFollowUps.length + lowStockProducts.length + unpaidInvoices.length + newLeadsToday.length;

  // Clear all notifications handler
  const handleClearAllNotifications = () => {
    const allIds: string[] = [];
    leads.filter((lead: Lead) => lead.followUpDate && new Date(lead.followUpDate) < new Date()).forEach(l => allIds.push(`followup_${l.id}`));
    products.filter((p: Product) => p.quantity <= p.lowStockThreshold).forEach(p => allIds.push(`lowstock_${p.id}`));
    orders.filter((o: Order) => o.paymentStatus === 'Unpaid').forEach(o => allIds.push(`invoice_${o.id}`));
    leads.forEach(l => allIds.push(`newlead_${l.id}`));
    setDismissedNotifications(new Set(allIds));
    setIsNotificationsOpen(false);
  };

  // Dismiss single notification handler
  const handleDismissNotification = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedNotifications(prev => new Set([...prev, notificationId]));
  };

  // ✅ NEW: Close sidebar on outside click (mobile)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        isSidebarOpen &&
        window.innerWidth < 768
      ) {
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSidebarOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      )
        setIsNotificationsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderView = () => {
    if (RESTRICTED_TABS.includes(currentView) && !isAdmin) {
      return <AccessRestricted />;
    }

    switch (currentView) {
      case "dashboard":
        return <Dashboard />;
      case "inventory":
        return <Inventory />;
      case "stock-registry":
        return <StockRegistry />;
      case "leads":
        return <Leads />;
      case "customers":
        return <Customers />;
      case "billing":
        return <Billing />;
      case "reports":
        return <Reports />;
      case "referrals":
        return <Referrals />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100 font-sans">

      {/* ✅ NEW: Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ✅ UPDATED: SIDEBAR with responsive behavior */}
      <aside
        ref={sidebarRef}
        className={`
          fixed md:relative z-40
          w-64 bg-white dark:bg-slate-800 
          flex flex-col flex-shrink-0 shadow-md
          h-screen
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* ✅ NEW: Close button (mobile only) */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-700">
          <img
            src="/logo.png"
            alt="Nature Hydrovation"
            className="h-10 w-auto object-contain"
          />
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {(Object.keys(VIEWS) as View[]).map((view) => {
            const viewConfig = VIEWS[view];
            const isActive = currentView === view;

            const icon = React.cloneElement(viewConfig.icon, {
              className: `w-5 h-5 ${isActive
                ? viewConfig.color
                : "text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200"
                }`,
            });

            return (
              <button
                key={view}
                onClick={() => {
                  setCurrentView(view);
                  // ✅ Close sidebar on mobile after clicking
                  if (window.innerWidth < 768) {
                    setIsSidebarOpen(false);
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors group ${isActive
                  ? `${viewConfig.activeColor}`
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                  }`}
              >
                {icon}
                <span>{viewConfig.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            {theme === "light" ? (
              <MoonIcon className="w-5 h-5" />
            ) : (
              <SunIcon className="w-5 h-5" />
            )}
            <span>Switch to {theme === "light" ? "Dark" : "Light"}</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* ✅ UPDATED: HEADER with hamburger button */}
        <header className="h-16 bg-white dark:bg-slate-800 flex-shrink-0 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-700">

          {/* ✅ NEW: Hamburger Menu Button */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Open menu"
          >
            <MenuIcon className="w-6 h-6" />
          </button>

          {/* ✅ UPDATED: Right side items */}
          <div className="flex items-center gap-4 ml-auto">
            {/* Notification Dropdown */}
            <div ref={notificationsRef} className="relative">
              <button
                onClick={() => setIsNotificationsOpen((prev) => !prev)}
                className="relative text-slate-500 hover:text-brand-primary dark:text-slate-400 dark:hover:text-brand-primary transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                aria-label="Notifications"
              >
                <BellIcon className="w-6 h-6" />
                {totalNotifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-5 w-5 text-xs font-bold text-white bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-800">
                    {totalNotifications > 9 ? '9+' : totalNotifications}
                  </span>
                )}
              </button>
              {isNotificationsOpen && (
                <div className="fixed md:absolute inset-x-0 md:inset-x-auto bottom-0 md:bottom-auto z-50 md:z-20 mt-2 w-full md:w-96 origin-bottom md:origin-top-right right-0 rounded-t-2xl md:rounded-lg bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-slate-800 dark:ring-slate-700 overflow-hidden animate-slide-up md:animate-fade-in max-h-[80vh] md:max-h-none">
                  {/* Header with Clear All */}
                  <div className="p-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Notifications ({totalNotifications})
                    </h3>
                    {totalNotifications > 0 && (
                      <button
                        onClick={handleClearAllNotifications}
                        className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {/* Tab Navigation */}
                  <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
                    <button
                      onClick={() => setActiveNotificationTab('followups')}
                      className={`flex-1 px-2 py-2 text-xs font-medium transition-colors ${activeNotificationTab === 'followups'
                        ? 'text-red-600 border-b-2 border-red-500 bg-white dark:bg-slate-800'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                        }`}
                    >
                      Follow-ups {overdueFollowUps.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full text-xs dark:bg-red-900/30 dark:text-red-400">{overdueFollowUps.length}</span>}
                    </button>
                    <button
                      onClick={() => setActiveNotificationTab('lowstock')}
                      className={`flex-1 px-2 py-2 text-xs font-medium transition-colors ${activeNotificationTab === 'lowstock'
                        ? 'text-orange-600 border-b-2 border-orange-500 bg-white dark:bg-slate-800'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                        }`}
                    >
                      Low Stock {lowStockProducts.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-full text-xs dark:bg-orange-900/30 dark:text-orange-400">{lowStockProducts.length}</span>}
                    </button>
                    <button
                      onClick={() => setActiveNotificationTab('invoices')}
                      className={`flex-1 px-2 py-2 text-xs font-medium transition-colors ${activeNotificationTab === 'invoices'
                        ? 'text-purple-600 border-b-2 border-purple-500 bg-white dark:bg-slate-800'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                        }`}
                    >
                      Invoices {unpaidInvoices.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded-full text-xs dark:bg-purple-900/30 dark:text-purple-400">{unpaidInvoices.length}</span>}
                    </button>
                    <button
                      onClick={() => setActiveNotificationTab('newleads')}
                      className={`flex-1 px-2 py-2 text-xs font-medium transition-colors ${activeNotificationTab === 'newleads'
                        ? 'text-green-600 border-b-2 border-green-500 bg-white dark:bg-slate-800'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                        }`}
                    >
                      New Leads {newLeadsToday.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-600 rounded-full text-xs dark:bg-green-900/30 dark:text-green-400">{newLeadsToday.length}</span>}
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="max-h-72 overflow-y-auto">
                    {/* Follow-ups Tab */}
                    {activeNotificationTab === 'followups' && (
                      <div className="py-1">
                        {overdueFollowUps.length > 0 ? (
                          overdueFollowUps.map((lead) => (
                            <div key={lead.id} className="w-full flex items-start gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 group">
                              <button onClick={() => { setCurrentView("leads"); setIsNotificationsOpen(false); }} className="flex-1 text-left flex items-start gap-3">
                                <AlertTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-semibold">{lead.name}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">Due on {new Date(lead.followUpDate!).toLocaleDateString()}</p>
                                </div>
                              </button>
                              <button onClick={(e) => handleDismissNotification(`followup_${lead.id}`, e)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-opacity" title="Dismiss">
                                <CloseIcon className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="px-3 py-6 text-sm text-center text-slate-500 dark:text-slate-400">No overdue follow-ups 🎉</p>
                        )}
                      </div>
                    )}

                    {/* Low Stock Tab */}
                    {activeNotificationTab === 'lowstock' && (
                      <div className="py-1">
                        {lowStockProducts.length > 0 ? (
                          lowStockProducts.map((product) => (
                            <div key={product.id} className="w-full flex items-start gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 group">
                              <button onClick={() => { setCurrentView("inventory"); setIsNotificationsOpen(false); }} className="flex-1 text-left flex items-start gap-3">
                                <XCircleIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${product.quantity === 0 ? 'text-red-500' : 'text-orange-500'}`} />
                                <div>
                                  <p className="font-semibold">{product.name}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {product.quantity === 0 ? 'Out of stock!' : `Only ${product.quantity} left (threshold: ${product.lowStockThreshold})`}
                                  </p>
                                </div>
                              </button>
                              <button onClick={(e) => handleDismissNotification(`lowstock_${product.id}`, e)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-opacity" title="Dismiss">
                                <CloseIcon className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="px-3 py-6 text-sm text-center text-slate-500 dark:text-slate-400">All products well stocked ✓</p>
                        )}
                      </div>
                    )}

                    {/* Unpaid Invoices Tab */}
                    {activeNotificationTab === 'invoices' && (
                      <div className="py-1">
                        {unpaidInvoices.length > 0 ? (
                          unpaidInvoices.map((order) => (
                            <div key={order.id} className="w-full flex items-start gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 group">
                              <button onClick={() => { setCurrentView("billing"); setIsNotificationsOpen(false); }} className="flex-1 text-left flex items-start gap-3">
                                <BillingIcon className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-semibold">{order.invoiceNumber}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    ₹{order.totalAmount?.toFixed(2) || '0.00'} • {Math.floor((Date.now() - new Date(order.orderDate).getTime()) / (1000 * 60 * 60 * 24))} days overdue
                                  </p>
                                </div>
                              </button>
                              <button onClick={(e) => handleDismissNotification(`invoice_${order.id}`, e)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-opacity" title="Dismiss">
                                <CloseIcon className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="px-3 py-6 text-sm text-center text-slate-500 dark:text-slate-400">No overdue invoices 💰</p>
                        )}
                      </div>
                    )}

                    {/* New Leads Tab */}
                    {activeNotificationTab === 'newleads' && (
                      <div className="py-1">
                        {newLeadsToday.length > 0 ? (
                          newLeadsToday.map((lead) => (
                            <div key={lead.id} className="w-full flex items-start gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 group">
                              <button onClick={() => { setCurrentView("leads"); setIsNotificationsOpen(false); }} className="flex-1 text-left flex items-start gap-3">
                                <LeadsIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-semibold">{lead.name}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    New lead from {lead.source || 'Unknown'} • {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </button>
                              <button onClick={(e) => handleDismissNotification(`newlead_${lead.id}`, e)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-opacity" title="Dismiss">
                                <CloseIcon className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="px-3 py-6 text-sm text-center text-slate-500 dark:text-slate-400">No new leads today</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User area */}
            <div className="flex items-center gap-3">
              <div className="text-right mr-2 hidden sm:block">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {user?.email ?? "User"}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {isAdmin ? "Admin" : "User"}
                </div>
              </div>

              <button
                onClick={logout}
                className="px-3 py-1 rounded bg-red-500 hover:bg-red-600 text-white text-sm flex items-center gap-2 transition-colors"
                aria-label="Sign out"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* CONTENT RENDERER */}
        <div className="flex-1 overflow-y-auto">{renderView()}</div>
      </main>
    </div>
  );
};

export default MainLayout;
