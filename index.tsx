import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { onAuthState } from "./firebase/auth";  // <-- add this import

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Listen to Firebase auth state changes
onAuthState((user) => {
  root.render(
    <React.StrictMode>
      <App firebaseUser={user} />   {/* <-- pass user into App */}
    </React.StrictMode>
  );
});
