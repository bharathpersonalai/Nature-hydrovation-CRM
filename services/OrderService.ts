import { useCallback } from 'react';
import { Order, PaymentMethod, Product, Customer, OrderResult } from '../types';
import { addToCollection, updateDocument, addStockHistoryEntry } from '../firebase/firestore';
import { useUI } from '../contexts/UIContext';

// This file contains all Order, Billing Status, and Referral Reward logic.

export const useOrderService = (orders: Order[], products: Product[], customers: Customer[]) => {
    const { showToast } = useUI();

    // --- Order Creation (Invoice Generation - NO STOCK REDUCTION) ---
    const addOrder = useCallback(async (newOrder: {
        customerId: string,
        items: { productId: string, quantity: number, discount: number }[],
        serviceFee?: number
    }): Promise<OrderResult> => {
        try {
            if (!Array.isArray(newOrder.items) || newOrder.items.length === 0) {
                showToast('No items in order.', 'error');
                return { success: false, message: 'No items' };
            }

            // 1. Validate products exist and check if enough stock WILL BE available when paid
            const itemDetails = newOrder.items.map(it => {
                const product = products.find(p => p.id === it.productId);
                return { requested: it, product };
            });

            const missing = itemDetails.find(d => !d.product);
            if (missing) {
                showToast('One or more products not found.', 'error');
                return { success: false, message: 'Product not found' };
            }

            const insufficient = itemDetails.find(d => (d.product!.quantity < d.requested.quantity));
            if (insufficient) {
                showToast('Insufficient stock for one or more items.', 'error');
                return { success: false, message: 'Insufficient stock' };
            }

            // 2. Generate Invoice Number and calculate totals
            const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const dailyOrderCount = orders.filter(o => o.invoiceNumber?.startsWith(`INV-${datePrefix}`)).length;
            const sequence = String(dailyOrderCount + 1).padStart(2, '0');
            const invoiceNumber = `INV-${datePrefix}-${sequence}`;
            const orderDate = new Date().toISOString();

            const itemsPayload = itemDetails.map(d => ({
                productId: d.product!.id,
                productName: d.product!.name,
                quantity: d.requested.quantity,
                salePrice: d.product!.sellingPrice,
                discount: d.requested.discount,
                lineTotal: (d.product!.sellingPrice - (d.requested.discount || 0)) * d.requested.quantity,
            }));

            const subtotal = itemsPayload.reduce((s, it) => s + (it.lineTotal || 0), 0);
            const tax = subtotal * 0.18;
            const serviceFee = newOrder.serviceFee || 0;
            const totalAmount = subtotal + tax + serviceFee;

            // Generate a secure random token for sharing (approx 20 chars)
            const shareToken = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);

            const orderPayload: any = {
                customerId: newOrder.customerId,
                items: itemsPayload,
                serviceFee: serviceFee,
                totalAmount,
                invoiceNumber,
                orderDate,
                paymentStatus: 'Unpaid',
                createdAt: new Date().toISOString(),
                shareToken,
            };

            // 3. Write order document to Firestore
            const createdId = await addToCollection('orders', orderPayload);

            // ✅ REMOVED: Stock reduction logic (moved to updateOrderStatus when marking as Paid)

            showToast(`Invoice ${invoiceNumber} created (Unpaid)`, 'success');

            return {
                success: true,
                message: `Invoice #${invoiceNumber} created`,
                order: { id: createdId, ...orderPayload } as Order
            };
        } catch (err: any) {
            console.error('[addOrder] caught error ->', err);
            const msg = err?.message || 'Failed to create invoice';
            showToast(msg, 'error');
            return { success: false, message: msg, error: err };
        }
    }, [products, orders, showToast]);

    // --- Status and Payment Update (STOCK REDUCTION HAPPENS HERE) ---
    const updateOrderStatus = useCallback(
        async (orderId: string, status: 'Paid' | 'Unpaid', paymentMethod: PaymentMethod) => {
            try {
                const order = orders.find(o => o.id === orderId);
                if (!order) {
                    showToast('Order not found.', 'error');
                    return;
                }

                // ✅ NEW: If marking as Paid, reduce stock FIRST before updating status
                if (status === 'Paid' && order.paymentStatus === 'Unpaid') {
                    // Get order items (handle both multi-item and legacy single-item orders)
                    const orderItems = Array.isArray((order as any).items)
                        ? (order as any).items
                        : [{
                            productId: order.productId,
                            productName: order.productName,
                            quantity: order.quantity,
                            salePrice: order.salePrice,
                            discount: order.discount || 0
                        }];

                    // Reduce stock for each item
                    for (const item of orderItems) {
                        const product = products.find(p => p.id === item.productId);
                        if (!product) {
                            showToast(`Product ${item.productName} not found.`, 'error');
                            return;
                        }

                        // Check if enough stock available NOW
                        if (product.quantity < item.quantity) {
                            showToast(`Insufficient stock for ${product.name}. Available: ${product.quantity}, Required: ${item.quantity}`, 'error');
                            return;
                        }

                        const newQty = product.quantity - item.quantity;

                        // Update product stock
                        await updateDocument('products', product.id, { ...product, quantity: newQty });

                        // Record stock history
                        try {
                            await addStockHistoryEntry({
                                productId: product.id,
                                productName: product.name,
                                reason: `Sale (Invoice ${order.invoiceNumber})`,
                                change: -item.quantity,
                                newQuantity: newQty,
                                date: new Date().toISOString(),
                            });
                        } catch (e) {
                            console.warn('Failed to write stock history for', product.id, e);
                        }
                    }
                }

                // Update order payment status
                const updatePayload: any = {
                    paymentStatus: status,
                    paymentMethod: paymentMethod ?? null,
                    paymentDate: new Date().toISOString(),
                };

                await updateDocument('orders', orderId, updatePayload);
                let newReferralCode: string | undefined = undefined;

                // Handle referral generation on first paid order
                if (status === 'Paid') {
                    const customer = customers.find(c => c.id === order.customerId);
                    if (customer) {
                        // Exclude the current order from the count to avoid stale closure issues
                        const customerPaidOrders = orders.filter(
                            o => o.customerId === customer.id && o.paymentStatus === 'Paid' && o.id !== orderId
                        );

                        // Check if this payment makes it the first paid order
                        if (customerPaidOrders.length === 0 && !customer.referralCode) {
                            const uniqueId = Math.random().toString(36).substring(2, 6).toUpperCase();
                            newReferralCode = `NH-${(customer.id || '').toString().substring(5, 9)}-${uniqueId}`;

                            // Persist referral code to Firestore customer doc
                            await updateDocument('customers', customer.id, { referralCode: newReferralCode });
                            showToast(`Referral code generated for ${customer.name}!`, 'success');
                        }

                        // Create referral record if customer was referred
                        if (customer.referredById) {
                            const referralPayload = {
                                referrerId: customer.referredById,
                                refereeId: customer.id,
                                orderId: orderId,
                                date: new Date().toISOString(),
                                status: 'Completed',
                                rewardAmount: 500,
                            };
                            await addToCollection('referrals', referralPayload);
                            showToast('Referral recorded and reward queued.', 'success');
                        }
                    }
                }

                showToast(status === 'Paid' ? 'Payment recorded and stock updated!' : 'Order status updated!', 'success');
            } catch (err: any) {
                console.error('[updateOrderStatus] error:', err);
                const msg = err?.message || 'Failed to update order status';
                showToast(msg, 'error');
            }
        },
        [orders, customers, products, showToast]  // ✅ Added 'products' dependency
    );

    // --- Referral Mark as Paid ---
    const markRewardAsPaid = useCallback(async (referralId: string) => {
        try {
            await updateDocument('referrals', referralId, { status: 'RewardPaid' });
            showToast('Reward marked as paid.', 'success');
        } catch (err) {
            console.error('markRewardAsPaid error', err);
            showToast('Failed to mark reward as paid.', 'error');
        }
    }, [showToast]);

    return {
        addOrder,
        updateOrderStatus,
        markRewardAsPaid,
    };
};
