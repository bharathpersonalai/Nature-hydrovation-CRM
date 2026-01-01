import { useCallback } from 'react';
import { addToCollection, updateDocument, deleteDocument, findDocumentByField } from '../firebase/firestore';
import { useUI } from '../contexts/UIContext';
import { ProductCategory } from '../types';

// The function signature now accepts the necessary state array and the setter function 
// directly from DataContext.tsx to manage the local state and avoid "Duplicate identifier" errors.
export const useListService = (
    categories: ProductCategory[],
    setCategories: React.Dispatch<React.SetStateAction<ProductCategory[]>>
) => {
    const { showToast } = useUI();

    // 1. Supplier CRUD
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
            // Find the supplier document by name
            const supplierDoc = await findDocumentByField("suppliers", "name", oldName);

            if (!supplierDoc) {
                showToast(`Supplier '${oldName}' not found in database.`, 'error');
                return;
            }

            // Update the supplier document in Firestore
            await updateDocument("suppliers", supplierDoc.id, { name: newName.trim() });

            // Also update all categories that reference this supplier
            const categoriesToUpdate = categories.filter(c => c.supplier === oldName);
            for (const cat of categoriesToUpdate) {
                if ((cat as any).id) {
                    await updateDocument("categories", (cat as any).id, { supplier: newName.trim() });
                }
            }

            showToast(`Supplier updated to '${newName}' successfully!`, 'success');
        } catch (e) {
            console.error('Error updating supplier:', e);
            showToast('Failed to update supplier.', 'error');
        }
    }, [showToast, categories]);

    const removeSupplier = useCallback(async (name: string) => {
        if (!name) return;
        try {
            // Find the supplier document by name
            const supplierDoc = await findDocumentByField("suppliers", "name", name);

            if (!supplierDoc) {
                showToast(`Supplier '${name}' not found in database.`, 'error');
                return;
            }

            // Delete all categories associated with this supplier first
            const categoriesToDelete = categories.filter(c => c.supplier === name);
            for (const cat of categoriesToDelete) {
                if ((cat as any).id) {
                    await deleteDocument("categories", (cat as any).id);
                }
            }

            // Delete the supplier document
            await deleteDocument("suppliers", supplierDoc.id);

            showToast(`Supplier '${name}' and its categories deleted successfully!`, 'success');
        } catch (e) {
            console.error('Error removing supplier:', e);
            showToast('Failed to remove supplier.', 'error');
        }
    }, [showToast, categories]);

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