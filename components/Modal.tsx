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
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className={`bg-white rounded-xl shadow-2xl w-full flex flex-col max-h-[95vh] dark:bg-slate-800 ${sizeClasses[size]}`}
        role="document"
      >
        <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 id="modal-title" className="text-xl font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 transition-colors dark:text-slate-500 dark:hover:text-slate-300"
            aria-label="Close modal"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-grow p-6 overflow-y-auto">
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