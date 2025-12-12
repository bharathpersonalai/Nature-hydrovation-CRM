import React, { createContext, useState, useCallback } from 'react';
// The path for Icons is changed to match your current components folder location
import { CheckCircleIcon, XCircleIcon, AlertTriangleIcon } from '../components/Icons'; 

// --- 1. Define Types ---
type Theme = 'light' | 'dark';
type ToastType = 'success' | 'error' | 'warning';

export interface UIContextType {
    theme: Theme;
    toggleTheme: () => void;
    toast: { message: string; type: ToastType; id: number } | null;
    showToast: (message: string, type?: ToastType) => void;
}

// --- 2. Create Context ---
export const UIContext = createContext<UIContextType | null>(null);

// --- 3. Create Provider Component ---
export const UIContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>('light');
    const [toast, setToast] = useState<{ message: string, type: ToastType, id: number } | null>(null);

    // Function to toggle theme (Dark/Light mode)
    const toggleTheme = useCallback(() => {
        setTheme(prev => {
            const newTheme = prev === 'light' ? 'dark' : 'light';
            document.documentElement.classList.toggle('dark', newTheme === 'dark');
            return newTheme;
        });
    }, []);
    
    // Function to show a temporary pop-up notification
    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = Date.now();
        setToast({ message, type, id });
        
        // Hide the toast after 4 seconds
        setTimeout(() => setToast(prevToast => (prevToast?.id === id ? null : prevToast)), 4000);
    }, []);

    // Helper component to render the toast message
    const ToastComponent = () => {
        if (!toast) return null;
        
        const icons = { 
            success: <CheckCircleIcon className="w-6 h-6 text-green-500" />, 
            error: <XCircleIcon className="w-6 h-6 text-red-500" />, 
            warning: <AlertTriangleIcon className="w-6 h-6 text-orange-500" />, 
        };
        const colors = { 
            success: 'border-green-500', 
            error: 'border-red-500', 
            warning: 'border-orange-500', 
        };
        
        return ( 
            <div className={`fixed bottom-5 right-5 bg-white dark:bg-slate-800 shadow-lg rounded-lg p-4 border-l-4 ${colors[toast.type]} flex items-center gap-3 z-[100] animate-fade-in-up`}> 
                {icons[toast.type]} 
                <p className="text-slate-800 dark:text-slate-200">{toast.message}</p> 
            </div> 
        );
    };

    const contextValue: UIContextType = {
        theme,
        toggleTheme,
        toast,
        showToast,
    };

    return (
        <UIContext.Provider value={contextValue}>
            {children}
            <ToastComponent />
        </UIContext.Provider>
    );
};

// --- 4. Export a hook for easy consumption ---
export const useUI = () => {
    const context = React.useContext(UIContext);
    if (!context) {
        // This error check is vital for the advanced structure
        throw new Error('useUI must be used within a UIContextProvider');
    }
    return context;
};

