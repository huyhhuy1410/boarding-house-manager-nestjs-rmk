import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import InvoicesPage from './InvoicesPage';
import {
  fetchInvoices,
  type Invoice,
} from '../api/invoice';
import { fetchContracts } from '../api/contract';
import { fetchRooms } from '../api/room';
import { fetchBoardingHouses, type BoardingHouse } from '../api/boarding-house';
import type { RoomDto } from '../types/room';

vi.mock('../api/invoice', () => ({
  fetchInvoices: vi.fn(),
  fetchInvoice: vi.fn(),
  createInvoice: vi.fn(),
  issueInvoice: vi.fn(),
  payInvoice: vi.fn(),
  voidInvoice: vi.fn(),
}));

vi.mock('../api/contract', () => ({
  fetchContracts: vi.fn(),
}));

vi.mock('../api/room', () => ({
  fetchRooms: vi.fn(),
}));

vi.mock('../api/boarding-house', () => ({
  fetchBoardingHouses: vi.fn(),
}));

const mockFetchInvoices = vi.mocked(fetchInvoices);
const mockFetchContracts = vi.mocked(fetchContracts);
const mockFetchRooms = vi.mocked(fetchRooms);
const mockFetchHouses = vi.mocked(fetchBoardingHouses);

const houses: BoardingHouse[] = [
  {
    id: 'house-1',
    name: 'Nhà trọ Minh Khai',
    address: '123 Lê Văn Sỹ, Quận 3',
    ownerId: 'owner-1',
    electricityUnitPrice: 3500,
    waterUnitPrice: 12000,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'house-2',
    name: 'Nhà trọ Nguyễn Văn Cừ',
    address: '45 Trần Hưng Đạo, Quận 5',
    ownerId: 'owner-1',
    electricityUnitPrice: 3600,
    waterUnitPrice: 13000,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
];

const rooms: RoomDto[] = [
  {
    id: 'room-1',
    code: 'A101',
    status: 'OCCUPIED',
    rentAmount: 3000000,
    houseId: 'house-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'room-2',
    code: 'A102',
    status: 'OCCUPIED',
    rentAmount: 3200000,
    houseId: 'house-1',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'room-3',
    code: 'B201',
    status: 'OCCUPIED',
    rentAmount: 2800000,
    houseId: 'house-2',
    createdAt: '2026-01-03T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z',
  },
];

function makeInvoice(
  id: string,
  contractId: string,
  roomId: string,
  roomCode: string,
  tenantName: string,
  tenantPhone: string,
  month: number,
  year: number,
  status: Invoice['status'],
): Invoice {
  return {
    id,
    contractId,
    month,
    year,
    status,
    rentAmount: 3000000,
    electricityUsage: 100,
    electricityUnitPrice: 3500,
    waterUsage: 10,
    waterUnitPrice: 12000,
    total: 3470000,
    issuedAt: null,
    dueAt: null,
    paidAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    contract: {
      id: contractId,
      tenant: { id: `t-${id}`, name: tenantName, phone: tenantPhone },
      room: { id: roomId, code: roomCode },
    },
  };
}

const invoices: Invoice[] = [
  makeInvoice('inv-1', 'contract-1', 'room-1', 'A101', 'Nguyễn Văn An', '0901234567', 1, 2026, 'PAID'),
  makeInvoice('inv-2', 'contract-2', 'room-2', 'A102', 'Trần Thị Bình', '0912345678', 2, 2026, 'ISSUED'),
  makeInvoice('inv-3', 'contract-3', 'room-3', 'B201', 'Lê Văn Cường', '0923456789', 3, 2026, 'DRAFT'),
];

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <InvoicesPage />
    </QueryClientProvider>,
  );
}

