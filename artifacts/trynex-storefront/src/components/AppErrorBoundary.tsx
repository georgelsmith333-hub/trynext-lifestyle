import { Component, type ReactNode, type ErrorInfo } from "react";
import { nukeAndReload } from "@/lib/cache-recovery";

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null; recovering: boolean }

const CHUNK_ERROR_RX = /loading chunk|dynamically imported module|importing a module script/i;

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, recovering: false };
  private _onPopState: (() => void) | null = null;
  private _onHashChange: (() => void) | null = null;

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, recovering: false };
  }

  componentDidMount() {
    // Auto-reset the error boundary when the user navigates (back/forward button).
    // This prevents a stale error UI from blocking navigation.
    this._onPopState = () => {
      if (this.state.hasError) {
        this.setState({ hasError: false, error: null, recovering: false });
      }
    };
    this._onHashChange = this._onPopState;
    window.addEventListener("popstate", this._onPopState);
    window.addEventListener("hashchange", this._onHashChange);
  }

  componentWillUnmount() {
    if (this._onPopState) window.removeEventListener("popstate", this._onPopState);
    if (this._onHashChange) window.removeEventListener("hashchange", this._onHashChange);
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[AppErrorBoundary]", error, info.componentStack);

    // Auto-recover from chunk-load errors: the most common cause is a stale
    // index.html (cached by an old SW) referencing chunks that no longer exist.
    if (CHUNK_ERROR_RX.test(error?.message || "")) {
      this.setState({ recovering: true });
      void nukeAndReload(`AppErrorBoundary: ${error.message.slice(0, 120)}`);
    }
  }

  private handleRefresh = () => {
    this.setState({ recovering: true });
    void nukeAndReload("user clicked refresh");
  };

  private handleGoHome = () => {
    // Soft navigation back to home — resets React state without a full cache nuke.
    this.setState({ hasError: false, error: null, recovering: false });
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const isChunkError = CHUNK_ERROR_RX.test(this.state.error?.message || "");

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center"
        style={{ background: "linear-gradient(135deg, #FFF8F3 0%, #FFF4EE 100%)" }}>
        <div className="w-20 h-20 rounded-3xl bg-white border border-orange-100 flex items-center justify-center mb-6 shadow-md">
          <span className="text-3xl" role="img" aria-label="warning">⚠️</span>
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-gray-500 max-w-sm mb-6">
          {this.state.recovering
            ? "Refreshing to get the latest version…"
            : isChunkError
              ? "Your browser cached an old version of the app. Tap Refresh to load the latest one."
              : "A temporary error occurred. You can go back to the home page or refresh the app."}
        </p>
        {!isChunkError && this.state.error && (
          <p className="text-[10px] text-gray-400 font-mono bg-gray-100 rounded px-3 py-2 max-w-sm mb-4 text-left break-all">
            {this.state.error.message}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          {!isChunkError && (
            <button
              onClick={this.handleGoHome}
              disabled={this.state.recovering}
              className="px-6 py-3 rounded-xl font-bold text-sm border-2 disabled:opacity-60"
              style={{ borderColor: "#E85D04", color: "#E85D04", background: "white" }}
            >
              Go to Home
            </button>
          )}
          <button
            onClick={this.handleRefresh}
            disabled={this.state.recovering}
            className="px-6 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #E85D04, #FB8500)",
              boxShadow: "0 6px 24px rgba(232,93,4,0.3)",
            }}
          >
            {this.state.recovering ? "Refreshing…" : "Refresh app"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-6 max-w-xs">
          If this keeps happening, please contact support at{" "}
          <a className="font-bold text-orange-600 hover:underline" href="https://wa.me/8801903426915">WhatsApp</a>.
        </p>
      </div>
    );
  }
}
