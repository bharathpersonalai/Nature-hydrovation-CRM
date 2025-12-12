import React, { useMemo } from "react";
import { Product } from "../../types";
import { PlusCircleIcon, TrashIcon } from "../Icons";

interface OrderItem {
  productId: string;
  quantity: number;
  discount: number;
}

interface NewOrderFormProps {
  orderItems: OrderItem[];
  products: Product[];
  serviceFee: number; // ✅ ADD THIS
  onServiceFeeChange: (value: number) => void; // ✅ ADD THIS
  onItemChange: (
    index: number,
    field: "productId" | "quantity" | "discount",
    value: string | number
  ) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const NewOrderForm: React.FC<NewOrderFormProps> = ({
  orderItems,
  products,
  serviceFee, // ✅ ADD THIS
  onServiceFeeChange, // ✅ ADD THIS
  onItemChange,
  onAddItem,
  onRemoveItem,
  onSubmit,
  onCancel,
}) => {
  const totals = useMemo(() => {
    let subtotal = 0;
    orderItems.forEach((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (product && item.quantity > 0) {
        subtotal +=
          (product.sellingPrice - (item.discount || 0)) * item.quantity;
      }
    });
    const tax = subtotal * 0.18;
    const total = subtotal + tax + (serviceFee || 0); // ✅ ADD serviceFee
    return { subtotal, tax, total };
  }, [orderItems, products, serviceFee]); // ✅ ADD serviceFee dependency

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg space-y-3 max-h-80 overflow-y-auto">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Order Items
          </h4>
          <button
            type="button"
            onClick={onAddItem}
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
          const selectedProduct = products.find((p) => p.id === item.productId);
          return (
            <div key={index} className="flex gap-2 items-start">
              <div className="flex-grow">
                <select
                  value={item.productId}
                  onChange={(e) =>
                    onItemChange(index, "productId", e.target.value)
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
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="w-20">
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) =>
                    onItemChange(index, "quantity", parseInt(e.target.value))
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
                    onItemChange(
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
                onClick={() => onRemoveItem(index)}
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
              <span>₹{totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
              <span>Tax (18%):</span>
              <span>₹{totals.tax.toFixed(2)}</span>
            </div>
            {/* ✅ SERVICE FEE INPUT - NEW SECTION */}
            <div className="flex justify-between items-center text-sm text-slate-600 dark:text-slate-400">
              <span>Service Fee:</span>
              <div className="flex items-center gap-2">
                <span>₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={serviceFee || ""}
                  onChange={(e) =>
                    onServiceFeeChange(parseFloat(e.target.value) || 0)
                  }
                  className="w-24 px-2 py-1 text-sm text-right bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex justify-between text-lg font-bold text-slate-800 dark:text-slate-200 border-t dark:border-slate-600 pt-2">
              <span>Total Amount:</span>
              <span className="text-brand-secondary">
                ₹{totals.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-300 transition-colors dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-brand-dark transition-colors"
        >
          Create Bill
        </button>
      </div>
    </form>
  );
};

export default NewOrderForm;
