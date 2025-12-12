import React from 'react';
import { Customer } from '../../types';

interface CustomerFormProps {
  formData: Partial<Customer> & { referralCode?: string };
  onChange: (data: Partial<Customer> & { referralCode?: string }) => void;
  onSubmit: (e: React.FormEvent) => void;
  isEditing: boolean;
}

const CustomerForm: React.FC<CustomerFormProps> = ({
  formData,
  onChange,
  onSubmit,
  isEditing,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input
        type="text"
        name="name"
        placeholder="Name"
        value={formData.name || ''}
        onChange={(e) => onChange({ ...formData, name: e.target.value })}
        className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
        required
      />
      <input
        type="email"
        name="email"
        placeholder="Email"
        value={formData.email || ''}
        onChange={(e) => onChange({ ...formData, email: e.target.value })}
        className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
        required
      />
      <input
        type="tel"
        name="phone"
        placeholder="Phone"
        value={formData.phone || ''}
        onChange={(e) => onChange({ ...formData, phone: e.target.value })}
        className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
      />
      <input
        type="text"
        name="address"
        placeholder="Address"
        value={formData.address || ''}
        onChange={(e) => onChange({ ...formData, address: e.target.value })}
        className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
      />
      {!isEditing && (
        <>
          <input
            type="text"
            name="source"
            placeholder="Source (e.g. Walk-in)"
            value={formData.source || ''}
            onChange={(e) => onChange({ ...formData, source: e.target.value })}
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
          />
          <input
            type="text"
            name="referralCode"
            placeholder="Referral Code (Optional)"
            value={formData.referralCode || ''}
            onChange={(e) => onChange({ ...formData, referralCode: e.target.value })}
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
          />
        </>
      )}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          className="bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-brand-dark transition-colors"
        >
          {isEditing ? "Save Changes" : "Add Customer"}
        </button>
      </div>
    </form>
  );
};

export default CustomerForm;