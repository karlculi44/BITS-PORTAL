import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/services/auditLogService.js", () => ({
  requestAuditContext: () => ({ userId: "1", ipAddress: null }),
  withAuditTransaction: (_context, _action, _module, operation) => operation(),
}));

vi.mock("../../src/config/db.js", () => ({
  default: {
    query: vi.fn(),
  },
}));

import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../../src/app.js";
import pool from "../../src/config/db.js";
import {
  policyDocumentDirectory,
  removePolicyDocument,
} from "../../src/utils/policyDocument.js";

const accessSecret = "test-access-secret";

const staffWithoutAccess = {
  id: 1,
  role: "staff",
  is_active: true,
  can_access_services: false,
  can_access_policies: false,
  can_access_categories: false,
};
const validInput = {
  title: "Student Handbook",
  file: "https://example.com/handbook.pdf",
  category_id: 11,
};

const accessCookie = (role) => {
  const token = jwt.sign({ role }, accessSecret, { subject: "1" });
  return `accessToken=${token}`;
};

const uploadPolicy = (categoryId = 11, title = validInput.title) =>
  request(app)
    .post("/api/policies")
    .set("Cookie", accessCookie("admin"))
    .field("title", title)
    .field("category_id", String(categoryId))
    .attach("document", Buffer.from("%PDF-1.7\npolicy"), {
      filename: "policy.pdf",
      contentType: "application/pdf",
    });

describe("GET /api/policies", () => {
  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = accessSecret;
    pool.query.mockReset();
  });

  it("returns policies to authorized administrators", async () => {
    const policies = [
      {
        id: 5,
        category_id: 11,
        title: "Student Handbook",
        description: null,
        file: "https://example.com/handbook.pdf",
      },
    ];
    pool.query.mockResolvedValueOnce({ rows: policies });

    const result = await request(app)
      .get("/api/policies")
      .set("Cookie", accessCookie("admin"));

    expect(result.status).toBe(200);
    expect(result.body).toEqual(policies);
    expect(pool.query).toHaveBeenCalledOnce();
    expect(pool.query.mock.calls[0][0]).toContain("FROM policies");
  });

  it("returns an empty array when there are no policies", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .get("/api/policies")
      .set("Cookie", accessCookie("admin"));

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("uses the existing error response for database failures", async () => {
    pool.query.mockRejectedValueOnce(new Error("Database unavailable"));

    const response = await request(app)
      .get("/api/policies")
      .set("Cookie", accessCookie("admin"));

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Internal Server Error");
  });

  it("requires policy access to list policies", async () => {
    const response = await request(app).get("/api/policies");
    expect(response.status).toBe(401);
    expect(pool.query).not.toHaveBeenCalled();
  });
});

describe("GET /api/policies/:id/document", () => {
  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = accessSecret;
    pool.query.mockReset();
  });

  it("serves a managed policy PDF inline to authorized administrators", async () => {
    const filename = `${randomUUID()}.pdf`;
    await mkdir(policyDocumentDirectory, { recursive: true });
    await writeFile(
      path.join(policyDocumentDirectory, filename),
      Buffer.from("%PDF-1.7\nmanaged policy"),
    );
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 5, file: filename }],
    });

    try {
      const response = await request(app)
        .get("/api/policies/5/document")
        .set("Cookie", accessCookie("admin"));

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/^application\/pdf/);
      expect(response.headers["content-disposition"]).toBe("inline");
      expect(response.body.toString("utf8")).toContain("%PDF-1.7");
      expect(pool.query.mock.calls[0][1]).toEqual(["5"]);
    } finally {
      await removePolicyDocument(filename);
    }
  });

  it("does not serve paths that are not managed PDF filenames", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 5, file: "../../private.pdf" }],
    });

    const response = await request(app)
      .get("/api/policies/5/document")
      .set("Cookie", accessCookie("admin"));

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Policy document not found");
  });

  it("requires policy access to retrieve a document", async () => {
    const unauthenticated = await request(app).get(
      "/api/policies/5/document",
    );
    pool.query.mockResolvedValueOnce({ rows: [staffWithoutAccess] });
    const unauthorized = await request(app)
      .get("/api/policies/5/document")
      .set("Cookie", accessCookie("staff"));

    expect(unauthenticated.status).toBe(401);
    expect(unauthorized.status).toBe(403);
    expect(pool.query).toHaveBeenCalledOnce();
  });
});

