import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[LinguaVersa UI Error]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#05060B] text-slate-100 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <AlertTriangle className="w-10 h-10 animate-bounce" />
          </div>
          <h1 className="text-2xl font-bold text-white">LinguaVersa Interface Reload</h1>
          <p className="text-xs text-slate-400 max-w-md">
            The interface encountered a minor browser render exception. Click below to refresh your session.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg"
          >
            <RefreshCw className="w-4 h-4" /> Reload Workspace
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
