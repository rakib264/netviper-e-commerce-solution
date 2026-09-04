import type { BarcodeType } from "./types";

function digitsOnly(value: string): string {
  return (value || "").replace(/\D/g, "");
}

/** GS1 / UPC-A / EAN check digit (modulo 10) */
function gs1CheckDigit(body: string): number {
  let sum = 0;
  const reversed = body.split("").reverse();
  for (let i = 0; i < reversed.length; i++) {
    const n = parseInt(reversed[i], 10);
    sum += i % 2 === 0 ? n * 3 : n;
  }
  return (10 - (sum % 10)) % 10;
}

function validateUpc(value: string): { valid: boolean; message?: string } {
  const digits = digitsOnly(value);
  if (digits.length !== 12) {
    return { valid: false, message: "UPC must be 12 digits" };
  }
  const expected = gs1CheckDigit(digits.slice(0, 11));
  if (expected !== parseInt(digits[11], 10)) {
    return { valid: false, message: "Invalid UPC checksum" };
  }
  return { valid: true };
}

function validateEan(value: string): { valid: boolean; message?: string } {
  const digits = digitsOnly(value);
  if (digits.length !== 13) {
    return { valid: false, message: "EAN must be 13 digits" };
  }
  const expected = gs1CheckDigit(digits.slice(0, 12));
  if (expected !== parseInt(digits[12], 10)) {
    return { valid: false, message: "Invalid EAN checksum" };
  }
  return { valid: true };
}

function isbn10Check(body: string): string {
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(body[i], 10) * (10 - i);
  }
  const rem = (11 - (sum % 11)) % 11;
  return rem === 10 ? "X" : String(rem);
}

function validateIsbn(value: string): { valid: boolean; message?: string } {
  const cleaned = (value || "").replace(/[-\s]/g, "").toUpperCase();
  if (/^\d{13}$/.test(cleaned)) {
    // ISBN-13 uses EAN-13 checksum (prefix 978/979)
    if (!cleaned.startsWith("978") && !cleaned.startsWith("979")) {
      return { valid: false, message: "ISBN-13 must start with 978 or 979" };
    }
    return validateEan(cleaned);
  }
  if (/^\d{9}[\dX]$/.test(cleaned)) {
    const expected = isbn10Check(cleaned.slice(0, 9));
    if (expected !== cleaned[9]) {
      return { valid: false, message: "Invalid ISBN-10 checksum" };
    }
    return { valid: true };
  }
  return { valid: false, message: "ISBN must be 10 or 13 characters" };
}

export function validateBarcode(
  type: BarcodeType,
  value: string,
): { valid: boolean; message?: string } {
  if (!value || !value.trim()) {
    return { valid: true }; // optional field
  }

  switch (type) {
    case "UPC":
      return validateUpc(value);
    case "EAN":
      return validateEan(value);
    case "ISBN":
      return validateIsbn(value);
    case "Custom":
      if (value.trim().length < 1) {
        return { valid: false, message: "Barcode value is required" };
      }
      return { valid: true };
    default:
      return { valid: false, message: "Unknown barcode type" };
  }
}

export function normalizeBarcodeValue(type: BarcodeType, value: string): string {
  if (!value) return "";
  if (type === "Custom") return value.trim();
  if (type === "ISBN") return value.replace(/[-\s]/g, "").toUpperCase();
  return digitsOnly(value);
}

export const BARCODE_TYPES: BarcodeType[] = ["UPC", "EAN", "ISBN", "Custom"];