describe('InvoicesPage', () => {
  it('renders all invoices when there is no filter or search term', async () => {
    mockFetchInvoices.mockResolvedValue(invoices);
    mockFetchContracts.mockResolvedValue([]);
    mockFetchRooms.mockResolvedValue(rooms);
    mockFetchHouses.mockResolvedValue(houses);
    renderPage();

    expect(await screen.findByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.getByText('Trần Thị Bình')).toBeInTheDocument();
    expect(screen.getByText('Lê Văn Cường')).toBeInTheDocument();
  });

  it('filters invoices by tenant name', async () => {
    mockFetchInvoices.mockResolvedValue(invoices);
    mockFetchContracts.mockResolvedValue([]);
    mockFetchRooms.mockResolvedValue(rooms);
    mockFetchHouses.mockResolvedValue(houses);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nguyễn Văn An');

    await user.type(
      screen.getByPlaceholderText('Tìm khách thuê, số điện thoại, phòng, kỳ...'),
      'Bình',
    );

    expect(screen.getByText('Trần Thị Bình')).toBeInTheDocument();
    expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument();
    expect(screen.queryByText('Lê Văn Cường')).not.toBeInTheDocument();
  });

  it('filters invoices by tenant phone number', async () => {
    mockFetchInvoices.mockResolvedValue(invoices);
    mockFetchContracts.mockResolvedValue([]);
    mockFetchRooms.mockResolvedValue(rooms);
    mockFetchHouses.mockResolvedValue(houses);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nguyễn Văn An');

    await user.type(
      screen.getByPlaceholderText('Tìm khách thuê, số điện thoại, phòng, kỳ...'),
      '0912345678',
    );

    expect(screen.getByText('Trần Thị Bình')).toBeInTheDocument();
    expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument();
    expect(screen.queryByText('Lê Văn Cường')).not.toBeInTheDocument();
  });

  it('filters invoices by room code', async () => {
    mockFetchInvoices.mockResolvedValue(invoices);
    mockFetchContracts.mockResolvedValue([]);
    mockFetchRooms.mockResolvedValue(rooms);
    mockFetchHouses.mockResolvedValue(houses);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nguyễn Văn An');

    await user.type(
      screen.getByPlaceholderText('Tìm khách thuê, số điện thoại, phòng, kỳ...'),
      'B201',
    );

    expect(screen.getByText('Lê Văn Cường')).toBeInTheDocument();
    expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument();
    expect(screen.queryByText('Trần Thị Bình')).not.toBeInTheDocument();
  });

  it('filters invoices by payment period (month/year)', async () => {
    mockFetchInvoices.mockResolvedValue(invoices);
    mockFetchContracts.mockResolvedValue([]);
    mockFetchRooms.mockResolvedValue(rooms);
    mockFetchHouses.mockResolvedValue(houses);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nguyễn Văn An');

    await user.type(
      screen.getByPlaceholderText('Tìm khách thuê, số điện thoại, phòng, kỳ...'),
      '2/2026',
    );

    expect(screen.getByText('Trần Thị Bình')).toBeInTheDocument();
    expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument();
    expect(screen.queryByText('Lê Văn Cường')).not.toBeInTheDocument();
  });

  it('filters invoices by facility through contract room mapping', async () => {
    mockFetchInvoices.mockResolvedValue(invoices);
    mockFetchContracts.mockResolvedValue([]);
    mockFetchRooms.mockResolvedValue(rooms);
    mockFetchHouses.mockResolvedValue(houses);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nguyễn Văn An');

    // Chọn "Nhà trọ Minh Khai" (house-1) → còn inv-1 và inv-2.
    await user.selectOptions(screen.getByRole('combobox'), 'house-1');

    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.getByText('Trần Thị Bình')).toBeInTheDocument();
    expect(screen.queryByText('Lê Văn Cường')).not.toBeInTheDocument();
  });

  it('combines the status filter with search using logical AND', async () => {
    mockFetchInvoices.mockResolvedValue(invoices);
    mockFetchContracts.mockResolvedValue([]);
    mockFetchRooms.mockResolvedValue(rooms);
    mockFetchHouses.mockResolvedValue(houses);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nguyễn Văn An');

    // Lọc "Đã thanh toán" → chỉ còn inv-1 (PAID).
    await user.click(screen.getByRole('button', { name: 'Đã thanh toán' }));
    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.queryByText('Trần Thị Bình')).not.toBeInTheDocument();
    expect(screen.queryByText('Lê Văn Cường')).not.toBeInTheDocument();

    // Thêm search theo tên khách thuê không khớp → rỗng (AND).
    await user.type(
      screen.getByPlaceholderText('Tìm khách thuê, số điện thoại, phòng, kỳ...'),
      'Bình',
    );

    expect(screen.getByText('Không có hóa đơn nào trong bộ lọc này.')).toBeInTheDocument();
    expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument();
  });

  it('shows an empty message when filters leave no matching invoice', async () => {
    mockFetchInvoices.mockResolvedValue(invoices);
    mockFetchContracts.mockResolvedValue([]);
    mockFetchRooms.mockResolvedValue(rooms);
    mockFetchHouses.mockResolvedValue(houses);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nguyễn Văn An');

    await user.type(
      screen.getByPlaceholderText('Tìm khách thuê, số điện thoại, phòng, kỳ...'),
      'Không tồn tại',
    );

    expect(screen.getByText('Không có hóa đơn nào trong bộ lọc này.')).toBeInTheDocument();
    expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument();
  });
});
