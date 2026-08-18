import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, beforeEach, expect, it, vi } from 'vitest';
import DashboardPage from './DashboardPage';
import { fetchDashboardData, type DashboardData } from '../api/dashboard';

vi.mock('../api/dashboard', () => ({
  fetchDashboardData: vi.fn(),
}));

const mockFetchDashboardData = vi.mocked(fetchDashboardData);

// Vitest không bật clearMocks, nên mock.calls tích lũy giữa các test trong file.
// Phải clear để assertion trên mock.calls/lastCall chỉ nói về test hiện tại.
beforeEach(() => {
  vi.clearAllMocks();
});

const money = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount);
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

const dashboard: DashboardData = {
  totalRooms: 12,
  occupiedRooms: 9,
  vacantRooms: 3,
  occupancyRate: 75,
  totalRevenue: 24_500_000,
  pendingInvoices: 2,
  paidInvoices: 7,
  activeContracts: 8,
  dueInvoices: [
    {
      id: 'invoice-1',
      contractId: 'contract-1',
      month: 7,
      year: 2026,
      status: 'ISSUED',
      rentAmount: 3_000_000,
      electricityUsage: 50,
      electricityUnitPrice: 3_500,
      waterUsage: 4,
      waterUnitPrice: 30_000,
      total: 3_295_000,
      issuedAt: '2026-08-01T00:00:00.000Z',
      dueAt: '2026-08-08T00:00:00.000Z',
      paidAt: null,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
      contract: {
        id: 'contract-1',
        tenant: { id: 'tenant-1', name: 'Nguyễn Văn A', phone: '0900000001' },
        room: { id: 'room-1', code: 'P101' },
      },
    },
  ],
  expiringContracts: [
    {
      id: 'contract-2',
      roomId: 'room-2',
      tenantId: 'tenant-2',
      startsAt: '2026-01-01T00:00:00.000Z',
      endsAt: '2026-09-01T00:00:00.000Z',
      deposit: 3_000_000,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      room: { id: 'room-2', code: 'P202' },
      tenant: { id: 'tenant-2', name: 'Trần Thị B', phone: '0900000002' },
    },
  ],
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DashboardPage', () => {
  it('renders the stats returned by the dashboard endpoint', async () => {
    mockFetchDashboardData.mockResolvedValue(dashboard);
    renderPage();

    expect(await screen.findByText('75%')).toBeInTheDocument();
    expect(screen.getByText('9/12 phòng đang thuê')).toBeInTheDocument();
    expect(screen.getByText(`${money(24_500_000)} ₫`)).toBeInTheDocument();
    expect(screen.getByText('7 hóa đơn hoàn tất')).toBeInTheDocument();
  });

  it('splits rooms into occupied and vacant', async () => {
    mockFetchDashboardData.mockResolvedValue(dashboard);
    renderPage();

    expect(await screen.findByText('9 phòng')).toBeInTheDocument();
    expect(screen.getByText('3 phòng')).toBeInTheDocument();
  });

  it('fetches the dashboard with a single request', async () => {
    mockFetchDashboardData.mockResolvedValue(dashboard);
    renderPage();

    await screen.findByText('75%');
    expect(mockFetchDashboardData).toHaveBeenCalledTimes(1);
  });

  it('lists invoices waiting to be paid', async () => {
    mockFetchDashboardData.mockResolvedValue(dashboard);
    renderPage();

    expect(await screen.findByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('P101 · Kỳ 7/2026')).toBeInTheDocument();
    expect(screen.getByText(`${money(3_295_000)} ₫`)).toBeInTheDocument();
    expect(
      screen.getByText(`Đến ${shortDate('2026-08-08T00:00:00.000Z')}`),
    ).toBeInTheDocument();
  });

  it('lists contracts that are about to expire', async () => {
    mockFetchDashboardData.mockResolvedValue(dashboard);
    renderPage();

    expect(await screen.findByText('Trần Thị B')).toBeInTheDocument();
    expect(screen.getByText('P202')).toBeInTheDocument();
    expect(
      screen.getByText(shortDate('2026-09-01T00:00:00.000Z')),
    ).toBeInTheDocument();
  });

  it('shows empty states when nothing is due or expiring', async () => {
    mockFetchDashboardData.mockResolvedValue({
      ...dashboard,
      dueInvoices: [],
      expiringContracts: [],
    });
    renderPage();

    expect(
      await screen.findByText('Chưa có hóa đơn chờ thu.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Chưa có hợp đồng sắp hết hạn.'),
    ).toBeInTheDocument();
  });

  it('shows a loading state while the request is in flight', () => {
    mockFetchDashboardData.mockReturnValue(new Promise<DashboardData>(() => {}));
    renderPage();

    expect(screen.getByText('Đang tải dữ liệu...')).toBeInTheDocument();
  });
});
