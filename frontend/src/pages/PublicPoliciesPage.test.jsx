// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { getCategories } from "../services/categoryService";
import { getPolicies, getPolicyDocument } from "../services/policyService";
import PublicPoliciesPage from "./PublicPoliciesPage";

vi.mock("../services/categoryService", () => ({ getCategories: vi.fn() }));
vi.mock("../services/policyService", () => ({
  getPolicies: vi.fn(),
  getPolicyDocument: vi.fn(),
}));
vi.mock("react-hot-toast", () => ({ default: { error: vi.fn() } }));

const categories = [
  { id: 1, name: "Ordinances", type: "policy" },
  { id: 2, name: "Orders", type: "policy" },
  { id: 3, name: "Services", type: "service" },
];
const policies = [
  { id: 1, title: "City Ordinance", description: "Local regulations", category_id: 1, category_name: "Ordinances" },
  { id: 2, title: "Executive Order", description: "City administration", category_id: 2, category_name: "Orders" },
];

beforeEach(() => {
  getCategories.mockResolvedValue(categories);
  getPolicies.mockResolvedValue(policies);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("Public policy library", () => {
  it("loads policy categories and filters documents by category and search", async () => {
    render(<PublicPoliciesPage />);
    expect(screen.getByRole("status").textContent).toContain("Loading");
    expect(await screen.findByText("Local regulations")).toBeTruthy();
    expect(getCategories).toHaveBeenCalledWith("policy");
    expect(screen.queryByRole("button", { name: "Services" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Orders" }));
    expect(screen.queryByText("City Ordinance")).toBeNull();
    expect(screen.getByText("City administration")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "All Categories" }));
    expect(screen.getByText("City Ordinance")).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search policies" }), { target: { value: "regulations" } });
    expect(screen.getByText("City Ordinance")).toBeTruthy();
    expect(screen.queryByText("Executive Order")).toBeNull();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search policies" }), { target: { value: "missing" } });
    expect(screen.getByText("No documents found")).toBeTruthy();
  });

  it("shows an empty category and retries a failed request", async () => {
    getPolicies.mockRejectedValueOnce(new Error("network"));
    render(<PublicPoliciesPage />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    getPolicies.mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("There are no policies in this category yet.")).toBeTruthy();
    expect(getPolicies).toHaveBeenCalledTimes(2);
  });

  it("opens the controlled document response and reports document errors", async () => {
    const tab = { opener: {}, location: { replace: vi.fn() }, close: vi.fn() };
    vi.stubGlobal("open", vi.fn(() => tab));
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:policy"), revokeObjectURL: vi.fn() }));
    const blob = new Blob(["pdf"], { type: "application/pdf" });
    getPolicyDocument.mockResolvedValueOnce(blob).mockRejectedValueOnce(new Error("missing"));
    const { default: toast } = await import("react-hot-toast");
    render(<PublicPoliciesPage />);
    const view = await screen.findByRole("button", { name: "View City Ordinance document in a new tab" });
    fireEvent.click(view);
    await waitFor(() => expect(tab.location.replace).toHaveBeenCalledWith("blob:policy"));
    expect(getPolicyDocument).toHaveBeenCalledWith(1);
    expect(tab.opener).toBeNull();
    fireEvent.click(view);
    await waitFor(() => expect(tab.close).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalled();
  });

  it("paginates results and resets pagination when filtering", async () => {
    getPolicies.mockResolvedValue(Array.from({ length: 10 }, (_, index) => ({
      id: index + 1, title: `Document ${index + 1}`, description: "", category_id: 1,
    })));
    render(<PublicPoliciesPage />);
    expect(await screen.findByText("Page 1 of 2")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Document 10")).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Document 1" } });
    expect(screen.getByText("Document 1")).toBeTruthy();
    expect(screen.getByText("Document 10")).toBeTruthy();
    expect(screen.queryByText("Page 2 of 2")).toBeNull();
  });
});
