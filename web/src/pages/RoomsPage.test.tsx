import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import RoomsPage from './RoomsPage';
import { fetchRooms } from '../api/room';
import { fetchBoardingHouses, type BoardingHouse } from '../api/boarding-house';
import type { RoomDto } from '../types/room';

vi.mock('../api/room', () => ({
  fetchRooms: vi.fn(),
  createRoom: vi.fn(),
  updateRoom: vi.fn(),
  deleteRoom: vi.fn(),
}));

vi.mock('../api/boarding-house', () => ({
  fetchBoardingHouses: vi.fn(),
}));

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
    contract: {
      id: 'contract-1',
      tenant: { id: 'tenant-1', name: 'Nguyễn Văn An' },
    },
  },
  {
    id: 'room-2',
    code: 'A102',
    status: 'VACANT',
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
    contract: {
      id: 'contract-2',
      tenant: { id: 'tenant-2', name: 'Trần Thị Bình' },
    },
  },
];

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RoomsPage />
    </QueryClientProvider>,
  );
}

describe('RoomsPage', () => {
  it('renders all rooms when there is no filter or search term', async () => {
    mockFetchRooms.mockResolvedValue(rooms);
    mockFetchHouses.mockResolvedValue(houses);
    renderPage();

    expect(await screen.findByText('Phòng A101')).toBeInTheDocument();
    expect(screen.getByText('Phòng A102')).toBeInTheDocument();
    expect(screen.getByText('Phòng B201')).toBeInTheDocument();
  });

  it('filters rooms by room code', async () => {
    mockFetchRooms.mockResolvedValue(rooms);
    mockFetchHouses.mockResolvedValue(houses);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Phòng A101');

    await user.type(
      screen.getByPlaceholderText('Tìm phòng, khách thuê, cơ sở...'),
      'B201',
    );

    expect(screen.getByText('Phòng B201')).toBeInTheDocument();
    expect(screen.queryByText('Phòng A101')).not.toBeInTheDocument();
    expect(screen.queryByText('Phòng A102')).not.toBeInTheDocument();
  });

  it('filters rooms by tenant name through the active contract', async () => {
    mockFetchRooms.mockResolvedValue(rooms);
    mockFetchHouses.mockResolvedValue(houses);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Phòng A101');

    await user.type(
      screen.getByPlaceholderText('Tìm phòng, khách thuê, cơ sở...'),
      'Nguyễn Văn An',
    );

    expect(screen.getByText('Phòng A101')).toBeInTheDocument();
    expect(screen.queryByText('Phòng A102')).not.toBeInTheDocument();
    expect(screen.queryByText('Phòng B201')).not.toBeInTheDocument();
  });

  it('filters rooms by boarding house name', async () => {
    mockFetchRooms.mockResolvedValue(rooms);
    mockFetchHouses.mockResolvedValue(houses);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Phòng A101');

    await user.type(
      screen.getByPlaceholderText('Tìm phòng, khách thuê, cơ sở...'),
      'Minh Khai',
    );

    expect(screen.getByText('Phòng A101')).toBeInTheDocument();
    expect(screen.getByText('Phòng A102')).toBeInTheDocument();
    expect(screen.queryByText('Phòng B201')).not.toBeInTheDocument();
  });

  it('combines search with the status filter using logical AND', async () => {
    mockFetchRooms.mockResolvedValue(rooms);
    mockFetchHouses.mockResolvedValue(houses);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Phòng A101');

    // Lọc "Đang thuê" trước → còn A101 và B201.
    await user.click(screen.getByRole('button', { name: 'Đang thuê' }));
    expect(screen.getByText('Phòng A101')).toBeInTheDocument();
    expect(screen.getByText('Phòng B201')).toBeInTheDocument();
    expect(screen.queryByText('Phòng A102')).not.toBeInTheDocument();

    // Thêm search theo tên khách thuê → chỉ còn B201 (AND).
    await user.type(
      screen.getByPlaceholderText('Tìm phòng, khách thuê, cơ sở...'),
      'Bình',
    );

    expect(screen.getByText('Phòng B201')).toBeInTheDocument();
    expect(screen.queryByText('Phòng A101')).not.toBeInTheDocument();
  });

  it('combines search with the house filter using logical AND', async () => {
    mockFetchRooms.mockResolvedValue(rooms);
    mockFetchHouses.mockResolvedValue(houses);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Phòng A101');

    // Lọc cơ sở "Nhà trọ Minh Khai" → còn A101 và A102.
    await user.selectOptions(screen.getByRole('combobox'), 'house-1');
    expect(screen.getByText('Phòng A101')).toBeInTheDocument();
    expect(screen.getByText('Phòng A102')).toBeInTheDocument();
    expect(screen.queryByText('Phòng B201')).not.toBeInTheDocument();

    // Thêm search theo mã phòng → chỉ còn A102 (AND).
    await user.type(
      screen.getByPlaceholderText('Tìm phòng, khách thuê, cơ sở...'),
      'A102',
    );

    expect(screen.getByText('Phòng A102')).toBeInTheDocument();
    expect(screen.queryByText('Phòng A101')).not.toBeInTheDocument();
  });

  it('shows the empty state when filters leave no matching room', async () => {
    mockFetchRooms.mockResolvedValue(rooms);
    mockFetchHouses.mockResolvedValue(houses);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Phòng A101');

    await user.type(
      screen.getByPlaceholderText('Tìm phòng, khách thuê, cơ sở...'),
      'Không tồn tại',
    );

    expect(screen.getByText('Chưa có phòng nào. Hãy tạo phòng đầu tiên!')).toBeInTheDocument();
    expect(screen.queryByText('Phòng A101')).not.toBeInTheDocument();
    expect(screen.queryByText('Phòng B201')).not.toBeInTheDocument();
  });
});
