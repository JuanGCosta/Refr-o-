import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const BAR_COUNT = 11;

export function AudioVisualizer({
  coverUrl,
  revealed = false,
  size = 220,
}: {
  coverUrl?: string;
  revealed?: boolean;
  size?: number;
}) {
  return (
    <div className="audio-visualizer" style={{ "--disc-size": `${size}px` } as React.CSSProperties}>
      <div className={`record-stage ${revealed ? "is-revealed" : "is-playing"}`}>
        <span className="record-orbit orbit-a" />
        <span className="record-orbit orbit-b" />
        <div className="record-disc">
          <AnimatePresence mode="wait">
            {revealed && coverUrl ? (
              <motion.img
                key="cover"
                src={coverUrl}
                alt="Capa da música"
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="record-art"
              />
            ) : (
              <motion.img
                key="brand-disc"
                src="/assets/disc.webp"
                alt="Disco Refrão"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                className="record-art"
              />
            )}
          </AnimatePresence>
          <span className="record-center" />
        </div>
      </div>

      <div className={`equalizer ${revealed ? "is-muted" : ""}`} aria-hidden="true">
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <span
            key={i}
            style={{
              animationDelay: `${(i % 6) * 0.09}s`,
              animationDuration: `${0.62 + (i % 5) * 0.12}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
