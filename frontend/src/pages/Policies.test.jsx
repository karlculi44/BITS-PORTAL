// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import toast from "react-hot-toast";
import Policies from "./Policies";
import { AuthContext } from "../context/authContextValue";
import api from "../services/api";

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const user = { first_name: "Test", last_name: "Admin", role: "admin" };
const categories = [
  { id: 11, name: "Student Affairs", type: "policy" },
  { id: 12, name: "Academic Rules", type: "policy" },
  { id: 13, name: "Support", type: "service" },
];
const policies = [
  {
    id: 1,
    category_id: 11,
    category_name: "Student Affairs",
    title: "Student Handbook",
    description: "Guidelines for learners",
    file: "1f5a4ce6-4f18-4475-9588-6ab5a426004c.pdf",
  },
  {
    id: 2,
    category_id: 12,
    category_name: "Academic Rules",
    title: "Assessment Policy",
    description: "Exam requirements",
    file: "e35b5774-6cb3-4f71-8863-6eb005c317b2.pdf",
  },
];

const renderPage = () =>
  render(
    <AuthContext.Provider
      value={{ user, loading: false, logout: vi.fn() }}
    >
      <Policies />
    </AuthContext.Provider>,
  );

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.spyOn(api, "get").mockImplementation((path) => {
    if (path === "/policies") return Promise.resolve({ data: policies });
    if (path === "/categories") return Promise.resolve({ data: categories });
    if (path.endsWith("/document")) {
      return Promise.resolve({
        data: new Blob(["%PDF-1.7"], { type: "application/pdf" }),
      });
    }
    return Promise.reject(new Error(`Unexpected request: ${path}`));
  });
  vi.spyOn(api, "post").mockResolvedValue({ data: { message: "Created" } });
  vi.spyOn(api, "patch").mockResolvedValue({ data: { message: "Updated" } });
  vi.spyOn(api, "delete").mockResolvedValue({ data: { message: "Deleted" } });
  toast.success.mockClear();
  toast.error.mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Policies page", () => {
  it("loads policies and combines category and case-insensitive search filters", async () => {
    renderPage();
    expect(await screen.findByText("Student Handbook")).toBeTruthy();
    expect(screen.getByText("Assessment Policy")).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith("/policies");
    expect(api.get).toHaveBeenCalledWith("/categories", {
      params: { type: "policy" },
    });

    const categorySelect = screen.getByLabelText("Filter by policy category");
    expect(categorySelect.options[0].textContent).toBe("All Categories");
    expect(
      screen.queryByRole("option", { name: "Support" }),
    ).toBeNull();

    fireEvent.change(screen.getByLabelText("Search policies"), {
      target: { value: "  LEARNERS " },
    });
    expect(screen.getByText("Student Handbook")).toBeTruthy();
    expect(screen.queryByText("Assessment Policy")).toBeNull();

    fireEvent.change(categorySelect, { target: { value: "11" } });
    expect(screen.getByText("Student Handbook")).toBeTruthy();
    expect(screen.queryByText("Assessment Policy")).toBeNull();

    fireEvent.change(screen.getByLabelText("Search policies"), {
      target: { value: "academic" },
    });
    expect(
      screen.getByText("No policies match your search in the selected category."),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("Student Handbook")).toBeTruthy();
    expect(screen.getByText("Assessment Policy")).toBeTruthy();
  });

  it("preserves filters and records when switching between list and grid views", async () => {
    renderPage();
    await screen.findByText("Student Handbook");
    const search = screen.getByLabelText("Search policies");
    const category = screen.getByLabelText("Filter by policy category");
    fireEvent.change(search, { target: { value: "learners" } });
    fireEvent.change(category, { target: { value: "11" } });

    expect(screen.getByRole("table")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Grid View" }));
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    const card = screen.getByRole("listitem");
    expect(within(card).getByRole("heading", { name: "Student Handbook" })).toBeTruthy();
    expect(within(card).getByText("Student Affairs")).toBeTruthy();
    expect(within(card).getByText("Guidelines for learners")).toBeTruthy();
    expect(search.value).toBe("learners");
    expect(category.value).toBe("11");
    expect(screen.getByRole("button", { name: "Grid View" }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.change(search, { target: { value: "no match" } });
    expect(screen.getByText("No policies match your search in the selected category.")).toBeTruthy();
    fireEvent.change(search, { target: { value: "learners" } });
    fireEvent.click(screen.getByRole("button", { name: "List View" }));
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.queryByText("Assessment Policy")).toBeNull();
    expect(search.value).toBe("learners");
    expect(category.value).toBe("11");
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it("opens the selected policy document from grid view", async () => {
    const tab = { opener: window, location: { replace: vi.fn() }, close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(tab);
    const createObjectURL = vi.fn(() => "blob:policy");
    const revokeObjectURL = vi.fn();
    const NativeURL = URL;
    vi.stubGlobal("URL", class extends NativeURL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    });
    const setTimeout = window.setTimeout.bind(window);
    vi.spyOn(window, "setTimeout").mockImplementation((callback, delay, ...args) =>
      delay === 60_000 ? 1 : setTimeout(callback, delay, ...args),
    );
    renderPage();
    await screen.findByText("Student Handbook");
    fireEvent.click(screen.getByRole("button", { name: "Grid View" }));
    fireEvent.click(screen.getByRole("button", { name: "View Student Handbook" }));

    await waitFor(() => expect(tab.location.replace).toHaveBeenCalledWith("blob:policy"));
    expect(api.get).toHaveBeenCalledWith("/policies/1/document", {
      responseType: "blob",
    });
    expect(tab.opener).toBeNull();
    expect(createObjectURL).toHaveBeenCalledOnce();
  });

  it("edits and deletes policies from grid view", async () => {
    renderPage();
    await screen.findByText("Student Handbook");
    fireEvent.click(screen.getByRole("button", { name: "Grid View" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit Student Handbook" }));
    const editDialog = screen.getByRole("dialog", { name: "Edit Policy" });
    expect(within(editDialog).getByLabelText("Policy Title").value).toBe("Student Handbook");
    fireEvent.click(within(editDialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "Delete Student Handbook" }));
    const deleteDialog = screen.getByRole("dialog", { name: "Delete Policy" });
    fireEvent.click(within(deleteDialog).getByRole("button", { name: "Delete Policy" }));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/policies/1"));
    await waitFor(() => expect(screen.queryByText("Student Handbook")).toBeNull());
    expect(screen.getByRole("heading", { name: "Assessment Policy" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "List View" }));
    expect(screen.queryByText("Student Handbook")).toBeNull();
  });

  it("creates a policy with an uploaded PDF", async () => {
    renderPage();
    await screen.findByText("Student Handbook");
    fireEvent.click(screen.getByRole("button", { name: "Add Policy" }));

    const dialog = screen.getByRole("dialog", { name: "Register New Policy" });
    fireEvent.change(within(dialog).getByLabelText("Policy Category"), {
      target: { value: "11" },
    });
    fireEvent.change(within(dialog).getByLabelText("Policy Title"), {
      target: { value: "New Policy" },
    });
    fireEvent.change(within(dialog).getByLabelText("Description"), {
      target: { value: "Policy summary" },
    });
    const document = new File(["%PDF-1.7"], "new-policy.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(within(dialog).getByLabelText("Policy Document"), {
      target: { files: [document] },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create Policy" }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      "/policies",
      expect.any(FormData),
    ));
    const payload = api.post.mock.calls[0][1];
    expect(payload.get("category_id")).toBe("11");
    expect(payload.get("title")).toBe("New Policy");
    expect(payload.get("description")).toBe("Policy summary");
    expect(payload.get("document")).toBe(document);
    expect(toast.success).toHaveBeenCalledWith("Policy created successfully.");
  });

  it("preserves the current PDF when editing without selecting a replacement", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Edit Student Handbook" }));

    const dialog = screen.getByRole("dialog", { name: "Edit Policy" });
    expect(within(dialog).getByText(/Current document: 1f5a4ce6/)).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText("Policy Title"), {
      target: { value: "Updated Handbook" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith(
      "/policies/1",
      expect.any(FormData),
    ));
    expect(api.patch.mock.calls[0][1].has("document")).toBe(false);
    expect(toast.success).toHaveBeenCalledWith("Policy updated successfully.");
  });

  it("confirms deletion before removing the policy from the table", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Delete Student Handbook" }));
    const dialog = screen.getByRole("dialog", { name: "Delete Policy" });
    expect(dialog.textContent).toContain('Delete policy "Student Handbook"?');
    expect(api.delete).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete Policy" }));

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/policies/1"));
    await waitFor(() => expect(screen.queryByText("Student Handbook")).toBeNull());
    expect(toast.success).toHaveBeenCalledWith("Policy deleted successfully.");
  });
});
