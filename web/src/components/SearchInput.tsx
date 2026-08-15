/**
 * SearchInput — thanh tìm kiếm dùng chung cho mọi trang danh sách.
 *
 * - type="search": hiện nút X xóa native trên webkit/iOS.
 * - Mobile-first: w-full trên mobile, cố định 240px trên desktop.
 * - Kết hợp với matchesTerm() để lọc client-side theo nhiều trường.
 */

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (term: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 fill-none stroke-current stroke-[1.8] text-muted"
        viewBox="0 0 24 24"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full sm:w-[240px] h-[44px] pl-9 pr-3 border border-border rounded-btn bg-white text-slate text-[0.85rem] focus:outline-none focus:ring-2 focus:ring-teal/30"
      />
    </div>
  );
}
