import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
type Variant="primary"|"secondary"|"ghost"|"danger"; type Size="md"|"lg";
interface ButtonProps extends Omit<HTMLMotionProps<"button">,"ref">{variant?:Variant;size?:Size}
const V:Record<Variant,string>={primary:"bg-brand-gradient text-white shadow-glow border border-white/10 hover:brightness-110 disabled:opacity-40",secondary:"bg-white/[.045] text-mist-100 border border-white/[.10] hover:bg-white/[.07]",ghost:"bg-transparent text-mist-200 border border-transparent hover:bg-white/[.05]",danger:"bg-danger/90 text-white border border-danger-soft/20 hover:brightness-110"};
const S:Record<Size,string>={md:"px-4 py-3.5 text-sm rounded-xl min-h-[48px]",lg:"px-6 py-4 text-[15px] sm:text-base md:text-[17px] rounded-2xl min-h-[54px]"};
export const Button=React.forwardRef<HTMLButtonElement,ButtonProps>(({variant="primary",size="md",className="",children,...props},ref)=><motion.button ref={ref} whileTap={{scale:.975}} whileHover={{y:-1}} transition={{duration:.16}} className={`font-display font-semibold inline-flex items-center justify-center gap-2 select-none disabled:cursor-not-allowed transition ${V[variant]} ${S[size]} ${className}`} {...props}>{children}</motion.button>);Button.displayName="Button";
