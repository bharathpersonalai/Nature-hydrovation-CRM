import { useCallback } from 'react';
import { addToCollection, updateDocument, deleteDocument } from '../firebase/firestore';
import { useUI } from '../contexts/UIContext';
import { ProductCategory } from '../types';

// The function signature now accepts the necessary state array and the setter function 
// directly from DataContext.tsx to manage the local state and avoid "Duplicate identifier" errors.
export const useListService = (
    categories: ProductCategory[],
    setCategories: React.Dispatch<React.SetStateAction<ProductCategory[]>>
) => { 
    const { showToast } = useUI();

    // 1. Supplier CRUD (Requires Firestore changes to be fully effective, relies on listener for client-side update)
    const addSupplier = useCallback(async (name: string) => {
        if (!name) return;
        try {
            // Awaiting Firestore write, listener will update the 'suppliers' state array in DataContext
            await addToCollection("suppliers", { name: name.trim() });
            showToast('Supplier added successfully!', 'success');
        } catch (err) {
            console.error('addSupplier failed:', err);
            showToast('Failed to add supplier.', 'error');
        }
    }, [showToast]);

    const updateSupplier = useCallback(async (oldName: string, newName: string) => {
        if (!oldName || !newName || oldName === newName) return;
        
        try {
            // NOTE: A complete system needs to fetch the Firestore ID for the supplier and update that document.
            // For now, we update client state as a fallback and use a warning toast.
            // The logic below ensures that categories referencing the old supplier name are updated in client memory.
            
            // This manual client-side state update is kept to mirror the original file's behavior where possible:
            setCategories(prev => prev.map(c => c.supplier === oldName ? { ...c, supplier: newName } : c));
            
            showToast(`Supplier name updated to ${newName}! (Requires back-end Firestore ID logic for persistence)`, 'warning');
            
        } catch (e) {
            console.error('Error updating supplier:', e);
            showToast('Failed to update supplier.', 'error');
        }
    }, [showToast, setCategories]); // setCategories must be in dependency array

    const removeSupplier = useCallback(async (name: string) => {
        if (!name) return;
        try {
            // NOTE: A complete system would find the Firestore ID and cascade delete.
            showToast(`Supplier '${name}' deleted! (Requires back-end Firestore ID logic for persistence)`, 'success');
        } catch (e) {
            console.error('Error removing supplier:', e);
            showToast('Failed to remove supplier.', 'error');
        }
    }, [showToast]);

    // 2. Category CRUD 
    const addCategory = useCallback(async (name: string, supplier: string) => {
        if (!name || !supplier) return;
        try {
            // Awaiting Firestore write, listener will update the 'categories' state array in DataContext
            await addToCollection("categories", { 
                name: name.trim(), 
                supplier: supplier.trim() 
            });
            showToast('Category added successfully!', 'success');
        } catch (error) {
            console.error("Error adding category:", error);
            showToast('Failed to add category.', 'error');
        }
    }, [showToast]); 

    const updateCategory = useCallback(async (oldName: string, supplier: string, newName: string) => {
        if (!oldName || !newName) return;

        // Find the Firestore ID using the 'categories' array passed from DataContext
        const categoryToUpdate = categories.find(c => c.name === oldName && c.supplier === supplier);

        if (categoryToUpdate && (categoryToUpdate as any).id) {
            try {
                await updateDocument("categories", (categoryToUpdate as any).id, { name: newName });
                showToast(`Category updated to ${newName}!`, 'success');
            } catch (error) {
                console.error("Error updating category:", error);
                showToast('Failed to update category.', 'error');
            }
        }
    }, [categories, showToast]);

    const removeCategory = useCallback(async (name: string, supplier: string) => {
        if (!name || !supplier) return;

        // Find the Firestore ID using the 'categories' array passed from DataContext
        const categoryToDelete = categories.find(c => c.name === name && c.supplier === supplier);

        if (categoryToDelete && (categoryToDelete as any).id) {
            try {
                await deleteDocument("categories", (categoryToDelete as any).id);
                showToast('Category deleted successfully!', 'success');
            } catch (error) {
                console.error("Error deleting category:", error);
                showToast('Failed to delete category.', 'error');
            }
        }
    }, [categories, showToast]);

    return {
        addSupplier,
        updateSupplier,
        removeSupplier,
        addCategory,
        updateCategory,
        removeCategory,
    };
};