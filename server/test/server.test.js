import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { listen } = vi.hoisted(() => ({
  listen: vi.fn(),
}));

vi.mock("../src/app.js", () => ({
  default: { listen },
}));

describe("server", () => {
  beforeEach(() => {
    vi.resetModules();
    listen.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("listens on the configured port", async () => {
    vi.stubEnv("PORT", "4321");

    await import("../src/server.js");

    expect(listen).toHaveBeenCalledWith("4321", expect.any(Function));
  });

  it("uses port 5000 when PORT is not configured", async () => {
    vi.stubEnv("PORT", "");

    await import("../src/server.js");

    expect(listen).toHaveBeenCalledWith(5000, expect.any(Function));
  });
});
