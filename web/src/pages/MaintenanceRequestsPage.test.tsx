import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MaintenanceRequestsPage from './MaintenanceRequestsPage';
import {
  fetchMaintenanceRequests,
  createMaintenanceRequest,
  resolveMaintenanceRequest,
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
const mockCreateRequest = vi.mocked(createMaintenanceRequest);
const mockResolveRequest = vi.mocked(resolveMaintenanceRequest);

// Vitest không bật clearMocks, nên mock.calls tích lũy giữa các test trong file.
// Phải clear để assertion trên mock.calls/lastCall chỉ nói về test hiện tại.
beforeEach(() => {
  vi.clearAllMocks();
});

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
      tenant: { id: 'tenant-1', name: 'Nguyễn Văn A' },
    },
  },
  {
    id: 'room-2',
    code: 'B201',
    status: 'VACANT',
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
    tenant: { id: 'tenant-1', name: 'Nguyễn Văn A' },
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
    tenant: { id: 'tenant-2', name: 'Trần Thị B' },
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
    tenant: { id: 'tenant-3', name: 'Lê Văn C' },
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

// Request của phòng TRỐNG (room-2 không có contract) — dùng riêng cho test
// resolve modal: "khách thuê chịu phí" phải bị vô hiệu hóa.
const vacantRequest: MaintenanceRequest = {
  id: 'req-4',
  roomId: 'room-2',
  tenantId: null,
  status: 'IN_PROGRESS',
  chargeTo: null,
  title: 'Sửa quạt trần',
  description: 'Quạt trần phòng B201 kêu to',
  estimatedCost: null,
  actualCost: null,
  resolvedAt: null,
  createdAt: '2026-01-04T00:00:00.000Z',
  updatedAt: '2026-01-04T00:00:00.000Z',
};

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

  it('shows the tenant name below the room code', async () => {
    mockFetchRequests.mockResolvedValue(requests);
    mockFetchRooms.mockResolvedValue(rooms);
    renderPage();

    // Desktop table: cột Phòng render mã phòng, kèm tên khách thuê snapshot bên dưới.
    expect(await screen.findByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('Trần Thị B')).toBeInTheDocument();
    expect(screen.getAllByText('A101').length).toBeGreaterThanOrEqual(1);
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

  // A1: form tạo yêu cầu phải gắn tenantId lấy từ contract ACTIVE của phòng.
  describe('create form tenant wiring', () => {
    it('sends the tenant of the selected room active contract', async () => {
      mockFetchRequests.mockResolvedValue(requests);
      mockFetchRooms.mockResolvedValue(rooms);
      mockCreateRequest.mockResolvedValue(requests[0]);
      const user = userEvent.setup();
      renderPage();

      await screen.findByText('Vòi nước bị rò rỉ');
      await user.click(screen.getByRole('button', { name: 'Tạo yêu cầu' }));

      await user.selectOptions(screen.getByLabelText('Phòng'), 'room-1');
      await user.type(screen.getByLabelText('Tiêu đề'), 'Vòi nước bị rò rỉ');
      await user.type(screen.getByLabelText('Mô tả'), 'Rò rỉ liên tục');

      expect(screen.getByText('Khách thuê: Nguyễn Văn A')).toBeInTheDocument();

      // "Tạo yêu cầu" xuất hiện 2 lần khi modal mở (nút trên page + nút submit).
      // Modal render sau nên nút submit là phần tử cuối.
      await user.click(
        screen.getAllByRole('button', { name: 'Tạo yêu cầu' }).at(-1)!,
      );

      // TanStack Query v5 gọi mutationFn với (variables, context) — chỉ quan tâm variables.
      expect(mockCreateRequest.mock.calls[0][0]).toEqual({
        roomId: 'room-1',
        tenantId: 'tenant-1',
        title: 'Vòi nước bị rò rỉ',
        description: 'Rò rỉ liên tục',
      });
    });

    it('omits tenantId entirely for a vacant room', async () => {
      mockFetchRequests.mockResolvedValue(requests);
      mockFetchRooms.mockResolvedValue(rooms);
      mockCreateRequest.mockResolvedValue(requests[0]);
      const user = userEvent.setup();
      renderPage();

      await screen.findByText('Vòi nước bị rò rỉ');
      await user.click(screen.getByRole('button', { name: 'Tạo yêu cầu' }));

      // room-2 không có contract -> không có khách thuê để gắn
      await user.selectOptions(screen.getByLabelText('Phòng'), 'room-2');
      await user.type(screen.getByLabelText('Tiêu đề'), 'Bóng đèn hỏng');
      await user.type(screen.getByLabelText('Mô tả'), 'Đèn không sáng');

      expect(
        screen.getByText('Phòng đang trống — yêu cầu sẽ không gắn khách thuê.'),
      ).toBeInTheDocument();

      await user.click(
        screen.getAllByRole('button', { name: 'Tạo yêu cầu' }).at(-1)!,
      );

      expect(mockCreateRequest.mock.calls[0][0]).toEqual({
        roomId: 'room-2',
        title: 'Bóng đèn hỏng',
        description: 'Đèn không sáng',
      });
      // Không được gửi tenantId: "" — API sẽ hiểu sai là có tenant.
      expect(mockCreateRequest.mock.calls[0][0]).not.toHaveProperty(
        'tenantId',
      );
    });
  });

  // A3: resolve với chargeTo TENANT chỉ hợp lệ khi request CÓ tenant.
  // default của modal bây giờ là OWNER (an toàn cho phòng trống).
  describe('resolve modal', () => {
    it('defaults to OWNER and lets the user switch to TENANT when a tenant exists', async () => {
      mockFetchRequests.mockResolvedValue(requests);
      mockFetchRooms.mockResolvedValue(rooms);
      mockResolveRequest.mockResolvedValue(requests[2]);
      const user = userEvent.setup();
      renderPage();

      await screen.findByText('Bóng đèn hỏng');
      await user.click(screen.getByRole('button', { name: 'Hoàn thành' }));

      // Modal mặc định chọn OWNER.
      expect(screen.getByLabelText('Người chịu phí')).toHaveValue('OWNER');
      expect(screen.getByText(/khoản chi \(Expense\)/)).toBeInTheDocument();

      // Chuyển sang Khách thuê — request có tenant (Trần Thị B) nên hợp lệ.
      await user.selectOptions(screen.getByLabelText('Người chịu phí'), 'TENANT');
      expect(
        screen.getByText(/KHÔNG được cộng vào hóa đơn tháng/),
      ).toBeInTheDocument();

      await user.type(screen.getByLabelText('Chi phí thực tế (VNĐ)'), '450000');
      await user.click(
        screen.getByRole('button', { name: 'Xác nhận hoàn thành' }),
      );

      expect(mockResolveRequest).toHaveBeenCalledWith('req-2', {
        chargeTo: 'TENANT',
        estimatedCost: undefined,
        actualCost: 450000,
      });
    });

    it('disables chargeTo TENANT when the request has no tenant', async () => {
      mockFetchRequests.mockResolvedValue([...requests, vacantRequest]);
      mockFetchRooms.mockResolvedValue(rooms);
      mockResolveRequest.mockResolvedValue(vacantRequest);
      const user = userEvent.setup();
      renderPage();

      await screen.findByText('Sửa quạt trần');
      // 2 nút "Hoàn thành": một cho req-2 (IN_PROGRESS), một cho req-4.
      await user.click(screen.getAllByRole('button', { name: 'Hoàn thành' })[1]);

      // Select bị khóa -> không thể chọn TENANT; giá trị ép về OWNER.
      const select = screen.getByLabelText('Người chịu phí') as HTMLSelectElement;
      expect(select).toBeDisabled();
      expect(select.value).toBe('OWNER');
      expect(
        screen.getByText(/Phòng trống — không có khách thuê/),
      ).toBeInTheDocument();
    });
  });
});
