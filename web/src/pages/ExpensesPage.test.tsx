import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import ExpensesPage from './ExpensesPage';
import { createExpense, fetchExpenses, type Expense } from '../api/expense';
import { fetchBoardingHouses, type BoardingHouse } from '../api/boarding-house';

vi.mock('../api/expense', () => ({
  fetchExpenses: vi.fn(),
  createExpense: vi.fn(),
}));

vi.mock('../api/boarding-house', () => ({
  fetchBoardingHouses: vi.fn(),
}));

const mockFetchExpenses = vi.mocked(fetchExpenses);
const mockCreateExpense = vi.mocked(createExpense);
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

const expenses: Expense[] = [
  {
    id: 'exp-1',
    boardingHouseId: 'house-1',
    maintenanceRequestId: null,
    category: 'UTILITIES',
    title: 'Tiền điện khu vực chung',
    description: 'Điện hành lang tháng 1',
    amount: 500000,
    spentAt: '2026-01-10T00:00:00.000Z',
    createdAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-01-10T00:00:00.000Z',
    boardingHouse: { id: 'house-1', name: 'Nhà trọ Minh Khai' },
  },
  {
    id: 'exp-2',
    boardingHouseId: 'house-2',
    maintenanceRequestId: null,
    category: 'MAINTENANCE',
    title: 'Sửa máy bơm nước',
    description: 'Thay máy bơm tầng trệt',
    amount: 1200000,
    spentAt: '2026-01-12T00:00:00.000Z',
    createdAt: '2026-01-12T00:00:00.000Z',
    updatedAt: '2026-01-12T00:00:00.000Z',
    boardingHouse: { id: 'house-2', name: 'Nhà trọ Nguyễn Văn Cừ' },
  },
  {
    id: 'exp-3',
    boardingHouseId: 'house-1',
    maintenanceRequestId: null,
    category: 'OTHER',
    title: 'Mua dụng cụ vệ sinh',
    description: 'Chổi, xà phòng',
    amount: 200000,
    spentAt: '2026-01-14T00:00:00.000Z',
    createdAt: '2026-01-14T00:00:00.000Z',
    updatedAt: '2026-01-14T00:00:00.000Z',
    boardingHouse: { id: 'house-1', name: 'Nhà trọ Minh Khai' },
  },
];

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ExpensesPage />
    </QueryClientProvider>,
  );
}

describe('ExpensesPage', () => {
  it('renders all expenses when there is no search term', async () => {
    mockFetchExpenses.mockResolvedValue(expenses);
    mockFetchHouses.mockResolvedValue(houses);
    renderPage();

    expect(await screen.findByText('Tiền điện khu vực chung')).toBeInTheDocument();
    expect(screen.getByText('Sửa máy bơm nước')).toBeInTheDocument();
    expect(screen.getByText('Mua dụng cụ vệ sinh')).toBeInTheDocument();
  });

  it('filters expenses by title', async () => {
    mockFetchExpenses.mockResolvedValue(expenses);
    mockFetchHouses.mockResolvedValue(houses);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Tiền điện khu vực chung');

    await user.type(
      screen.getByPlaceholderText('Tìm tiêu đề, cơ sở, loại chi...'),
      'máy bơm',
    );

    expect(screen.getByText('Sửa máy bơm nước')).toBeInTheDocument();
    expect(screen.queryByText('Tiền điện khu vực chung')).not.toBeInTheDocument();
    expect(screen.queryByText('Mua dụng cụ vệ sinh')).not.toBeInTheDocument();
  });

  it('filters expenses by boarding house name', async () => {
    mockFetchExpenses.mockResolvedValue(expenses);
    mockFetchHouses.mockResolvedValue(houses);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Tiền điện khu vực chung');

    await user.type(
      screen.getByPlaceholderText('Tìm tiêu đề, cơ sở, loại chi...'),
      'Minh Khai',
    );

    expect(screen.getByText('Tiền điện khu vực chung')).toBeInTheDocument();
    expect(screen.getByText('Mua dụng cụ vệ sinh')).toBeInTheDocument();
    expect(screen.queryByText('Sửa máy bơm nước')).not.toBeInTheDocument();
  });

  it('filters expenses by category label', async () => {
    mockFetchExpenses.mockResolvedValue(expenses);
    mockFetchHouses.mockResolvedValue(houses);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Tiền điện khu vực chung');

    await user.type(
      screen.getByPlaceholderText('Tìm tiêu đề, cơ sở, loại chi...'),
      'Sửa chữa',
    );

    expect(screen.getByText('Sửa máy bơm nước')).toBeInTheDocument();
    expect(screen.queryByText('Tiền điện khu vực chung')).not.toBeInTheDocument();
    expect(screen.queryByText('Mua dụng cụ vệ sinh')).not.toBeInTheDocument();
  });

  it('shows an empty result message when no expense matches the search', async () => {
    mockFetchExpenses.mockResolvedValue(expenses);
    mockFetchHouses.mockResolvedValue(houses);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Tiền điện khu vực chung');

    await user.type(
      screen.getByPlaceholderText('Tìm tiêu đề, cơ sở, loại chi...'),
      'Không tồn tại',
    );

    expect(screen.getByText('Không tìm thấy khoản chi nào.')).toBeInTheDocument();
    expect(screen.queryByText('Tiền điện khu vực chung')).not.toBeInTheDocument();
  });

  it('converts the MoneyInput amount to an integer in the create payload', async () => {
    mockFetchExpenses.mockResolvedValue([]);
    mockFetchHouses.mockResolvedValue(houses);
    mockCreateExpense.mockResolvedValue(expenses[0]);
    const user = userEvent.setup();
    renderPage();

    // Chờ danh sách rỗng render (empty state hiển thị).
    expect(await screen.findByText('Chưa có khoản chi nào. Hãy thêm khoản chi đầu tiên!')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Thêm chi phí' }));

    await user.selectOptions(screen.getByLabelText('Cơ sở'), 'house-1');
    await user.type(screen.getByPlaceholderText('Ví dụ: Tiền điện khu vực chung'), 'Tiền điện tháng 2');
    await user.type(screen.getByPlaceholderText('150000'), '1500000');

    await user.click(screen.getByRole('button', { name: 'Tạo khoản chi' }));

    // TanStack Query v5 gọi mutationFn với (variables, context); ta chỉ quan tâm payload đầu tiên.
    expect(mockCreateExpense).toHaveBeenCalledTimes(1);
    const payload = mockCreateExpense.mock.calls[0][0] as {
      boardingHouseId: string;
      title: string;
      amount: number;
    };
    expect(payload).toMatchObject({
      boardingHouseId: 'house-1',
      title: 'Tiền điện tháng 2',
      amount: 1500000,
    });
    // Không gửi formatted string có dấu chấm.
    expect(payload.amount).toBe(1500000);
    expect(payload.amount).not.toBe('1.500.000');
  });
});
