import React from 'react';
import { XIcon } from './Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, size = 'md' }) => {
  if (!isOpen) {
    return null;
  }

  const sizeClasses = {
    md: 'md:max-w-md',
    lg: 'md:max-w-lg',
    xl: 'md:max-w-xl',
    '2xl': 'md:max-w-2xl',
    '3xl': 'md:max-w-3xl',
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-end md:items-center p-0 md:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`bg-white rounded-t-2xl md:rounded-xl shadow-2xl w-full flex flex-col max-h-[90vh] md:max-h-[95vh] dark:bg-slate-800 ${sizeClasses[size]} animate-slide-up md:animate-none`}
        role="document"
      >
        <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          {/* Drag indicator for mobile */}
          <div className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
          <h2 id="modal-title" className="text-lg md:text-xl font-semibold text-slate-800 dark:text-slate-100 pt-2 md:pt-0">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors dark:text-slate-500 dark:hover:text-slate-300 p-1"
            aria-label="Close modal"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-grow p-4 md:p-6 overflow-y-auto">
          {children}
        </div>
        {footer && (
          <div className="flex-shrink-0 flex justify-end gap-2 p-4 bg-slate-50 border-t border-slate-200 dark:bg-slate-900 dark:border-slate-700 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;