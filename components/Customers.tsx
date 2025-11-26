import React, { useState, useContext, useMemo, useRef, useEffect } from "react";
import { CrmContext } from "../App";
import { Customer, Order, PaymentMethod, Referral } from "../types";
import Modal from "./Modal";
import Invoice from "./Invoice";
import Receipt from "./Receipt";
import {
  PlusCircleIcon,
  DownloadIcon,
  FileTextIcon,
  PrinterIcon,
  CheckCircleIcon,
  PdfIcon,
  ReceiptIcon,
  PencilIcon,
  GiftIcon,
  XIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronsUpDownIcon,
  UploadCloudIcon,
  ImageIcon,
  TicketIcon,
  ShareIcon,
  TrashIcon,
} from "./Icons";
import ReferralSlip from "./ReferralSlip";
import html2canvas from "html2canvas";

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
declare var html2pdf: any; // Declare html2pdf to avoid TypeScript errors

type SortableKey = "name" | "email" | "phone" | "address" | "createdAt";

const Customers: React.FC = () => {
  const context = useContext(CrmContext);
  if (!context) return null;
  const {
    customers,
    products,
    orders,
    referrals,
    leads,
    addCustomer,
    updateCustomer,
    addOrder,
    showToast,
    updateInvoiceStatus,
    brandingSettings,
    viewingItem,
    clearViewingItem,
  } = context;

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

  // New Order State (Multi-item)
  const [orderItems, setOrderItems] = useState<
    { productId: string; quantity: number; discount: number }[]
  >([{ productId: "", quantity: 1, discount: 0 }]);

  const [searchQuery, setSearchQuery] = useState("");

  // Segmentation State
  const [purchaseHistoryFilter, setPurchaseHistoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("");

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [orderToPay, setOrderToPay] = useState<Order | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>(PaymentMethod.CreditCard);
  const [sortConfig, setSortConfig] = useState<{
    key: SortableKey;
    direction: "ascending" | "descending";
  } | null>(null);

  // Referral Slip State
  const [viewingReferralSlip, setViewingReferralSlip] =
    useState<Referral | null>(null);
  const [referralSlipBackground, setReferralSlipBackground] = useState<
    string | null
  >("/slip.jpg");
  const slipContainerRef = useRef<HTMLDivElement>(null);
  const backgroundUploadRef = useRef<HTMLInputElement>(null);

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

  const filteredCustomers = useMemo(() => {
    let tempCustomers = [...customers];

    // Text search
    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      tempCustomers = tempCustomers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(lowercasedQuery) ||
          customer.email.toLowerCase().includes(lowercasedQuery)
      );
    }

    // Segmentation filters
    if (purchaseHistoryFilter !== "all" || locationFilter) {
      tempCustomers = tempCustomers.filter((customer) => {
        const customerOrders = orders.filter(
          (o) => o.customerId === customer.id
        );
        const totalSpent = customerOrders.reduce(
          (sum, o) => sum + (o.salePrice - (o.discount || 0)) * o.quantity,
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

  const sortedCustomers = useMemo(() => {
    let sortableItems = [...filteredCustomers];
    if (sortConfig) {
      sortableItems.sort((a, b) => {
        const key = sortConfig.key;
        const valA = a[key] || "";
        const valB = b[key] || "";
        const comparison = String(valA).localeCompare(String(valB));

        return sortConfig.direction === "ascending" ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [filteredCustomers, sortConfig]);

  const requestSort = (key: SortableKey) => {
    let direction: "ascending" | "descending" = "ascending";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "ascending"
    ) {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const SortableHeader: React.FC<{
    children: React.ReactNode;
    sortKey: SortableKey;
  }> = ({ children, sortKey }) => {
    const isSorting = sortConfig?.key === sortKey;
    const icon = isSorting ? (
      sortConfig.direction === "ascending" ? (
        <ChevronUpIcon className="w-4 h-4 ml-1.5" />
      ) : (
        <ChevronDownIcon className="w-4 h-4 ml-1.5" />
      )
    ) : (
      <ChevronsUpDownIcon className="w-4 h-4 ml-1.5 opacity-0 group-hover:opacity-40" />
    );

    return (
      <th scope="col" className="px-6 py-3">
        <button
          onClick={() => requestSort(sortKey)}
          className="group flex items-center uppercase font-medium"
        >
          {children} {icon}
        </button>
      </th>
    );
  };

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

  // Calculate dynamic totals for New Order modal
  const newOrderTotals = useMemo(() => {
    let subtotal = 0;
    orderItems.forEach((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (product && item.quantity > 0) {
        subtotal +=
          (product.sellingPrice - (item.discount || 0)) * item.quantity;
      }
    });
    const tax = subtotal * 0.18;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }, [orderItems, products]);

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
    setSelectedCustomer(null); // This closes modal and resets state
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
        // DO NOT clear selectedCustomer here!
      } else {
        showToast(result.message ?? "Order failed", "error");
      }
    } else {
      showToast("Please add at least one product.", "error");
    }
  };

  const getCustomerOrdersGrouped = (customerId: string) => {
    const customerOrders = orders.filter(
      (order) => order.customerId === customerId
    );
    const grouped: Record<
      string,
      {
        invoiceNumber: string;
        date: string;
        status: string;
        method: string;
        total: number;
        representativeOrder: Order;
      }
    > = {};

    customerOrders.forEach((order) => {
      if (!grouped[order.invoiceNumber]) {
        grouped[order.invoiceNumber] = {
          invoiceNumber: order.invoiceNumber,
          date: order.orderDate,
          status: order.paymentStatus,
          method: order.paymentMethod || "-",
          total: 0,
          representativeOrder: order,
        };
      }

      // FIX: Handle both multi-item and single-item orders
      if (
        Array.isArray((order as any).items) &&
        (order as any).items.length > 0
      ) {
        // Multi-item order
        (order as any).items.forEach((item: any) => {
          const itemTotal =
            ((item.salePrice || item.price || 0) - (item.discount || 0)) *
            (item.quantity || item.qty || 0);
          grouped[order.invoiceNumber].total += itemTotal;
        });
      } else {
        // Single-item order (legacy)
        const itemTotal =
          (order.salePrice - (order.discount || 0)) * order.quantity;
        grouped[order.invoiceNumber].total += itemTotal;
      }
    });

    return Object.values(grouped).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  const getCustomerPaymentHistory = (customerId: string) => {
    const customerOrders = orders.filter(
      (order) =>
        order.customerId === customerId &&
        order.paymentStatus === "Paid" &&
        order.paymentDate
    );
    const grouped: Record<
      string,
      {
        invoiceNumber: string;
        paymentDate: string;
        method: string;
        total: number;
        representativeOrder: Order;
      }
    > = {};

    customerOrders.forEach((order) => {
      if (!grouped[order.invoiceNumber]) {
        grouped[order.invoiceNumber] = {
          invoiceNumber: order.invoiceNumber,
          paymentDate: order.paymentDate!,
          method: order.paymentMethod || "-",
          total: 0,
          representativeOrder: order,
        };
      }

      // FIX: Handle both multi-item and single-item orders
      if (
        Array.isArray((order as any).items) &&
        (order as any).items.length > 0
      ) {
        // Multi-item order
        (order as any).items.forEach((item: any) => {
          const itemTotal =
            ((item.salePrice || item.price || 0) - (item.discount || 0)) *
            (item.quantity || item.qty || 0);
          grouped[order.invoiceNumber].total += itemTotal;
        });
      } else {
        // Single-item order (legacy)
        const itemTotal =
          (order.salePrice - (order.discount || 0)) * order.quantity;
        grouped[order.invoiceNumber].total += itemTotal;
      }
    });

    return Object.values(grouped).sort(
      (a, b) =>
        new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );
  };

  const handleExportCustomers = () => {
    if (filteredCustomers.length === 0) {
      showToast("No customer data to export.", "error");
      return;
    }

    const headers = [
      "ID",
      "Name",
      "Email",
      "Phone",
      "Address",
      "Customer Since",
    ];

    const escapeCsvField = (field: any) => {
      const str = String(field);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = filteredCustomers.map((customer) =>
      [
        customer.id,
        customer.name,
        customer.email,
        customer.phone,
        customer.address,
        new Date(customer.createdAt).toLocaleDateString(),
      ]
        .map(escapeCsvField)
        .join(",")
    );

    const csvContent = [headers.join(","), ...rows].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "customers.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      // use the Firestore document id (orderToPay.id), not the invoice number
      updateInvoiceStatus(orderToPay.id, "Paid", selectedPaymentMethod);

      const updatedOrder = {
        ...orderToPay,
        paymentStatus: "Paid" as const,
        paymentDate: new Date().toISOString(),
        paymentMethod: selectedPaymentMethod,
      };
      setViewingOrder(updatedOrder);

      const invoiceOrders = orders.filter(
        (o) => o.invoiceNumber === orderToPay.invoiceNumber
      );
      const invoiceTotal =
        invoiceOrders.reduce(
          (sum, o) => sum + (o.salePrice - (o.discount || 0)) * o.quantity,
          0
        ) * 1.18;

      showToast(
        `Payment of ₹${invoiceTotal.toFixed(
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

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        // 2MB limit
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

  // add this import at top: import html2canvas from 'html2canvas';

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
      // create canvas
      const canvas = await html2canvas(element, { useCORS: true });

      // convert canvas -> blob with a Promise wrapper
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/png");
      });

      if (!blob) {
        showToast("Could not create image for sharing.", "error");
        return;
      }

      const file = new File([blob], "referral-slip.png", { type: "image/png" });

      // some browsers don't support sharing files; check before calling navigator.share
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${brandingSettings.companyName} Referral Slip`,
          text: `A referral reward for ${selectedCustomer?.name || ""}!`,
          files: [file],
        });
        showToast("Shared successfully", "success");
      } else {
        // fallback: open the image in a new tab so user can save manually
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        showToast(
          "Sharing files isn't supported by this browser. Opened image in new tab for download.",
          "warning"
        );
        // revoke the object URL after a short delay
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      }
    } catch (error) {
      console.error("Error sharing slip:", error);
      showToast("An error occurred while trying to share.", "error");
    }
  };

  // Helper to get all orders for a given invoice
  const getOrdersByInvoice = (invoiceNumber: string) => {
    return orders.filter((o) => o.invoiceNumber === invoiceNumber);
  };

  // --- ADD THIS HELPER ---
  const getInvoiceLinesFor = (invoiceNumber: string) => {
    const oList = getOrdersByInvoice(invoiceNumber);
    if (!oList || oList.length === 0) return [];

    // Case A: Firestore stores single order doc with items[]
    if (oList.length === 1 && Array.isArray((oList[0] as any).items)) {
      const doc = oList[0] as any;
      return doc.items.map((it: any, idx: number) => ({
        id: `${doc.id}_itm_${idx}`,
        productName: it.productName ?? it.name ?? "Item",
        quantity: it.quantity ?? it.qty ?? 0,
        salePrice: it.salePrice ?? it.price ?? 0,
        discount: it.discount ?? 0,
        invoiceNumber: doc.invoiceNumber,
        orderDate: doc.orderDate,
        paymentStatus: doc.paymentStatus,
        customerId: doc.customerId,
      })) as any[];
    }

    // Case B: already line items — return as is
    return oList as any[];
  };
  // --- END HELPER ---

  return (
    <div className="p-6 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
          Customers
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCustomers}
            className="flex items-center gap-2 bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-700 transition-colors"
          >
            <DownloadIcon className="w-5 h-5" />
            Export Customers
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-brand-dark transition-colors"
          >
            <PlusCircleIcon className="w-5 h-5" />
            Add Customer
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="search"
          placeholder="Search customers by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
        />
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700 items-center">
        <h3 className="text-md font-semibold text-slate-700 dark:text-slate-200 flex-shrink-0">
          Segments:
        </h3>
        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={purchaseHistoryFilter}
            onChange={(e) => setPurchaseHistoryFilter(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
          >
            <option value="all">All Purchase Histories</option>
            <option value="high-value">High Value (&gt; ₹10,000)</option>
            <option value="repeat">Repeat Customers (&gt; 1 order)</option>
            <option value="first-time">First-time Customers</option>
          </select>

          <input
            type="text"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            placeholder="Filter by location..."
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
          />
        </div>
        <button
          onClick={handleClearFilters}
          className="ml-4 flex-shrink-0 text-sm flex items-center gap-1.5 text-slate-500 hover:text-brand-primary dark:text-slate-400 dark:hover:text-brand-primary transition-colors"
        >
          <XIcon className="w-4 h-4" />
          Clear Filters
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden dark:bg-slate-800">
        <div className="overflow-x-auto">
          {customers.length > 0 ? (
            sortedCustomers.length > 0 ? (
              <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                <thead className="text-xs text-slate-700 bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                  <tr>
                    <SortableHeader sortKey="name">Name</SortableHeader>
                    <SortableHeader sortKey="email">Email</SortableHeader>
                    <SortableHeader sortKey="phone">Phone</SortableHeader>
                    <SortableHeader sortKey="address">Address</SortableHeader>
                    <SortableHeader sortKey="createdAt">
                      Customer Since
                    </SortableHeader>
                    <th scope="col" className="px-6 py-3 uppercase font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="bg-white border-b hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
                    >
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                        {customer.name}
                      </td>
                      <td className="px-6 py-4">{customer.email}</td>
                      <td className="px-6 py-4">{customer.phone}</td>
                      <td className="px-6 py-4 truncate max-w-xs">
                        {customer.address}
                      </td>
                      <td className="px-6 py-4">
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleViewCustomer(customer)}
                            className="font-medium text-brand-primary hover:underline"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(customer)}
                            className="text-slate-400 hover:text-brand-primary transition-colors"
                            aria-label="Edit customer"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-16">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                  No Customers Found
                </h3>
                <p className="text-slate-500 mt-2 dark:text-slate-400">
                  Your search and filter combination did not return any results.
                </p>
              </div>
            )
          ) : (
            <div className="text-center py-16">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                No customers yet
              </h3>
              <p className="text-slate-500 mt-2 dark:text-slate-400">
                Convert qualified leads or add a customer manually.
              </p>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => {
          setIsAddEditModalOpen(false);
          setEditingCustomer(null);
        }}
        title={editingCustomer ? "Edit Customer" : "Add New Customer"}
      >
        <form onSubmit={handleCustomerFormSubmit} className="space-y-4">
          <input
            type="text"
            name="name"
            placeholder="Name"
            value={customerFormData.name}
            onChange={(e) =>
              setCustomerFormData((p) => ({ ...p, name: e.target.value }))
            }
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={customerFormData.email}
            onChange={(e) =>
              setCustomerFormData((p) => ({ ...p, email: e.target.value }))
            }
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
            required
          />
          <input
            type="tel"
            name="phone"
            placeholder="Phone"
            value={customerFormData.phone}
            onChange={(e) =>
              setCustomerFormData((p) => ({ ...p, phone: e.target.value }))
            }
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
          />
          <input
            type="text"
            name="address"
            placeholder="Address"
            value={customerFormData.address}
            onChange={(e) =>
              setCustomerFormData((p) => ({ ...p, address: e.target.value }))
            }
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
          />
          {!editingCustomer && (
            <>
              <input
                type="text"
                name="source"
                placeholder="Source (e.g. Walk-in)"
                value={customerFormData.source || ""}
                onChange={(e) =>
                  setCustomerFormData((p) => ({ ...p, source: e.target.value }))
                }
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
              />
              <input
                type="text"
                name="referralCode"
                placeholder="Referral Code (Optional)"
                value={(customerFormData as any).referralCode || ""}
                onChange={(e) =>
                  setCustomerFormData((p) => ({
                    ...p,
                    referralCode: e.target.value,
                  }))
                }
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
              />
            </>
          )}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-brand-dark transition-colors"
            >
              {editingCustomer ? "Save Changes" : "Add Customer"}
            </button>
          </div>
        </form>
      </Modal>

      {selectedCustomer && (
        <Modal
          isOpen={!!selectedCustomer}
          onClose={handleCloseCustomerView}
          title={
            customerModalView === "details"
              ? selectedCustomer.name
              : customerModalView === "newOrder"
              ? `New Order for ${selectedCustomer.name}`
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
              <>
                <button
                  type="button"
                  onClick={() => setCustomerModalView("details")}
                  className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-300 transition-colors dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
                >
                  Back to Details
                </button>
                {viewingOrder.paymentStatus === "Unpaid" ? (
                  <button
                    onClick={() => handleOpenPaymentModal(viewingOrder)}
                    className="flex items-center gap-2 bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-green-700 transition-colors"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                    Mark as Paid
                  </button>
                ) : (
                  <button
                    onClick={() => setCustomerModalView("viewReceipt")}
                    className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
                  >
                    <ReceiptIcon className="w-5 h-5" />
                    View Receipt
                  </button>
                )}
                <button
                  onClick={() =>
                    handleDocumentAction("pdf", viewingOrder, "invoice")
                  }
                  className="flex items-center gap-2 bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-700 transition-colors"
                >
                  <PdfIcon className="w-5 h-5" /> Download PDF
                </button>
                <button
                  onClick={() =>
                    handleDocumentAction("print", viewingOrder, "invoice")
                  }
                  className="flex items-center gap-2 bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-brand-dark transition-colors"
                >
                  <PrinterIcon className="w-5 h-5" /> Print Invoice
                </button>
              </>
            ) : customerModalView === "viewReceipt" && viewingOrder ? (
              <>
                <button
                  type="button"
                  onClick={() => setCustomerModalView("details")}
                  className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-300 transition-colors dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
                >
                  Back to Details
                </button>
                <button
                  onClick={() => setCustomerModalView("viewInvoice")}
                  className="flex items-center gap-2 bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-700 transition-colors"
                >
                  <FileTextIcon className="w-5 h-5" /> View Invoice
                </button>
                <button
                  onClick={() =>
                    handleDocumentAction("pdf", viewingOrder, "receipt")
                  }
                  className="flex items-center gap-2 bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-700 transition-colors"
                >
                  <PdfIcon className="w-5 h-5" /> Download PDF
                </button>
                <button
                  onClick={() =>
                    handleDocumentAction("print", viewingOrder, "receipt")
                  }
                  className="flex items-center gap-2 bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-brand-dark transition-colors"
                >
                  <PrinterIcon className="w-5 h-5" /> Print Receipt
                </button>
              </>
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
                        className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors
                                                    ${
                                                      activeCustomerTab ===
                                                      "orders"
                                                        ? "border-brand-primary text-brand-primary"
                                                        : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-600"
                                                    }`}
                      >
                        Order History
                      </button>
                      <button
                        onClick={() => setActiveCustomerTab("payments")}
                        className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors
                                                    ${
                                                      activeCustomerTab ===
                                                      "payments"
                                                        ? "border-brand-primary text-brand-primary"
                                                        : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-600"
                                                    }`}
                      >
                        Payment History
                      </button>
                      <button
                        onClick={() => setActiveCustomerTab("referrals")}
                        className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors
                                                    ${
                                                      activeCustomerTab ===
                                                      "referrals"
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
                        : "Create a new order"
                    }
                    className="ml-4 text-sm flex-shrink-0 flex items-center gap-1 bg-brand-secondary text-white font-semibold py-1 px-3 rounded-md shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PlusCircleIcon className="w-4 h-4" />
                    New Order
                  </button>
                </div>
                <div className="mt-4">
                  {activeCustomerTab === "orders" &&
                    (getCustomerOrdersGrouped(selectedCustomer.id).length >
                    0 ? (
                      <div className="overflow-x-auto max-h-60 border rounded-lg dark:border-slate-700">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-600 dark:text-slate-400 uppercase sticky top-0 bg-slate-50 dark:bg-slate-700/80 backdrop-blur-sm">
                            <tr>
                              <th className="px-2 py-2 font-medium">
                                Invoice #
                              </th>
                              <th className="px-2 py-2 font-medium">Status</th>
                              <th className="px-2 py-2 font-medium">Method</th>
                              <th className="px-2 py-2 font-medium text-right">
                                Total
                              </th>
                              <th className="px-2 py-2 font-medium text-center">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {getCustomerOrdersGrouped(selectedCustomer.id).map(
                              (group) => (
                                <tr
                                  key={group.invoiceNumber}
                                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                >
                                  <td className="px-2 py-2 whitespace-nowrap font-medium text-slate-900 dark:text-slate-100 font-medium text-slate-900 dark:text-slate-100">
                                    {group.invoiceNumber}
                                  </td>
                                  <td className="px-2 py-2">
                                    <span
                                      className={`px-2 py-0.5 text-xs rounded-full ${
                                        group.status === "Paid"
                                          ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
                                          : "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300"
                                      }`}
                                    >
                                      {group.status}
                                    </span>
                                  </td>
                                  <td className="px-2 py-2 text-slate-500 dark:text-slate-400 text-xs">
                                    {group.method}
                                  </td>
                                  <td className="px-2 py-2 text-right font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                    ₹{(group.total * 1.18).toFixed(2)}
                                  </td>
                                  <td className="px-2 py-2 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        onClick={() =>
                                          handleViewInvoice(
                                            group.representativeOrder
                                          )
                                        }
                                        className="text-brand-primary hover:underline text-xs font-semibold"
                                      >
                                        Invoice
                                      </button>
                                      {group.status === "Paid" && (
                                        <>
                                          <span className="text-slate-300 dark:text-slate-600">
                                            |
                                          </span>
                                          <button
                                            onClick={() =>
                                              handleViewReceipt(
                                                group.representativeOrder
                                              )
                                            }
                                            className="text-brand-secondary hover:underline text-xs font-semibold"
                                          >
                                            Receipt
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-slate-50 rounded-lg dark:bg-slate-800/50">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          No orders yet for this customer.
                        </p>
                      </div>
                    ))}
                  {activeCustomerTab === "payments" &&
                    (getCustomerPaymentHistory(selectedCustomer.id).length >
                    0 ? (
                      <div className="overflow-x-auto max-h-60 border rounded-lg dark:border-slate-700">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-600 dark:text-slate-400 uppercase sticky top-0 bg-slate-50 dark:bg-slate-700/80 backdrop-blur-sm">
                            <tr>
                              <th className="px-4 py-2 font-medium">
                                Payment Date
                              </th>
                              <th className="px-4 py-2 font-medium">
                                Receipt #
                              </th>
                              <th className="px-4 py-2 font-medium">Method</th>
                              <th className="px-4 py-2 font-medium text-right">
                                Amount Paid
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {getCustomerPaymentHistory(selectedCustomer.id).map(
                              (group) => (
                                <tr
                                  key={group.invoiceNumber}
                                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                >
                                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                    {new Date(
                                      group.paymentDate
                                    ).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300">
                                    {group.invoiceNumber.replace("INV", "RCPT")}
                                  </td>
                                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                                    {group.method}
                                  </td>
                                  <td className="px-4 py-2 text-right font-semibold text-brand-secondary whitespace-nowrap">
                                    ₹{(group.total * 1.18).toFixed(2)}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-slate-50 rounded-lg dark:bg-slate-800/50">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          No payment history found.
                        </p>
                      </div>
                    ))}
                  {activeCustomerTab === "referrals" && (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-lg dark:bg-slate-800/50">
                        {selectedCustomer.referralCode ? (
                          <div className="text-center">
                            <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                              YOUR REFERRAL CODE
                            </h4>
                            <div className="my-2 p-2 bg-brand-light dark:bg-brand-dark/30 border-2 border-dashed border-brand-primary rounded-lg">
                              <code className="text-2xl font-bold text-brand-primary">
                                {selectedCustomer.referralCode}
                              </code>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  selectedCustomer.referralCode || ""
                                );
                                showToast("Referral code copied to clipboard!");
                              }}
                              className="text-sm font-medium text-brand-primary hover:underline"
                            >
                              Copy Code
                            </button>
                            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                              <div className="bg-white dark:bg-slate-700 p-3 rounded-lg shadow-sm">
                                <div className="font-semibold text-slate-500 dark:text-slate-400">
                                  Successful Referrals
                                </div>
                                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                                  {customerReferralStats.count}
                                </div>
                              </div>
                              <div className="bg-white dark:bg-slate-700 p-3 rounded-lg shadow-sm">
                                <div className="font-semibold text-slate-500 dark:text-slate-400">
                                  Total Rewards Earned
                                </div>
                                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                                  ₹
                                  {customerReferralStats.earnings.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <GiftIcon className="w-12 h-12 mx-auto text-slate-400" />
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                              This customer will receive a referral code after
                              their first paid order.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-slate-50 rounded-lg dark:bg-slate-800/50">
                        <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                          CUSTOMIZE REFERRAL SLIP
                        </h4>
                        <div className="mt-2 flex items-center gap-4">
                          <div className="w-24 h-14 bg-slate-200 dark:bg-slate-700 rounded-md flex items-center justify-center overflow-hidden">
                            <img
                              src={referralSlipBackground || "/slip.jpg"}
                              alt="Referral slip background"
                              className="w-full h-full object-cover rounded-md"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                ref={backgroundUploadRef}
                                onChange={handleBackgroundUpload}
                                accept="image/*"
                                className="hidden"
                              />
                              <button
                                onClick={() =>
                                  backgroundUploadRef.current?.click()
                                }
                                className="flex items-center gap-2 text-sm font-medium bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600"
                              >
                                <UploadCloudIcon className="w-4 h-4" />
                                Upload Background
                              </button>

                              {/* NEW: View Customer Slip Button */}
                              {selectedCustomer?.referralCode && (
                                <button
                                  onClick={() => {
                                    // Create a dummy referral object to view the slip
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
                                  className="flex items-center gap-2 text-sm font-medium bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700"
                                >
                                  <TicketIcon className="w-4 h-4" />
                                  View Customer Slip
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-slate-400">
                              Recommended size: 1280x720px.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                          REFERRAL HISTORY
                        </h4>
                        {customerReferralStats.referrals.length > 0 ? (
                          <div className="mt-2 border rounded-lg dark:border-slate-700 max-h-48 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="text-xs text-slate-600 dark:text-slate-400 uppercase sticky top-0 bg-slate-50 dark:bg-slate-700/80 backdrop-blur-sm">
                                <tr>
                                  <th className="px-4 py-2 font-medium text-left">
                                    Date
                                  </th>
                                  <th className="px-4 py-2 font-medium text-left">
                                    New Customer
                                  </th>
                                  <th className="px-4 py-2 font-medium text-left">
                                    Status
                                  </th>
                                  <th className="px-4 py-2 font-medium text-center">
                                    Action
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {customerReferralStats.referrals.map(
                                  (referral) => (
                                    <tr
                                      key={referral.id}
                                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                    >
                                      <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                                        {new Date(
                                          referral.date
                                        ).toLocaleDateString()}
                                      </td>
                                      <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300">
                                        {context.customers.find(
                                          (c) => c.id === referral.refereeId
                                        )?.name || "N/A"}
                                      </td>
                                      <td className="px-4 py-2">
                                        <span
                                          className={`px-2 py-0.5 text-xs rounded-full ${
                                            referral.status === "RewardPaid"
                                              ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
                                              : "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                                          }`}
                                        >
                                          {referral.status}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2 text-center">
                                        <button
                                          onClick={() => {
                                            setViewingReferralSlip(referral);
                                            setCustomerModalView(
                                              "viewReferralSlip"
                                            );
                                          }}
                                          className="flex items-center justify-center mx-auto gap-1.5 font-medium text-brand-primary hover:underline"
                                        >
                                          <TicketIcon className="w-4 h-4" />{" "}
                                          View Slip
                                        </button>
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-4 mt-2 bg-slate-50 rounded-lg dark:bg-slate-800/50">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              No referral history yet.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {customerModalView === "newOrder" && (
            <form onSubmit={handleAddOrderSubmit} className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg space-y-3 max-h-80 overflow-y-auto">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Order Items
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddOrderItem}
                    className="text-xs flex items-center gap-1 text-brand-primary font-medium hover:underline"
                  >
                    <PlusCircleIcon className="w-3 h-3" /> Add Item
                  </button>
                </div>

                <div className="flex gap-2 px-1 mb-1">
                  <div className="flex-grow text-xs font-medium text-slate-500 dark:text-slate-400">
                    Product
                  </div>
                  <div className="w-20 text-xs font-medium text-slate-500 dark:text-slate-400">
                    Qty
                  </div>
                  <div className="w-24 text-xs font-medium text-slate-500 dark:text-slate-400">
                    Discount
                  </div>
                  <div className="w-9"></div>
                </div>

                {orderItems.map((item, index) => {
                  const selectedProduct = products.find(
                    (p) => p.id === item.productId
                  );
                  return (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-grow">
                        <select
                          value={item.productId}
                          onChange={(e) =>
                            handleOrderItemChange(
                              index,
                              "productId",
                              e.target.value
                            )
                          }
                          className="block w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                          required
                        >
                          <option value="" disabled>
                            Select Product
                          </option>
                          {products
                            .filter((p) => p.quantity > 0)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.quantity} in stock)
                              </option>
                            ))}
                        </select>
                        {selectedProduct && (
                          <div className="mt-1 ml-1 text-xs text-slate-500 dark:text-slate-400">
                            Selling Price (MRP):{" "}
                            <span className="font-semibold">
                              ₹{selectedProduct.sellingPrice}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="w-20">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleOrderItemChange(
                              index,
                              "quantity",
                              parseInt(e.target.value)
                            )
                          }
                          className="block w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                          required
                          placeholder="Qty"
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          min="0"
                          value={item.discount || ""}
                          onChange={(e) =>
                            handleOrderItemChange(
                              index,
                              "discount",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="block w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                          placeholder="Discount"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveOrderItem(index)}
                        disabled={orderItems.length === 1}
                        className="p-2 text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-400"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Calculated Totals Display */}
              <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                <div className="flex justify-end">
                  <div className="w-full max-w-xs space-y-2">
                    <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                      <span>Subtotal:</span>
                      <span>₹{newOrderTotals.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                      <span>Tax (18%):</span>
                      <span>₹{newOrderTotals.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-slate-800 dark:text-slate-200 border-t dark:border-slate-600 pt-2">
                      <span>Total Amount:</span>
                      <span className="text-brand-secondary">
                        ₹{newOrderTotals.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 gap-2">
                <button
                  type="button"
                  onClick={() => setCustomerModalView("details")}
                  className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-300 transition-colors dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-brand-dark transition-colors"
                >
                  Place Order
                </button>
              </div>
            </form>
          )}
          {customerModalView === "viewInvoice" && viewingOrder && (
            <Invoice
              orders={getInvoiceLinesFor(viewingOrder.invoiceNumber)}
              customer={
                context.customers.find((c) => c.id === viewingOrder.customerId)!
              }
              brandingSettings={brandingSettings}
            />
          )}
          {customerModalView === "viewReceipt" && viewingOrder && (
            <Receipt
              orders={getInvoiceLinesFor(viewingOrder.invoiceNumber)}
              customer={
                context.customers.find((c) => c.id === viewingOrder.customerId)!
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
                backgroundUrl={
                  referralSlipBackground || "/slip.jpg"
                } /* Always use default if null */
                referralCode={selectedCustomer.referralCode}
              />
            </div>
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

export default Customers;
