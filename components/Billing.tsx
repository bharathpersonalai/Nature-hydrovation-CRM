import React, { useState, useContext, useMemo } from "react";
import { CrmContext } from "../App";
import { Order, Customer, PaymentMethod } from "../types";
import Modal from "./Modal";
import Invoice from "./Invoice";
import Receipt from "./Receipt";
import {
  PrinterIcon,
  CheckCircleIcon,
  PdfIcon,
  FileTextIcon,
  ReceiptIcon,
  DownloadIcon,
} from "./Icons";
import { safeNumber, getTotalWithTax } from '../utils/calculationUtils';

declare var html2pdf: any;

type BillingTab = "invoices" | "receipts";

const Billing: React.FC = () => {
  const context = useContext(CrmContext);
  if (!context) return null;
  const {
    orders,
    customers,
    updateInvoiceStatus,
    showToast,
    brandingSettings,
  } = context;
   const taxRate = context?.brandingSettings.taxRate ?? 18; 
   const handleExportAllBilling = () => {
    // Filter orders based on active tab
    const filteredOrders =
      activeTab === "receipts"
        ? orders.filter((order) => order.paymentStatus === "Paid")
        : orders; // For invoices, show all orders

    if (filteredOrders.length === 0) {
      showToast(`No ${activeTab} data to export.`, "error");
      return;
    }

    // CSV Headers (update based on tab)
    const headers =
      activeTab === "receipts"
        ? [
            "Receipt Number",
            "Customer Name",
            "Payment Date",
            "Total Amount",
            "Tax (18%)",
            "Grand Total",
            "Payment Method",
          ]
        : [
            "Invoice Number",
            "Customer Name",
            "Order Date",
            "Total Amount",
            "Tax (18%)",
            "Grand Total",
            "Payment Status",
            "Payment Method",
            "Payment Date",
          ];

    // Helper to escape CSV fields
    const escapeCsvField = (field: any) => {
      const str = String(field || "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Build rows based on tab
    const rows = filteredOrders.map((order) => {
      const customer = customers.find((c) => c.id === order.customerId);
      const subtotal = order.totalAmount || 0;
      const tax = subtotal * 0.18;
      const grandTotal = subtotal + tax;

      if (activeTab === "receipts") {
        // Receipt format
        return [
          order.invoiceNumber.replace("INV", "RCPT"),
          customer?.name || "N/A",
          order.paymentDate
            ? new Date(order.paymentDate).toLocaleDateString()
            : "-",
          subtotal.toFixed(2),
          tax.toFixed(2),
          grandTotal.toFixed(2),
          order.paymentMethod || "-",
        ]
          .map(escapeCsvField)
          .join(",");
      } else {
        // Invoice format
        return [
          order.invoiceNumber,
          customer?.name || "N/A",
          new Date(order.orderDate).toLocaleDateString(),
          subtotal.toFixed(2),
          tax.toFixed(2),
          grandTotal.toFixed(2),
          order.paymentStatus,
          order.paymentMethod || "-",
          order.paymentDate
            ? new Date(order.paymentDate).toLocaleDateString()
            : "-",
        ]
          .map(escapeCsvField)
          .join(",");
      }
    });

    // Create CSV content
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);

    // Dynamic filename based on tab
    const filename = `${activeTab}-export-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(
      `${
        activeTab.charAt(0).toUpperCase() + activeTab.slice(1)
      } data exported successfully!`,
      "success"
    );
  };

  const [activeTab, setActiveTab] = useState<BillingTab>("invoices");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Paid" | "Unpaid">(
    "all"
  );
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<
    "all" | PaymentMethod
  >("all");
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [modalContent, setModalContent] = useState<"invoice" | "receipt">(
    "invoice"
  );

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [orderToPay, setOrderToPay] = useState<Order | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>(PaymentMethod.CreditCard);

  const customerMap = useMemo(() => {
    return new Map(customers.map((c) => [c.id, c]));
  }, [customers]);

  // --- safe helper to compute numeric amount for an order ---
  const getOrderAmount = (order: any): number => {
    // If the order has an items[] (multi-item order)
    if (Array.isArray(order?.items) && order.items.length > 0) {
      return order.items.reduce((s: number, it: any) => {
        const unit = Number(it?.salePrice ?? it?.price ?? 0) || 0;
        const qty = Number(it?.quantity ?? it?.qty ?? 0) || 0;
        const disc = Number(it?.discount ?? 0) || 0;
        return s + (unit - disc) * qty;
      }, 0);
    }

    // fallback: single line order with salePrice/quantity or price/qty
    const unit = Number(order?.salePrice ?? order?.price ?? 0) || 0;
    const qty = Number(order?.quantity ?? order?.qty ?? 0) || 0;
    const disc = Number(order?.discount ?? 0) || 0;
    return (unit - disc) * qty;
  };

  // Group Orders by Invoice Number to show unique rows (safe numeric totals)
  const groupedInvoices = useMemo(() => {
    // helper: compute numeric amount for a single order (supports items[] and single-line orders)
    const computeOrderAmount = (order: any): number => {
      try {
        if (Array.isArray(order?.items) && order.items.length > 0) {
          return order.items.reduce((acc: number, it: any) => {
            const unit = Number(it?.salePrice ?? it?.price ?? 0) || 0;
            const qty = Number(it?.quantity ?? it?.qty ?? 0) || 0;
            const disc = Number(it?.discount ?? 0) || 0;
            return acc + (unit - disc) * qty;
          }, 0);
        }
        const unit = Number(order?.salePrice ?? order?.price ?? 0) || 0;
        const qty = Number(order?.quantity ?? order?.qty ?? 0) || 0;
        const disc = Number(order?.discount ?? 0) || 0;
        return (unit - disc) * qty;
      } catch (e) {
        console.error("computeOrderAmount error", e, order);
        return 0;
      }
    };

    const grouped: Record<
      string,
      {
        invoiceNumber: string;
        customerId: string;
        date: string;
        status: string;
        method: string;
        total: number;
        representativeOrder: any;
        paymentDate?: string;
      }
    > = {};

    orders.forEach((order: any) => {
      // defensive values
      const invoice =
        order?.invoiceNumber ??
        `INV-UNKNOWN-${order?.id ?? Math.random().toString(36).slice(2, 6)}`;
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

      const amount = computeOrderAmount(order);
      grouped[invoice].total =
        (Number(grouped[invoice].total) || 0) + (Number(amount) || 0);

      // keep the most recent order as representative
      try {
        const existingDate = new Date(grouped[invoice].date).getTime();
        const thisDate = new Date(
          order?.orderDate ?? grouped[invoice].date
        ).getTime();
        if (thisDate > existingDate) {
          grouped[invoice].date = order?.orderDate ?? grouped[invoice].date;
          grouped[invoice].representativeOrder = order;
          grouped[invoice].status =
            order?.paymentStatus ?? grouped[invoice].status;
          grouped[invoice].method =
            order?.paymentMethod ?? grouped[invoice].method;
          grouped[invoice].paymentDate =
            order?.paymentDate ?? grouped[invoice].paymentDate;
        }
      } catch (e) {
        /* ignore date parsing errors */
      }
    });

    return Object.values(grouped);
  }, [orders]);

  const filteredItems = useMemo(() => {
    let tempItems = [...groupedInvoices];

    if (activeTab === "invoices") {
      tempItems = tempItems.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      if (statusFilter !== "all") {
        tempItems = tempItems.filter((item) => item.status === statusFilter);
      }
    } else {
      // Receipts
      tempItems = tempItems
        .filter((item) => item.status === "Paid")
        .sort(
          (a, b) =>
            new Date(b.paymentDate!).getTime() -
            new Date(a.paymentDate!).getTime()
        );

      if (paymentMethodFilter !== "all") {
        tempItems = tempItems.filter(
          (item) => item.method === paymentMethodFilter
        );
      }
    }

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
  }, [
    groupedInvoices,
    searchQuery,
    statusFilter,
    customerMap,
    activeTab,
    paymentMethodFilter,
  ]);

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
      updateInvoiceStatus(
        orderToPay.invoiceNumber,
        "Paid",
        selectedPaymentMethod
      );
      const updatedOrder = {
        ...orderToPay,
        paymentStatus: "Paid" as const,
        paymentDate: new Date().toISOString(),
        paymentMethod: selectedPaymentMethod,
      };
      setViewingOrder(updatedOrder);
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
        filename: `${type === "invoice" ? "Invoice" : "Receipt"}-${
          order.invoiceNumber
        }.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      };
      html2pdf().from(element).set(opt).save();
    }
  };

  // Helper to get all orders for a given invoice
  const getOrdersByInvoice = (invoiceNumber: string) => {
    return orders.filter((o) => o.invoiceNumber === invoiceNumber);
  };

  return (
    <div className="p-6 md:p-8">
      {/* Header with Export Button */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
          Billing
        </h1>

        {/* Export All Billing Button - Dynamic Text */}
        <button
          onClick={handleExportAllBilling}
          className="flex items-center gap-2 bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-700 transition-colors"
        >
          <DownloadIcon className="w-5 h-5" />
          {activeTab === "receipts"
            ? "Export All Receipts"
            : "Export All Invoices"}
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          <button
            onClick={() => handleTabChange("invoices")}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
            ${
              activeTab === "invoices"
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-600"
            }`}
          >
            Invoices
          </button>
          <button
            onClick={() => handleTabChange("receipts")}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
            ${
              activeTab === "receipts"
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-600"
            }`}
          >
            Receipts
          </button>
        </nav>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <input
          type="search"
          placeholder={
            activeTab === "invoices"
              ? "Search by invoice # or customer..."
              : "Search by receipt # or customer..."
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-grow block w-full px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
        />
        {activeTab === "invoices" && (
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "Paid" | "Unpaid")
            }
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
            onChange={(e) =>
              setPaymentMethodFilter(e.target.value as "all" | PaymentMethod)
            }
            className="block w-full md:w-auto px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
          >
            <option value="all">All Payment Methods</option>
            {Object.values(PaymentMethod).map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden dark:bg-slate-800">
        <div className="overflow-x-auto">
          {orders.length > 0 ? (
            filteredItems.length > 0 ? (
              activeTab === "invoices" ? (
                <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                  <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                    <tr>
                      <th scope="col" className="px-6 py-3">
                        Invoice #
                      </th>
                      <th scope="col" className="px-6 py-3">
                        Customer
                      </th>
                      <th scope="col" className="px-6 py-3">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-right">
                        Amount
                      </th>
                      <th scope="col" className="px-6 py-3 text-center">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                   
{filteredItems.map((item) => {
  const customer = customerMap.get(item.customerId);
  const displayTotal = safeNumber(item.total, 0);
  const totalWithTax = getTotalWithTax(displayTotal, taxRate); 

                      return (
                        <tr
                          key={item.invoiceNumber}
                          className="bg-white border-b hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
                        >
                          <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                            {item.invoiceNumber}
                          </td>
                          <td className="px-6 py-4">
                            {customer?.name || "N/A"}
                          </td>
                          <td className="px-6 py-4">
                            {new Date(item.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right font-medium">
                            ₹{totalWithTax}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`px-2.5 py-1 text-xs rounded-full ${
                                item.status === "Paid"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
                                  : "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() =>
                                handleViewInvoice(item.representativeOrder)
                              }
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
              ) : (
                <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                  <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                    <tr>
                      <th scope="col" className="px-6 py-3">
                        Receipt #
                      </th>
                      <th scope="col" className="px-6 py-3">
                        Customer
                      </th>
                      <th scope="col" className="px-6 py-3">
                        Payment Date
                      </th>
                      <th scope="col" className="px-6 py-3">
                        Method
                      </th>
                      <th scope="col" className="px-6 py-3 text-right">
                        Amount Paid
                      </th>
                      <th scope="col" className="px-6 py-3">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      const customer = customerMap.get(item.customerId);
                      const displayTotal =
                        isNaN(item.total) || !isFinite(item.total)
                          ? 0
                          : Number(item.total);
                      const totalWithTax = (displayTotal * 1.18).toFixed(2);

                      return (
                        <tr
                          key={item.invoiceNumber}
                          className="bg-white border-b hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
                        >
                          <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                            {item.invoiceNumber.replace("INV", "RCPT")}
                          </td>
                          <td className="px-6 py-4">
                            {customer?.name || "N/A"}
                          </td>
                          <td className="px-6 py-4">
                            {item.paymentDate
                              ? new Date(item.paymentDate).toLocaleDateString()
                              : "N/A"}
                          </td>
                          <td className="px-6 py-4">{item.method}</td>
                          <td className="px-6 py-4 text-right font-semibold text-green-600 dark:text-green-400">
                            ₹{totalWithTax}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() =>
                                handleViewReceipt(item.representativeOrder)
                              }
                              className="font-medium text-brand-primary hover:underline"
                            >
                              View Receipt
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            ) : (
              <div className="text-center py-16">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                  No {activeTab === "invoices" ? "Invoices" : "Receipts"} Found
                </h3>
                <p className="text-slate-500 mt-2 dark:text-slate-400">
                  Your search and filter combination did not return any results.
                </p>
              </div>
            )
          ) : (
            <div className="text-center py-16">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                No billing records yet
              </h3>
              <p className="text-slate-500 mt-2 dark:text-slate-400">
                Place an order from the Customers tab to generate an invoice.
              </p>
            </div>
          )}
        </div>
      </div>

      {viewingOrder && (
        <Modal
          isOpen={!!viewingOrder}
          onClose={handleCloseModal}
          title={
            modalContent === "invoice"
              ? `Invoice ${viewingOrder.invoiceNumber}`
              : `Receipt ${viewingOrder.invoiceNumber.replace("INV", "RCPT")}`
          }
          size="2xl"
          footer={
            <>
              {viewingOrder.paymentStatus === "Paid" && (
                <button
                  onClick={() =>
                    setModalContent(
                      modalContent === "invoice" ? "receipt" : "invoice"
                    )
                  }
                  className="mr-auto flex items-center gap-2 bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-700 transition-colors"
                >
                  {modalContent === "invoice" ? (
                    <ReceiptIcon className="w-5 h-5" />
                  ) : (
                    <FileTextIcon className="w-5 h-5" />
                  )}
                  {modalContent === "invoice" ? "View Receipt" : "View Invoice"}
                </button>
              )}
              <button
                type="button"
                onClick={handleCloseModal}
                className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-300 transition-colors dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
              >
                Close
              </button>
              {viewingOrder.paymentStatus === "Unpaid" &&
                modalContent === "invoice" && (
                  <button
                    onClick={() => handleOpenPaymentModal(viewingOrder)}
                    className="flex items-center gap-2 bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-green-700 transition-colors"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                    Mark as Paid
                  </button>
                )}
              <button
                onClick={() =>
                  handleDocumentAction("pdf", viewingOrder, modalContent)
                }
                className="flex items-center gap-2 bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-700 transition-colors"
              >
                <PdfIcon className="w-5 h-5" />
                Download PDF
              </button>
              <button
                onClick={() =>
                  handleDocumentAction("print", viewingOrder, modalContent)
                }
                className="flex items-center gap-2 bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-brand-dark transition-colors"
              >
                <PrinterIcon className="w-5 h-5" />
                {modalContent === "invoice" ? "Print Invoice" : "Print Receipt"}
              </button>
            </>
          }
        >
          {modalContent === "invoice" ? (
            <Invoice
              orders={getOrdersByInvoice(viewingOrder.invoiceNumber)}
              customer={getCustomerForOrder(viewingOrder)!}
              brandingSettings={brandingSettings}
            />
          ) : (
            <Receipt
              orders={getOrdersByInvoice(viewingOrder.invoiceNumber)}
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
            <label
              htmlFor="paymentMethod"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Payment Method
            </label>
            <select
              id="paymentMethod"
              value={selectedPaymentMethod}
              onChange={(e) =>
                setSelectedPaymentMethod(e.target.value as PaymentMethod)
              }
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
            >
              {Object.values(PaymentMethod).map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
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
    </div>
  );
};

export default Billing;
