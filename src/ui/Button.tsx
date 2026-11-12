import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router";
import { ArrowRight } from "lucide-react";
import { cn } from "./cn";

/**
 * Button variants (SILVET_DESIGN_REFERENCE.pdf · "Every control, every state"):
 * - primary:      Midnight fill, Chalk label, Citron arrow. One per view.
 * - secondary:    Chalk with a 28% Midnight border.
 * - quiet:        underlined text action ("Clear look", "Open in Build").
 * - danger:       Danger fill. Only inside a confirm dialog.
 * - danger-quiet: underlined Danger text that OPENS the confirm dialog ("Delete item").
 */
export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger" | "danger-quiet";
export type ButtonSize = "md" | "sm";

const block =
  "inline-flex select-none items-center justify-center gap-3 whitespace-nowrap rounded-xs font-sans font-medium " +
  "transition-[background-color,color,border-color,transform] duration-120 ease-editorial enabled:active:scale-[0.98] disabled:cursor-not-allowed aria-disabled:pointer-events-none";

const variants: Record<ButtonVariant, string> = {
  primary:
    "surface-midnight hover:bg-midnight-hover active:bg-midnight-press " +
    "disabled:bg-chalk-deep disabled:text-graphite aria-disabled:bg-chalk-deep aria-disabled:text-graphite",
  secondary:
    "border border-line-strong bg-chalk text-midnight hover:bg-chalk-deep active:border-graphite active:bg-chalk-deep " +
    "disabled:border-line disabled:text-graphite aria-disabled:border-line aria-disabled:text-graphite",
  quiet:
    "h-auto! px-0! text-midnight underline decoration-line-strong underline-offset-4 hover:decoration-midnight " +
    "disabled:text-graphite disabled:decoration-line",
  danger: "bg-danger text-chalk hover:bg-danger-press active:bg-danger-press disabled:opacity-60",
  "danger-quiet": "h-auto! px-0! text-danger underline decoration-danger/40 underline-offset-4 hover:decoration-danger",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-ui",
  md: "h-12 px-5 text-ui",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", fullWidth = false): string {
  return cn(block, sizes[size], variants[variant], fullWidth && "w-full", variant === "primary" && "justify-between");
}

/** Citron arrow: the signature on every primary button. Graphite when the button is disabled. */
function PrimaryArrow({ disabled }: { disabled?: boolean }) {
  return <ArrowRight aria-hidden="true" className={cn("size-4 shrink-0", disabled ? "text-graphite" : "text-citron")} strokeWidth={1.75} />;
}

/** Loading indicator for primary: three Citron dots. */
function LoadingDots({ tone }: { tone: "citron" | "graphite" }) {
  return (
    <span aria-hidden="true" className="inline-flex gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn("size-1 animate-pulse-dot rounded-full", tone === "citron" ? "bg-citron" : "bg-graphite")}
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  /** Replaces the label while loading, e.g. "Saving" or "Finding one…". */
  loadingLabel?: string;
  leadingIcon?: ReactNode;
  /** Primary buttons show the Citron arrow by default; pass `arrow={false}` to hide it. */
  arrow?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", fullWidth, loading = false, loadingLabel, leadingIcon, arrow = true, className, children, disabled, type = "button", ...rest },
  ref,
) {
  const isPrimary = variant === "primary";
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonClasses(variant, size, fullWidth), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <span className="inline-flex items-center gap-2">
        {leadingIcon}
        <span>{loading && loadingLabel ? loadingLabel : children}</span>
      </span>
      {isPrimary && loading && <LoadingDots tone="citron" />}
      {isPrimary && !loading && arrow && <PrimaryArrow disabled={disabled} />}
    </button>
  );
});

export interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  arrow?: boolean;
}

/** A router link styled as a Button. Use for navigation; use Button for actions. */
export function ButtonLink({ variant = "primary", size = "md", fullWidth, leadingIcon, arrow = true, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={cn(buttonClasses(variant, size, fullWidth), className)} {...rest}>
      <span className="inline-flex items-center gap-2">
        {leadingIcon}
        <span>{children as ReactNode}</span>
      </span>
      {variant === "primary" && arrow && <PrimaryArrow />}
    </Link>
  );
}
