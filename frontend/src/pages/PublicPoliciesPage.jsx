import { useEffect, useState } from "react";
import { ArrowUpRight, BookOpen, ChevronLeft, ChevronRight, FileText, Search } from "lucide-react";
import toast from "react-hot-toast";
import { getCategories } from "../services/categoryService";
import { getPolicies, getPolicyDocument } from "../services/policyService";
import { usePageLoading } from "../hooks/usePageLoading";
import "./PublicPoliciesPage.css";

const PAGE_SIZE = 9;

function PublicPoliciesPage() {
  const [policies, setPolicies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  usePageLoading(loading);

  useEffect(() => {
    let active = true;
    Promise.all([getPolicies(), getCategories("policy")])
      .then(([documents, categoryResult]) => {
        if (!active) return;
        const policyCategories = categoryResult.filter((item) => item.type === "policy");
        setPolicies(documents);
        setCategories(policyCategories);
        setCategory((selected) =>
          selected && !policyCategories.some((item) => String(item.id) === selected)
            ? ""
            : selected,
        );
      })
      .catch(() => {
        if (active) setError("Unable to load the document library. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [reloadKey]);

  const query = search.trim().toLowerCase();
  const filtered = policies.filter((policy) =>
    (!category || String(policy.category_id) === category) &&
    (!query || [policy.title, policy.description].some((value) =>
      value?.toLowerCase().includes(query),
    )),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visiblePolicies = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selectedCategory = categories.find((item) => String(item.id) === category);

  const viewDocument = async (policy) => {
    const tab = window.open("about:blank", "_blank");
    if (!tab) {
      toast.error("Allow pop-ups to view policy documents.");
      return;
    }
    tab.opener = null;
    try {
      const blob = await getPolicyDocument(policy.id);
      const url = URL.createObjectURL(blob);
      tab.location.replace(url);
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      tab.close();
      toast.error("Unable to open the policy document. Please try again.");
    }
  };

  const retry = () => {
    setError("");
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  return (
    <div className="public-portal">
      <main className="policy-library">
        <div className="policy-library-inner">
          <section className="policy-library-intro" aria-labelledby="policy-library-heading">
            <div>
              <p className="policy-library-kicker">BITS Portal / Document library</p>
              <h1 id="policy-library-heading">Policies &amp; Governance</h1>
              <p>Browse official policies, ordinances, executive orders, and other institutional documents in one place.</p>
            </div>
            <span className="policy-library-intro-icon" aria-hidden="true"><BookOpen size={32} /></span>
          </section>

          <div className="policy-library-layout">
            <nav className="policy-categories" aria-label="Policy categories">
              <p className="policy-categories-label">Browse by category</p>
              <div className="policy-category-list">
                <button type="button" className={!category ? "active" : ""} aria-pressed={!category} onClick={() => { setCategory(""); setPage(1); }}>
                  All Categories
                </button>
                {categories.map((item) => (
                  <button key={item.id} type="button" className={category === String(item.id) ? "active" : ""} aria-pressed={category === String(item.id)} onClick={() => { setCategory(String(item.id)); setPage(1); }}>
                    {item.name}
                  </button>
                ))}
              </div>
            </nav>

            <section className="policy-results" aria-labelledby="policy-results-heading">
              <div className="policy-results-header">
                <div>
                  <p className="policy-library-kicker">Official documents</p>
                  <h2 id="policy-results-heading">{selectedCategory?.name || "All Categories"}</h2>
                  {!loading && !error && <p className="policy-result-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? "document" : "documents"}</p>}
                </div>
                <label className="policy-search">
                  <Search size={18} aria-hidden="true" />
                  <span className="sr-only">Search policies</span>
                  <input type="search" placeholder="Search documents..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
                </label>
              </div>
              {loading ? (
                <div className="policy-state" role="status">Loading documents...</div>
              ) : error ? (
                <div className="policy-state">
                  <p role="alert">{error}</p>
                  <button type="button" onClick={retry}>Try again</button>
                </div>
              ) : visiblePolicies.length === 0 ? (
                <div className="policy-state">
                  <FileText size={28} aria-hidden="true" />
                  <h3>No documents found</h3>
                  <p>{query ? "Try a different search or category." : "There are no policies in this category yet."}</p>
                </div>
              ) : (
                <>
                  <ul className="policy-document-list">
                    {visiblePolicies.map((policy) => (
                      <li key={policy.id}>
                        <article className="policy-document">
                          <span className="policy-document-icon" aria-hidden="true"><FileText size={22} /></span>
                          <div className="policy-document-copy">
                            <span className="policy-document-category">{policy.category_name || categories.find((item) => String(item.id) === String(policy.category_id))?.name || "Policy"}</span>
                            <h3>{policy.title}</h3>
                            <p>{policy.description?.trim() || "No description available."}</p>
                          </div>
                          <button type="button" className="policy-document-action" aria-label={`View ${policy.title} document in a new tab`} onClick={() => viewDocument(policy)}>
                            View Document <ArrowUpRight size={16} aria-hidden="true" />
                          </button>
                        </article>
                      </li>
                    ))}
                  </ul>
                  {pageCount > 1 && (
                    <div className="policy-pagination" aria-label="Document pagination">
                      <span>Page {currentPage} of {pageCount}</span>
                      <div>
                        <button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={18} aria-hidden="true" /></button>
                        <button type="button" aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={18} aria-hidden="true" /></button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default PublicPoliciesPage;
