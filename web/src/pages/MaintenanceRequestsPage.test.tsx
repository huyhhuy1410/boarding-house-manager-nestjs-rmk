import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import MaintenanceRequestsPage from './MaintenanceRequestsPage';
import {
  fetchMaintenanceRequests,
  type MaintenanceRequest,
} from '../api/maintenance-request';
import { fetchRooms } from '../api/room';
import type { RoomDto } from '../types/room';

vi.mock('../api/maintenance-request', () => ({
  fetchMaintenanceRequests: vi.fn(),
  createMaintenanceRequest: vi.fn(),
  startMaintenanceRequest: vi.fn(),
  resolveMaintenanceRequest: vi.fn(),
  cancelMaintenanceRequest: vi.fn(),
  deleteMaintenanceRequest: vi.fn(),
}));

vi.mock('../api/room', () => ({
  fetchRooms: vi.fn(),
}));

const mockFetchRequests = vi.mocked(fetchMaintenanceRequests);
const mockFetchRooms = vi.mocked(fetchRooms);

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
    code: 'B201',
    status: 'OCCUPIED',
    rentAmount: 2800000,
    houseId: 'house-2',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
];

const requests: MaintenanceRequest[] = [
  {
    id: 'req-1',
    roomId: 'room-1',
    tenantId: 'tenant-1',
    status: 'OPEN',
    chargeTo: null,
    title: 'Vòi nước bị rò rỉ',
    description: 'Vòi nước phòng tắm rò rỉ liên tục',
    estimatedCost: null,
    actualCost: null,
    resolvedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'req-2',
    roomId: 'room-2',
    tenantId: 'tenant-2',
    status: 'IN_PROGRESS',
    chargeTo: 'OWNER',
    title: 'Bóng đèn hỏng',
    description: 'Đèn hành lang tầng 2 không sáng',
    estimatedCost: 100000,
    actualCost: null,
    resolvedAt: null,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'req-3',
    roomId: 'room-1',
    tenantId: 'tenant-3',
    status: 'RESOLVED',
    chargeTo: 'TENANT',
    title: 'Sửa cửa sổ',
    description: 'Cửa sổ phòng A101 bị kẹt',
    estimatedCost: 200000,
    actualCost: 180000,
    resolvedAt: '2026-01-03T00:00:00.000Z',
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
      <MaintenanceRequestsPage />
    </QueryClientProvider>,
  );
}

describe('MaintenanceRequestsPage', () => {
  it('renders all requests when there is no search term', async () => {
    mockFetchRequests.mockResolvedValue(requests);
    mockFetchRooms.mockResolvedValue(rooms);
    renderPage();

    expect(await screen.findByText('Vòi nước bị rò rỉ')).toBeInTheDocument();
    expect(screen.getByText('Bóng đèn hỏng')).toBeInTheDocument();
    expect(screen.getByText('Sửa cửa sổ')).toBeInTheDocument();
  });

  it('filters requests by title', async () => {
    mockFetchRequests.mockResolvedValue(requests);
    mockFetchRooms.mockResolvedValue(rooms);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Vòi nước bị rò rỉ');

    await user.type(
      screen.getByPlaceholderText('Tìm tiêu đề, mô tả, phòng...'),
      'Bóng đèn',
    );

    expect(screen.getByText('Bóng đèn hỏng')).toBeInTheDocument();
    expect(screen.queryByText('Vòi nước bị rò rỉ')).not.toBeInTheDocument();
    expect(screen.queryByText('Sửa cửa sổ')).not.toBeInTheDocument();
  });

  it('filters requests by description', async () => {
    mockFetchRequests.mockResolvedValue(requests);
    mockFetchRooms.mockResolvedValue(rooms);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Vòi nước bị rò rỉ');

    await user.type(
      screen.getByPlaceholderText('Tìm tiêu đề, mô tả, phòng...'),
      'hành lang',
    );

    expect(screen.getByText('Bóng đèn hỏng')).toBeInTheDocument();
    expect(screen.queryByText('Vòi nước bị rò rỉ')).not.toBeInTheDocument();
    expect(screen.queryByText('Sửa cửa sổ')).not.toBeInTheDocument();
  });

  it('filters requests by room code through the room lookup', async () => {
    mockFetchRequests.mockResolvedValue(requests);
    mockFetchRooms.mockResolvedValue(rooms);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Vòi nước bị rò rỉ');

    await user.type(
      screen.getByPlaceholderText('Tìm tiêu đề, mô tả, phòng...'),
      'B201',
    );

    expect(screen.getByText('Bóng đèn hỏng')).toBeInTheDocument();
    expect(screen.queryByText('Vòi nước bị rò rỉ')).not.toBeInTheDocument();
    expect(screen.queryByText('Sửa cửa sổ')).not.toBeInTheDocument();
  });

  it('shows an empty result message when no request matches the search', async () => {
    mockFetchRequests.mockResolvedValue(requests);
    mockFetchRooms.mockResolvedValue(rooms);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Vòi nước bị rò rỉ');

    await user.type(
      screen.getByPlaceholderText('Tìm tiêu đề, mô tả, phòng...'),
      'Không tồn tại',
    );

    expect(screen.getByText('Không tìm thấy yêu cầu nào.')).toBeInTheDocument();
    expect(screen.queryByText('Vòi nước bị rò rỉ')).not.toBeInTheDocument();
  });
});
