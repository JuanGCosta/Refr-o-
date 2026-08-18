
const widths = {
  sm: "w-[118px] sm:w-[130px]",
  md: "w-[180px] sm:w-[210px]",
  lg: "w-[270px] sm:w-[330px] md:w-[390px]",
};

export function Logo({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  return (
    <img
      src="/assets/logo.webp"
      alt="Refrão"
      draggable={false}
      className={`${widths[size]} h-auto object-contain select-none drop-shadow-[0_14px_34px_rgba(22,199,183,.16)] ${className}`}
    />
  );
}

export function Tagline({ className = "" }: { className?: string }) {
  return <p className={`text-mist-300 text-sm md:text-base ${className}`}>Ouça. Reconheça. Responda antes de todo mundo.</p>;
}
