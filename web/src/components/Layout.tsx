import { useState, type ReactElement } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '../api/auth';

type NavItem = {
  to: string;
  label: string;
  icon: ReactElement;
};

const iconProps = {
  className: 'w-5 h-5 fill-none stroke-current stroke-[1.8] stroke-round',
  viewBox: '0 0 24 24',
} as const;

const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: 'Tổng quan',
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    to: '/rooms',
    label: 'Phòng',
    icon: (
      <svg {...iconProps}>
        <path d="M5 21h14M7 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17M13.5 12h.01" />
      </svg>
    ),
  },
  {
    to: '/tenants',
    label: 'Khách thuê',
    icon: (
      <svg {...iconProps}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    to: '/contracts',
    label: 'Hợp đồng',
    icon: (
      <svg {...iconProps}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    to: '/invoices',
    label: 'Hóa đơn',
    icon: (
      <svg {...iconProps}>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" />
        <path d="M9 8h6M9 12h6" />
      </svg>
    ),
  },
  {
    to: '/boarding-houses',
    label: 'Cơ sở',
    icon: (
      <svg {...iconProps}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    to: '/meter-readings',
    label: 'Chỉ số',
    icon: (
      <svg {...iconProps}>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    to: '/maintenance-requests',
    label: 'Sửa chữa',
    icon: (
      <svg {...iconProps}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    to: '/expenses',
    label: 'Chi phí',
    icon: (
      <svg {...iconProps}>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
];

// 5 tab chính hiển thị trên bottom bar; các mục còn lại nằm trong drawer "Menu".
const TAB_ORDER = ['/', '/rooms', '/invoices', '/maintenance-requests'] as const;
const MENU_ITEMS = NAV_ITEMS.filter((item) => !TAB_ORDER.includes(item.to as (typeof TAB_ORDER)[number]));

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // The signed-in user is the only source of truth for who is on screen;
  // a hardcoded name would greet one account with another account's name.
  // queryFn is wrapped because TanStack Query passes its context as the first
  // argument, which a bare function reference would receive as a parameter.
  const { data: user } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => getCurrentUser(),
    // Identity does not change during a session, so this is fetched once.
    staleTime: 5 * 60 * 1000,
  });

  // Degrade to a neutral label rather than rendering "undefined" while the
  // request is in flight or if it fails.
  const displayName = user?.name?.trim() || user?.email || 'Chủ nhà';
  const displayInitials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'CN';

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinkClass = (path: string) =>
    `flex items-center gap-3 px-[13px] min-h-[48px] rounded-btn font-[650] text-[#526173] text-[0.92rem] transition-colors ${
      isActive(path) ? 'bg-soft text-teal' : 'hover:bg-[#f3f7f6]'
    }`;

  return (
    <div className="min-h-screen bg-canvas">
      {/* Sidebar (desktop only) */}
      <aside className="hidden md:flex fixed top-0 left-0 w-[248px] h-full bg-white border-r border-border flex-col p-[26px_18px] z-10">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-2.5 pb-[30px] font-extrabold text-[1.08rem]">
          <div className="w-[38px] h-[38px] rounded-xl bg-teal text-white flex items-center justify-center">
            <svg className="w-5 h-5 fill-none stroke-current stroke-[1.8] stroke-round" viewBox="0 0 24 24">
              <path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />
            </svg>
          </div>
          <span>An Tâm</span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1.5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={isActive(item.to) ? 'page' : undefined}
              className={navLinkClass(item.to)}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* User info at bottom */}
        <div className="mt-auto pt-3.5 border-t border-border flex items-center justify-between gap-2.5 px-2">
          <div className="flex items-center gap-2.5">
            <div className="w-[38px] h-[38px] rounded-full bg-soft text-teal flex items-center justify-center font-extrabold text-sm">
              {displayInitials}
            </div>
            <div className="flex flex-col gap-0.5 text-[0.78rem]">
              <strong className="font-bold text-slate leading-tight">{displayName}</strong>
              <small className="text-muted leading-tight">Chủ nhà</small>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-[44px] h-[44px] rounded-xl flex items-center justify-center text-muted hover:bg-[#f1f5f9] transition-colors"
            title="Đăng xuất"
            aria-label="Đăng xuất"
          >
            <svg className="w-5 h-5 fill-none stroke-current stroke-[1.8] stroke-round" viewBox="0 0 24 24">
              <path d="M10 17l5-5-5-5M15 12H3M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-20 flex items-center justify-between px-4 h-[56px] bg-white border-b border-border">
        <div className="flex items-center gap-2 font-extrabold text-[1rem] text-slate">
          <div className="w-[32px] h-[32px] rounded-lg bg-teal text-white flex items-center justify-center">
            <svg className="w-[18px] h-[18px] fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24">
              <path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />
            </svg>
          </div>
          <span>An Tâm</span>
        </div>
        <button
          onClick={handleLogout}
          className="w-[44px] h-[44px] rounded-xl flex items-center justify-center text-muted hover:bg-slate-100 transition-colors"
          title="Đăng xuất"
          aria-label="Đăng xuất"
        >
          <svg className="w-5 h-5 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24">
            <path d="M10 17l5-5-5-5M15 12H3M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
          </svg>
        </button>
      </header>

      {/* Main content */}
      <main className="md:ml-[248px] min-h-screen pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-border pb-[env(safe-area-inset-bottom)]"
        aria-label="Điều hướng chính"
      >
        <div className="grid grid-cols-5">
          {TAB_ORDER.map((path) => {
            const item = NAV_ITEMS.find((n) => n.to === path)!;
            return (
              <Link
                key={path}
                to={path}
                aria-current={isActive(path) ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 h-[64px] text-[0.68rem] font-bold transition-colors ${
                  isActive(path) ? 'text-teal' : 'text-muted'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Mở menu"
            className={`flex flex-col items-center justify-center gap-1 h-[64px] text-[0.68rem] font-bold transition-colors ${
              MENU_ITEMS.some((n) => isActive(n.to)) ? 'text-teal' : 'text-muted'
            }`}
          >
            <svg className="w-5 h-5 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
            <span>Menu</span>
          </button>
        </div>
      </nav>

      {/* Mobile menu drawer */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 flex items-end bg-black/40"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="w-full bg-white rounded-t-2xl p-4 pb-[calc(16px+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2 px-2">
              <h2 className="m-0 text-base font-bold text-slate">Menu</h2>
              <button
                onClick={() => setMenuOpen(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-muted hover:bg-slate-100 transition-colors"
                aria-label="Đóng menu"
              >
                <svg className="w-5 h-5 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MENU_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 min-h-[52px] rounded-btn font-bold text-[0.9rem] transition-colors ${
                    isActive(item.to) ? 'bg-soft text-teal' : 'text-[#526173] hover:bg-[#f3f7f6]'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
