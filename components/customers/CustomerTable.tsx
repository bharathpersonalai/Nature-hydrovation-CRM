import React, { useMemo, useState } from 'react';
import { Customer } from '../../types';
import { PencilIcon, ChevronUpIcon, ChevronDownIcon, ChevronsUpDownIcon } from '../Icons';

type SortableKey = "name" | "email" | "phone" | "address" | "createdAt";

interface CustomerTableProps {
  customers: Customer[];
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
}

const CustomerTable: React.FC<CustomerTableProps> = ({ customers, onView, onEdit }) => {
  const [sortConfig, setSortConfig] = useState<{
    key: SortableKey;
    direction: "ascending" | "descending";
  } | null>(null);

  const sortedCustomers = useMemo(() => {
    let sortableItems = [...customers];
    if (sortConfig) {
      sortableItems.sort((a, b) => {
        const key = sortConfig.key;
        const valA = a[key] || "";
        const valB = b[key] || "";
        const comparison = String(valA).localeCompare(String(valB));
        return sortConfig.direction === "ascending" ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [customers, sortConfig]);

  const requestSort = (key: SortableKey) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const SortableHeader: React.FC<{ children: React.ReactNode; sortKey: SortableKey }> = ({
    children,
    sortKey
  }) => {
    const isSorting = sortConfig?.key === sortKey;
    const icon = isSorting ? (
      sortConfig.direction === "ascending" ? (
        <ChevronUpIcon className="w-4 h-4 ml-1.5" />
      ) : (
        <ChevronDownIcon className="w-4 h-4 ml-1.5" />
      )
    ) : (
      <ChevronsUpDownIcon className="w-4 h-4 ml-1.5 opacity-0 group-hover:opacity-40" />
    );

    return (
      <th scope="col" className="px-6 py-3">
        <button
          onClick={() => requestSort(sortKey)}
          className="group flex items-center uppercase font-medium"
        >
          {children} {icon}
        </button>
      </th>
    );
  };

  if (customers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden dark:bg-slate-800">
        <div className="text-center py-16 px-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            No customers yet
          </h3>
          <p className="text-slate-500 mt-2 dark:text-slate-400">
            Convert qualified leads or add a customer manually.
          </p>
        </div>
      </div>
    );
  }

  if (sortedCustomers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden dark:bg-slate-800">
        <div className="text-center py-16 px-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            No Customers Found
          </h3>
          <p className="text-slate-500 mt-2 dark:text-slate-400">
            Your search and filter combination did not return any results.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden dark:bg-slate-800">
      {/* Mobile Card View */}
      <div className="md:hidden divide-y dark:divide-slate-700">
        {sortedCustomers.map((customer) => (
          <div key={customer.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{customer.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">{customer.email}</p>
                <p className="text-sm text-slate-400 dark:text-slate-500">{customer.phone}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onEdit(customer)}
                  className="p-2 text-slate-400 hover:text-brand-primary rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                  aria-label="Edit customer"
                >
                  <PencilIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            {customer.address && (
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 truncate">📍 {customer.address}</p>
            )}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Customer since {new Date(customer.createdAt).toLocaleDateString()}
              </span>
              <button
                onClick={() => onView(customer)}
                className="text-sm font-semibold text-brand-primary hover:underline"
              >
                View Details →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
          <thead className="text-xs text-slate-700 bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
            <tr>
              <SortableHeader sortKey="name">Name</SortableHeader>
              <SortableHeader sortKey="email">Email</SortableHeader>
              <SortableHeader sortKey="phone">Phone</SortableHeader>
              <SortableHeader sortKey="address">Address</SortableHeader>
              <SortableHeader sortKey="createdAt">Customer Since</SortableHeader>
              <th scope="col" className="px-6 py-3 uppercase font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedCustomers.map((customer) => (
              <tr
                key={customer.id}
                className="bg-white border-b hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
              >
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                  {customer.name}
                </td>
                <td className="px-6 py-4">{customer.email}</td>
                <td className="px-6 py-4">{customer.phone}</td>
                <td className="px-6 py-4 truncate max-w-xs">{customer.address}</td>
                <td className="px-6 py-4">
                  {new Date(customer.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => onView(customer)}
                      className="font-medium text-brand-primary hover:underline"
                    >
                      View
                    </button>
                    <button
                      onClick={() => onEdit(customer)}
                      className="text-slate-400 hover:text-brand-primary transition-colors"
                      aria-label="Edit customer"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerTable; 