import React from 'react';
import { XIcon } from '../Icons';

interface CustomerFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  purchaseHistoryFilter: string;
  onPurchaseHistoryChange: (value: string) => void;
  locationFilter: string;
  onLocationChange: (value: string) => void;
  onClearFilters: () => void;
}

const CustomerFilters: React.FC<CustomerFiltersProps> = ({
  searchQuery,
  onSearchChange,
  purchaseHistoryFilter,
  onPurchaseHistoryChange,
  locationFilter,
  onLocationChange,
  onClearFilters,
}) => {
  return (
    <>
      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="search"
          placeholder="Search customers by name or email..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="block w-full px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
        />
      </div>

      {/* Segment Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700 items-center">
        <h3 className="text-md font-semibold text-slate-700 dark:text-slate-200 flex-shrink-0">
          Segments:
        </h3>
        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={purchaseHistoryFilter}
            onChange={(e) => onPurchaseHistoryChange(e.target.value)}
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
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="Filter by location..."
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
          />
        </div>
        <button
          onClick={onClearFilters}
          className="ml-4 flex-shrink-0 text-sm flex items-center gap-1.5 text-slate-500 hover:text-brand-primary dark:text-slate-400 dark:hover:text-brand-primary transition-colors"
        >
          <XIcon className="w-4 h-4" />
          Clear Filters
        </button>
      </div>
    </>
  );
};

export default CustomerFilters; 