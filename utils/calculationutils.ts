// Centralized calculation utilities to avoid NaN/Infinity issues
/**
 * Safely convert any value to a number, defaulting to 0 if invalid
 */
export const safeNumber = (val: any, defaultVal: number = 0): number => {
  const num = Number(val);
  return isNaN(num) || !isFinite(num) ? defaultVal : num;
};

/**
 * Normalize order items array with safe numeric conversions
 */
export const getOrderItems = (order: any) => {
  if (Array.isArray(order?.items) && order.items.length > 0) {
    return order.items.map((it: any) => ({
      productId: it.productId,
      quantity: safeNumber(it.quantity ?? it.qty, 0),
      salePrice: safeNumber(it.salePrice ?? it.price, 0),
      discount: safeNumber(it.discount, 0),
    }));
  }

  // Fallback: single-line order shape
  return [
    {
      productId: order?.productId,
      quantity: safeNumber(order?.quantity ?? order?.qty, 0),
      salePrice: safeNumber(order?.salePrice ?? order?.price, 0),
      discount: safeNumber(order?.discount, 0),
    },
  ];
};

/**
 * Calculate total amount for an order: sum of (salePrice - discount) * quantity
 */
export const getOrderAmount = (order: any): number => {
  const items = getOrderItems(order);
  return items.reduce(
    (sum: number, it: any) =>
      sum + (it.salePrice - it.discount) * it.quantity,
    0
  );
};

/**
 * Calculate total quantity for an order: sum of item quantities
 */
export const getOrderQuantity = (order: any): number => {
  const items = getOrderItems(order);
  return items.reduce((sum: number, it: any) => sum + it.quantity, 0);
};

/**
 * Calculate total with tax (18% default, but configurable)
 */
export const getTotalWithTax = (
  amount: number,
  taxPercent?: number
): string => {
  const total = safeNumber(amount, 0);
  const taxRate = taxPercent ?? 18; // Default to 18 if not provided
  const taxAmount = total * (taxRate / 100);
  return (total + taxAmount).toFixed(2);
};

/**
 * Validate if a number is safe (not NaN, not Infinity)
 */
export const isValidNumber = (val: any): boolean => {
  const num = Number(val);
  return !isNaN(num) && isFinite(num);
};