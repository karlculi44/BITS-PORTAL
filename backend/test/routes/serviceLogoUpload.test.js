import { randomUUID } from "node:crypto";
import { access, mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
import { serviceLogoDirectory } from "../../src/utils/serviceLogo.js";

const accessCookie = (role) => {
  const token = jwt.sign(
    { role },
    "test-access-secret",
    { subject: "1" },
  );
  return `accessToken=${token}`;
};

const pngImage = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]);

const imageFileExists = async (filename) => {
  try {
    await access(path.join(serviceLogoDirectory, filename));
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
};

const listLogos = async () => {
  try {
    return await readdir(serviceLogoDirectory);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
};

const uploadService = (file, filename, contentType) =>
  request(app)
    .post("/api/services")
    .set("Cookie", accessCookie("admin"))
    .field("title", "Transcript Request")
    .field("url", "https://example.com/transcript")
    .field("description", "Request an official transcript")
    .field("category_id", "3")
    .attach("image", file, { filename, contentType });

let existingLogos;

describe("service logo uploads", () => {
  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = "test-access-secret";
    pool.query.mockReset();
  });

  afterEach(async () => {
    const logos = await listLogos();
    for (const filename of logos) {
      if (!existingLogos.has(filename)) {
        await unlink(path.join(serviceLogoDirectory, filename));
      }
    }
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    await mkdir(serviceLogoDirectory, { recursive: true });
    existingLogos = new Set(await listLogos());
  });

  it("stores PNG uploads by generated filename and serves them as images", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 3, type: "service" }] })
      .mockImplementationOnce((query, values) => ({
        rows: [
          {
            id: 9,
            title: values[0],
            url: values[1],
            image: values[2],
            description: values[3],
            category_id: 3,
          },
        ],
      }));

    const response = await uploadService(pngImage, "logo.png", "image/png");

    expect(response.status).toBe(201);
    expect(response.body.data.image).toMatch(
      /^\/api\/services\/images\/[0-9a-f-]+\.png$/i,
    );
    const filename = response.body.data.image.split("/").at(-1);
    expect(await imageFileExists(filename)).toBe(true);

    const imageResponse = await request(app).get(response.body.data.image);
    expect(imageResponse.status).toBe(200);
    expect(imageResponse.headers["content-type"]).toMatch(/^image\/png/);
    expect(imageResponse.body).toEqual(pngImage);

    pool.query.mockResolvedValueOnce({
      rows: [{ id: 9, image: filename }],
    });

    const servicesResponse = await request(app).get("/api/services");
    expect(servicesResponse.body[0].image).toBe(response.body.data.image);
  });

  it("persists and retrieves the shared default marker without storing an image", async () => {
    let storedImage;
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 3, type: "service" }] })
      .mockImplementationOnce((query, values) => {
        storedImage = values[2];
        return { rows: [{ id: 9, title: values[0], image: storedImage }] };
      });

    const response = await request(app)
      .post("/api/services")
      .set("Cookie", accessCookie("admin"))
      .field("title", "Transcript Request")
      .field("url", "https://example.com/transcript")
      .field("description", "Request an official transcript")
      .field("category_id", "3");

    expect(response.status).toBe(201);
    expect(storedImage).toBe("bits-default");
    expect(response.body.data.image).toBe(storedImage);
    expect(await listLogos()).toEqual([...existingLogos]);

    pool.query.mockResolvedValueOnce({ rows: [{ id: 9, image: storedImage }] });
    const servicesResponse = await request(app).get("/api/services");
    expect(servicesResponse.body[0].image).toBe(storedImage);
  });

  it.each([
    [
      "JPG",
      "logo.jpg",
      "image/jpeg",
      Buffer.from([0xff, 0xd8, 0xff, 0x00]),
      ".jpg",
    ],
    [
      "JPEG",
      "logo.jpeg",
      "image/jpeg",
      Buffer.from([0xff, 0xd8, 0xff, 0x00]),
      ".jpeg",
    ],
    [
      "WebP",
      "logo.webp",
      "image/webp",
      Buffer.from("RIFF\x04\x00\x00\x00WEBP"),
      ".webp",
    ],
  ])("accepts %s uploads", async (label, originalName, contentType, image, extension) => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 3, type: "service" }] })
      .mockImplementationOnce((query, values) => ({
        rows: [
          {
            id: 9,
            title: values[0],
            url: values[1],
            image: values[2],
            description: values[3],
            category_id: 3,
          },
        ],
      }));

    const response = await uploadService(image, originalName, contentType);

    expect(response.status).toBe(201);
    expect(response.body.data.image).toMatch(
      new RegExp(`^/api/services/images/[0-9a-f-]+\\${extension}$`, "i"),
    );
  });

  it("rejects unsupported formats and spoofed image content", async () => {
    const unsupported = await request(app)
      .post("/api/services")
      .set("Cookie", accessCookie("admin"))
      .attach("image", Buffer.from("not an image"), {
        filename: "logo.gif",
        contentType: "image/gif",
      });

    expect(unsupported.status).toBe(400);
    expect(unsupported.body.message).toMatch(/PNG, JPG, JPEG, and WebP/);

    const spoofed = await uploadService(
      Buffer.from("not a PNG"),
      "logo.png",
      "image/png",
    );
    expect(spoofed.status).toBe(400);
    expect(spoofed.body.message).toMatch(/does not contain a valid/);
    expect(pool.query).not.toHaveBeenCalled();
    expect(await listLogos()).toEqual([...existingLogos]);
  });

  it("rejects uploads larger than 2 MB", async () => {
    const response = await uploadService(
      Buffer.alloc(2 * 1024 * 1024 + 1, 0),
      "large.png",
      "image/png",
    );

    expect(response.status).toBe(413);
    expect(response.body.message).toBe(
      "Service logos must be 2 MB or smaller.",
    );
    expect(pool.query).not.toHaveBeenCalled();
    expect(await listLogos()).toEqual([...existingLogos]);
  });

  it("does not store uploads for unauthorized users", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          role: "staff",
          is_active: true,
          can_access_services: false,
        },
      ],
    });
    const response = await request(app)
      .post("/api/services")
      .set("Cookie", accessCookie("staff"))
      .attach("image", pngImage, {
        filename: "logo.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(403);
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(await listLogos()).toEqual([...existingLogos]);
  });

  it("removes a newly uploaded logo when the database update fails", async () => {
    let uploadedFilename;
    pool.query.mockImplementationOnce((query, values) => {
      uploadedFilename = values[1];
      return Promise.reject(new Error("database unavailable"));
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await request(app)
      .patch("/api/services/9")
      .set("Cookie", accessCookie("admin"))
      .field("title", "Updated transcript")
      .attach("image", pngImage, {
        filename: "failed-update.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(500);
    expect(await imageFileExists(uploadedFilename)).toBe(false);
  });

  it("removes uploaded files when validation or database insertion fails", async () => {
    const invalid = await request(app)
      .post("/api/services")
      .set("Cookie", accessCookie("admin"))
      .field("title", "")
      .field("url", "https://example.com/transcript")
      .field("description", "A transcript")
      .field("category_id", "3")
      .attach("image", pngImage, {
        filename: "invalid.png",
        contentType: "image/png",
      });
    expect(invalid.status).toBe(400);
    expect(await listLogos()).toEqual([...existingLogos]);

    let uploadedFilename;
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 3, type: "service" }] })
      .mockImplementationOnce((query, values) => {
        uploadedFilename = values[2];
        return Promise.reject(new Error("database unavailable"));
      });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const failedInsert = await uploadService(
      pngImage,
      "failed.png",
      "image/png",
    );

    expect(failedInsert.status).toBe(500);
    expect(await imageFileExists(uploadedFilename)).toBe(false);
  });

  it("preserves an existing logo when an edit does not include a replacement", async () => {
    const existingLogo = `${randomUUID()}.png`;
    await writeFile(path.join(serviceLogoDirectory, existingLogo), pngImage);
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 9,
          title: "Updated transcript",
          url: "https://example.com/transcript",
          image: existingLogo,
          previous_image: existingLogo,
          description: "Request an official transcript",
          category_id: 3,
        },
      ],
    });

    const response = await request(app)
      .patch("/api/services/9")
      .set("Cookie", accessCookie("admin"))
      .send({ title: "Updated transcript" });

    expect(response.status).toBe(200);
    expect(response.body.data.image).toBe(
      `/api/services/images/${existingLogo}`,
    );
    expect(pool.query).toHaveBeenCalledOnce();
    expect(await imageFileExists(existingLogo)).toBe(true);
  });

  it("replaces a managed logo only after success and keeps shared files", async () => {
    const previousLogo = `${randomUUID()}.png`;
    await writeFile(path.join(serviceLogoDirectory, previousLogo), pngImage);

    pool.query
      .mockImplementationOnce((query, values) => ({
        rows: [
          {
            id: 9,
            title: "Updated transcript",
            url: "https://example.com/transcript",
            image: values[1],
            previous_image: previousLogo,
            description: "Request an official transcript",
            category_id: 3,
          },
        ],
      }))
      .mockResolvedValueOnce({ rows: [{ referenced: false }] });

    const response = await request(app)
      .patch("/api/services/9")
      .set("Cookie", accessCookie("admin"))
      .field("title", "Updated transcript")
      .attach("image", pngImage, {
        filename: "replacement.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(200);
    const replacement = response.body.data.image.split("/").at(-1);
    expect(await imageFileExists(replacement)).toBe(true);
    expect(await imageFileExists(previousLogo)).toBe(false);

    const sharedLogo = `${randomUUID()}.png`;
    await writeFile(path.join(serviceLogoDirectory, sharedLogo), pngImage);
    pool.query
      .mockImplementationOnce((query, values) => ({
        rows: [
          {
            id: 9,
            title: "Another update",
            url: "https://example.com/transcript",
            image: values[1],
            previous_image: sharedLogo,
            description: "Request an official transcript",
            category_id: 3,
          },
        ],
      }))
      .mockResolvedValueOnce({ rows: [{ referenced: true }] });

    const sharedResponse = await request(app)
      .patch("/api/services/9")
      .set("Cookie", accessCookie("admin"))
      .field("title", "Another update")
      .attach("image", pngImage, {
        filename: "another.png",
        contentType: "image/png",
      });

    expect(sharedResponse.status).toBe(200);
    expect(await imageFileExists(sharedLogo)).toBe(true);
  });

  it("deletes an unreferenced managed logo after deleting its service", async () => {
    const logo = `${randomUUID()}.png`;
    await writeFile(path.join(serviceLogoDirectory, logo), pngImage);
    pool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 9,
            title: "Transcript Request",
            url: "https://example.com/transcript",
            image: logo,
            description: "Request an official transcript",
            category_id: 3,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ referenced: false }] });

    const response = await request(app)
      .delete("/api/services/9")
      .set("Cookie", accessCookie("admin"));

    expect(response.status).toBe(200);
    expect(response.body.data.image).toBe(`/api/services/images/${logo}`);
    expect(await imageFileExists(logo)).toBe(false);
  });
});
