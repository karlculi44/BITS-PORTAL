import { useEffect, useState } from "react";
import { ImageOff, Pencil, Plus, Trash2 } from "lucide-react";
import ServiceModal from "../components/ServiceModal";
import { useAuth } from "../hooks/useAuth";
import { getServices } from "../services/dashboardService";
import { getServiceImageUrl } from "../services/serviceService";

const isHttpUrl = (value) => {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

function ServiceLogo({ image, title }) {
  const [failed, setFailed] = useState(false);

  if (!image?.trim() || failed) {
    return (
      <div
        aria-label="No service logo"
        className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-100 text-slate-400"
      >
        <ImageOff size={20} aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={getServiceImageUrl(image)}
      alt={`${title} logo`}
      onError={() => setFailed(true)}
      className="h-12 w-12 rounded-md border border-slate-200 object-contain"
    />
  );
}

function Services() {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    getServices()
      .then((result) => {
        if (!Array.isArray(result)) {
          throw new Error("Invalid services response");
        }
        if (active) setServices(result);
      })
      .catch((err) => {
        if (active) {
          setError(err.response?.data?.message || "Unable to load services.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Services</h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage the services displayed in the BITS Portal.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedService(null);
            setModalOpen(true);
          }}
          disabled={user?.role !== "admin"}
          title={
            user?.role !== "admin"
              ? "Only admins can manage services"
              : undefined
          }
          className="inline-flex items-center justify-center gap-2 self-start rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={18} aria-hidden="true" />
          Add Service
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p role="status" className="p-5 text-sm text-slate-500">
            Loading services...
          </p>
        ) : error ? (
          <p role="alert" className="p-5 text-sm text-red-700">
            {error}
          </p>
        ) : services.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No services available.</p>
        ) : (
          <table className="w-full min-w-240 table-fixed text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th scope="col" className="w-24 px-5 py-3">
                  Logo
                </th>
                <th scope="col" className="w-1/4 px-5 py-3">
                  Name
                </th>
                <th scope="col" className="px-5 py-3">
                  Description
                </th>
                <th scope="col" className="w-1/4 px-5 py-3">
                  URL
                </th>
                <th scope="col" className="w-28 px-5 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {services.map((service) => (
                <tr key={service.id}>
                  <td className="px-5 py-4">
                    <ServiceLogo
                      key={service.image}
                      image={service.image}
                      title={service.title}
                    />
                  </td>
                  <td className="wrap-break-word px-5 py-4 font-medium text-slate-800">
                    {service.title}
                  </td>
                  <td className="wrap-break-word px-5 py-4 text-slate-600">
                    {service.description?.trim() || "No description available."}
                  </td>
                  <td className="break-all px-5 py-4">
                    {service.url?.trim() && isHttpUrl(service.url) ? (
                      <a
                        href={service.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 hover:underline"
                      >
                        {service.url}
                      </a>
                    ) : service.url?.trim() ? (
                      <span>{service.url}</span>
                    ) : (
                      <span className="text-slate-500">No URL available.</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedService(service);
                          setModalOpen(true);
                        }}
                        disabled={user?.role !== "admin"}
                        aria-label={`Edit ${service.title}`}
                        title={
                          user?.role === "admin"
                            ? "Edit service"
                            : "Only admins can manage services"
                        }
                        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Pencil size={18} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${service.title}`}
                        title="Delete service"
                        className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 size={18} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {modalOpen && (
        <ServiceModal
          service={selectedService}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            setLoading(true);
            setError("");
            setRefresh((current) => current + 1);
          }}
        />
      )}
    </div>
  );
}

export default Services;
