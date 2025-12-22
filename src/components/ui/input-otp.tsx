import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const InputOTP = React.forwardRef<
  React.ElementRef<typeof OTPInput>,
  React.ComponentPropsWithoutRef<typeof OTPInput>
>(({ className, containerClassName, ...props }, ref) => (
  <OTPInput
    ref={ref}
    containerClassName={cn(
      "flex items-center gap-3 has-[:disabled]:opacity-50",
      containerClassName
    )}
    className={cn("disabled:cursor-not-allowed", className)}
    {...props}
  />
));
InputOTP.displayName = "InputOTP";

const InputOTPGroup = (
  props: React.HTMLAttributes<HTMLDivElement>
) => (
  <div
    {...props}
    className={cn("flex items-center gap-3", props.className)}
  />
);

const InputOTPSeparator = (
  props: React.HTMLAttributes<HTMLDivElement>
) => (
  <div
    {...props}
    className={cn(
      "w-px h-6 bg-gray-200 dark:bg-gray-700",
      props.className
    )}
  />
);

const InputOTPSlot = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & { index: number }
>(({ index, className, ...props }, ref) => {
  const inputOTP = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTP.slots[index];

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex h-14 w-12 items-center justify-center rounded-xl border-2 text-xl font-semibold transition-all",
        isActive
          ? "border-violet-500 bg-violet-50 dark:bg-violet-950 text-violet-600 shadow-sm"
          : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white",
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-6 w-px animate-pulse bg-violet-600" />
        </div>
      )}
    </div>
  );
});
InputOTPSlot.displayName = "InputOTPSlot";

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot };


