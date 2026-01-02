import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';
import { Order, Customer, PaymentMethod, BrandingSettings } from '../types';
import Modal from './Modal';
import Invoice from "./Invoice";
import Receipt from "./Receipt";
import {
  PrinterIcon,
  CheckCircleIcon,
  PdfIcon,
  FileTextIcon,
  ReceiptIcon,
  DownloadIcon,
  SearchIcon,
  WhatsAppIcon,
  MailIcon,
  LinkIcon,
  ShareIcon,
} from "./Icons";
import html2canvas from 'html2canvas';

// Ensure html2pdf is available
declare var html2pdf: any;

type BillingTab = "invoices" | "receipts";

const Billing: React.FC = () => {
  const {
    orders,
    customers,
    products, // Critical: Needed to look up product names for the receipt
    brandingSettings,
    updateBrandingSettings,
    updateOrderStatus,
    updateInvoiceStatus
  } = useData();
  const { showToast } = useUI();

  const [activeTab, setActiveTab] = useState<BillingTab>("invoices");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Paid" | "Unpaid">("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<"all" | PaymentMethod>("all");
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [modalContent, setModalContent] = useState<"invoice" | "receipt">("invoice");

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [orderToPay, setOrderToPay] = useState<Order | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CreditCard);

  // Settings Modal State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [tempSettings, setTempSettings] = useState<BrandingSettings | null>(null);

  const customerMap = useMemo(() => {
    return new Map(customers.map((c) => [c.id, c]));
  }, [customers]);

  // --- HELPER 1: Calculate Total for an Order (for the list view) ---
  const getOrderAmount = (order: any): number => {
    let total = 0;

    // Case A: Multi-item order
    if (Array.isArray(order?.items) && order.items.length > 0) {
      total = order.items.reduce((s: number, it: any) => {
        // Try to find price in item -> order -> product catalog
        const product = products.find(p => p.id === it.productId);
        const unit = Number(it?.salePrice ?? it?.price ?? product?.sellingPrice ?? 0) || 0;
        const qty = Number(it?.quantity ?? it?.qty ?? 0) || 0;
        const disc = Number(it?.discount ?? 0) || 0;
        return s + (unit - disc) * qty;
      }, 0);
    }
    // Case B: Single-item order
    else {
      const product = products.find(p => p.id === order.productId);
      const unit = Number(order?.salePrice ?? order?.price ?? product?.sellingPrice ?? 0) || 0;
      const qty = Number(order?.quantity ?? order?.qty ?? 0) || 0;
      const disc = Number(order?.discount ?? 0) || 0;
      total = (unit - disc) * qty;
    }

    return total;
  };

  // --- HELPER 2: Prepare Data for Invoice/Receipt Modal (Exact match to Customers.tsx) ---
  const getInvoiceLines = (invoiceNumber: string) => {
    const relatedOrders = orders.filter(o => o.invoiceNumber === invoiceNumber);
    const lines: any[] = [];

    relatedOrders.forEach(order => {
      if (Array.isArray((order as any).items) && (order as any).items.length > 0) {
        // Map multi-items
        const mapped = (order as any).items.map((it: any, idx: number) => {
          // Lookup product to get the Name if it's missing in the order
          const product = products.find(p => p.id === it.productId);
          return {
            id: `${order.id}_${idx}`,
            // Logic: Item Name -> Catalog Name -> Fallback
            productName: it.productName ?? it.name ?? product?.name ?? 'Item',
            quantity: Number(it.quantity ?? 0),
            salePrice: Number(it.salePrice ?? it.price ?? product?.sellingPrice ?? 0),
            discount: Number(it.discount ?? 0),
            invoiceNumber: order.invoiceNumber,
            orderDate: order.orderDate,
            paymentStatus: order.paymentStatus
          };
        });
        lines.push(...mapped);
      } else {
        // Map single-item
        const product = products.find(p => p.id === order.productId);
        lines.push({
          id: order.id,
          productName: (order as any).productName ?? product?.name ?? 'Product',
          quantity: Number(order.quantity ?? 0),
          salePrice: Number(order.salePrice ?? product?.sellingPrice ?? 0),
          discount: Number(order.discount ?? 0),
          invoiceNumber: order.invoiceNumber,
          orderDate: order.orderDate,
          paymentStatus: order.paymentStatus
        });
      }
    });
    return lines;
  };

  // --- Group Orders by Invoice for the List View ---
  const groupedInvoices = useMemo(() => {
    const grouped: Record<string, {
      invoiceNumber: string;
      customerId: string;
      date: string;
      status: string;
      method: string;
      total: number;
      representativeOrder: any;
      paymentDate?: string;
    }> = {};

    orders.forEach((order: any) => {
      const invoice = order?.invoiceNumber ?? `INV-${order.id}`;

      if (!grouped[invoice]) {
        grouped[invoice] = {
          invoiceNumber: invoice,
          customerId: order?.customerId ?? "",
          date: order?.orderDate ?? new Date().toISOString(),
          status: order?.paymentStatus ?? "Unpaid",
          method: order?.paymentMethod ?? "-",
          total: 0,
          representativeOrder: order,
          paymentDate: order?.paymentDate,
        };
      }

      grouped[invoice].total += getOrderAmount(order);

      // Keep metadata from the most relevant/recent order in the group
      const existingDate = new Date(grouped[invoice].date).getTime();
      const thisDate = new Date(order?.orderDate ?? grouped[invoice].date).getTime();

      if (thisDate > existingDate || !grouped[invoice].paymentDate) {
        grouped[invoice].date = order?.orderDate ?? grouped[invoice].date;
        grouped[invoice].representativeOrder = order;
        grouped[invoice].status = order?.paymentStatus ?? grouped[invoice].status;
        grouped[invoice].method = order?.paymentMethod ?? grouped[invoice].method;
        grouped[invoice].paymentDate = order?.paymentDate ?? grouped[invoice].paymentDate;
      }
    });

    return Object.values(grouped);
  }, [orders, products]); // Re-calculate if products change (for prices)

  const filteredItems = useMemo(() => {
    let tempItems = [...groupedInvoices];

    // Filter by Tab
    if (activeTab === "receipts") {
      tempItems = tempItems.filter((item) => item.status === "Paid");
      if (paymentMethodFilter !== "all") {
        tempItems = tempItems.filter((item) => item.method === paymentMethodFilter);
      }
    } else {
      if (statusFilter !== "all") {
        tempItems = tempItems.filter((item) => item.status === statusFilter);
      }
    }

    // Sort by Date
    tempItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Search Filter
    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      tempItems = tempItems.filter((item) => {
        const customer = customerMap.get(item.customerId);
        return (
          item.invoiceNumber.toLowerCase().includes(lowercasedQuery) ||
          customer?.name.toLowerCase().includes(lowercasedQuery)
        );
      });
    }

    return tempItems;
  }, [groupedInvoices, searchQuery, statusFilter, customerMap, activeTab, paymentMethodFilter]);

  const handleTabChange = (tab: BillingTab) => {
    setActiveTab(tab);
    setSearchQuery("");
    setStatusFilter("all");
    setPaymentMethodFilter("all");
  };

  const handleViewInvoice = (order: Order) => {
    setViewingOrder(order);
    setModalContent("invoice");
  };

  const handleViewReceipt = (order: Order) => {
    setViewingOrder(order);
    setModalContent("receipt");
  };

  const handleCloseModal = () => {
    setViewingOrder(null);
  };

  const handleOpenPaymentModal = (order: Order) => {
    setOrderToPay(order);
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = () => {
    if (orderToPay) {
      const updateFn = updateOrderStatus || updateInvoiceStatus;
      updateFn(
        orderToPay.id,
        "Paid",
        selectedPaymentMethod
      );

      showToast(`Payment recorded via ${selectedPaymentMethod}.`);
      setModalContent("receipt");
      setIsPaymentModalOpen(false);
      setOrderToPay(null);
    }
  };

  const getCustomerForOrder = (order: Order): Customer | undefined => {
    return customerMap.get(order.customerId);
  };

  const handleDocumentAction = (
    action: "print" | "pdf",
    order: Order,
    type: "invoice" | "receipt"
  ) => {
    const element = document.getElementById(`${type}-section-content`);
    if (!element) return;

    if (action === "print") {
      window.print();
    } else {
      const opt = {
        margin: 0.5,
        filename: `${type === "invoice" ? "Invoice" : "Receipt"}-${order.invoiceNumber}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      };
      html2pdf().from(element).set(opt).save();
    }
  };

  const handleSharePdf = async (order: Order, type: "invoice" | "receipt") => {
    const element = document.getElementById(`${type}-section-content`);
    if (!element) return;

    if (!navigator.share) {
      showToast("Web Share API is not supported in your browser. Downloading instead.", "warning");
      handleDocumentAction("pdf", order, type);
      return;
    }

    try {
      const opt = {
        margin: 0.5,
        filename: `${type === "invoice" ? "Invoice" : "Receipt"}-${order.invoiceNumber}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      };

      const pdfBlob = await html2pdf().from(element).set(opt).output('blob');
      const file = new File([pdfBlob], `${type}-${order.invoiceNumber}.pdf`, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${type === "invoice" ? "Invoice" : "Receipt"} #${order.invoiceNumber}`,
          text: `Here is your ${type} #${order.invoiceNumber}`,
          files: [file],
        });
        showToast("Shared successfully!", "success");
      } else {
        showToast("Sharing files isn't supported by this browser. Downloading instead.", "warning");
        handleDocumentAction("pdf", order, type);
      }

    } catch (error) {
      console.error("Error sharing PDF:", error);
      showToast("An error occurred while trying to share.", "error");
    }
  };

  const handleExportAllBilling = () => {
    if (filteredItems.length === 0) {
      showToast(`No ${activeTab} data to export.`, "error");
      return;
    }

    const headers = activeTab === "receipts"
      ? ["Receipt Number", "Customer Name", "Payment Date", "Total Amount", "Tax (18%)", "Grand Total", "Payment Method"]
      : ["Invoice Number", "Customer Name", "Order Date", "Total Amount", "Tax (18%)", "Grand Total", "Payment Status", "Payment Method"];

    const escapeCsvField = (field: any) => {
      const str = String(field || "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = filteredItems.map((item) => {
      const customer = customerMap.get(item.customerId);
      const subtotal = item.total || 0;
      const tax = subtotal * 0.18;
      const grandTotal = subtotal + tax;

      if (activeTab === "receipts") {
        return [
          item.invoiceNumber.replace("INV", "RCPT"),
          customer?.name || "N/A",
          item.paymentDate ? new Date(item.paymentDate).toLocaleDateString() : "-",
          subtotal.toFixed(2),
          tax.toFixed(2),
          grandTotal.toFixed(2),
          item.method || "-",
        ].map(escapeCsvField).join(",");
      } else {
        return [
          item.invoiceNumber,
          customer?.name || "N/A",
          new Date(item.date).toLocaleDateString(),
          subtotal.toFixed(2),
          tax.toFixed(2),
          grandTotal.toFixed(2),
          item.status,
          item.method || "-",
        ].map(escapeCsvField).join(",");
      }
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const filename = `${activeTab}-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`${activeTab} data exported successfully!`, "success");
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200">
          Billing
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setTempSettings(brandingSettings);
              setIsSettingsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-slate-200 text-slate-700 font-semibold py-2 px-3 md:px-4 rounded-lg shadow-sm hover:bg-slate-300 transition-colors dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            title="Invoice Settings"
          >
            <span className="hidden sm:inline">Settings</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={handleExportAllBilling}
            className="flex items-center gap-2 bg-slate-600 text-white font-semibold py-2 px-3 md:px-4 rounded-lg shadow-sm hover:bg-slate-700 transition-colors"
            title={activeTab === "receipts" ? "Export All Receipts" : "Export All Invoices"}
          >
            <DownloadIcon className="w-5 h-5" />
            <span className="hidden sm:inline">{activeTab === "receipts" ? "Export Receipts" : "Export Invoices"}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          <button
            onClick={() => handleTabChange("invoices")}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
            ${activeTab === "invoices"
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-600"
              }`}
          >
            Invoices
          </button>
          <button
            onClick={() => handleTabChange("receipts")}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
            ${activeTab === "receipts"
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-600"
              }`}
          >
            Receipts
          </button>
        </nav>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="relative flex-grow">
          <input
            type="search"
            placeholder={activeTab === "invoices" ? "Search by invoice # or customer..." : "Search by receipt # or customer..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
          />
        </div>

        {activeTab === "invoices" && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "Paid" | "Unpaid")}
            className="block w-full md:w-auto px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
          >
            <option value="all">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Unpaid">Unpaid</option>
          </select>
        )}
        {activeTab === "receipts" && (
          <select
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value as "all" | PaymentMethod)}
            className="block w-full md:w-auto px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
          >
            <option value="all">All Payment Methods</option>
            {Object.values(PaymentMethod).map((method) => (
              <option key={method} value={method}>{method}</option>
            ))}
          </select>
        )}
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden dark:bg-slate-800">
        {filteredItems.length > 0 ? (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden divide-y dark:divide-slate-700">
              {filteredItems.map((item) => {
                const customer = customerMap.get(item.customerId);
                const totalWithTax = (item.total * 1.18).toFixed(2);

                return (
                  <div key={item.invoiceNumber} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                            {activeTab === "invoices" ? item.invoiceNumber : item.invoiceNumber.replace("INV", "RCPT")}
                          </h3>
                          {activeTab === "invoices" && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.status === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'}`}>
                              {item.status}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{customer?.name || "N/A"}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {activeTab === "invoices"
                            ? new Date(item.date).toLocaleDateString()
                            : (item.paymentDate ? new Date(item.paymentDate).toLocaleDateString() : "N/A")}
                          {activeTab === "receipts" && ` • ${item.method}`}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-lg text-slate-800 dark:text-slate-100">₹{totalWithTax}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                      <button
                        onClick={() => {
                          if (activeTab === "invoices") {
                            handleViewInvoice(item.representativeOrder);
                          } else {
                            handleViewReceipt(item.representativeOrder);
                          }
                        }}
                        className="text-sm font-semibold text-brand-primary hover:underline"
                      >
                        View {activeTab === "invoices" ? "Invoice" : "Receipt"} →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                  <tr>
                    <th scope="col" className="px-6 py-3">
                      {activeTab === "invoices" ? "Invoice #" : "Receipt #"}
                    </th>
                    <th scope="col" className="px-6 py-3">Customer</th>
                    <th scope="col" className="px-6 py-3">
                      {activeTab === "invoices" ? "Date" : "Payment Date"}
                    </th>
                    <th scope="col" className="px-6 py-3 text-right">Amount</th>
                    {activeTab === "invoices" && <th scope="col" className="px-6 py-3 text-center">Status</th>}
                    {activeTab === "receipts" && <th scope="col" className="px-6 py-3">Method</th>}
                    <th scope="col" className="px-6 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const customer = customerMap.get(item.customerId);
                    const totalWithTax = (item.total * 1.18).toFixed(2);

                    return (
                      <tr key={item.invoiceNumber} className="bg-white border-b hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                          {activeTab === "invoices" ? item.invoiceNumber : item.invoiceNumber.replace("INV", "RCPT")}
                        </td>
                        <td className="px-6 py-4">{customer?.name || "N/A"}</td>
                        <td className="px-6 py-4">
                          {activeTab === "invoices"
                            ? new Date(item.date).toLocaleDateString()
                            : (item.paymentDate ? new Date(item.paymentDate).toLocaleDateString() : "N/A")}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-300">
                          ₹{totalWithTax}
                        </td>
                        {activeTab === "invoices" && (
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'}`}>
                              {item.status}
                            </span>
                          </td>
                        )}
                        {activeTab === "receipts" && (
                          <td className="px-6 py-4">{item.method}</td>
                        )}
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              if (activeTab === "invoices") {
                                handleViewInvoice(item.representativeOrder);
                              } else {
                                handleViewReceipt(item.representativeOrder);
                              }
                            }}
                            className="font-medium text-brand-primary hover:underline"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-center py-16 px-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              No {activeTab} Found
            </h3>
            <p className="text-slate-500 mt-2 dark:text-slate-400">
              {searchQuery ? "Your search did not return any results." : "No records found."}
            </p>
          </div>
        )}
      </div>

      {viewingOrder && (
        <Modal
          isOpen={!!viewingOrder}
          onClose={handleCloseModal}
          title={modalContent === "invoice" ? `Invoice ${viewingOrder.invoiceNumber}` : `Receipt ${viewingOrder.invoiceNumber.replace("INV", "RCPT")}`}
          size="2xl"
          footer={
            <div className="flex flex-wrap items-center gap-2 w-full">
              {/* Left side - Share buttons */}
              <div className="flex items-center gap-1 mr-auto">
                {(() => {
                  const customer = getCustomerForOrder(viewingOrder);
                  const invoiceUrl = `${window.location.origin}/invoice/${viewingOrder.shareToken || viewingOrder.invoiceNumber}`;
                  const message = `Hi ${customer?.name || 'there'}! Your invoice ${viewingOrder.invoiceNumber} is ready.\nView here: ${invoiceUrl}`;
                  const phone = customer?.phone?.replace(/\D/g, '') || '';
                  const whatsappUrl = `https://wa.me/${phone.startsWith('91') ? phone : '91' + phone}?text=${encodeURIComponent(message)}`;
                  const emailUrl = `mailto:${customer?.email || ''}?subject=Invoice ${viewingOrder.invoiceNumber}&body=${encodeURIComponent(message)}`;

                  return (
                    <>
                      {customer?.phone && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                          title="Share via WhatsApp"
                        >
                          <WhatsAppIcon className="w-5 h-5" />
                        </a>
                      )}
                      {customer?.email && (
                        <a
                          href={emailUrl}
                          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          title="Share via Email"
                        >
                          <MailIcon className="w-5 h-5" />
                        </a>
                      )}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(invoiceUrl);
                          showToast('Invoice link copied to clipboard!');
                        }}
                        className="p-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors"
                        title="Copy Link"
                      >
                        <LinkIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleSharePdf(viewingOrder, modalContent)}
                        className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                        title="Share PDF"
                      >
                        <ShareIcon className="w-5 h-5" />
                      </button>
                    </>
                  );
                })()}
              </div>

              {/* Right side - Action buttons */}
              {viewingOrder.paymentStatus === "Paid" && (
                <button
                  onClick={() => setModalContent(modalContent === "invoice" ? "receipt" : "invoice")}
                  className="flex items-center gap-2 bg-slate-600 text-white font-semibold py-2 px-3 rounded-lg shadow-sm hover:bg-slate-700 transition-colors text-sm"
                >
                  {modalContent === "invoice" ? <ReceiptIcon className="w-4 h-4" /> : <FileTextIcon className="w-4 h-4" />}
                  <span className="hidden sm:inline">{modalContent === "invoice" ? "Receipt" : "Invoice"}</span>
                </button>
              )}
              {viewingOrder.paymentStatus === "Unpaid" && modalContent === "invoice" && (
                <button
                  onClick={() => handleOpenPaymentModal(viewingOrder)}
                  className="flex items-center gap-2 bg-green-600 text-white font-semibold py-2 px-3 rounded-lg shadow-sm hover:bg-green-700 transition-colors text-sm"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Mark Paid</span>
                </button>
              )}
              <button
                onClick={() => handleDocumentAction("pdf", viewingOrder, modalContent)}
                className="flex items-center gap-2 bg-slate-600 text-white font-semibold py-2 px-3 rounded-lg shadow-sm hover:bg-slate-700 transition-colors text-sm"
              >
                <PdfIcon className="w-4 h-4" />
                <span className="hidden sm:inline">PDF</span>
              </button>
              <button
                onClick={() => handleDocumentAction("print", viewingOrder, modalContent)}
                className="flex items-center gap-2 bg-brand-primary text-white font-semibold py-2 px-3 rounded-lg shadow-sm hover:bg-brand-dark transition-colors text-sm"
              >
                <PrinterIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </button>
            </div>
          }
        >
          {modalContent === "invoice" ? (
            <Invoice
              orders={getInvoiceLines(viewingOrder.invoiceNumber)}
              customer={getCustomerForOrder(viewingOrder)!}
              brandingSettings={brandingSettings}
            />
          ) : (
            <Receipt
              orders={getInvoiceLines(viewingOrder.invoiceNumber)}
              customer={getCustomerForOrder(viewingOrder)!}
              brandingSettings={brandingSettings}
            />
          )}
        </Modal>
      )}

      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Payment"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Payment Method
            </label>
            <select
              id="paymentMethod"
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value as PaymentMethod)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
            >
              {Object.values(PaymentMethod).map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end pt-2 gap-2">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-300 transition-colors dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmPayment}
              className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-green-700 transition-colors"
            >
              Confirm Payment
            </button>
          </div>
        </div>
      </Modal>

      {/* Settings Modal */}
      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        title="Invoice Settings"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Company Name</label>
            <input
              type="text"
              value={tempSettings?.companyName || ''}
              onChange={(e) => setTempSettings(prev => prev ? { ...prev, companyName: e.target.value } : null)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Address</label>
            <textarea
              value={tempSettings?.companyAddress || ''}
              onChange={(e) => setTempSettings(prev => prev ? { ...prev, companyAddress: e.target.value } : null)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Brand Color</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={tempSettings?.brandColor || '#0284c7'}
                  onChange={(e) => setTempSettings(prev => prev ? { ...prev, brandColor: e.target.value } : null)}
                  className="h-9 w-12 p-1 bg-white border border-slate-300 rounded-md shadow-sm cursor-pointer"
                />
                <span className="text-sm text-slate-500">{tempSettings?.brandColor}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Template</label>
              <select
                value={tempSettings?.template || 'modern'}
                onChange={(e) => setTempSettings(prev => prev ? { ...prev, template: e.target.value as 'modern' | 'classic' } : null)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
              >
                <option value="modern">Modern</option>
                <option value="classic">Classic</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">UPI ID (for QR Code)</label>
            <input
              type="text"
              placeholder="e.g. 9876543210@upi"
              value={tempSettings?.upiId || ''}
              onChange={(e) => setTempSettings(prev => prev ? { ...prev, upiId: e.target.value } : null)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
            />
            <p className="text-xs text-slate-500 mt-1">Provide your UPI ID to show a QR code on invoices.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Footer Note</label>
            <input
              type="text"
              value={tempSettings?.footerNotes || ''}
              onChange={(e) => setTempSettings(prev => prev ? { ...prev, footerNotes: e.target.value } : null)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
            />
          </div>

          <div className="flex justify-end pt-4 gap-2">
            <button
              onClick={() => setIsSettingsModalOpen(false)}
              className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-300 transition-colors dark:bg-slate-600 dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (tempSettings) {
                  updateBrandingSettings(tempSettings);
                  setIsSettingsModalOpen(false);
                  showToast("Branding settings updated!");
                }
              }}
              className="bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-brand-dark transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Billing;