describe("POST /api/policies", () => {
  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = accessSecret;
    pool.query.mockReset();
  });

  it("creates a policy and permits an omitted nullable description", async () => {
    const policy = {
      id: 5,
      title: validInput.title,
      category_id: validInput.category_id,
      description: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 11, type: "policy" }] })
      .mockImplementationOnce((_query, values) =>
        Promise.resolve({ rows: [{ ...policy, file: values[2] }] }),
      );

    const response = await uploadPolicy();
    const uploadedFile = pool.query.mock.calls[1][1][2];

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      message: "Policy created successfully",
      data: { ...policy, file: uploadedFile },
    });
    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(pool.query.mock.calls[0][1]).toEqual([11]);
    expect(pool.query.mock.calls[1][0]).toContain(
      "INSERT INTO policies (title, description, file, category_id)",
    );
    expect(pool.query.mock.calls[1][1]).toEqual([
      validInput.title,
      null,
      uploadedFile,
      validInput.category_id,
    ]);
    expect(uploadedFile).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    await removePolicyDocument(uploadedFile);
  });

  it.each([
    [{ file: validInput.file, category_id: 11 }, "missing title"],
    [{ title: validInput.title, category_id: 11 }, "missing file"],
    [{ title: validInput.title, file: validInput.file }, "missing category ID"],
    [{ ...validInput, title: "" }, "empty title"],
    [{ ...validInput, title: 5 }, "invalid title type"],
    [{ ...validInput, file: "" }, "empty file"],
    [{ ...validInput, file: 5 }, "invalid file type"],
    [{ ...validInput, description: 5 }, "invalid description type"],
    [{ ...validInput, category_id: "11" }, "invalid category ID type"],
    [{ ...validInput, category_id: 0 }, "nonpositive category ID"],
    [{ ...validInput, category_id: 1.5 }, "fractional category ID"],
  ])("rejects %s", async (body) => {
    const response = await request(app)
      .post("/api/policies")
      .set("Cookie", accessCookie("admin"))
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("rejects non-PDF content and uploads without a PDF signature", async () => {
    const wrongMime = await request(app)
      .post("/api/policies")
      .set("Cookie", accessCookie("admin"))
      .field("title", validInput.title)
      .field("category_id", String(validInput.category_id))
      .attach("document", Buffer.from("not pdf"), {
        filename: "policy.txt",
        contentType: "text/plain",
      });
    const invalidPdf = await request(app)
      .post("/api/policies")
      .set("Cookie", accessCookie("admin"))
      .field("title", validInput.title)
      .field("category_id", String(validInput.category_id))
      .attach("document", Buffer.from("not a PDF"), {
        filename: "policy.pdf",
        contentType: "application/pdf",
      });

    expect(wrongMime.status).toBe(400);
    expect(invalidPdf.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("rejects missing categories and categories with service type", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 10, type: "service" }] });

    const missingCategory = await uploadPolicy(99);
    expect(missingCategory.status).toBe(404);
    expect(missingCategory.body.message).toBe("Category not found");
    expect(pool.query).toHaveBeenCalledTimes(1);

    pool.query.mockReset();
    pool.query.mockResolvedValueOnce({ rows: [{ id: 10, type: "service" }] });
    const serviceCategory = await uploadPolicy(10);

    expect(serviceCategory.status).toBe(400);
    expect(serviceCategory.body.message).toBe(
      "Category must be a policy category",
    );
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it("maps category foreign-key races to not found", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 11, type: "policy" }] })
      .mockRejectedValueOnce({ code: "23503" });

    const response = await uploadPolicy();

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Category not found");
  });

  it("does not allow public or staff requests to create policies", async () => {
    const unauthenticated = await request(app)
      .post("/api/policies")
      .send(validInput);
    pool.query.mockResolvedValueOnce({ rows: [staffWithoutAccess] });
    const staff = await request(app)
      .post("/api/policies")
      .set("Cookie", accessCookie("staff"))
      .send(validInput);

    expect(unauthenticated.status).toBe(401);
    expect(staff.status).toBe(403);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});

