import { useCallback } from 'react';
import { Product } from '../types';
import { addToCollection, updateDocument, deleteDocument, getDocumentById, addStockHistoryEntry } from '../firebase/firestore';
import { useUI } from '../contexts/UIContext';

// This file contains all product-related CRUD and stock adjustment logic.

export const useProductService = (setProducts: React.Dispatch<React.SetStateAction<Product[]>>) => { 
    const { showToast } = useUI();

    const addProduct = useCallback(async (productData: Omit<Product, 'id'>) => {
        try {
            // 1) create product in Firestore and get its ID
            const newProductId = await addToCollection("products", productData);

            // 2) if initial quantity provided, record it in stockHistory
            if (typeof productData.quantity === "number" && productData.quantity !== 0) {
                try {
                    await addStockHistoryEntry({
                        productId: newProductId,
                        productName: productData.name,
                        reason: "Initial Stock",
                        change: productData.quantity,
                        newQuantity: productData.quantity,
                    });
                } catch (err) {
                    console.error("Failed to write initial stock history:", err);
                }
            }

            showToast("Product added successfully!", 'success');
        } catch (error) {
            console.error("Error adding product:", error);
            showToast("Failed to add product", "error");
        }
    }, [showToast]);

    const updateProduct = useCallback(
        async (updatedProduct: Product, reason?: string) => {
            try {
                const { id, ...dataWithoutId } = updatedProduct;

                // 1) Get old product from Firestore
                const oldProduct: any = await getDocumentById("products", id);

                // Fallback if old product doesn't exist
                const oldQty = oldProduct?.quantity ?? 0;
                const newQty = updatedProduct.quantity;

                // 2) Calculate change
                const change = newQty - oldQty;

                // 3) Update the product in Firestore
                await updateDocument("products", id, dataWithoutId);

                // 4) Only write stock history if quantity changed AND a reason is provided
                if (change !== 0 && reason) {
                    await addStockHistoryEntry({
                        productId: id,
                        productName: updatedProduct.name,
                        reason: reason,
                        change: change,
                        newQuantity: newQty,
                        date: new Date().toISOString()
                    });
                }

                showToast("Product updated successfully!", 'success');
            } catch (error) {
                console.error("Error updating product:", error);
                showToast("Failed to update product", "error");
            }
        },
        [showToast]
    );

    const deleteProduct = useCallback(async (productId: string) => {
        try {
            await deleteDocument("products", productId);
            // In a full application, deleting related documents (orders, history) would also happen here.
            showToast('Product deleted successfully.', 'success');
        } catch (error) {
            console.error("Error deleting product:", error);
            showToast('Failed to delete product.', 'error');
        }
    }, [showToast]);

    return {
        addProduct,
        updateProduct,
        deleteProduct,
    };
};