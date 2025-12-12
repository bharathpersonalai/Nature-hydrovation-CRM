import { Order, Product, Customer } from '../types';

// Order calculation utilities
export const getOrderItems = (order: Order | any) => {
  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items.map((it: any) => ({
      productId: it.productId,
      quantity: Number(it.quantity ?? 0) || 0,
      salePrice: Number(it.salePrice ?? 0) || 0,
      discount: Number(it.discount ?? 0) || 0
    }));
  }
  if (order.productId) {
    return [{
      productId: order.productId,
      quantity: Number(order.quantity ?? 0) || 0,
      salePrice: Number(order.salePrice ?? 0) || 0,
      discount: Number(order.discount ?? 0) || 0
    }];
  }
  return [];
};

export const getOrderAmount = (order: Order | any) => {
  const items = getOrderItems(order);
  return items.reduce((s: number, it: any) => s + ((it.salePrice - (it.discount || 0)) * it.quantity), 0);
};

export const getOrdersByInvoice = (invoiceNumber: string, orders: Order[]) => {
  return orders.filter((o) => o.invoiceNumber === invoiceNumber);
};

export const getInvoiceLinesFor = (invoiceNumber: string, orders: Order[], products: Product[]) => {
  const oList = getOrdersByInvoice(invoiceNumber, orders);
  if (!oList || oList.length === 0) return [];

  const allLines: any[] = [];

  oList.forEach(order => {
    if (Array.isArray((order as any).items) && (order as any).items.length > 0) {
      const lines = (order as any).items.map((it: any, idx: number) => {
        const product = products.find(p => p.id === it.productId);
        return {
          id: `${order.id}_itm_${idx}`,
          productName: it.productName ?? it.name ?? product?.name ?? "Item",
          quantity: Number(it.quantity ?? it.qty ?? 0) || 0,
          salePrice: Number(it.salePrice ?? it.price ?? product?.sellingPrice ?? 0) || 0,
          discount: Number(it.discount ?? 0) || 0,
          invoiceNumber: order.invoiceNumber,
          orderDate: order.orderDate,
          paymentStatus: order.paymentStatus,
          customerId: order.customerId,
        };
      });
      allLines.push(...lines);
    } else {
      const product = products.find(p => p.id === order.productId);
      allLines.push({
        id: order.id,
        productName: (order as any).productName ?? product?.name ?? "Product",
        quantity: Number(order.quantity ?? 0) || 0,
        salePrice: Number(order.salePrice ?? product?.sellingPrice ?? 0) || 0,
        discount: Number(order.discount ?? 0) || 0,
        invoiceNumber: order.invoiceNumber,
        orderDate: order.orderDate,
        paymentStatus: order.paymentStatus,
        customerId: order.customerId,
      });
    }
  });

  return allLines;
};

// Group orders by invoice
export const groupOrdersByInvoice = (customerId: string, orders: Order[]) => {
  const customerOrders = orders.filter((order) => order.customerId === customerId);
  const grouped: Record<string, {
    invoiceNumber: string;
    date: string;
    status: string;
    method: string;
    total: number;
    representativeOrder: Order;
  }> = {};

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
    grouped[order.invoiceNumber].total += getOrderAmount(order);
  });

  return Object.values(grouped).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};

// Get payment history
export const getCustomerPaymentHistory = (customerId: string, orders: Order[]) => {
  const customerOrders = orders.filter(
    (order) => order.customerId === customerId && order.paymentStatus === "Paid" && order.paymentDate
  );
  const grouped: Record<string, {
    invoiceNumber: string;
    paymentDate: string;
    method: string;
    total: number;
    representativeOrder: Order;
  }> = {};

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
    grouped[order.invoiceNumber].total += getOrderAmount(order);
  });

  return Object.values(grouped).sort(
    (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
  );
};

// CSV Export utilities
export const escapeCsvField = (field: any) => {
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const exportCustomersToCSV = (customers: Customer[]) => {
  const headers = ["ID", "Name", "Email", "Phone", "Address", "Customer Since"];
  const rows = customers.map((customer) =>
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

// Document action utilities
declare var html2pdf: any;

export const handleDocumentAction = (
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