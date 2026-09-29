import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import MeterReadingsPage from "./MeterReadingsPage";
import { fetchRooms } from "../api/room";
import { createMeterReading, fetchMeterReadings } from "../api/meter-reading";
import { setViewportWidth } from "../test/setup";

vi.mock("../api/room", () => ({ fetchRooms: vi.fn() }));
vi.mock("../api/meter-reading", () => ({
  fetchMeterReadings: vi.fn(),
  createMeterReading: vi.fn(),
}));

const roomA = { id: "room-a", code: "A101", status: "OCCUPIED" };
const roomB = { id: "room-b", code: "B202", status: "VACANT" };

const reading = (overrides: Partial<{ id: string; month: number; year: number; electricity: number; water: number; createdAt: string }> = {}) => ({
  id: "reading-1",
  roomId: roomA.id,
  month: 8,
  year: 2026,
  electricity: 150,
  water: 70,
  createdAt: "2026-08-31T00:00:00.000Z",
  updatedAt: "2026-08-31T00:00:00.000Z",
  ...overrides,
});

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>{<MeterReadingsPage /> as ReactNode}</QueryClientProvider>,
  );
}

async function selectRoomA() {
  const user = userEvent.setup();
  // Chờ danh sách phòng nạp xong trước khi chọn, nếu không <option> chưa tồn tại.
  await waitFor(() => expect(screen.getByRole("option", { name: /A101/ })).toBeInTheDocument());
  await user.selectOptions(screen.getByLabelText("Chọn phòng"), roomA.id);
  await waitFor(() => expect(fetchMeterReadings).toHaveBeenCalledWith({ roomId: roomA.id }));
}

// The cache-key test is the regression guard: invalidating
// ["meter-readings", selectedRoomId] instead of ["meter-readings"] looks
// correct until a reading is recorded for a room other than the one on screen.
describe("MeterReadingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setViewportWidth(1280);
    vi.mocked(fetchRooms).mockResolvedValue([roomA, roomB] as never);
    vi.mocked(fetchMeterReadings).mockResolvedValue([reading()] as never);
    vi.mocked(createMeterReading).mockResolvedValue(reading({ id: "reading-2" }) as never);
  });

  it("asks the user to pick a room before loading readings", () => {
    renderPage();
    expect(screen.getByText("Vui lòng chọn một phòng để xem chỉ số điện nước.")).toBeInTheDocument();
    expect(fetchMeterReadings).not.toHaveBeenCalled();
  });

  it("renders a table on desktop", async () => {
    renderPage();
    await selectRoomA();

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Điện (kWh)" })).toBeInTheDocument();
  });

  it("renders cards instead of a table on mobile", async () => {
    setViewportWidth(375);
    renderPage();
    await selectRoomA();

    expect(await screen.findByText("Kỳ 8/2026")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("invalidates every meter-readings cache entry after creating a reading for another room", async () => {
    const user = userEvent.setup();
    renderPage();
    await selectRoomA();

    await user.click(screen.getByRole("button", { name: "Ghi chỉ số mới" }));
    // Form cho phép chọn phòng khác với phòng đang xem. Mã phòng xuất hiện ở
    // cả select chính lẫn select trong modal nên phải giới hạn trong dialog.
    const dialog = await screen.findByRole("dialog");
    const roomSelectInModal = within(dialog).getByLabelText("Phòng") as HTMLSelectElement;
    await waitFor(() => expect(within(dialog).getByRole("option", { name: /B202/ })).toBeInTheDocument());
    await user.selectOptions(roomSelectInModal, roomB.id);
    await user.clear(screen.getByLabelText("Điện (kWh)"));
    await user.type(screen.getByLabelText("Điện (kWh)"), "200");
    await user.clear(screen.getByLabelText("Nước (m³)"));
    await user.type(screen.getByLabelText("Nước (m³)"), "90");
    await user.click(screen.getByRole("button", { name: "Ghi chỉ số" }));

    await waitFor(() =>
      expect(createMeterReading).toHaveBeenCalledWith({
        roomId: roomB.id,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        electricity: 200,
        water: 90,
      }),
    );
    // Danh sách của phòng đang xem phải refresh, kể cả khi ghi cho phòng khác.
    await waitFor(() =>
      expect(fetchMeterReadings).toHaveBeenCalledTimes(2),
    );
  });

  it("shows the API error message inside the modal when creating fails", async () => {
    vi.mocked(createMeterReading).mockRejectedValue({
      response: { data: { message: "A meter reading already exists for this room and period." } },
    } as never);

    const user = userEvent.setup();
    renderPage();
    await selectRoomA();

    await user.click(screen.getByRole("button", { name: "Ghi chỉ số mới" }));
    await user.clear(screen.getByLabelText("Điện (kWh)"));
    await user.type(screen.getByLabelText("Điện (kWh)"), "150");
    await user.clear(screen.getByLabelText("Nước (m³)"));
    await user.type(screen.getByLabelText("Nước (m³)"), "70");
    await user.click(screen.getByRole("button", { name: "Ghi chỉ số" }));

    expect(
      await screen.findByText("A meter reading already exists for this room and period."),
    ).toBeInTheDocument();
  });
});
