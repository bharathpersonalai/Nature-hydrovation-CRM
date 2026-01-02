// /mnt/data/Dashboard.tsx
import React, { useMemo } from "react";
import { useData } from "../contexts/DataContext";
import { useUI } from "../contexts/UIContext";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Product, Lead, Order, LeadStatus } from "../types";
import { RupeeIcon, UsersIcon, PackageIcon, AlertCircleIcon } from "./Icons";

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon,
  color,
}) => {
  const colorClasses = {
    green: {
      bg: "bg-green-100 dark:bg-green-900/40",
      text: "text-green-600 dark:text-green-400",
      border: "border-green-500",
    },
    orange: {
      bg: "bg-orange-100 dark:bg-orange-900/40",
      text: "text-orange-600 dark:text-orange-400",
      border: "border-orange-500",
    },
    blue: {
      bg: "bg-blue-100 dark:bg-blue-900/40",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-500",
    },
    red: {
      bg: "bg-red-100 dark:bg-red-900/40",
      text: "text-red-600 dark:text-red-400",
      border: "border-red-500",
    },
  }[color] || {
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-500",
  };

  return (
    <div
      className={`bg-white p-3 md:p-5 rounded-xl shadow-sm dark:bg-slate-800 border-t-4 ${colorClasses.border}`}
    >
      <div className="flex items-center gap-3 md:gap-4">
        <div
          className={`flex-shrink-0 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full ${colorClasses.bg}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
            {title}
          </h3>
          <p className="text-lg md:text-2xl font-bold text-slate-800 mt-0.5 md:mt-1 dark:text-slate-100 truncate">
            {value}
          </p>
        </div>
      </div>
      <p className="text-xs md:text-sm text-slate-400 mt-2 md:mt-3 dark:text-slate-500 truncate">
        {description}
      </p>
    </div>
  );
};

const currency = (n: number) => `₹${n.toFixed(2)}`;

const Dashboard: React.FC = () => {
  const { products, leads, orders } = useData();
  const { theme } = useUI();

  // --- SAFETY: compute numeric amount for an order (handles both single-order fields and items[] arrays)
  const getOrderAmount = (order: Order): number => {
    const anyOrder = order as any;

    // If order has items[] (multi-item order), compute from items
    if (Array.isArray(anyOrder.items) && anyOrder.items.length > 0) {
      return anyOrder.items.reduce((sum: number, it: any) => {
        const unit = Number(it.salePrice ?? it.price ?? 0) || 0;
        const qty = Number(it.quantity ?? it.qty ?? 0) || 0;
        const discount = Number(it.discount ?? 0) || 0;
        return sum + (unit - discount) * qty;
      }, 0);
    }

    // Fallback: single-order fields (salePrice/quantity)
    const unit = Number(anyOrder.salePrice ?? anyOrder.price ?? 0) || 0;
    const qty = Number(anyOrder.quantity ?? anyOrder.qty ?? 0) || 0;
    const discount = Number(anyOrder.discount ?? 0) || 0;
    return (unit - discount) * qty;
  };

  // ✅ FIXED: Filter only PAID orders for revenue calculation
  const totalRevenue = useMemo(() => {
    return (orders || [])
      .filter((o: Order) => o.paymentStatus === 'Paid')  // ✅ ONLY PAID ORDERS
      .reduce((s: number, o: Order) => s + getOrderAmount(o), 0);
  }, [orders]);

  const ordersCount = orders.length ?? 0;
  const leadsCount = leads.length ?? 0;

  const lowStockItems = useMemo(() => {
    return (products || []).filter((p) => {
      const qty = Number((p as any).quantity ?? 0);
      const threshold = Number((p as any).lowStockThreshold ?? 0);
      return qty <= threshold;
    }).length;
  }, [products]);

  // Lead Conversion Funnel Data
  const leadFunnelData = useMemo(() => {
    return Object.values(LeadStatus).map((status) => ({
      name: status,
      count: leads.filter((l) => l.status === status).length,
    }));
  }, [leads]);

  // Top Selling Products Data
  const topProductsData = useMemo(() => {
    const productSales: Record<string, number> = {};

    orders
      .filter((o) => o.paymentStatus === 'Paid')
      .forEach((order: any) => {
        if (Array.isArray(order.items) && order.items.length > 0) {
          order.items.forEach((item: any) => {
            // Try to resolve name from product catalog if missing in item
            const product = products.find(p => p.id === item.productId);
            const name = item.productName || product?.name || "Unknown Product";
            const qty = Number(item.quantity || 0);
            productSales[name] = (productSales[name] || 0) + qty;
          });
        } else {
          const product = products.find(p => p.id === order.productId);
          const name = (order as any).productName || product?.name || "Unknown Product";
          const qty = Number(order.quantity || 0);
          productSales[name] = (productSales[name] || 0) + qty;
        }
      });

    return Object.entries(productSales)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5
  }, [orders, products]);

  // ✅ FIXED: Prepare sales-by-day (only PAID orders)
  const salesData = useMemo(() => {
    const map: Record<string, number> = {};
    (orders || [])
      .filter((o: Order) => o.paymentStatus === 'Paid')  // ✅ ONLY PAID ORDERS
      .forEach((o) => {
        const dateKey = o?.orderDate
          ? new Date(o.orderDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
          : "Unknown";
        map[dateKey] = (map[dateKey] || 0) + getOrderAmount(o);
      });
    return map;
  }, [orders]);

  const chartData = Object.entries(salesData)
    .map(([name, sales]) => ({ name, sales }))
    .slice(-7);

  const tooltipStyle = {
    backgroundColor: theme === "light" ? "#fff" : "#0f1724",
    border: `1px solid ${theme === "light" ? "#e2e8f0" : "#334155"}`,
    borderRadius: "0.5rem",
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-6 dark:text-slate-200">
        Dashboard
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Total Revenue"
          value={currency(totalRevenue)}
          description="Paid sales only"
          icon={
            <RupeeIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
          }
          color="green"
        />
        <StatCard
          title="New Leads"
          value={leadsCount}
          description="Total leads in pipeline"
          icon={
            <UsersIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          }
          color="orange"
        />
        <StatCard
          title="Total Products"
          value={products.length}
          description="Unique products in inventory"
          icon={
            <PackageIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          }
          color="blue"
        />
        <StatCard
          title="Low Stock Alerts"
          value={lowStockItems}
          description="Items needing restock"
          icon={
            <AlertCircleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
          }
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <section className="bg-white p-6 rounded-lg shadow-sm dark:bg-slate-800">
          <h2 className="text-xl font-semibold text-slate-800 mb-4 dark:text-slate-200">
            Recent Sales Performance
          </h2>
          {(orders || []).filter(o => o.paymentStatus === 'Paid').length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={theme === "light" ? "#e2e8f0" : "#334155"}
                />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#0284c7"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#0284c7" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-16">
              <p className="text-slate-500 dark:text-slate-400">
                No paid sales yet.
              </p>
            </div>
          )}
        </section>

        <section className="bg-white p-6 rounded-lg shadow-sm dark:bg-slate-800">
          <h2 className="text-xl font-semibold text-slate-800 mb-4 dark:text-slate-200">
            Lead Conversion Funnel
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={leadFunnelData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === "light" ? "#e2e8f0" : "#334155"} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="bg-white p-6 rounded-lg shadow-sm dark:bg-slate-800 lg:col-span-2">
          <h2 className="text-xl font-semibold text-slate-800 mb-4 dark:text-slate-200">
            Top Selling Products (Qty)
          </h2>
          {topProductsData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topProductsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {topProductsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-slate-500 dark:text-slate-400">No product sales data yet.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
