import { clsx } from "clsx";
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("rounded-xl border", className)}
      style={{ background: "var(--surface-1)", borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
      {...props}
    />
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}

export function Button({ className, variant = "secondary", size = "md", ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  const sizes = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm";
  const variants: Record<string, string> = {
    primary: "text-white shadow-sm hover:brightness-110",
    secondary: "border hover:brightness-110",
    ghost: "hover:brightness-110",
    danger: "text-white hover:brightness-110",
  };
  const style =
    variant === "primary"
      ? { background: "var(--accent)" }
      : variant === "danger"
        ? { background: "var(--critical)" }
        : variant === "secondary"
          ? { background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }
          : { color: "var(--text-secondary)" };
  return <button className={clsx(base, sizes, variants[variant], className)} style={style} {...props} />;
}

export function Badge({
  className,
  color,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { color?: string }) {
  return (
    <span
      className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", className)}
      style={{
        background: color ? `color-mix(in srgb, ${color} 16%, transparent)` : "var(--surface-2)",
        color: color ?? "var(--text-secondary)",
      }}
      {...props}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton rounded-lg", className)} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--accent)]",
        className
      )}
      style={{ background: "var(--surface-3)", borderColor: "var(--border)", color: "var(--text-primary)" }}
      {...props}
    />
  );
}

export function Chip({
  active,
  children,
  onClick,
  className,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        className
      )}
      style={
        active
          ? { background: "var(--accent-bg)", borderColor: "var(--accent)", color: "var(--accent)" }
          : { background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-secondary)" }
      }
    >
      {children}
    </button>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center" style={{ borderColor: "var(--border)" }}>
      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        {title}
      </p>
      {description && (
        <p className="max-w-sm text-sm" style={{ color: "var(--text-muted)" }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-xl border py-12 text-center"
      style={{ borderColor: "var(--critical)", background: "color-mix(in srgb, var(--critical) 8%, transparent)" }}
    >
      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        Something went wrong
      </p>
      <p className="max-w-sm text-sm" style={{ color: "var(--text-muted)" }}>
        {message}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
