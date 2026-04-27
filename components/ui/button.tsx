import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "secondary" | "ghost" | "destructive";
type ButtonSize = "default" | "sm" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
  outline: "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 shadow-sm",
  secondary: "bg-zinc-100 text-zinc-800 hover:bg-zinc-200",
  ghost: "bg-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
  destructive: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm"
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-9 px-4 py-2 text-sm",
  sm: "h-8 px-3 py-1.5 text-sm",
  lg: "h-11 px-6 py-3 text-base"
};

export function buttonVariants({
  variant = "default",
  size = "default",
  className
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1",
    "disabled:pointer-events-none disabled:opacity-50",
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
