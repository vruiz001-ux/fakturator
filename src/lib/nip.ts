// Polish NIP (tax ID) validation. Pure — safe to import anywhere.

export const NIP_RE = /^\d{10}$/

// NIP checksum: weighted sum of first 9 digits mod 11 must equal digit 10.
export function nipChecksumValid(nip: string): boolean {
  const digits = (nip || "").replace(/[^0-9]/g, "")
  if (!NIP_RE.test(digits)) return false
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7]
  const sum = weights.reduce((acc, w, i) => acc + w * Number(digits[i]), 0)
  const check = sum % 11
  if (check === 10) return false // invalid NIP — checksum can't be 10
  return check === Number(digits[9])
}
