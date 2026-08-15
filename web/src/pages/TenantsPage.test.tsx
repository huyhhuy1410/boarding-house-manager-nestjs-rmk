import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import TenantsPage from './TenantsPage';
import { setViewportWidth } from '../test/setup';
import {
  fetchTenants,
  type Tenant,
} from '../api/tenant';

vi.mock('../api/tenant', () => ({
  fetchTenants: vi.fn(),
  createTenant: vi.fn(),
  updateTenant: vi.fn(),
  deleteTenant: vi.fn(),
}));

const mockFetch = vi.mocked(fetchTenants);

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

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TenantsPage />
    </QueryClientProvider>,
  );
}

describe('TenantsPage', () => {
  it('renders all tenants when there is no search term', async () => {
    mockFetch.mockResolvedValue(tenants);
    renderPage();

    expect(await screen.findByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.getByText('Trần Thị Bình')).toBeInTheDocument();
    expect(screen.getByText('Lê Văn Cường')).toBeInTheDocument();
  });

  it('filters tenants by name', async () => {
    mockFetch.mockResolvedValue(tenants);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nguyễn Văn An');

    await user.type(
      screen.getByPlaceholderText('Tìm tên, số điện thoại, CCCD...'),
      'Bình',
    );

    expect(screen.getByText('Trần Thị Bình')).toBeInTheDocument();
    expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument();
    expect(screen.queryByText('Lê Văn Cường')).not.toBeInTheDocument();
  });

  it('filters tenants by phone number', async () => {
    mockFetch.mockResolvedValue(tenants);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nguyễn Văn An');

    await user.type(
      screen.getByPlaceholderText('Tìm tên, số điện thoại, CCCD...'),
      '0912345678',
    );

    expect(screen.getByText('Trần Thị Bình')).toBeInTheDocument();
    expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument();
    expect(screen.queryByText('Lê Văn Cường')).not.toBeInTheDocument();
  });

  it('filters tenants by identity number', async () => {
    mockFetch.mockResolvedValue(tenants);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nguyễn Văn An');

    await user.type(
      screen.getByPlaceholderText('Tìm tên, số điện thoại, CCCD...'),
      '080987654321',
    );

    expect(screen.getByText('Trần Thị Bình')).toBeInTheDocument();
    expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument();
    expect(screen.queryByText('Lê Văn Cường')).not.toBeInTheDocument();
  });

  it('shows an empty result message when no tenant matches the search', async () => {
    mockFetch.mockResolvedValue(tenants);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nguyễn Văn An');

    await user.type(
      screen.getByPlaceholderText('Tìm tên, số điện thoại, CCCD...'),
      'Không tồn tại',
    );

    expect(screen.getByText('Không tìm thấy khách thuê nào.')).toBeInTheDocument();
    expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument();
  });

  it('restores all tenants after clearing the search term', async () => {
    mockFetch.mockResolvedValue(tenants);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Nguyễn Văn An');

    const search = screen.getByPlaceholderText('Tìm tên, số điện thoại, CCCD...');
    await user.type(search, 'Bình');
    expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument();

    await user.clear(search);

    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.getByText('Trần Thị Bình')).toBeInTheDocument();
    expect(screen.getByText('Lê Văn Cường')).toBeInTheDocument();
  });

  it('renders card list instead of table on mobile viewport', async () => {
    setViewportWidth(375);
    mockFetch.mockResolvedValue(tenants);
    renderPage();

    await screen.findByText('Nguyễn Văn An');

    // Card view dùng <article>, không render bảng <table>.
    expect(screen.getAllByRole('article').length).toBeGreaterThan(0);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    // Các field chính vẫn hiện trong card (không mất tính năng trên mobile).
    expect(screen.getAllByText('Số điện thoại:').length).toBe(tenants.length);
    expect(screen.getAllByText('CCCD / CMND:').length).toBe(tenants.length);
  });
});
