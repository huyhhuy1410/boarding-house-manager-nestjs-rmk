import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import ContractsPage from './ContractsPage';
import {
  fetchContracts,
  type Contract,
} from '../api/contract';
import { fetchRooms } from '../api/room';
import { fetchTenants } from '../api/tenant';
import { fetchBoardingHouses, type BoardingHouse } from '../api/boarding-house';
import type { RoomDto } from '../types/room';
import type { Tenant } from '../api/tenant';

vi.mock('../api/contract', () => ({
  fetchContracts: vi.fn(),
  fetchContract: vi.fn(),
  createContract: vi.fn(),
  endContract: vi.fn(),
}));

vi.mock('../api/room', () => ({
  fetchRooms: vi.fn(),
}));

vi.mock('../api/tenant', () => ({
  fetchTenants: vi.fn(),
}));

vi.mock('../api/boarding-house', () => ({
  fetchBoardingHouses: vi.fn(),
}));

const mockFetchContracts = vi.mocked(fetchContracts);
const mockFetchRooms = vi.mocked(fetchRooms);
const mockFetchTenants = vi.mocked(fetchTenants);
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

const tenants: Tenant[] = [
  {
    id: 'tenant-1',
    name: 'Nguyễn Văn An',
    phone: '0901234567',
    identityNumber: '079123456789',
    ownerId: 'owner-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tenant-2',
    name: 'Trần Thị Bình',
    phone: '0912345678',
    identityNumber: '080987654321',
    ownerId: 'owner-1',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'tenant-3',
    name: 'Lê Văn Cường',
    phone: '0923456789',
    identityNumber: null,
    ownerId: 'owner-1',
    createdAt: '2026-01-03T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z',
  },
];

const contracts: Contract[] = [
  {
    id: 'contract-1',
    roomId: 'room-1',
    tenantId: 'tenant-1',
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: null,
    deposit: 1000000,
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    room: { id: 'room-1', code: 'A101' },
    tenant: { id: 'tenant-1', name: 'Nguyễn Văn An', phone: '0901234567' },
  },
  {
    id: 'contract-2',
    roomId: 'room-2',
    tenantId: 'tenant-2',
    startsAt: '2026-01-02T00:00:00.000Z',
    endsAt: null,
    deposit: 1100000,
    status: 'ACTIVE',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    room: { id: 'room-2', code: 'A102' },
    tenant: { id: 'tenant-2', name: 'Trần Thị Bình', phone: '0912345678' },
  },
  {
    id: 'contract-3',
    roomId: 'room-3',
    tenantId: 'tenant-3',
    startsAt: '2026-01-03T00:00:00.000Z',
    endsAt: null,
    deposit: 900000,
    status: 'ACTIVE',
    createdAt: '2026-01-03T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z',
    room: { id: 'room-3', code: 'B201' },
    tenant: { id: 'tenant-3', name: 'Lê Văn Cường', phone: '0923456789' },
  },
];

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ContractsPage />
    </QueryClientProvider>,
  );
}

describe('ContractsPage', () => {
  it('renders all contracts when there is no filter or search term', async () => {
    mockFetchContracts.mockResolvedValue(contracts);
    mockFetchRooms.mockResolvedValue(rooms);
    mockFetchTenants.mockResolvedValue(tenants);
    mockFetchHouses.mockResolvedValue(houses);
    renderPage();

    expect(await screen.findByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.getByText('Trần Thị Bình')).toBeInTheDocument();
    expect(screen.getByText('Lê Văn Cường')).toBeInTheDocument();
  });

  it('filters contracts by tenant name', async () => {
    mockFetchContracts.mockResolvedValue(contracts);
    mockFetchRooms.mockResolvedValue(rooms);
    mockFetchTenants.mockResolvedValue(tenants);
    mockFetchHouses.mockResolvedValue(houses);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nguyễn Văn An');

    await user.type(
      screen.getByPlaceholderText('Tìm khách thuê, số điện thoại, phòng...'),
      'Bình',
    );

    expect(screen.getByText('Trần Thị Bình')).toBeInTheDocument();
    expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument();
    expect(screen.queryByText('Lê Văn Cường')).not.toBeInTheDocument();
  });

  it('filters contracts by tenant phone number', async () => {
    mockFetchContracts.mockResolvedValue(contracts);
    mockFetchRooms.mockResolvedValue(rooms);
    mockFetchTenants.mockResolvedValue(tenants);
    mockFetchHouses.mockResolvedValue(houses);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nguyễn Văn An');

    await user.type(
      screen.getByPlaceholderText('Tìm khách thuê, số điện thoại, phòng...'),
      '0912345678',
    );

    expect(screen.getByText('Trần Thị Bình')).toBeInTheDocument();
    expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument();
    expect(screen.queryByText('Lê Văn Cường')).not.toBeInTheDocument();
  });

  it('filters contracts by room code', async () => {
    mockFetchContracts.mockResolvedValue(contracts);
    mockFetchRooms.mockResolvedValue(rooms);
    mockFetchTenants.mockResolvedValue(tenants);
    mockFetchHouses.mockResolvedValue(houses);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nguyễn Văn An');

    await user.type(
      screen.getByPlaceholderText('Tìm khách thuê, số điện thoại, phòng...'),
      'B201',
    );

    expect(screen.getByText('Lê Văn Cường')).toBeInTheDocument();
    expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument();
    expect(screen.queryByText('Trần Thị Bình')).not.toBeInTheDocument();
  });

  it('filters contracts by facility through the room-to-house mapping', async () => {
    mockFetchContracts.mockResolvedValue(contracts);
    mockFetchRooms.mockResolvedValue(rooms);
    mockFetchTenants.mockResolvedValue(tenants);
    mockFetchHouses.mockResolvedValue(houses);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nguyễn Văn An');

    // Chọn cơ sở "Nhà trọ Minh Khai" (house-1) → còn contract-1 và contract-2.
    await user.selectOptions(screen.getByRole('combobox'), 'house-1');

    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.getByText('Trần Thị Bình')).toBeInTheDocument();
    expect(screen.queryByText('Lê Văn Cường')).not.toBeInTheDocument();
  });

  it('shows an empty result message when search has no match', async () => {
    mockFetchContracts.mockResolvedValue(contracts);
    mockFetchRooms.mockResolvedValue(rooms);
    mockFetchTenants.mockResolvedValue(tenants);
    mockFetchHouses.mockResolvedValue(houses);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nguyễn Văn An');

    await user.type(
      screen.getByPlaceholderText('Tìm khách thuê, số điện thoại, phòng...'),
      'Không tồn tại',
    );

    expect(screen.getByText('Không tìm thấy hợp đồng nào.')).toBeInTheDocument();
    expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument();
  });
});
