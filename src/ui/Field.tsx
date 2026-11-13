import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { ChevronDown, CircleAlert } from "lucide-react";
import { cn } from "./cn";

/**
 * Inputs (SILVET_DESIGN_REFERENCE.pdf · Inputs):
 * boxed field on Chalk with a 28% Midnight border · 16 px text so iOS never zooms ·
 * focus = 2 px Midnight · error = Danger border + "!" message · disabled says why (dashed, hint explains).
 * Labels are sentence-case sans (not uppercase eyebrows); "required"/"optional" sits on the right.
 */
interface FieldChromeProps {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  /** Show "required" on the right of the label. */
  requiredMark?: boolean;
  /** Keep the label for assistive tech only (compact search rows); the placeholder must then say what to type. */
  hideLabel?: boolean;
  className?: string;
}

function useFieldIds(error?: string | null, hint?: ReactNode) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return { id, hintId, errorId, describedBy: [errorId, hintId].filter(Boolean).join(" ") || undefined };
}

function Chrome({
  id,
  label,
  optional,
  requiredMark,
  hideLabel,
  hint,
  hintId,
  error,
  errorId,
  className,
  children,
}: FieldChromeProps & { id: string; hintId?: string; errorId?: string; children: ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "flex items-baseline justify-between gap-3 text-ui font-medium text-midnight"}>
        <span>{label}</span>
        {(optional || requiredMark) && <span className="text-caption font-normal text-graphite-deep">{optional ? "optional" : "required"}</span>}
      </label>
      {children}
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-caption text-danger" role="alert">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={hintId} className="text-caption text-graphite-deep">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const control =
  "w-full rounded-xs border bg-chalk px-3.5 text-input text-midnight placeholder:text-graphite-deep " +
  "transition-[border-color,background-color] duration-120 ease-editorial " +
  "focus:outline-none focus-visible:outline-none active:bg-chalk-deep " +
  "disabled:cursor-not-allowed disabled:border-dashed disabled:border-line-strong disabled:bg-chalk disabled:text-graphite";

/** Focus = 2 px Midnight (border + inset ring keeps the box size stable). */
const controlState = (error?: string | null) =>
  error
    ? "border-danger ring-1 ring-danger ring-inset focus:ring-2"
    : "border-line-strong focus:border-midnight focus:ring-1 focus:ring-midnight focus:ring-inset";

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement>, FieldChromeProps {
  /** A small control inside the right edge of the box (e.g. a password "Show" toggle); it keeps its own label. */
  trailing?: ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, optional, requiredMark, hideLabel, className, trailing, ...rest },
  ref,
) {
  const ids = useFieldIds(error, hint);
  const input = (
    <input
      ref={ref}
      id={ids.id}
      aria-invalid={error ? true : undefined}
      aria-describedby={ids.describedBy}
      className={cn(control, controlState(error), "h-12", trailing ? "pr-20" : null)}
      {...rest}
    />
  );
  return (
    <Chrome {...ids} label={label} hint={hint} error={error} optional={optional} requiredMark={requiredMark} hideLabel={hideLabel} className={className}>
      {trailing ? (
        <div className="relative">
          {input}
          <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>
        </div>
      ) : input}
    </Chrome>
  );
});

export interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldChromeProps {}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField(
  { label, hint, error, optional, requiredMark, className, rows = 3, ...rest },
  ref,
) {
  const ids = useFieldIds(error, hint);
  return (
    <Chrome {...ids} label={label} hint={hint} error={error} optional={optional} requiredMark={requiredMark} className={className}>
      <textarea
        ref={ref}
        id={ids.id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={cn(control, controlState(error), "resize-none py-3")}
        {...rest}
      />
    </Chrome>
  );
});

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children">, FieldChromeProps {
  options: readonly SelectOption[];
  /** Adds an empty first option, e.g. "Choose…". */
  placeholder?: string;
}

/** Native select: best-in-class on phones, no dependency. */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, hint, error, optional, requiredMark, className, options, placeholder, ...rest },
  ref,
) {
  const ids = useFieldIds(error, hint);
  return (
    <Chrome {...ids} label={label} hint={hint} error={error} optional={optional} requiredMark={requiredMark} className={className}>
      <div className="relative">
        <select
          ref={ref}
          id={ids.id}
          aria-invalid={error ? true : undefined}
          aria-describedby={ids.describedBy}
          className={cn(control, controlState(error), "h-12 appearance-none pr-10")}
          {...rest}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-graphite" strokeWidth={1.5} />
      </div>
    </Chrome>
  );
});
