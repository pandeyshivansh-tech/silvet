import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  /** Required: icon-only controls must be named for screen readers. */
  label: string;
  icon: ReactNode;
  variant?: "plain" | "outline" | "solid";
}

/** 44×44 touch target, icon only. 2 px radius like everything you tap. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant = "plain", className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-xs transition-[background-color,border-color] duration-120 ease-editorial disabled:text-graphite",
        variant === "plain" && "text-midnight hover:bg-chalk-deep active:bg-chalk-deep",
        variant === "outline" && "border border-line-strong bg-chalk text-midnight hover:bg-chalk-deep",
        variant === "solid" && "surface-midnight hover:bg-midnight-hover active:bg-midnight-press",
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );
});
