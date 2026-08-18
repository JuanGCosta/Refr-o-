import React from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

export type AnswerVisualState = "idle" | "selected" | "correct" | "wrong" | "dim" | "disabled";
const LETTERS = ["A", "B", "C", "D"];

export function AnswerCard({ index, label, state, onClick }: { index: number; label: string; state: AnswerVisualState; onClick: () => void; }) {
  const interactive = state === "idle";
  return (
    <motion.button
      type="button"
      disabled={!interactive}
      onClick={onClick}
      layout
      whileTap={interactive ? { scale: .975 } : undefined}
      className={`answer-card answer-${state}`}
    >
      <span className="answer-letter">{LETTERS[index] ?? index + 1}</span>
      <span className="answer-label">{label}</span>
      <span className="answer-feedback">
        {state === "correct" && <Check size={22} strokeWidth={3}/>} 
        {state === "wrong" && <X size={22} strokeWidth={3}/>} 
      </span>
    </motion.button>
  );
}
