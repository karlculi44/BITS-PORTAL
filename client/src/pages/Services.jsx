import { useEffect, useState } from "react";
import { ImageOff, Pencil, Plus, Trash2 } from "lucide-react";
import ServiceModal from "../components/ServiceModal";
import ViewToggle from "../components/ViewToggle";
import { tooltip } from "../components/tooltip";
import { hasSectionAccess } from "../components/navItems";
import { useAuth } from "../hooks/useAuth";
import { getServices } from "../services/dashboardService";
import SearchFilter from "../components/SearchFilter";
import {
  getServiceCategories,
  getServiceImageUrl,
} from "../services/serviceService";

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

function ServiceUrl({ url }) {
  if (!url?.trim()) {
    return <span className="text-slate-500">No URL available.</span>;
  }
  if (!isHttpUrl(url)) return <span>{url}</span>;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      {...tooltip("Open Service")}
      className="text-blue-700 hover:underline"
    >
      {url}
    </a>
  );
}

const ADMIN_ONLY_MESSAGE = "Only admins can manage services";

function ServiceActions({ service, isAdmin, onEdit }) {
  return (
    <div className="flex shrink-0 gap-1">
      <span {...(!isAdmin && tooltip(ADMIN_ONLY_MESSAGE))}>
        <button
          type="button"
          onClick={() => onEdit(service)}
          disabled={!isAdmin}
          aria-label={`Edit ${service.title}`}
          {...(isAdmin && tooltip("Edit Service"))}
          className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Pencil size={18} aria-hidden="true" />
        </button>
      </span>
      <button
        type="button"
        aria-label={`Delete ${service.title}`}
        {...tooltip("Delete Service")}
        className="rounded-md p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-red-700"
      >
        <Trash2 size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

function Services() {
  const { user } = useAuth();
  const isAdmin = hasSectionAccess(user, "services");
  const [viewMode, setViewMode] = useState("list");
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    let active = true;
    getServiceCategories()
      .then((result) => {
        if (active) setCategories(result);
      })
      .catch(() => {
        if (active) setCategories([]);
      });
    return () => {
      active = false;
    };
  }, []);

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

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filtersActive = !!normalizedSearch || !!categoryFilter;
  const filteredServices = services.filter(
    (service) =>
      (!categoryFilter || String(service.category_id) === categoryFilter) &&
      (!normalizedSearch ||
        [service.title, service.description].some((value) =>
          value?.toLowerCase().includes(normalizedSearch),
        )),
  );
  const categoryOptions = categories.map((category) => ({
    value: String(category.id),
    label: category.name,
  }));
  const categoryNames = Object.fromEntries(
    categories.map((category) => [category.id, category.name]),
  );
  const openEditModal = (service) => {
    setSelectedService(service);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Services</h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage the services displayed in the BITS Portal.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchFilter
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search services"
            searchLabel="Search services"
            searchTooltip="Search services by name or description"
            filterValue={categoryFilter}
            onFilterChange={setCategoryFilter}
            filterOptions={categoryOptions}
            filterLabel="Filter by category"
            filterTooltip="Filter services by category"
            filterPlaceholder="All Categories"
          />
          <ViewToggle label="Services view" viewMode={viewMode} onChange={setViewMode} />
          <span
            className="self-start"
            {...(!isAdmin && tooltip(ADMIN_ONLY_MESSAGE))}
          >
            <button
              type="button"
              onClick={() => {
                setSelectedService(null);
                setModalOpen(true);
              }}
              disabled={!isAdmin}
              {...(isAdmin && tooltip("Add a new service"))}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={18} aria-hidden="true" />
              Add Service
            </button>
          </span>
        </div>
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
        ) : filteredServices.length === 0 ? (
          <div className="p-5 text-sm text-slate-500">
            <p>
              {normalizedSearch && categoryFilter
                ? "No services match your search in the selected category."
                : normalizedSearch
                  ? "No services match your search."
                  : "No services found in the selected category."}
            </p>
            {filtersActive && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("");
                }}
                className="mt-2 font-medium text-blue-700 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : viewMode === "list" ? (
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
              {filteredServices.map((service) => (
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
                    <ServiceUrl url={service.url} />
                  </td>
                  <td className="px-5 py-4">
                    <ServiceActions
                      service={service}
                      isAdmin={isAdmin}
                      onEdit={openEditModal}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <ul className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredServices.map((service) => (
              <li
                key={service.id}
                className="flex h-56 flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <ServiceLogo
                    key={service.image}
                    image={service.image}
                    title={service.title}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium text-slate-800">
                      {service.title}
                    </h3>
                    {categoryNames[service.category_id] && (
                      <span className="mt-1 inline-block max-w-full truncate rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {categoryNames[service.category_id]}
                      </span>
                    )}
                  </div>
                  <ServiceActions
                    service={service}
                    isAdmin={isAdmin}
                    onEdit={openEditModal}
                  />
                </div>
                <p className="mt-3 line-clamp-3 flex-1 text-sm text-slate-600">
                  {service.description?.trim() || "No description available."}
                </p>
                <div className="mt-3 truncate border-t border-slate-100 pt-3 text-sm">
                  <ServiceUrl url={service.url} />
                </div>
              </li>
            ))}
          </ul>
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
