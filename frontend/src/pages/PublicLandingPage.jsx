import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ImageOff,
  Search,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { Tilt } from "@gfazioli/react-tilt";
import "@gfazioli/react-tilt/styles.css";
import bayawanCityLogo from "../assets/images/bayawan_city_logo.png";
import informationTechnologyLogo from "../assets/images/ITS_logo.png";
import { getServices } from "../services/dashboardService";
import {
  getServiceCategories,
  getServiceImageUrl,
} from "../services/serviceService";

const PAGE_SIZE_OPTIONS = [6, 9, 12];
const SWIPE_TRANSITION = {
  duration: 0.42,
  ease: [0.22, 1, 0.36, 1],
};

function PaginationControls({
  position,
  firstResult,
  lastResult,
  totalResults,
  pageSize,
  page,
  pageCount,
  onPageSizeChange,
  onPrevious,
  onNext,
  isTransitioning,
}) {
  return (
    <div className={`public-pagination public-pagination-${position}`}>
      <p aria-live={position === "top" ? "polite" : undefined}>
        Showing{" "}
        <strong>
          {firstResult}–{lastResult}
        </strong>{" "}
        of <strong>{totalResults}</strong> services
      </p>
      <div className="public-pagination-controls">
        <label>
          <span>Per page</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(event.target.value)}
            aria-label={`Services per page (${position})`}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={onPrevious}
          disabled={isTransitioning || page <= 1}
          aria-label={`Previous page (${position})`}
        >
          <ChevronLeft size={17} aria-hidden="true" />
        </button>
        <span
          className="public-page-number"
          aria-label={`Page ${page} of ${pageCount}`}
        >
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={isTransitioning || page >= pageCount}
          aria-label={`Next page (${position})`}
        >
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

const isExternalHttpUrl = (value) => {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

function ServiceImage({ image, title }) {
  const [failed, setFailed] = useState(false);

  if (!image?.trim() || failed) {
    return (
      <span className="public-service-image public-service-image-fallback">
        <ImageOff size={22} aria-hidden="true" />
        <span className="sr-only">No service image available</span>
      </span>
    );
  }

  return (
    <img
      src={getServiceImageUrl(image)}
      alt={`${title} logo`}
      onError={() => setFailed(true)}
      className="public-service-image"
    />
  );
}

function ServiceCard({ service, categoryName, className = "" }) {
  const destination = isExternalHttpUrl(service.url) ? service.url.trim() : "";
  const content = (
    <>
      <div className="public-service-card-top">
        <ServiceImage image={service.image} title={service.title} />
        {categoryName && (
          <span className="public-service-category">{categoryName}</span>
        )}
      </div>
      <h3 className="public-service-title">{service.title}</h3>
      <p className="public-service-description">
        {service.description?.trim() ||
          "More information about this service will be available soon."}
      </p>
      {destination ? (
        <span className="public-service-action">
          Visit service <ExternalLink size={15} aria-hidden="true" />
        </span>
      ) : (
        <span className="public-service-action public-service-action-muted">
          Information
        </span>
      )}
    </>
  );

  return (
    <li className={`public-service-item ${className}`}>
      {destination ? (
        <a
          href={destination}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${service.title} service in a new tab`}
          className="public-service-card"
        >
          {content}
        </a>
      ) : (
        <article className="public-service-card">{content}</article>
      )}
    </li>
  );
}

function PublicLandingPage() {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [transition, setTransition] = useState(null);
  const gridRef = useRef(null);
  const incomingGridRef = useRef(null);
  const transitionId = useRef(0);
  const transitionLock = useRef(false);

  useEffect(() => {
    let active = true;

    Promise.all([getServices(), getServiceCategories()])
      .then(([serviceResult, categoryResult]) => {
        if (!Array.isArray(serviceResult)) {
          throw new Error("Invalid services response");
        }
        if (active) {
          setServices(serviceResult);
          setCategories(categoryResult);
        }
      })
      .catch((error) => {
        if (active) {
          setLoadError(
            error.response?.data?.message ||
              "Unable to load services right now. Please try again.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (event) => {
      if (event.matches) {
        transitionId.current += 1;
        transitionLock.current = false;
        setTransition(null);
      }
    };
    preference.addEventListener("change", handleChange);
    return () => preference.removeEventListener("change", handleChange);
  }, []);

  const filteredServices = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
    return services.filter((service) => {
      const matchesCategory =
        !categoryFilter || String(service.category_id) === categoryFilter;
      const matchesSearch =
        !normalizedSearch ||
        [service.title, service.description].some(
          (value) =>
            typeof value === "string" &&
            value.toLocaleLowerCase().includes(normalizedSearch),
        );
      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, searchTerm, services]);

  const pageCount = Math.max(1, Math.ceil(filteredServices.length / pageSize));
  const visiblePage = Math.min(currentPage, pageCount);
  const pageServices = filteredServices.slice(
    (visiblePage - 1) * pageSize,
    visiblePage * pageSize,
  );
  const firstResult = filteredServices.length
    ? (visiblePage - 1) * pageSize + 1
    : 0;
  const lastResult = Math.min(visiblePage * pageSize, filteredServices.length);
  const categoryNames = new Map(
    categories.map((category) => [String(category.id), category.name]),
  );

  const updateSearch = (value) => {
    transitionLock.current = false;
    setTransition(null);
    setSearchTerm(value);
    setCurrentPage(1);
  };
  const updateCategory = (value) => {
    transitionLock.current = false;
    setTransition(null);
    setCategoryFilter(value);
    setCurrentPage(1);
  };

  const startTransition = (direction, nextPage, nextPageSize = pageSize) => {
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      transitionId.current += 1;
      transitionLock.current = false;
      setTransition(null);
      setCurrentPage(nextPage);
      setPageSize(nextPageSize);
      return;
    }

    const height = gridRef.current?.getBoundingClientRect().height ?? 0;
    transitionLock.current = true;
    setTransition({
      id: transitionId.current + 1,
      direction,
      outgoingServices: pageServices,
      height,
      previousPageSize: pageSize,
      nextPageSize,
    });
    transitionId.current += 1;
    setCurrentPage(nextPage);
    setPageSize(nextPageSize);
  };

  const updatePageSize = (value) => {
    const nextPageSize = Number(value);
    if (nextPageSize === pageSize) return;
    startTransition("size", 1, nextPageSize);
  };

  const activeTransitionId =
    transition?.direction === "size" ? transition.id : undefined;
  useEffect(() => {
    if (activeTransitionId === undefined) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      const height = incomingGridRef.current?.getBoundingClientRect().height;
      if (height === undefined) return;
      setTransition((current) =>
        current?.id === activeTransitionId ? { ...current, height } : current,
      );
    });
    const timerId = window.setTimeout(() => {
      if (transitionId.current === activeTransitionId) {
        transitionLock.current = false;
      }
      setTransition((current) =>
        current?.id === activeTransitionId ? null : current,
      );
    }, 320);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timerId);
    };
  }, [activeTransitionId]);

  const navigatePage = (direction) => {
    if (transitionLock.current) return;
    const nextPage = visiblePage + (direction === "next" ? 1 : -1);
    if (nextPage < 1 || nextPage > pageCount) return;
    startTransition(direction, nextPage);
  };

  const paginationProps = {
    firstResult,
    lastResult,
    totalResults: filteredServices.length,
    pageSize,
    page: visiblePage,
    pageCount,
    onPageSizeChange: updatePageSize,
    onPrevious: () => navigatePage("previous"),
    onNext: () => navigatePage("next"),
    isTransitioning: Boolean(transition),
  };

  const renderServiceGrid = (servicesToRender, className, options = {}) => {
    const swiping = transition && transition.direction !== "size";
    const direction = transition?.direction === "next" ? 1 : -1;
    return (
      <motion.ul
        ref={options.incoming ? incomingGridRef : undefined}
        id={options.incoming ? "public-service-grid" : undefined}
        key={options.key}
        className={`public-service-grid ${className}`}
        aria-hidden={options.incoming ? undefined : true}
        inert={options.incoming ? undefined : true}
        initial={
          swiping ? { x: options.incoming ? `${direction * 100}%` : "0%" } : false
        }
        animate={
          swiping ? { x: options.incoming ? "0%" : `${direction * -100}%` } : undefined
        }
        transition={SWIPE_TRANSITION}
        onAnimationComplete={
          options.incoming && swiping
            ? () => {
                if (transitionId.current === transition.id) {
                  transitionLock.current = false;
                  setTransition(null);
                }
              }
            : undefined
        }
      >
        {servicesToRender.map((service, index) => {
          const curtainClass =
            options.curtainFrom !== undefined && index >= options.curtainFrom
              ? options.curtainClass
              : "";
          return (
            <ServiceCard
              key={service.id}
              service={service}
              categoryName={categoryNames.get(String(service.category_id))}
              className={curtainClass}
            />
          );
        })}
      </motion.ul>
    );
  };

  const renderPagination = (position) => (
    <PaginationControls position={position} {...paginationProps} />
  );

  const incomingClass =
    transition?.direction === "size"
      ? "public-service-grid-curtain"
      : transition
        ? `public-service-grid-enter public-service-grid-enter-${transition.direction}`
        : "";
  const incomingCurtain =
    transition?.direction === "size" &&
    transition.nextPageSize > transition.previousPageSize;
  const outgoingClass =
    transition?.direction === "size"
      ? "public-service-grid-curtain-exit"
      : transition
        ? `public-service-grid-exit public-service-grid-exit-${transition.direction}`
        : "";

  const renderServices = () => {
    if (loadError) {
      return (
        <div className="public-state public-state-error" role="alert">
          <p>{loadError}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setLoadError("");
              setReloadKey((value) => value + 1);
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    if (loading) {
      return (
        <p className="public-state" role="status">
          Loading public services...
        </p>
      );
    }

    if (filteredServices.length === 0) {
      return (
        <div className="public-state public-empty-state">
          <h3>
            {services.length === 0
              ? "No services are available yet"
              : "No services match your search"}
          </h3>
          <p>
            {services.length === 0
              ? "Please check back soon for updates."
              : "Try another search term or choose a different category."}
          </p>
          {(searchTerm || categoryFilter) && (
            <button
              type="button"
              onClick={() => {
                updateSearch("");
                updateCategory("");
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      );
    }

    return (
      <div
        ref={gridRef}
        className={`public-service-grid-stage${transition ? " public-service-grid-stage-animating" : ""}`}
        style={transition?.direction === "size" ? { height: transition.height } : undefined}
        aria-live="polite"
      >
        {transition &&
          renderServiceGrid(transition.outgoingServices, outgoingClass, {
            curtainFrom:
              transition.direction === "size" &&
              transition.nextPageSize < transition.previousPageSize
                ? transition.nextPageSize
                : undefined,
            curtainClass: "public-service-item-curtain-exit",
            key: `outgoing-${transition.id}`,
          })}
        {renderServiceGrid(pageServices, incomingClass, {
          incoming: true,
          curtainFrom: incomingCurtain
            ? transition.previousPageSize
            : undefined,
          curtainClass: "public-service-item-curtain-enter",
          key: `incoming-${transition?.id ?? "initial"}-${visiblePage}-${pageSize}`,
        })}
      </div>
    );
  };

  return (
    <div className="public-portal">
      <main>
        <section className="public-hero" aria-labelledby="welcome-heading">
          <div className="public-hero-inner">
            <div className="public-hero-copy">
              <p className="public-eyebrow">
                <span aria-hidden="true" />
                BAYAWAN INFORMATION TECHNOLOGY SECTION
              </p>
              <h1 id="welcome-heading">Welcome to BITS Portal</h1>
              <p className="public-hero-lead">
                Your gateway to Bayawan City&apos;s digital services.
              </p>
              <p className="public-hero-description">
                Find the online services and information you need, all in one
                trusted place from the Bayawan Information Technology Section.
              </p>
              <a className="public-hero-cta" href="#services">
                <span>Explore now</span>
                <ArrowRight size={17} aria-hidden="true" />
              </a>
            </div>
            <div className="public-identity-tilt">
              <Tilt
                threshold={12}
                maxRotation={6}
                hoverScale={1.01}
                springEffect
                springStiffness={170}
                springDamping={26}
                glareEffect
                glareColor="rgba(255, 255, 255, 0.4)"
                glareMaxOpacity={0.2}
                glareSize={25}
                radius="1.5rem"
                touchEnabled={false}
              >
                <div className="public-identity-card">
                  <div className="public-identity-kicker">
                    <span aria-hidden="true" />
                    Bayawan City &middot; Digital services
                  </div>
                  <h2 className="public-identity-label">
                    A city moving forward
                  </h2>
                  <p className="public-identity-description">
                    Connecting our community to accessible public services.
                  </p>
                  <div className="public-identity-logos">
                    <div className="public-identity-logo">
                      <img src={bayawanCityLogo} alt="Bayawan City seal" />
                      <span>Bayawan City</span>
                    </div>
                    <span
                      className="public-identity-divider"
                      aria-hidden="true"
                    />
                    <div className="public-identity-logo">
                      <img
                        src={informationTechnologyLogo}
                        alt="Information Technology Section logo"
                      />
                      <span>Information Technology Section</span>
                    </div>
                  </div>
                  <div className="public-identity-footer" aria-hidden="true">
                    <span>Connected community</span>
                    <span className="public-identity-footer-line" />
                    <ArrowRight size={16} />
                  </div>
                </div>
              </Tilt>
            </div>
          </div>
          <div
            className="public-hero-orb public-hero-orb-one"
            aria-hidden="true"
          />
          <div
            className="public-hero-orb public-hero-orb-two"
            aria-hidden="true"
          />
        </section>

        <section
          id="services"
          className="public-services-section"
          aria-labelledby="services-heading"
        >
          <div className="public-content">
            <div className="public-section-heading">
              <div>
                <p className="public-section-kicker">CITY SERVICES</p>
                <h2 id="services-heading">Discover what you need</h2>
                <p>
                  Browse Bayawan City&apos;s digital services by name or
                  category.
                </p>
              </div>
              <span className="public-service-count">
                {loading ? "Loading services" : `${services.length} services`}
              </span>
            </div>

            <div className="public-discovery-panel">
              <label className="public-search">
                <Search size={19} aria-hidden="true" />
                <span className="sr-only">Search services</span>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => updateSearch(event.target.value)}
                  placeholder="Search by service name or description"
                  aria-label="Search services"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => updateSearch("")}
                    aria-label="Clear search"
                  >
                    <X size={17} aria-hidden="true" />
                  </button>
                )}
              </label>
              <label className="public-category-select">
                <span className="sr-only">Filter by category</span>
                <select
                  value={categoryFilter}
                  onChange={(event) => updateCategory(event.target.value)}
                  aria-label="Filter by category"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={String(category.id)}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {renderPagination("top")}
            {renderServices()}
            {renderPagination("bottom")}
          </div>
        </section>
      </main>

    </div>
  );
}

export default PublicLandingPage;
