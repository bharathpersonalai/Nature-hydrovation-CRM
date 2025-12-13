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
import { Lead } from "../types";

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

  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  
  // ✅ NEW: Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  const ADMIN_EMAILS = [
    "bharathpersonalai@gmail.com",
    "naturehydrovation@gmail.com",
  ];

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);
  const RESTRICTED_TABS: View[] = ["dashboard", "inventory", "stock-registry", "reports"];

  if (!user) {
    return <SignIn />;
  }

  const overdueFollowUps = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return leads.filter(
      (lead: Lead) => lead.followUpDate && new Date(lead.followUpDate) < today
    );
  }, [leads]);

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
              className: `w-5 h-5 ${
                isActive
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
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors group ${
                  isActive
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
                {overdueFollowUps.length > 0 && (
                  <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-800" />
                )}
              </button>
              {isNotificationsOpen && (
                <div className="absolute z-20 mt-2 w-72 origin-top-right right-0 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-slate-800 dark:ring-slate-700">
                  <div className="p-2">
                    <h3 className="px-2 py-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Overdue Follow-ups ({overdueFollowUps.length})
                    </h3>
                  </div>
                  <div className="py-1 max-h-80 overflow-y-auto">
                    {overdueFollowUps.length > 0 ? (
                      overdueFollowUps.map((lead) => (
                        <button
                          key={lead.id}
                          onClick={() => {
                            setCurrentView("leads");
                            setIsNotificationsOpen(false);
                          }}
                          className="w-full text-left flex items-start gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          <AlertTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold">{lead.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Due on{" "}
                              {new Date(lead.followUpDate!).toLocaleDateString()}
                            </p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-4 text-sm text-center text-slate-500 dark:text-slate-400">
                        No overdue follow-ups. Great job!
                      </p>
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
 