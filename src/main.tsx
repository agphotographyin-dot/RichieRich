import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';

// Intercept unhandled promise rejections and window errors (e.g. audio policy, camera permissions, network, resize observer)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    // Prevent unhandled promise errors from crashing React runtime
    event.preventDefault();
  });

  window.addEventListener('error', (event) => {
    // Prevent uncaught top-level noise from breaking execution
    event.preventDefault();
    if (event.error || event.message) {
      console.warn('Suppressed window error:', event.message || event.error);
    }
  });

  window.onerror = function (_message, _source, _lineno, _colno, _error) {
    return true; // Prevents the firing of the default event handler
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

