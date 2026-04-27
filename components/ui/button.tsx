import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "secondary" | "ghost";
type ButtonSize = "default" | "sm";

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-ink text-white hover:bg-tealCore",
  outline: "border border-slate-300 bg-white text-slate-700 hover:border-tealCore hover:text-tealCore",
  secondary: "bg-slateMist text-ink hover:bg-slate-200",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100"
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-11 px-5 py-3 text-sm",
  sm: "h-9 px-3 py-2 text-sm"
};

export function buttonVariants({
  variant = "default",
  size = "default",
  className
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(
    "inline-flex items-center justify-center rounded-full font-semibold transition focus:outline-none focus:ring-2 focus:ring-tealCore/40 disabled:pointer-events-none disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    className
  );
}

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button type={type} className={buttonVariants({ variant, size, className })} {...props} />;
}
