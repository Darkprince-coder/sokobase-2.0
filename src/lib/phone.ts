// Normalizes a Kenyan number to 2547XXXXXXXX / 2541XXXXXXXX. Accepts 07.., 01.., +254.., 254..
export function normalizeKePhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  let n = digits;
  if (n.startsWith("0") && n.length === 10) n = `254${n.slice(1)}`;
  else if (n.startsWith("254")) n = n;
  else if (n.length === 9) n = `254${n}`; // 7XXXXXXXX / 1XXXXXXXX with no leading 0
  return /^254[17]\d{8}$/.test(n) ? n : null;
}
