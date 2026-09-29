import { describe, expect, it } from "vitest";
import { getApiErrorMessage } from "./errors";

// These are the exact body shapes the NestJS backend produces, so the test
// doubles double as documentation of the API's error contract.
describe("getApiErrorMessage", () => {
  it("reads a single NestJS exception message from response.data", () => {
    const error = {
      response: { data: { statusCode: 409, message: "Only DRAFT invoices can be issued." } },
      message: "Request failed with status code 409",
    };
    expect(getApiErrorMessage(error)).toBe("Only DRAFT invoices can be issued.");
  });

  it("joins ValidationPipe message arrays into one sentence", () => {
    const error = {
      response: { data: { message: ["month must not be greater than 12", "year must not be less than 2000"] } },
    };
    expect(getApiErrorMessage(error)).toBe(
      "month must not be greater than 12; year must not be less than 2000",
    );
  });

  it("stringifies a non-string message object", () => {
    const error = { response: { data: { message: { code: "OVER_LIMIT" } } } };
    expect(getApiErrorMessage(error)).toBe('{"code":"OVER_LIMIT"}');
  });

  it("falls back when the error has no response body", () => {
    expect(getApiErrorMessage(new Error("Network Error"))).toBe(
      "Có lỗi xảy ra. Vui lòng thử lại.",
    );
  });

  it("falls back for null, undefined and non-object errors", () => {
    expect(getApiErrorMessage(null)).toBe("Có lỗi xảy ra. Vui lòng thử lại.");
    expect(getApiErrorMessage(undefined)).toBe("Có lỗi xảy ra. Vui lòng thử lại.");
    expect(getApiErrorMessage("boom", "Không thể xóa phòng.")).toBe("Không thể xóa phòng.");
  });

  it("uses a custom fallback when the response has no usable message", () => {
    const error = { response: { data: {} } };
    expect(getApiErrorMessage(error, "Không thể xóa phòng.")).toBe("Không thể xóa phòng.");
  });

  it("ignores the generic Axios message when the body carries a real one", () => {
    const error = {
      message: "Request failed with status code 400",
      response: { data: { message: "Room not found." } },
    };
    expect(getApiErrorMessage(error)).not.toContain("Request failed");
  });
});
