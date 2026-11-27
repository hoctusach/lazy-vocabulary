import React from 'react';

interface State { error: Error | null }

/** Shows a visible message instead of a blank white screen when rendering throws. */
export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    try {
      console.error('[boot] render error', error);
      // Make sure a native splash never hides a crashed app.
      const cap = (window as unknown as { Capacitor?: { Plugins?: { SplashScreen?: { hide?: () => void } } } }).Capacitor;
      cap?.Plugins?.SplashScreen?.hide?.();
    } catch { /* ignore */ }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" style={{ fontFamily: 'sans-serif', padding: 24, color: '#1e293b', lineHeight: 1.5 }}>
        <h2 style={{ margin: '0 0 8px' }}>Lazy Vocabulary hit a problem</h2>
        <p>Please close and reopen the app. If this keeps happening, send a screenshot of this page to hoctusach@gmail.com.</p>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, background: '#f1f5f9', padding: 8, borderRadius: 6 }}>
          {String(this.state.error.message || this.state.error).slice(0, 500)}
        </pre>
        <button type="button" onClick={() => window.location.reload()} style={{ padding: '8px 16px' }}>Reload</button>
      </div>
    );
  }
}

export default AppErrorBoundary;
