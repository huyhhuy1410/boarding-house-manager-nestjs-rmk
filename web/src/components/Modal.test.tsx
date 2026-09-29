import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Modal } from "./Modal";

function Harness({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Ghi chỉ số mới" onClose={onClose}>
      <label htmlFor="note">Ghi chú</label>
      <input id="note" />
      <button type="button">Lưu</button>
    </Modal>
  );
}

// Each test here covers one clause of the keyboard contract documented on
// Modal, so removing any of the behaviour has a test that fails by name.
describe("Modal", () => {
  it("exposes dialog semantics and the title as its accessible name", () => {
    render(<Harness onClose={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Ghi chỉ số mới");
  });

  it("moves focus to the first input inside the modal body on open", () => {
    render(<Harness onClose={() => {}} />);
    // Bỏ qua nút "Đóng" ở header: focus vào ô nhập đầu tiên trong form.
    expect(document.activeElement).toBe(screen.getByLabelText("Ghi chú"));
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when the pointer is released on the overlay", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<Harness onClose={onClose} />);

    const overlay = container.firstElementChild as HTMLElement;
    // user.pointer({ keys: "[MouseLeft>]" }) bắn pointerdown trên overlay.
    await user.pointer({ target: overlay, keys: "[MouseLeft>]" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close on a pointer interaction that starts inside the panel", () => {
    const onClose = vi.fn();
    const { container } = render(<Harness onClose={onClose} />);

    const overlay = container.firstElementChild as HTMLElement;
    const panel = overlay.firstElementChild as HTMLElement;
    fireEvent.pointerDown(panel);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not close when the interaction starts inside the panel", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Lưu" }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps Tab inside the modal", async () => {
    const user = userEvent.setup();
    render(<Harness onClose={() => {}} />);

    const closeButton = screen.getByRole("button", { name: "Đóng" });
    closeButton.focus();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByLabelText("Ghi chú"));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Lưu" }));
    // Tab ở phần tử cuối quay về đầu, không thoát ra ngoài modal.
    await user.tab();
    expect(document.activeElement).toBe(closeButton);
  });

  it("returns focus to the element that opened it after unmount", async () => {
    function Wrapper() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Mở modal
          </button>
          {open && <Harness onClose={() => setOpen(false)} />}
        </>
      );
    }

    const user = userEvent.setup();
    render(<Wrapper />);
    const opener = screen.getByRole("button", { name: "Mở modal" });

    await user.click(opener);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(opener);
  });
});
