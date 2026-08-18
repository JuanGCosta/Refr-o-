import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

class AppErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="min-h-screen flex items-center justify-center px-5 text-center">
        <section className="game-panel w-full max-w-md p-6 sm:p-8">
          <p className="eyebrow">Refrão</p>
          <h1 className="hero-title mt-3 text-2xl">A partida encontrou um problema</h1>
          <p className="mt-3 text-sm leading-relaxed text-mist-400">
            Recarregue a página para reconectar à sala e continuar jogando.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 min-h-[48px] w-full rounded-xl border border-white/10 bg-brand-gradient px-4 font-semibold text-white"
          >
            Recarregar jogo
          </button>
        </section>
      </main>
    );
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
