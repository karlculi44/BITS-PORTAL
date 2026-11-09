import { unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export const policyDocumentDirectory = path.join(
  serverDirectory,
  "uploads",
  "policies",
);

const policyDocumentFilenamePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/i;

export const isManagedPolicyDocument = (filename) =>
  typeof filename === "string" && policyDocumentFilenamePattern.test(filename);

export const getPolicyDocumentPath = (filename) =>
  isManagedPolicyDocument(filename)
    ? path.join(policyDocumentDirectory, filename)
    : undefined;

export const removePolicyDocument = async (filename) => {
  const filePath = getPolicyDocumentPath(filename);

  if (!filePath) return;

  try {
    await unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
};
