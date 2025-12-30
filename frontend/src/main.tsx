import React from 'react'
// Import createRoot from react-dom/client (React 18)
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import ErrorBoundary from './ErrorBoundary'

console.log('main.tsx executing');


try {
  const rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('Root element #root not found');
  const root = createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
  (window as any).__app_mounted = true;
  console.log('React mounted');
} catch (e) {
  console.error('React mount error:', e);
  (window as any).__app_mounted = false;
  const show = (msg: string) => {
    const overlay = document.getElementById('runtime-error');
    const text = document.getElementById('runtime-error-text');
    if (overlay && text) {
      overlay.style.display = 'block';
      text.textContent = String(msg);
    }
  };
  show((e as any)?.message || String(e));
}
