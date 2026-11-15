import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { resolveTelegramChatIdForGudang, resetTelegramGudangChatIdCache } from "./telegram-gudang";

describe("telegram gudang chat map", () => {
  const prev = process.env.TELEGRAM_GUDANG_CHAT_IDS;

  beforeEach(() => {
    process.env.TELEGRAM_GUDANG_CHAT_IDS = JSON.stringify({
      "Gudang Barata": "-5445085798",
      "Gudang Kijang": "-5368463791",
    });
    resetTelegramGudangChatIdCache();
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.TELEGRAM_GUDANG_CHAT_IDS;
    else process.env.TELEGRAM_GUDANG_CHAT_IDS = prev;
    resetTelegramGudangChatIdCache();
  });

  it("resolves known gudang label", () => {
    expect(resolveTelegramChatIdForGudang("Gudang Barata")).toBe("-5445085798");
  });

  it("returns null for unknown gudang", () => {
    expect(resolveTelegramChatIdForGudang("Gudang Tidak Ada")).toBeNull();
  });

  it("resolves Customer from TELEGRAM_CUSTOMER_CHAT_ID", () => {
    const prevCustomer = process.env.TELEGRAM_CUSTOMER_CHAT_ID;
    process.env.TELEGRAM_CUSTOMER_CHAT_ID = "-5495031107";
    resetTelegramGudangChatIdCache();
    expect(resolveTelegramChatIdForGudang("Customer")).toBe("-5495031107");
    if (prevCustomer === undefined) delete process.env.TELEGRAM_CUSTOMER_CHAT_ID;
    else process.env.TELEGRAM_CUSTOMER_CHAT_ID = prevCustomer;
    resetTelegramGudangChatIdCache();
  });

  it("resolves Customer from JSON map", () => {
    process.env.TELEGRAM_GUDANG_CHAT_IDS = JSON.stringify({
      Customer: "-5495031107",
    });
    resetTelegramGudangChatIdCache();
    expect(resolveTelegramChatIdForGudang("Customer")).toBe("-5495031107");
  });
});