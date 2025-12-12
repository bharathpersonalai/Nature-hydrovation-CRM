import { useCallback } from 'react';
import { Lead, Customer, LeadStatus } from '../types';
import { addToCollection, updateDocument, deleteDocument, subscribeToCollection } from '../firebase/firestore';
import { useUI } from '../contexts/UIContext';
import { useData } from '../contexts/DataContext';

// This file contains all Lead and Customer creation/management logic.

// Helper function (was previously in App.tsx) - kept local for now
const findCustomerByReferralCode = async (referralCode: string) => {
    if (!referralCode) return null;
    return new Promise<any>((resolve) => {
        try {
            const unsub = subscribeToCollection("customers", (items: any[]) => {
                const match = (items || []).find(c => (c.referralCode || '').trim() === referralCode.trim()) || null;
                try { unsub(); } catch (e) { /* ignore */ }
                resolve(match);
            });
            setTimeout(() => {
                try { unsub(); } catch (e) { /* ignore */ }
                resolve(null);
            }, 3000);
        } catch (err) {
            console.error('findCustomerByReferralCode error', err);
            resolve(null);
        }
    });
};


export const useLeadService = (customers: Customer[]) => {
    const { showToast } = useUI();
    // We import customers array only for client-side validation, 
    // the Firestore listener in DataContext handles the source of truth.
    

    // --- Lead Management ---
    const addLead = useCallback(async (leadData: Omit<Lead, 'id' | 'createdAt'>, referralCode?: string) => {
        try {
            let referredById: string | undefined = undefined;
            let finalSource = leadData.source ?? '';

            if (referralCode && referralCode.trim()) {
                let referrer = customers.find(c => c.referralCode === referralCode.trim());
                if (!referrer) {
                    referrer = await findCustomerByReferralCode(referralCode.trim());
                }

                if (referrer) {
                    referredById = referrer.id;
                    finalSource = `Referral by ${referrer.name}`;
                    showToast(`Lead referred by ${referrer.name}!`, 'success');
                } else {
                    showToast('Invalid referral code entered.', 'warning');
                }
            }

            const payload = {
                ...leadData,
                referredById: referredById ?? null,
                source: finalSource,
                createdAt: new Date().toISOString(),
                followUpDate: leadData.followUpDate ?? null,
            };

           const newId = await addToCollection('leads', payload);
        showToast('Lead added successfully!', 'success');
        // Return nothing (void) to match the DataContextType expectation
    } catch (err) {
        console.error('Failed to add lead:', err);
        showToast('Failed to add lead', 'error');
        // When using Promises, throwing the error is the correct way to end a 'void' promise if it fails
        throw err; // IMPORTANT: Throw the error to satisfy the Promise<void> signature
    }
}, [customers, showToast]); 

    const updateLead = useCallback(async (lead: Lead) => {
        try {
            if (!lead.id) throw new Error('Lead id missing');
            const { id, ...dataNoId } = lead as any;
            await updateDocument('leads', id, { ...dataNoId });
            showToast('Lead updated successfully.', 'success');
        } catch (err) {
            console.error('Error updating lead:', err);
            showToast('Failed to update lead.', 'error');
            throw err;
        }
    }, [showToast]);

    const deleteLead = useCallback(async (leadId: string) => {
        try {
            await deleteDocument('leads', leadId);
            showToast('Lead deleted successfully.', 'success');
        } catch (err) {
            console.error('Error deleting lead:', err);
            showToast('Failed to delete lead.', 'error');
            throw err;
        }
    }, [showToast]);

    const deleteMultipleLeads = useCallback(async (leadIds: string[]) => {
        try {
            await Promise.all(leadIds.map(id => deleteDocument('leads', id)));
            showToast(`${leadIds.length} leads deleted successfully.`, 'success');
        } catch (err) {
            console.error('Error deleting multiple leads:', err);
            showToast('Failed to delete some leads.', 'error');
            throw err;
        }
    }, [showToast]);

    const convertLeadToCustomer = useCallback(async (lead: Lead) => {
        try {
            if (!lead.id) throw new Error('Lead id missing');

            // 1. Update lead status in Firestore
            await updateDocument('leads', lead.id, { ...lead, status: LeadStatus.Converted });

            // 2. Create customer record in Firestore
            const newCustomerPayload = {
                name: lead.name,
                email: lead.email,
                phone: lead.phone,
                address: '',
                createdAt: new Date().toISOString(),
                sourceLeadId: lead.id,
                source: lead.source,
                referredById: (lead as any).referredById ?? null,
            };
            await addToCollection('customers', newCustomerPayload);

            showToast('Lead converted to customer!', 'success');
        } catch (err) {
            console.error('Error converting lead to customer:', err);
            showToast('Conversion failed.', 'error');
            throw err;
        }
    }, [showToast]);


    // --- Customer Management (CRUD used by Customers.tsx/Leads.tsx) ---
    const addCustomer = useCallback(async (customerData: Omit<Customer, 'id' | 'createdAt'>, referralCode?: string) => {
        try {
            let referredById: string | undefined = undefined;
            let finalSource = customerData.source ?? '';

            if (referralCode && referralCode.trim()) {
                let referrer = customers.find(c => c.referralCode === referralCode.trim());
                if (!referrer) referrer = await findCustomerByReferralCode(referralCode.trim());
                if (referrer) {
                    referredById = referrer.id;
                    finalSource = `Referral by ${referrer.name}`;
                    showToast(`Customer referred by ${referrer.name}!`, 'success');
                } else {
                    showToast('Invalid referral code entered.', 'warning');
                }
            }

            const payload = {
                ...customerData,
                createdAt: new Date().toISOString(),
                referredById: referredById ?? null,
                source: finalSource,
            };

            await addToCollection('customers', payload);
            showToast('Customer added successfully!', 'success');

        } catch (err: any) {
            console.error('[addCustomer] failed:', err);
            showToast('Failed to add customer.', 'error');
            throw err;
        }
    }, [customers, showToast]);


    const updateCustomer = useCallback(async (updatedCustomer: Customer) => {
        try {
            if (!updatedCustomer.id) throw new Error("Customer id missing");
            const { id, ...dataToUpdate } = updatedCustomer as any;
            await updateDocument("customers", id, { ...dataToUpdate });
            showToast("Customer updated successfully!", "success");
        } catch (err: any) {
            console.error("[updateCustomer] error:", err);
            const msg = err?.message || "Failed to update customer";
            showToast(msg, "error");
            throw err;
        }
    }, [showToast]); 

    return {
        addLead,
        updateLead,
        deleteLead,
        deleteMultipleLeads,
        convertLeadToCustomer,
        addCustomer,
        updateCustomer,
    };
};