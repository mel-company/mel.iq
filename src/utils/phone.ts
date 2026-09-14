import { parsePhoneNumberFromString } from "libphonenumber-js/mobile";

/**
 * One implementation of "is this an Iraqi mobile number?", shared by the login
 * page, the checkout wizard and the AI generator's sign-in modal.
 *
 * Each screen used to parse phones its own way, and all three used the default
 * `libphonenumber-js` metadata, which only checks length: it accepts unassigned
 * carrier prefixes (070, 071, 072) and 8-digit Baghdad landlines as "valid", so
 * an OTP would be sent to a number that can never receive an SMS. The `/mobile`
 * metadata validates against the mobile patterns themselves — +15KB of JSON for
 * the difference between counting digits and actually verifying the number.
 */

/** Digits in the local part of an Iraqi mobile number, without the +964. */
export const IQ_LOCAL_PHONE_LENGTH = 10;

const ARABIC_DIGITS = /[٠-٩۰-۹]/g;

/** "٠٧٧٠" -> "0770". Numeric keypads on Arabic phones emit these. */
function toAsciiDigits(input: string): string {
  return input.replace(ARABIC_DIGITS, (d) => {
    const code = d.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

/**
 * Reduces any spelling a merchant might type — `+964 770…`, `00964770…`,
 * `0770…`, `770…` — to the bare 10-digit local number.
 */
export function toLocalDigits(input: string): string {
  let digits = toAsciiDigits(String(input ?? "")).replace(/\D/g, "");
  if (digits.startsWith("00964")) digits = digits.slice(5);
  else if (digits.startsWith("964")) digits = digits.slice(3);
  // The national trunk prefix, which E.164 drops.
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

/** E.164 (`+9647…`) for a valid Iraqi mobile, or null for anything else. */
export function toIqE164(input: string): string | null {
  const local = toLocalDigits(input);
  if (local.length !== IQ_LOCAL_PHONE_LENGTH) return null;
  const parsed = parsePhoneNumberFromString(`+964${local}`, "IQ");
  return parsed?.isValid() ? parsed.number : null;
}

/**
 * Why the number was rejected, in the wizard's Arabic, or `""` when it is fine.
 *
 * Separate messages per failure so the merchant is told what to fix rather than
 * being left staring at a greyed-out button.
 */
export function iqPhoneError(input: string): string {
  const local = toLocalDigits(input);
  if (!local) return "يرجى إدخال رقم الهاتف.";
  if (local.length < IQ_LOCAL_PHONE_LENGTH)
    return `الرقم ناقص — يجب أن يتكون من ${IQ_LOCAL_PHONE_LENGTH} أرقام (مثال: 770 123 4567).`;
  if (local.length > IQ_LOCAL_PHONE_LENGTH)
    return `الرقم أطول من اللازم — ${IQ_LOCAL_PHONE_LENGTH} أرقام فقط (مثال: 770 123 4567).`;
  if (!toIqE164(local))
    return "رقم غير صحيح. أرقام الموبايل العراقية تبدأ بـ 73 حتى 79.";
  return "";
}

/** "+9647701234567" -> "+964 770 123 4567", the grouping the frames show. */
export function formatIqPhone(e164: string): string {
  if (!e164) return "—";
  const local = toLocalDigits(e164);
  if (local.length !== IQ_LOCAL_PHONE_LENGTH) return e164;
  return `+964 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}
