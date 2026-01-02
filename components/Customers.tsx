import React, { useState, useMemo, useEffect, useRef } from "react";
import { useData } from "../contexts/DataContext";
import { useUI } from "../contexts/UIContext";
import { Customer, Order, PaymentMethod, Referral } from "../types";
import Modal from "./Modal";
import Invoice from "./Invoice";
import Receipt from "./Receipt";
import ReferralSlip from "./ReferralSlip";
import html2canvas from "html2canvas";
import {
  PlusCircleIcon,
  DownloadIcon,
  FileTextIcon,
  PrinterIcon,
  CheckCircleIcon,
  PdfIcon,
  ReceiptIcon,
  ShareIcon,
  WhatsAppIcon,
  MailIcon,
  LinkIcon,
} from "./Icons";

// Import new components
import CustomerTable from "./customers/CustomerTable";
import CustomerFilters from "./customers/CustomerFilters";
import CustomerForm from "./customers/CustomerForm";
import OrderHistoryTab from "./customers/OrderHistoryTab";
import PaymentHistoryTab from "./customers/PaymentHistoryTab";
import ReferralsTab from "./customers/ReferralsTab";
import NewOrderForm from "./customers/NewOrderForm";

// Import utilities
import {
  getOrderAmount,
  groupOrdersByInvoice,
  getCustomerPaymentHistory,
  exportCustomersToCSV,
  handleDocumentAction as utilHandleDocumentAction,
  getInvoiceLinesFor,
} from "../utils/customerUtils";

declare var html2pdf: any;

const emptyCustomer = {
  name: "",
  email: "",
  phone: "",
  address: "",
  source: "",
  referralCode: "",
};

type CustomerModalView =
  | "details"
  | "newOrder"
  | "viewInvoice"
  | "viewReceipt"
  | "viewReferralSlip";
type CustomerDetailTab = "orders" | "payments" | "referrals";

const Customers: React.FC = () => {
  const {
    customers,
    orders,
    products,
    brandingSettings,
    viewingItem,
    clearViewingItem,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addOrder,
    updateOrderStatus,
    referrals,
  } = useData();
  const { showToast } = useUI();

  // Modal States
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [customerModalView, setCustomerModalView] =
    useState<CustomerModalView>("details");
  const [activeCustomerTab, setActiveCustomerTab] =
    useState<CustomerDetailTab>("orders");
  const [viewingOrder, setViewingOrder] = useState<
    (Order & { newReferralCode?: string }) | null
  >(null);
  const [customerFormData, setCustomerFormData] = useState<
    typeof emptyCustomer | Customer
  >(emptyCustomer);
  const [serviceFee, setServiceFee] = useState(0);

  // New Order State
  const [orderItems, setOrderItems] = useState<
    { productId: string; quantity: number; discount: number }[]
  >([{ productId: "", quantity: 1, discount: 0 }]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [purchaseHistoryFilter, setPurchaseHistoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("");

  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [orderToPay, setOrderToPay] = useState<Order | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>(PaymentMethod.CreditCard);

  // Referral Slip States
  const [viewingReferralSlip, setViewingReferralSlip] =
    useState<Referral | null>(null);
  const [referralSlipBackground, setReferralSlipBackground] = useState<
    string | null
  >("/slip.jpg");
  const slipContainerRef = useRef<HTMLDivElement>(null);

  // Delete Confirmation States
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);

  // Customer handlers
  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerModalView("details");
    setActiveCustomerTab("orders");
  };

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setCustomerFormData(emptyCustomer);
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerFormData(customer);
    setIsAddEditModalOpen(true);
  };

  useEffect(() => {
    if (viewingItem?.type === "customer") {
      const customerToView = customers.find((c) => c.id === viewingItem.id);
      if (customerToView) {
        handleViewCustomer(customerToView);
        clearViewingItem();
      }
    }
  }, [viewingItem, customers, clearViewingItem]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    let tempCustomers = [...customers];

    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      tempCustomers = tempCustomers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(lowercasedQuery) ||
          customer.email.toLowerCase().includes(lowercasedQuery)
      );
    }

    if (purchaseHistoryFilter !== "all" || locationFilter) {
      tempCustomers = tempCustomers.filter((customer) => {
        const customerOrders = orders.filter(
          (o) => o.customerId === customer.id
        );
        const totalSpent = customerOrders.reduce(
          (sum, o) => sum + getOrderAmount(o),
          0
        );
        const orderCount = customerOrders.length;

        let purchaseMatch = true;
        if (purchaseHistoryFilter === "high-value")
          purchaseMatch = totalSpent > 10000;
        else if (purchaseHistoryFilter === "repeat")
          purchaseMatch = orderCount > 1;
        else if (purchaseHistoryFilter === "first-time")
          purchaseMatch = orderCount === 1;

        const locationMatch =
          !locationFilter ||
          customer.address.toLowerCase().includes(locationFilter.toLowerCase());

        return purchaseMatch && locationMatch;
      });
    }

    return tempCustomers;
  }, [customers, orders, searchQuery, purchaseHistoryFilter, locationFilter]);

  const hasProductsInStock = useMemo(
    () => products.some((p) => p.quantity > 0),
    [products]
  );

  const customerReferralStats = useMemo(() => {
    if (!selectedCustomer) return { count: 0, earnings: 0, referrals: [] };
    const customerReferrals = referrals.filter(
      (r) => r.referrerId === selectedCustomer.id
    );
    const totalEarnings = customerReferrals
      .filter((r) => r.status === "RewardPaid")
      .reduce((sum, r) => sum + r.rewardAmount, 0);
    return {
      count: customerReferrals.length,
      earnings: totalEarnings,
      referrals: customerReferrals.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    };
  }, [referrals, selectedCustomer]);

  const handleCustomerFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      updateCustomer(customerFormData as Customer);
    } else {
      const { referralCode, ...customerData } =
        customerFormData as typeof emptyCustomer;
      addCustomer(customerData, referralCode);
    }
    setIsAddEditModalOpen(false);
    setEditingCustomer(null);
    setCustomerFormData(emptyCustomer);
  };

  const handleCloseCustomerView = () => {
    setSelectedCustomer(null);
    setViewingOrder(null);
    setCustomerModalView("details");
  };

  const handleAddOrderItem = () => {
    setOrderItems([...orderItems, { productId: "", quantity: 1, discount: 0 }]);
  };

  const handleRemoveOrderItem = (index: number) => {
    if (orderItems.length > 1) {
      const newItems = [...orderItems];
      newItems.splice(index, 1);
      setOrderItems(newItems);
    }
  };

  const handleOrderItemChange = (
    index: number,
    field: "productId" | "quantity" | "discount",
    value: string | number
  ) => {
    const newItems = [...orderItems];
    // @ts-ignore
    newItems[index][field] = value;
    setOrderItems(newItems);
  };

  const handleAddOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = orderItems.filter(
      (item) => item.productId && item.quantity > 0
    );

    if (selectedCustomer && validItems.length > 0) {
      const result = await addOrder({
        customerId: selectedCustomer.id,
        items: validItems,
        serviceFee: serviceFee, // ✅ ADD THIS
      });

      if (result.success && result.order) {
        showToast("Order placed successfully!");
        const orderWithCode = {
          ...result.order,
          newReferralCode: result.newReferralCode,
        };
        setViewingOrder(orderWithCode);
        setCustomerModalView("viewInvoice");
        setOrderItems([{ productId: "", quantity: 1, discount: 0 }]);
        setServiceFee(0); // ✅ ADD THIS - Reset service fee
      } else {
        showToast(result.message ?? "Order failed", "error");
      }
    } else {
      showToast("Please add at least one product.", "error");
    }
  };

  const handleViewInvoice = (order: Order) => {
    setViewingOrder(order);
    setCustomerModalView("viewInvoice");
  };

  const handleViewReceipt = (order: Order) => {
    setViewingOrder(order);
    setCustomerModalView("viewReceipt");
  };

  const handleOpenPaymentModal = (order: Order) => {
    setOrderToPay(order);
    setIsPaymentModalOpen(true);
  };

  const handleClearFilters = () => {
    setPurchaseHistoryFilter("all");
    setLocationFilter("");
  };

  const handleConfirmPayment = () => {
    if (orderToPay) {
      updateOrderStatus(orderToPay.id, "Paid", selectedPaymentMethod);
      const updatedOrder = {
        ...orderToPay,
        paymentStatus: "Paid" as const,
        paymentDate: new Date().toISOString(),
        paymentMethod: selectedPaymentMethod,
      };
      setViewingOrder(updatedOrder);

      const invoiceTotalSubtotal =
        groupOrdersByInvoice(orderToPay.customerId, orders).find(
          (g) => g.invoiceNumber === orderToPay.invoiceNumber
        )?.total || 0;
      const invoiceTotalWithTax = invoiceTotalSubtotal * 1.18;

      showToast(
        `Payment of ₹${invoiceTotalWithTax.toFixed(
          2
        )} recorded via ${selectedPaymentMethod}.`
      );
      setCustomerModalView("viewReceipt");
      setIsPaymentModalOpen(false);
      setOrderToPay(null);
    }
  };

  const handleDocumentAction = (
    action: "print" | "pdf",
    order: Order,
    type: "invoice" | "receipt"
  ) => {
    utilHandleDocumentAction(action, order, type);
  };

  const handleSharePdf = async (order: Order, type: "invoice" | "receipt") => {
    const element = document.getElementById(`${type === "invoice" ? "invoice" : "receipt"}-section-content`);
    // Note: the logic in Customers.tsx for element ID might differ.
    // In Billing.tsx I used `${type}-section-content`.
    // Let's check Invoice.tsx and Receipt.tsx.
    // Receipt.tsx uses id="receipt-section-content".
    // Invoice.tsx likely uses id="invoice-section-content".
    // Wait, let me double check Invoice.tsx file content if I can... 
    // I haven't seen Invoice.tsx content. But Receipt.tsx has `receipt-section-content`.
    // I'll assume they follow pattern.
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


  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast("Background image must be less than 2MB.", "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferralSlipBackground(reader.result as string);
        showToast("Referral slip background updated!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadSlip = () => {
    const element = slipContainerRef.current;
    if (!element) return;
    const referrerName =
      selectedCustomer?.name.replace(/\s/g, "_") || "customer";
    const slipWidth = element.offsetWidth;
    const slipHeight = element.offsetHeight;

    const opt = {
      margin: 0,
      filename: `Referral_Slip_${referrerName}_${viewingReferralSlip?.id}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: {
        unit: "px",
        format: [slipWidth, slipHeight],
        orientation: slipWidth > slipHeight ? "landscape" : "portrait",
      },
    };
    html2pdf().from(element).set(opt).save();
  };

  const handleShareSlip = async () => {
    const element = slipContainerRef.current;
    if (!element) {
      showToast("Cannot find slip content to share.", "error");
      return;
    }

    if (!navigator.share) {
      showToast("Web Share API is not supported in your browser.", "warning");
      return;
    }

    try {
      const canvas = await html2canvas(element, { useCORS: true });
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/png");
      });

      if (!blob) {
        showToast("Could not create image for sharing.", "error");
        return;
      }

      const file = new File([blob], "referral-slip.png", { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${brandingSettings.companyName} Referral Slip`,
          text: `A referral reward for ${selectedCustomer?.name || ""}!`,
          files: [file],
        });
        showToast("Shared successfully", "success");
      } else {
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        showToast(
          "Sharing files isn't supported by this browser. Opened image in new tab for download.",
          "warning"
        );
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      }
    } catch (error) {
      console.error("Error sharing slip:", error);
      showToast("An error occurred while trying to share.", "error");
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200">
          Customers
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportCustomersToCSV(filteredCustomers)}
            className="flex items-center gap-2 bg-slate-600 text-white font-semibold py-2 px-3 md:px-4 rounded-lg shadow-sm hover:bg-slate-700 transition-colors"
            title="Export Customers"
          >
            <DownloadIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-brand-primary text-white font-semibold py-2 px-3 md:px-4 rounded-lg shadow-sm hover:bg-brand-dark transition-colors"
            title="Add Customer"
          >
            <PlusCircleIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <CustomerFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        purchaseHistoryFilter={purchaseHistoryFilter}
        onPurchaseHistoryChange={setPurchaseHistoryFilter}
        locationFilter={locationFilter}
        onLocationChange={setLocationFilter}
        onClearFilters={handleClearFilters}
      />

      {/* Table */}
      <CustomerTable
        customers={filteredCustomers}
        onView={handleViewCustomer}
        onEdit={handleOpenEditModal}
        onDelete={(customerId) => {
          setCustomerToDelete(customerId);
          setIsConfirmDeleteOpen(true);
        }}
      />

      {/* Add/Edit Customer Modal */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => {
          setIsAddEditModalOpen(false);
          setEditingCustomer(null);
        }}
        title={editingCustomer ? "Edit Customer" : "Add New Customer"}
      >
        <CustomerForm
          formData={customerFormData}
          onChange={(data) =>
            setCustomerFormData(data as typeof emptyCustomer | Customer)
          }
          onSubmit={handleCustomerFormSubmit}
          isEditing={!!editingCustomer}
        />
      </Modal>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <Modal
          isOpen={!!selectedCustomer}
          onClose={handleCloseCustomerView}
          title={
            customerModalView === "details"
              ? selectedCustomer.name
              : customerModalView === "newOrder"
                ? `Create Bill for ${selectedCustomer.name}` // ✅ CHANGE THIS
                : customerModalView === "viewInvoice"
                  ? `Invoice ${viewingOrder?.invoiceNumber}`
                  : customerModalView === "viewReceipt"
                    ? `Receipt ${viewingOrder?.invoiceNumber.replace("INV", "RCPT")}`
                    : `Referral Slip for ${selectedCustomer.name}`
          }
          size={
            [
              "viewInvoice",
              "viewReceipt",
              "viewReferralSlip",
              "newOrder",
            ].includes(customerModalView)
              ? "2xl"
              : "3xl"
          }
          footer={
            customerModalView === "viewInvoice" && viewingOrder ? (
              <div className="flex flex-wrap items-center gap-2 w-full">
                {/* Share buttons */}
                <div className="flex items-center gap-1 mr-auto">
                  {(() => {
                    const invoiceUrl = `${window.location.origin}/invoice/${viewingOrder.shareToken || viewingOrder.invoiceNumber}`;
                    const message = `Hi ${selectedCustomer?.name || 'there'}! Your invoice ${viewingOrder.invoiceNumber} is ready.\nView here: ${invoiceUrl}`;
                    const phone = selectedCustomer?.phone?.replace(/\D/g, '') || '';
                    const whatsappUrl = `https://wa.me/${phone.startsWith('91') ? phone : '91' + phone}?text=${encodeURIComponent(message)}`;
                    const emailUrl = `mailto:${selectedCustomer?.email || ''}?subject=Invoice ${viewingOrder.invoiceNumber}&body=${encodeURIComponent(message)}`;

                    return (
                      <>
                        {selectedCustomer?.phone && (
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
                        {selectedCustomer?.email && (
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
                          onClick={() => handleSharePdf(viewingOrder, "invoice")}
                          className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                          title="Share PDF"
                        >
                          <ShareIcon className="w-5 h-5" />
                        </button>
                      </>
                    );
                  })()}
                </div>

                {/* Action buttons */}
                {viewingOrder.paymentStatus === "Unpaid" ? (
                  <button
                    onClick={() => handleOpenPaymentModal(viewingOrder)}
                    className="flex items-center gap-2 bg-green-600 text-white font-semibold py-2 px-3 rounded-lg shadow-sm hover:bg-green-700 transition-colors text-sm"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Mark Paid</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setCustomerModalView("viewReceipt")}
                    className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2 px-3 rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-sm"
                  >
                    <ReceiptIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Receipt</span>
                  </button>
                )}
                <button
                  onClick={() => handleDocumentAction("pdf", viewingOrder, "invoice")}
                  className="flex items-center gap-2 bg-slate-600 text-white font-semibold py-2 px-3 rounded-lg shadow-sm hover:bg-slate-700 transition-colors text-sm"
                >
                  <PdfIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">PDF</span>
                </button>
                <button
                  onClick={() => handleDocumentAction("print", viewingOrder, "invoice")}
                  className="flex items-center gap-2 bg-brand-primary text-white font-semibold py-2 px-3 rounded-lg shadow-sm hover:bg-brand-dark transition-colors text-sm"
                >
                  <PrinterIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Print</span>
                </button>
              </div>
            ) : customerModalView === "viewReceipt" && viewingOrder ? (
              <div className="flex flex-wrap items-center gap-2 w-full">
                {/* Share buttons */}
                <div className="flex items-center gap-1 mr-auto">
                  {(() => {
                    const invoiceUrl = `${window.location.origin}/invoice/${viewingOrder.shareToken || viewingOrder.invoiceNumber}`;
                    const message = `Hi ${selectedCustomer?.name || 'there'}! Your invoice ${viewingOrder.invoiceNumber} is ready.\nView here: ${invoiceUrl}`;
                    const phone = selectedCustomer?.phone?.replace(/\D/g, '') || '';
                    const whatsappUrl = `https://wa.me/${phone.startsWith('91') ? phone : '91' + phone}?text=${encodeURIComponent(message)}`;
                    const emailUrl = `mailto:${selectedCustomer?.email || ''}?subject=Invoice ${viewingOrder.invoiceNumber}&body=${encodeURIComponent(message)}`;

                    return (
                      <>
                        {selectedCustomer?.phone && (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                            title="Share via WhatsApp"
                          >
                            <WhatsAppIcon className="w-4 h-4" />
                          </a>
                        )}
                        {selectedCustomer?.email && (
                          <a
                            href={emailUrl}
                            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            title="Share via Email"
                          >
                            <MailIcon className="w-4 h-4" />
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
                          <LinkIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSharePdf(viewingOrder, "receipt")}
                          className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                          title="Share PDF"
                        >
                          <ShareIcon className="w-4 h-4" />
                        </button>
                      </>
                    );
                  })()}
                </div>

                {/* Action buttons */}
                <button
                  onClick={() => setCustomerModalView("viewInvoice")}
                  className="flex items-center gap-2 bg-slate-600 text-white font-semibold py-2 px-3 rounded-lg shadow-sm hover:bg-slate-700 transition-colors text-sm"
                >
                  <FileTextIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Invoice</span>
                </button>
                <button
                  onClick={() => handleDocumentAction("pdf", viewingOrder, "receipt")}
                  className="flex items-center gap-2 bg-slate-600 text-white font-semibold py-2 px-3 rounded-lg shadow-sm hover:bg-slate-700 transition-colors text-sm"
                >
                  <PdfIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">PDF</span>
                </button>
                <button
                  onClick={() => handleDocumentAction("print", viewingOrder, "receipt")}
                  className="flex items-center gap-2 bg-brand-primary text-white font-semibold py-2 px-3 rounded-lg shadow-sm hover:bg-brand-dark transition-colors text-sm"
                >
                  <PrinterIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Print</span>
                </button>
              </div>
            ) : customerModalView === "viewReferralSlip" &&
              viewingReferralSlip ? (
              <>
                <button
                  type="button"
                  onClick={() => setCustomerModalView("details")}
                  className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-300 transition-colors dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                >
                  Back to Details
                </button>
                <button
                  onClick={handleShareSlip}
                  className="flex items-center gap-2 bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-300 transition-colors dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                >
                  <ShareIcon className="w-5 h-5" /> Share
                </button>
                <button
                  onClick={handleDownloadSlip}
                  className="flex items-center gap-2 bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-brand-dark transition-colors"
                >
                  <DownloadIcon className="w-5 h-5" /> Download PDF
                </button>
              </>
            ) : undefined
          }
        >
          {customerModalView === "details" && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                  Contact Info
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedCustomer.email}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedCustomer.phone}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedCustomer.address}
                </p>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="border-b border-slate-200 dark:border-slate-700 w-full">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                      <button
                        onClick={() => setActiveCustomerTab("orders")}
                        className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeCustomerTab === "orders"
                          ? "border-brand-primary text-brand-primary"
                          : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-600"
                          }`}
                      >
                        Order History
                      </button>
                      <button
                        onClick={() => setActiveCustomerTab("payments")}
                        className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeCustomerTab === "payments"
                          ? "border-brand-primary text-brand-primary"
                          : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-600"
                          }`}
                      >
                        Payment History
                      </button>
                      <button
                        onClick={() => setActiveCustomerTab("referrals")}
                        className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeCustomerTab === "referrals"
                          ? "border-brand-primary text-brand-primary"
                          : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-600"
                          }`}
                      >
                        Referrals
                      </button>
                    </nav>
                  </div>
                  <button
                    onClick={() => setCustomerModalView("newOrder")}
                    disabled={!hasProductsInStock}
                    title={
                      !hasProductsInStock
                        ? "No products in stock to create an order"
                        : "Create a new bill"
                    } // ✅ CHANGE THIS
                    className="ml-4 text-sm flex-shrink-0 flex items-center gap-1 bg-brand-secondary text-white font-semibold py-1 px-3 rounded-md shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PlusCircleIcon className="w-4 h-4" />
                    New Bill {/* ✅ CHANGE THIS from "New Order" */}
                  </button>
                </div>
                <div className="mt-4">
                  {activeCustomerTab === "orders" && (
                    <OrderHistoryTab
                      orderGroups={groupOrdersByInvoice(
                        selectedCustomer.id,
                        orders
                      )}
                      onViewInvoice={handleViewInvoice}
                      onViewReceipt={handleViewReceipt}
                    />
                  )}
                  {activeCustomerTab === "payments" && (
                    <PaymentHistoryTab
                      paymentGroups={getCustomerPaymentHistory(
                        selectedCustomer.id,
                        orders
                      )}
                    />
                  )}
                  {activeCustomerTab === "referrals" && (
                    <ReferralsTab
                      customer={selectedCustomer}
                      referralStats={customerReferralStats}
                      customers={customers}
                      referralSlipBackground={referralSlipBackground}
                      onBackgroundUpload={handleBackgroundUpload}
                      onViewSlip={(referral) => {
                        setViewingReferralSlip(referral);
                        setCustomerModalView("viewReferralSlip");
                      }}
                      onViewCustomerSlip={() => {
                        const dummyReferral: Referral = {
                          id: "preview",
                          referrerId: selectedCustomer.id,
                          refereeId: "",
                          orderId: "",
                          date: new Date().toISOString(),
                          status: "Completed",
                          rewardAmount: 500,
                        };
                        setViewingReferralSlip(dummyReferral);
                        setCustomerModalView("viewReferralSlip");
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
          {customerModalView === "newOrder" && (
            <NewOrderForm
              orderItems={orderItems}
              products={products}
              serviceFee={serviceFee} // ✅ ADD THIS
              onServiceFeeChange={setServiceFee} // ✅ ADD THIS
              onItemChange={handleOrderItemChange}
              onAddItem={handleAddOrderItem}
              onRemoveItem={handleRemoveOrderItem}
              onSubmit={handleAddOrderSubmit}
              onCancel={() => setCustomerModalView("details")}
            />
          )}
          {customerModalView === "viewInvoice" && viewingOrder && (
            <Invoice
              orders={getInvoiceLinesFor(
                viewingOrder.invoiceNumber,
                orders,
                products
              )}
              customer={
                customers.find((c) => c.id === viewingOrder.customerId)!
              }
              brandingSettings={brandingSettings}
            />
          )}
          {customerModalView === "viewReceipt" && viewingOrder && (
            <Receipt
              orders={getInvoiceLinesFor(
                viewingOrder.invoiceNumber,
                orders,
                products
              )}
              customer={
                customers.find((c) => c.id === viewingOrder.customerId)!
              }
              brandingSettings={brandingSettings}
            />
          )}
          {customerModalView === "viewReferralSlip" && viewingReferralSlip && (
            <div ref={slipContainerRef}>
              <ReferralSlip
                referralId={viewingReferralSlip.id}
                referrerName={selectedCustomer.name}
                date={viewingReferralSlip.date}
                rewardAmount={viewingReferralSlip.rewardAmount}
                backgroundUrl={referralSlipBackground || "/slip.jpg"}
                referralCode={selectedCustomer.referralCode}
              />
            </div>
          )}
        </Modal>
      )}

      {/* Payment Modal */}
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

      {/* Confirm Delete Modal */}
      <Modal isOpen={isConfirmDeleteOpen} onClose={() => setIsConfirmDeleteOpen(false)} title="Confirm Deletion">
        <div>
          <p className="text-slate-600 dark:text-slate-300">
            Are you sure you want to delete this customer? This action cannot be undone.
          </p>
          <div className="flex justify-end pt-6 gap-2">
            <button
              onClick={() => setIsConfirmDeleteOpen(false)}
              className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-300 transition-colors dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (customerToDelete) {
                  deleteCustomer(customerToDelete);
                }
                setIsConfirmDeleteOpen(false);
                setCustomerToDelete(null);
              }}
              className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Customers;