describe("PATCH /api/policies/:id", () => {
  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = accessSecret;
    pool.query.mockReset();
  });

  it("updates only supplied fields and returns the policy", async () => {
    const policy = {
      id: 5,
      category_id: 11,
      title: "Updated Handbook",
      description: "Guidelines for students",
      file: "https://example.com/handbook.pdf",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-02-01T00:00:00.000Z",
    };
    pool.query.mockResolvedValueOnce({ rows: [policy] });

    const response = await request(app)
      .patch("/api/policies/5")
      .set("Cookie", accessCookie("admin"))
      .send({ title: "Updated Handbook" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Policy updated successfully",
      data: policy,
    });
    const [query, values] = pool.query.mock.calls[0];
    expect(query).toContain("SET title = $1, updated_at = CURRENT_TIMESTAMP");
    expect(query).not.toContain("description =");
    expect(query).not.toContain("file =");
    expect(query).not.toContain("category_id =");
    expect(values).toEqual(["Updated Handbook", "5"]);
  });

  it("allows clearing the nullable description", async () => {
    const policy = { id: 5, description: null };
    pool.query.mockResolvedValueOnce({ rows: [policy] });

    const response = await request(app)
      .patch("/api/policies/5")
      .set("Cookie", accessCookie("admin"))
      .send({ description: null });

    expect(response.status).toBe(200);
    expect(pool.query.mock.calls[0][0]).toContain("description = $1");
    expect(pool.query.mock.calls[0][1]).toEqual([null, "5"]);
  });

  it("validates a replacement category before updating", async () => {
    const policy = { id: 5, category_id: 12 };
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 12, type: "policy" }] })
      .mockResolvedValueOnce({ rows: [policy] });

    const response = await request(app)
      .patch("/api/policies/5")
      .set("Cookie", accessCookie("admin"))
      .send({ category_id: 12 });

    expect(response.status).toBe(200);
    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(pool.query.mock.calls[1][0]).toContain("type = 'policy'");
    expect(pool.query.mock.calls[1][0]).toContain("FOR SHARE");
    expect(pool.query.mock.calls[1][1]).toEqual([12, "5"]);
  });

  it("rejects nonexistent and service categories", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 10, type: "service" }] });

    const missingCategory = await request(app)
      .patch("/api/policies/5")
      .set("Cookie", accessCookie("admin"))
      .send({ category_id: 12 });
    expect(missingCategory.status).toBe(404);
    expect(missingCategory.body.message).toBe("Category not found");
    expect(pool.query).toHaveBeenCalledTimes(1);

    pool.query.mockReset();
    pool.query.mockResolvedValueOnce({ rows: [{ id: 10, type: "service" }] });
    const serviceCategory = await request(app)
      .patch("/api/policies/5")
      .set("Cookie", accessCookie("admin"))
      .send({ category_id: 10 });
    expect(serviceCategory.status).toBe(400);
    expect(serviceCategory.body.message).toBe(
      "Category must be a policy category",
    );
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it("returns 404 for a policy that does not exist", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .patch("/api/policies/99")
      .set("Cookie", accessCookie("admin"))
      .send({ title: "Updated Handbook" });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Policy not found");
  });

  it("maps a category foreign-key race to not found", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 12, type: "policy" }] })
      .mockRejectedValueOnce({ code: "23503" });

    const response = await request(app)
      .patch("/api/policies/5")
      .set("Cookie", accessCookie("admin"))
      .send({ category_id: 12 });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Category not found");
  });

  it("rejects invalid IDs and invalid or empty updates", async () => {
    for (const id of ["invalid", "0", "2147483648"]) {
      const response = await request(app)
        .patch(`/api/policies/${id}`)
        .set("Cookie", accessCookie("admin"))
        .send({ title: "Updated Handbook" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid policy ID");
    }

    for (const body of [
      {},
      { title: "" },
      { title: 5 },
      { file: "" },
      { file: 5 },
      { description: 5 },
      { category_id: 0 },
      { category_id: 1.5 },
      { category_id: "11" },
      { unknown: "field" },
    ]) {
      const response = await request(app)
        .patch("/api/policies/5")
        .set("Cookie", accessCookie("admin"))
        .send(body);

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    }

    expect(pool.query).not.toHaveBeenCalled();
  });

  it("requires authentication and admin authorization", async () => {
    const unauthenticated = await request(app)
      .patch("/api/policies/5")
      .send({ title: "Updated Handbook" });
    pool.query.mockResolvedValueOnce({ rows: [staffWithoutAccess] });
    const staff = await request(app)
      .patch("/api/policies/5")
      .set("Cookie", accessCookie("staff"))
      .send({ title: "Updated Handbook" });

    expect(unauthenticated.status).toBe(401);
    expect(staff.status).toBe(403);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});

describe("DELETE /api/policies/:id", () => {
  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = accessSecret;
    pool.query.mockReset();
  });

  it("deletes a policy and returns the deleted record", async () => {
    const policy = {
      id: 5,
      category_id: 11,
      title: "Student Handbook",
      description: null,
      file: "https://example.com/handbook.pdf",
    };
    pool.query.mockResolvedValueOnce({ rows: [policy] });

    const response = await request(app)
      .delete("/api/policies/5")
      .set("Cookie", accessCookie("admin"));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Policy deleted successfully",
      data: policy,
    });
    expect(pool.query.mock.calls[0][0]).toContain("DELETE FROM policies");
    expect(pool.query.mock.calls[0][1]).toEqual(["5"]);
  });

  it("returns 404 when the policy does not exist", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .delete("/api/policies/99")
      .set("Cookie", accessCookie("admin"));

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Policy not found");
  });

  it.each(["invalid", "0", "2147483648"])(
    "rejects invalid policy ID %s",
    async (id) => {
      const response = await request(app)
        .delete(`/api/policies/${id}`)
        .set("Cookie", accessCookie("admin"));

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid policy ID");
      expect(pool.query).not.toHaveBeenCalled();
    },
  );

  it("requires authentication and admin authorization", async () => {
    const unauthenticated = await request(app).delete("/api/policies/5");
    pool.query.mockResolvedValueOnce({ rows: [staffWithoutAccess] });
    const staff = await request(app)
      .delete("/api/policies/5")
      .set("Cookie", accessCookie("staff"));

    expect(unauthenticated.status).toBe(401);
    expect(staff.status).toBe(403);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it("uses the existing error response for database failures", async () => {
    pool.query.mockRejectedValueOnce(new Error("Database unavailable"));

    const response = await request(app)
      .delete("/api/policies/5")
      .set("Cookie", accessCookie("admin"));

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Internal Server Error");
  });
});
