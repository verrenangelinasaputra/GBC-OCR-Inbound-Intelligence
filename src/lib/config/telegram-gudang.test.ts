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
});