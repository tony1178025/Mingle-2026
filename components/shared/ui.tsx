import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/mingle";

type SurfaceProps = HTMLAttributes<HTMLElement> & {
  as?: "section" | "article" | "div";
};

export function Surface({ as = "section", className, ...props }: SurfaceProps) {
  const Component = as;
  return <Component className={cn("surface", className)} {...props} />;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  block?: boolean;
};

export function Button({
  variant = "primary",
  block = false,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn("button", `button-${variant}`, block && "button-block", className)}
      {...props}
    />
  );
}

export function Badge({
  children,
  tone = "neutral",
  className
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning";
  className?: string;
}) {
  return <span className={cn("badge", `badge-${tone}`, className)}>{children}</span>;
}

export function MetricCard({
  label,
  value,
  hint,
  accent = false
}: {
  label: string;
  value: ReactNode;
  hint: string;
  accent?: boolean;
}) {
  return (
    <Surface className={cn("metric-card", accent && "metric-card-accent")}>
      <p className="eyebrow">{label}</p>
      <div className="metric-value">{value}</div>
      <p className="metric-hint">{hint}</p>
    </Surface>
  );
}

export function HeatMeter({ value, max = 24 }: { value: number; max?: number }) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  const tone = percent >= 70 ? "hot" : percent <= 35 ? "cold" : "warm";
  return (
    <div className="heat-meter" aria-label={`테이블 열기 ${value}`}>
      <div className="heat-meter-track">
        <div className={cn("heat-meter-fill", `heat-meter-${tone}`)} style={{ width: `${percent}%` }} />
      </div>
      <span className={cn("heat-meter-label", `heat-meter-label-${tone}`)}>{value}</span>
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="section-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="section-title">{title}</h2>
        {description ? <p className="section-description">{description}</p> : null}
      </div>
      {actions ? <div className="section-actions">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Surface className="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </Surface>
  );
}
