import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "outline" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

export interface UIButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};
const variants: Record<Variant, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 border border-transparent",
  secondary:
    "bg-gray-900 text-white hover:bg-black border border-transparent dark:bg-gray-700 dark:hover:bg-gray-600",
  outline:
    "bg-transparent border border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100",
  danger:
    "bg-red-600 text-white hover:bg-red-700 border border-transparent",
  ghost:
    "bg-transparent text-gray-900 dark:text-gray-100 hover:bg-gray-100/60 dark:hover:bg-gray-800/60 border border-transparent",
};

export default function Button({
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  loading,
  children,
  className = "",
  ...props
}: UIButtonProps) {
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  );
}
