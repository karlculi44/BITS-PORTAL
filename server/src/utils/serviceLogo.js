import { unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export const serviceLogoDirectory = path.join(
  serverDirectory,
  "uploads",
  "services",
);

const serviceLogoFilenamePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:png|jpe?g|webp)$/i;

export const isManagedServiceLogo = (filename) =>
  typeof filename === "string" && serviceLogoFilenamePattern.test(filename);

export const getServiceLogoPath = (filename) =>
  isManagedServiceLogo(filename)
    ? path.join(serviceLogoDirectory, filename)
    : undefined;

export const removeServiceLogo = async (filename) => {
  const filePath = getServiceLogoPath(filename);

  if (!filePath) return;

  try {
    await unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
};

export const formatServiceImage = (service) => {
  if (!service || !isManagedServiceLogo(service.image)) return service;

  return {
    ...service,
    image: `/api/services/images/${service.image}`,
  };
};

export const formatServiceImages = (services) => {
  const formattedServices = services.map(formatServiceImage);

  return formattedServices.every(
    (service, index) => service === services[index],
  )
    ? services
    : formattedServices;
};
