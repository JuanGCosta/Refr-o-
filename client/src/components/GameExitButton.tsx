import { useState } from "react";
import { LogOut, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export function GameExitButton({ onExit }: { onExit: () => void }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="fixed bottom-[calc(12px+env(safe-area-inset-bottom,0px))] left-3 sm:bottom-auto sm:top-4 sm:left-4 z-40 flex h-10 items-center gap-2 rounded-full border border-ink-600 bg-ink-800/88 px-3.5 text-sm font-semibold text-mist-300 backdrop-blur transition hover:border-rose-400/40 hover:text-mist-100"
        aria-label="Voltar ao menu"
      >
        <LogOut size={16} />
        <span className="sm:hidden">Menu</span>
        <span className="hidden sm:inline">Voltar ao menu</span>
      </button>

      <AnimatePresence>
        {confirming && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4 pb-4 sm:px-5 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Confirmar saída da partida"
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="relative w-full max-w-sm rounded-2xl border border-ink-600 bg-ink-900 p-5 shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="absolute right-3 top-3 rounded-lg p-2 text-mist-500 transition hover:bg-ink-800 hover:text-mist-100"
                aria-label="Cancelar"
              >
                <X size={17} />
              </button>

              <h2 className="pr-8 font-display text-xl font-bold text-mist-100">Sair da partida?</h2>
              <p className="mt-2 text-sm leading-relaxed text-mist-400">
                Você voltará ao menu e sairá desta sala. Se houver outros jogadores, a partida continua para eles.
              </p>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-xl border border-ink-600 bg-ink-800 px-4 py-3 text-sm font-semibold text-mist-200 transition hover:bg-ink-700"
                >
                  Continuar jogando
                </button>
                <button
                  type="button"
                  onClick={onExit}
                  className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-300 transition hover:bg-rose-500/20"
                >
                  Sair para o menu
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
