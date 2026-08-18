import React from "react";
import { motion } from "framer-motion";
import { WifiOff } from "lucide-react";

export function ReconnectingOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-ink-950/90 backdrop-blur-sm px-6 text-center"
    >
      <WifiOff size={32} className="text-mist-400 animate-pulse" />
      <p className="font-display font-semibold text-mist-100">Reconectando...</p>
      <p className="text-mist-400 text-sm max-w-xs">
        Perdemos a conexão por um instante. Sua pontuação e posição na sala estão salvas.
      </p>
    </motion.div>
  );
}
