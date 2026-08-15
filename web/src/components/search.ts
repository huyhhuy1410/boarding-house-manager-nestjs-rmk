/** True nếu term khớp ít nhất 1 field (case-insensitive, chứa chuỗi). */
export function matchesTerm(term: string, ...fields: (string | undefined | null)[]) {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  return fields.some((f) => (f ?? "").toLowerCase().includes(t));
}
