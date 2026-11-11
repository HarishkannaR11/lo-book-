/** "TN39AB1234" → "TN 39 AB 1234". Display only; storage stays compact. */
export function formatReg(reg: string): string {
  const std = /^([A-Z]{2})([0-9]{1,2})([A-Z]{0,3})([0-9]{1,4})$/.exec(reg);
  if (std) return std.slice(1).filter(Boolean).join(" ");
  const bh = /^([0-9]{2})(BH)([0-9]{4})([A-Z]{1,2})$/.exec(reg);
  if (bh) return bh.slice(1).join(" ");
  return reg;
}

/** "919876543210" → "98765 43210". */
export function formatMobile(phone: string): string {
  const local = phone.startsWith("91") && phone.length === 12 ? phone.slice(2) : phone;
  return local.length === 10 ? `${local.slice(0, 5)} ${local.slice(5)}` : local;
}
