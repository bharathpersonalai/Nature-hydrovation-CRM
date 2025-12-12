import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// ✅ SIMPLE - No auth listener needed here, AuthContext handles it
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
 