import axios, { AxiosError } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import api, {
  getAccessToken,
  registerAuthFailureHandler,
  setAccessToken,
} from "./api";

const originalAdapter = api.defaults.adapter;
let unregisterAuthFailureHandler = () => {};

const makeResponse = (config, status = 200, data = {}) => ({
  config,
  data,
  headers: {},
  status,
  statusText: status === 200 ? "OK" : "Unauthorized",
});

const unauthorized = (config) => {
  const response = makeResponse(config, 401);
  return new AxiosError(
    "Unauthorized",
    AxiosError.ERR_BAD_REQUEST,
    config,
    null,
    response,
  );
};

afterEach(() => {
  api.defaults.adapter = originalAdapter;
  setAccessToken(null);
  unregisterAuthFailureHandler();
  unregisterAuthFailureHandler = () => {};
  vi.restoreAllMocks();
});

describe("API authentication interceptors", () => {
  it("adds the current access token to protected requests", async () => {
    setAccessToken("current-token");
    const requestConfigs = [];
    api.defaults.adapter = async (config) => {
      requestConfigs.push(config);
      return makeResponse(config);
    };

    await api.get("/protected");

    expect(requestConfigs[0].headers.Authorization).toBe("Bearer current-token");
  });

  it("refreshes an expired token and retries the original request", async () => {
    setAccessToken("expired-token");
    const requestTokens = [];
    api.defaults.adapter = async (config) => {
      requestTokens.push(config.headers.Authorization);
      if (config.headers.Authorization === "Bearer expired-token") {
        throw unauthorized(config);
      }
      return makeResponse(config, 200, { ok: true });
    };
    vi.spyOn(axios, "post").mockResolvedValue({
      data: { data: { id: 1 }, accessToken: "fresh-token" },
    });

    const response = await api.get("/protected");

    expect(response.data).toEqual({ ok: true });
    expect(requestTokens).toEqual([
      "Bearer expired-token",
      "Bearer fresh-token",
    ]);
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe("fresh-token");
  });

  it("shares one refresh between concurrent unauthorized requests", async () => {
    setAccessToken("expired-token");
    const requestTokens = [];
    let resolveRefresh;
    const refreshResult = new Promise((resolve) => {
      resolveRefresh = resolve;
    });
    api.defaults.adapter = async (config) => {
      requestTokens.push(config.headers.Authorization);
      if (config.headers.Authorization === "Bearer expired-token") {
        throw unauthorized(config);
      }
      return makeResponse(config, 200, { url: config.url });
    };
    const refreshRequest = vi
      .spyOn(axios, "post")
      .mockReturnValue(refreshResult);

    const requests = Promise.all([
      api.get("/protected/one"),
      api.get("/protected/two"),
    ]);
    await vi.waitFor(() => expect(refreshRequest).toHaveBeenCalledTimes(1));
    resolveRefresh({ data: { data: { id: 1 }, accessToken: "fresh-token" } });
    const responses = await requests;

    expect(responses.map(({ data }) => data.url)).toEqual([
      "/protected/one",
      "/protected/two",
    ]);
    expect(requestTokens).toEqual([
      "Bearer expired-token",
      "Bearer expired-token",
      "Bearer fresh-token",
      "Bearer fresh-token",
    ]);
    expect(refreshRequest).toHaveBeenCalledTimes(1);
  });

  it("clears the token and authentication state when refresh fails", async () => {
    setAccessToken("expired-token");
    const onAuthFailure = vi.fn();
    unregisterAuthFailureHandler = registerAuthFailureHandler(onAuthFailure);
    const protectedRequests = [];
    api.defaults.adapter = async (config) => {
      protectedRequests.push(config);
      throw unauthorized(config);
    };
    const refreshRequest = vi.spyOn(axios, "post").mockRejectedValue(
      new AxiosError("Refresh failed", AxiosError.ERR_BAD_REQUEST),
    );

    await expect(api.get("/protected")).rejects.toThrow("Refresh failed");
    await expect(api.get("/protected")).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(protectedRequests).toHaveLength(2);
    expect(refreshRequest).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
  });

  it("does not refresh repeatedly when the retried request is unauthorized", async () => {
    setAccessToken("expired-token");
    let protectedRequestCount = 0;
    api.defaults.adapter = async (config) => {
      protectedRequestCount += 1;
      throw unauthorized(config);
    };
    const refreshRequest = vi.spyOn(axios, "post").mockResolvedValue({
      data: { data: { id: 1 }, accessToken: "fresh-token" },
    });

    await expect(api.get("/protected")).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(protectedRequestCount).toBe(2);
    expect(refreshRequest).toHaveBeenCalledTimes(1);
  });

  it.each(["/auth/login", "/auth/logout", "/auth/refresh"])(
    "does not refresh or add a bearer token for %s",
    async (url) => {
      setAccessToken("current-token");
      const requestConfigs = [];
      api.defaults.adapter = async (config) => {
        requestConfigs.push(config);
        throw unauthorized(config);
      };
      const refreshRequest = vi.spyOn(axios, "post");

      await expect(api.post(url)).rejects.toMatchObject({
        response: { status: 401 },
      });

      expect(refreshRequest).not.toHaveBeenCalled();
      expect(requestConfigs).toHaveLength(1);
      expect(requestConfigs[0].headers.Authorization).toBeUndefined();
    },
  );
});
