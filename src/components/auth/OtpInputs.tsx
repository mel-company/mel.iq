import { OTPInput, type SlotProps } from "input-otp";

/**
 * The designed one-time-code boxes.
 *
 * Built on `input-otp`, which the app already depends on: it keeps a single
 * real <input> behind the boxes, so paste, autofill and the phone keyboard's
 * SMS suggestion all keep working — things a row of separate inputs loses.
 *
 * `length` is a prop rather than a constant because the frames draw six boxes
 * while the server issues a four-digit code
 * (`faker.number.int({ min: 1000, max: 9999 })`). Six boxes would be
 * unfillable, so the call sites pass the real length; the day the backend
 * moves to six, the boxes follow with no change here.
 */

export type OtpStatus = "default" | "success" | "error";

const BOX =
  "relative flex h-[68px] w-full max-w-[64px] flex-1 items-center justify-center rounded-[14px] bg-field text-[28px] font-bold tabular-nums text-frost transition-all duration-200";

/**
 * One box.
 *
 * The slot comes in as a prop rather than from `OTPInputContext`: that context
 * is only populated on the `children` API, and reading it under `render` gets
 * you an undefined `slots`.
 */
function Slot({ slot, status }: { slot: SlotProps; status: OtpStatus }) {
  const { char, hasFakeCaret, isActive } = slot;

  // Resting boxes show a dimmer border than filled ones, which is what makes
  // progress through the code legible at a glance.
  const border =
    status === "success"
      ? "border-[1.5px] border-mint"
      : status === "error"
        ? "border-[1.5px] border-[#ff5252]"
        : isActive
          ? "border-[1.5px] border-brand-primary shadow-[0_0_0_3px_rgba(51,197,255,0.25)]"
          : char
            ? "border border-line"
            : "border border-field-line";

  return (
    <div className={`${BOX} ${border}`}>
      {char}
      {hasFakeCaret && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <span className="h-8 w-px animate-pulse bg-brand-primary" />
        </span>
      )}
    </div>
  );
}

function OtpInputs({
  value,
  onChange,
  onComplete,
  length,
  status = "default",
  disabled,
  autoFocus,
  ariaLabel = "رمز التحقق",
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length: number;
  status?: OtpStatus;
  disabled?: boolean;
  autoFocus?: boolean;
  ariaLabel?: string;
}) {
  return (
    <OTPInput
      value={value}
      // Digits only: the field is numeric, and letting other characters in
      // only produces a request the server will reject.
      onChange={(next) => onChange(next.replace(/\D/g, ""))}
      onComplete={onComplete}
      maxLength={length}
      disabled={disabled}
      autoFocus={autoFocus}
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={ariaLabel}
      containerClassName="w-full has-[:disabled]:opacity-50"
      render={({ slots }) => (
        // The code itself reads left-to-right even on an RTL page — a number
        // is not mirrored — so the row opts out of the page's direction.
        <div dir="ltr" className="flex w-full items-center justify-end gap-2 sm:gap-3">
          {slots.map((slot, i) => (
            <Slot key={i} slot={slot} status={status} />
          ))}
        </div>
      )}
    />
  );
}

export default OtpInputs;
