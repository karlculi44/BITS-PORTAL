import { afterEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import verifyToken from "../../src/middlewares/verifyToken.js";

const accessSecret = "test-access-secret";

const createResponse = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
});

describe("verifyToken middleware", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects requests without an access token", async () => {
    const req = { cookies: {} };
    const res = createResponse();
    const next = vi.fn();

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Access denied. No token provided.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid", "not-a-valid-token"],
    [
      "expired",
      jwt.sign({ role: "admin" }, accessSecret, {
        subject: "1",
        expiresIn: -1,
      }),
    ],
  ])("rejects an %s access token", async (_case, accessToken) => {
    vi.stubEnv("JWT_ACCESS_SECRET", accessSecret);
    const req = { cookies: { accessToken } };
    const res = createResponse();
    const next = vi.fn();

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid or expired token.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches the verified claims and continues", async () => {
    vi.stubEnv("JWT_ACCESS_SECRET", accessSecret);
    const claims = { role: "admin" };
    const accessToken = jwt.sign(claims, accessSecret, { subject: "1" });
    const req = { cookies: { accessToken } };
    const res = createResponse();
    const next = vi.fn();

    await verifyToken(req, res, next);

    expect(req.user).toMatchObject({ ...claims, sub: "1" });
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
