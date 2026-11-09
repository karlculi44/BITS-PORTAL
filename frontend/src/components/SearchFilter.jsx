import { Search, X } from "lucide-react";
import { tooltip } from "./tooltip";

function SearchFilter({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  searchLabel = "Search",
  searchTooltip,
  filterValue,
  onFilterChange,
  filterOptions,
  filterLabel = "Filter",
  filterTooltip,
  filterPlaceholder = "All",
  disabled = false,
}) {
  const showFilter = Array.isArray(filterOptions) && !!onFilterChange;

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative sm:w-64">
        <Search
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchLabel}
          {...(searchTooltip && tooltip(searchTooltip))}
          disabled={disabled}
          className="w-full rounded-md border border-slate-300 bg-white py-2 pl-10 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {searchValue && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            {...tooltip("Clear search")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      {showFilter && (
        <select
          value={filterValue}
          onChange={(event) => onFilterChange(event.target.value)}
          aria-label={filterLabel}
          {...(filterTooltip && tooltip(filterTooltip))}
          disabled={disabled}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-56"
        >
          <option value="">{filterPlaceholder}</option>
          {filterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export default SearchFilter;
