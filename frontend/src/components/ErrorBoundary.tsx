import React from 'react';

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: undefined };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('TicketDetail crash:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page">
          <div className="card">
            <h2>Ha ocurrido un error al cargar el ticket</h2>
            {import.meta.env.DEV && this.state.error?.message && <p>{this.state.error.message}</p>}
            <button onClick={() => window.location.reload()}>Recargar</button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
