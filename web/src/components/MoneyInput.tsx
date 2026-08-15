/**
 * MoneyInput — ô nhập tiền VND auto-format dấu chấm phân tách hàng nghìn khi gõ.
 *
 * Pattern:
 * - State luôn giữ RAW digits (ví dụ "3000000"), không giữ chuỗi đã format.
 * - Dấu chấm chỉ là suy ra tại render (formatVND), nên không có vòng lặp reformat.
 * - type="text" + inputMode="numeric": trên iOS type="number" không hiển thị
 *   dấu chấm phân tách, dùng text để hiện "3.000.000" mà vẫn mở bàn phím số.
 * - Con trỏ tự nhảy về cuối sau mỗi thay đổi (cách đơn giản, đã chốt với user).
 */

const stripNonDigits = (s: string) => s.replace(/\D/g, "");

const formatVND = (raw: string) => {
  const digits = stripNonDigits(raw);
  return digits === "" ? "" : Number(digits).toLocaleString("vi-VN");
};

export function MoneyInput({
  value,
  onChange,
  placeholder,
}: {
  /** Raw digits, ví dụ "3000000" — không chứa dấu chấm. */
  value: string;
  /** Trả về raw digits (không dấu). */
  onChange: (raw: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={formatVND(value)}
      placeholder={placeholder}
      onChange={(e) => onChange(stripNonDigits(e.target.value))}
      className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate focus:outline-none focus:ring-2 focus:ring-teal/30"
    />
  );
}
