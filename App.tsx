import React from 'react';
import { AuthContextProvider, useAuth } from './contexts/AuthContext';
import { DataContextProvider } from './contexts/DataContext';
import { UIContextProvider } from './contexts/UIContext';
import MainLayout from './layouts/MainLayout';

// Internal component to handle the render order safely
const AppContent = () => {
    const { user, loading } = useAuth();

    // A. Loading Spinner: Wait for Firebase to confirm status
    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div> 
            </div>
        );
    }

    // B. Logged Out: Render Layout directly (Layout will show Login screen)
    if (!user) {
        return <MainLayout />; 
    }

    // C. Logged In: Wrap Layout in DataContextProvider
    return (
        <DataContextProvider>
            <MainLayout />
        </DataContextProvider>
    );
};

// The Main App Component - NO PROPS NEEDED
const App: React.FC = () => {
    return (
        <UIContextProvider>
            <AuthContextProvider>
                <AppContent />
            </AuthContextProvider>
        </UIContextProvider>
    );
};

export default App;