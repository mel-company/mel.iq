import type { ReactNode, SelectHTMLAttributes, InputHTMLAttributes } from "react";
import { AlertCircle, ChevronDown, Loader2 } from "@/components/icons";
import { IQ_LOCAL_PHONE_LENGTH } from "@/utils/phone";

/**
 * The checkout wizard's form primitives, in the auth screens' dark language:
 * a 13px muted label, a 52px field on the card ground, and an optional hint
 * or error underneath.
 *
 * Kept together in one module because their only job is to stay identical to
 * each other across the five steps.
 */

/** Field chrome shared by inputs, selects and the composite phone control. */
const CONTROL =
  "flex h-[52px] w-full items-center gap-2.5 rounded-[14px] bg-field px-4 text-sm transition-colors";

function borderFor(state: FieldState): string {
  if (state === "error") return "border-[1.5px] border-[#ff5252]";
  if (state === "valid") return "border-[1.5px] border-mint";
  return "border border-field-line focus-within:border-[1.5px] focus-within:border-brand-primary";
}

export type FieldState = "default" | "valid" | "error";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-w-px flex-1 flex-col gap-2 text-right ${className}`}>
      <label htmlFor={htmlFor} className="text-[13px] font-semibold leading-5 text-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p className="flex items-center justify-end gap-1.5 text-xs leading-[18px] text-[#ff5252]">
          <AlertCircle size={13} className="shrink-0" />
          {error}
        </p>
      ) : (
        hint && <p className="text-xs leading-[18px] text-dim">{hint}</p>
      )}
    </div>
  );
}

export function TextInput({
  state = "default",
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { state?: FieldState }) {
  return (
    <div className={`${CONTROL} ${borderFor(state)}`}>
      <input
        {...props}
        className={`min-w-0 flex-1 bg-transparent text-right text-frost placeholder:text-dim focus:outline-none ${className}`}
      />
    </div>
  );
}

/**
 * A native <select> behind the designed chrome.
 *
 * Native rather than a custom listbox: it gets the platform's own picker on a
 * phone, keyboard support and form semantics for free, and none of that is
 * worth reimplementing for a styling difference.
 */
export function SelectInput({
  state = "default",
  placeholder,
  children,
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  state?: FieldState;
  placeholder?: string;
}) {
  return (
    <div className={`${CONTROL} relative ${borderFor(state)}`}>
      <select
        {...props}
        className={`min-w-0 flex-1 appearance-none bg-transparent text-right text-frost focus:outline-none ${
          props.value ? "" : "text-dim"
        } ${className}`}
      >
        {placeholder && (
          <option value="" disabled className="bg-ink-raised text-dim">
            {placeholder}
          </option>
        )}
        {children}
      </select>
      {/* The chevron sits at the field's end — its left edge, under RTL —
          which is where the frame draws it. */}
      <ChevronDown size={16} className="pointer-events-none shrink-0 text-muted" />
    </div>
  );
}

/** The +964 / IQ affix field, shared by the account step and the login page. */
export function PhoneInput({
  state = "default",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { state?: FieldState }) {
  return (
    <div className={`${CONTROL} ${borderFor(state)}`}>
      <span className="flex shrink-0 items-center gap-2">
        <span className="flex h-5 w-7 items-center justify-center rounded-md bg-[#161c44] text-[10px] font-bold text-muted">
          IQ
        </span>
        <span dir="ltr" className="font-semibold text-frost">
          +964
        </span>
        <span aria-hidden className="h-[22px] w-px bg-field-line" />
      </span>
      {/* The cap allows one extra digit so "0770…" can be typed in full and
          normalized on submit, rather than being truncated at the keystroke. */}
      <input
        maxLength={IQ_LOCAL_PHONE_LENGTH + 1}
        {...props}
        type="tel"
        dir="ltr"
        inputMode="numeric"
        className="min-w-0 flex-1 bg-transparent text-right text-frost placeholder:text-dim focus:outline-none"
      />
    </div>
  );
}

/** The gradient tick the frames use for consent and selection. */
export function CheckBox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center rounded-md border border-field-line text-[11px] font-bold text-white peer-checked:border-transparent peer-checked:bg-[linear-gradient(135deg,#00b7ff_0%,#7d26f7_71%)] peer-focus-visible:ring-2 peer-focus-visible:ring-brand-primary/50"
      >
        {checked ? "✓" : ""}
      </span>
      <span className="text-[13px] leading-5 text-muted">{children}</span>
    </label>
  );
}

/**
 * The row that closes every step: "رجوع" on the left, the primary action on
 * the right, with anything else (a sign-in link) in between.
 */
export function StepFooter({
  onBack,
  backLabel = "رجوع",
  submitLabel,
  busy,
  disabled,
  onSubmit,
  children,
}: {
  onBack?: () => void;
  backLabel?: string;
  submitLabel: string;
  busy?: boolean;
  disabled?: boolean;
  onSubmit?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <button
        type={onSubmit ? "button" : "submit"}
        onClick={onSubmit}
        disabled={busy || disabled}
        className="flex h-[52px] w-[180px] items-center justify-center rounded-[14px] bg-gradient-to-l from-brand-violet to-brand-indigo px-5 text-[15px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40 sm:w-[220px]"
      >
        {busy ? <Loader2 size={18} className="animate-spin" /> : submitLabel}
      </button>

      {children}

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex h-[52px] items-center justify-center rounded-[14px] border border-white/12 bg-white/[0.04] px-6 text-[15px] font-bold text-frost transition-colors hover:bg-white/[0.08]"
        >
          {backLabel}
        </button>
      )}
    </div>
  );
}
