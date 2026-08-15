import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import BoardingHousesPage from './BoardingHousesPage';
import {
  fetchBoardingHouses,
  type BoardingHouse,
} from '../api/boarding-house';

vi.mock('../api/boarding-house', () => ({
  fetchBoardingHouses: vi.fn(),
  createBoardingHouse: vi.fn(),
  updateBoardingHouse: vi.fn(),
  deleteBoardingHouse: vi.fn(),
}));

const mockFetch = vi.mocked(fetchBoardingHouses);

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
  {
    id: 'house-3',
    name: 'Nhà trọ Lý Thường Kiệt',
    address: '78 Hai Bà Trưng, Quận 1',
    ownerId: 'owner-1',
    electricityUnitPrice: 3700,
    waterUnitPrice: 14000,
    createdAt: '2026-01-03T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z',
  },
];

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BoardingHousesPage />
    </QueryClientProvider>,
  );
}

describe('BoardingHousesPage', () => {
  it('renders all boarding houses when there is no search term', async () => {
    mockFetch.mockResolvedValue(houses);
    renderPage();

    expect(await screen.findByText('Nhà trọ Minh Khai')).toBeInTheDocument();
    expect(screen.getByText('Nhà trọ Nguyễn Văn Cừ')).toBeInTheDocument();
    expect(screen.getByText('Nhà trọ Lý Thường Kiệt')).toBeInTheDocument();
  });

  it('filters houses by name', async () => {
    mockFetch.mockResolvedValue(houses);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nhà trọ Minh Khai');

    await user.type(
      screen.getByPlaceholderText('Tìm tên hoặc địa chỉ cơ sở...'),
      'Minh Khai',
    );

    expect(screen.getByText('Nhà trọ Minh Khai')).toBeInTheDocument();
    expect(screen.queryByText('Nhà trọ Nguyễn Văn Cừ')).not.toBeInTheDocument();
    expect(screen.queryByText('Nhà trọ Lý Thường Kiệt')).not.toBeInTheDocument();
  });

  it('filters houses by address', async () => {
    mockFetch.mockResolvedValue(houses);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nhà trọ Minh Khai');

    await user.type(
      screen.getByPlaceholderText('Tìm tên hoặc địa chỉ cơ sở...'),
      'Trần Hưng Đạo',
    );

    expect(screen.getByText('Nhà trọ Nguyễn Văn Cừ')).toBeInTheDocument();
    expect(screen.queryByText('Nhà trọ Minh Khai')).not.toBeInTheDocument();
    expect(screen.queryByText('Nhà trọ Lý Thường Kiệt')).not.toBeInTheDocument();
  });

  it('shows an empty result message when no house matches the search', async () => {
    mockFetch.mockResolvedValue(houses);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nhà trọ Minh Khai');

    await user.type(
      screen.getByPlaceholderText('Tìm tên hoặc địa chỉ cơ sở...'),
      'Không tồn tại',
    );

    expect(screen.getByText('Không tìm thấy cơ sở nào.')).toBeInTheDocument();
    expect(screen.queryByText('Nhà trọ Minh Khai')).not.toBeInTheDocument();
  });

  it('restores all houses after clearing the search term', async () => {
    mockFetch.mockResolvedValue(houses);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nhà trọ Minh Khai');

    const search = screen.getByPlaceholderText('Tìm tên hoặc địa chỉ cơ sở...');
    await user.type(search, 'Minh Khai');
    expect(screen.queryByText('Nhà trọ Nguyễn Văn Cừ')).not.toBeInTheDocument();

    await user.clear(search);

    expect(screen.getByText('Nhà trọ Minh Khai')).toBeInTheDocument();
    expect(screen.getByText('Nhà trọ Nguyễn Văn Cừ')).toBeInTheDocument();
    expect(screen.getByText('Nhà trọ Lý Thường Kiệt')).toBeInTheDocument();
  });
});
