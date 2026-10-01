import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "success";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-600",
  secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:outline-slate-400",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600",
  ghost: "text-slate-600 hover:bg-slate-100 focus-visible:outline-slate-400",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:outline-emerald-600",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-2.5 text-xs gap-1",
  md: "h-10 px-4 text-sm gap-1.5",
  lg: "h-12 px-5 text-base gap-2",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    extra,
  );
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({ variant, size, loading, icon, children, className, disabled, type = "button", ...rest }: Props) {
  return (
    <button type={type} disabled={disabled || loading} className={buttonClass(variant, size, className)} {...rest}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

interface LinkProps extends ComponentProps<typeof Link> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

/** Link com aparência de botão (navegação interna). */
export function LinkButton({ variant, size, icon, children, className, ...rest }: LinkProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

/** Âncora externa com aparência de botão. */
export function ExternalButton({
  variant,
  size,
  icon,
  children,
  className,
  ...rest
}: ComponentProps<"a"> & { variant?: Variant; size?: Size; icon?: ReactNode }) {
  return (
    <a target="_blank" rel="noopener noreferrer" className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </a>
  );
}
