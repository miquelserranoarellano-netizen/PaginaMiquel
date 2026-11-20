import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  label: string;
}

/** Aísla errores de una zona de la interfaz para que no tumben la aplicación completa. */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Error en ${this.props.label}:`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-[14px] font-semibold text-slate-800">Se ha producido un error en {this.props.label}</p>
          <p className="max-w-md text-[12px] text-slate-500">{this.state.error.message}</p>
          <p className="max-w-md text-[12px] text-slate-500">Tus datos no se han perdido. Puedes deshacer el último cambio (Ctrl+Z) y reintentar.</p>
          <button type="button" className="rounded-md bg-accent-600 px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-accent-700" onClick={() => this.setState({ error: null })}>
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
