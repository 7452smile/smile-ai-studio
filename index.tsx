import React, { Component } from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';
import i18next from 'i18next';
import App from './App';
import { GenerationProvider } from './context/GenerationContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("React Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#020204] text-white p-6 font-sans">
          <div className="glass-card p-8 rounded-2xl border border-red-500/20 max-w-2xl w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500"></div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
              </div>
              <h1 className="text-xl font-bold text-white">{i18next.t('errors:systemError')}</h1>
            </div>

            <p className="mb-4 text-gray-400 text-sm">
              {i18next.t('errors:systemErrorDesc')}
            </p>

            <div className="bg-black/50 p-4 rounded-lg border border-white/5 mb-6 overflow-x-auto">
              <code className="text-xs text-red-300 font-mono">
                {this.state.error?.toString() || "Unknown Error"}
              </code>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                {i18next.t('errors:reload')}
              </button>
              <button
                onClick={() => { localStorage.clear(); window.location.reload(); }}
                className="px-6 py-2.5 bg-transparent border border-white/10 text-gray-400 font-medium rounded-lg hover:bg-white/5 transition-colors text-sm"
              >
                {i18next.t('errors:clearCacheRetry')}
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <GenerationProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </GenerationProvider>
    </React.StrictMode>
  );
} catch (e) {
  console.error("Root Render Error:", e);
  // Fallback if ReactDOM fails completely
  rootElement.innerHTML = `
    <div style="height: 100vh; display: flex; align-items: center; justify-content: center; background: #020204; color: #ef4444; font-family: sans-serif; text-align: center;">
        <div>
            <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">Critical Initialization Error</h2>
            <p style="opacity: 0.8;">${e}</p>
        </div>
    </div>
  `;
}