import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Silence benign Vite HMR errors in this environment
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.message || event.reason;
  if (reason && typeof reason === 'string' && reason.includes('WebSocket')) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
