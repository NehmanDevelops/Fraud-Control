import React, { PropsWithChildren } from 'react';

interface State {
  hasError: boolean;
  error?: Error | null;
}

export default class ErrorBoundary extends React.Component<PropsWithChildren<{}>, State> {
  constructor(props: PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('ErrorBoundary caught error:', error, info);
    // Also show overlay if available
    try {
      const overlay = document.getElementById('runtime-error');
      const text = document.getElementById('runtime-error-text');
      if (overlay && text) {
        overlay.style.display = 'block';
        text.textContent = `Error: ${error?.message || String(error)}`;
      }
    } catch (e) {
      // ignore
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding: 20}}>
          <h2 style={{color: '#7f1d1d'}}>An unexpected error occurred</h2>
          <pre>{this.state.error?.message}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}
