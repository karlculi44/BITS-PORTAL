// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../App";
import { AuthContext } from "../context/authContextValue";
import api from "../services/api";
import toast from "react-hot-toast";
import ServiceModal from "../components/ServiceModal";
import Services from "./Services";

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

const user = { first_name: "Test", last_name: "Admin", role: "admin" };
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

function renderApp() {
  window.history.pushState({}, "", "/services");
  return render(
    <AuthContext.Provider value={{ user, loading: false, logout: vi.fn() }}>
      <App />
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  if (!URL.createObjectURL) {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:service-logo-preview"),
    });
  } else {
    vi.spyOn(URL, "createObjectURL").mockReturnValue(
      "blob:service-logo-preview",
    );
  }
  if (!URL.revokeObjectURL) {
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
  } else {
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  }
  vi.spyOn(api, "get");
  vi.spyOn(api, "post");
  vi.spyOn(api, "patch");
  vi.spyOn(api, "delete");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  if (!originalCreateObjectURL) delete URL.createObjectURL;
  if (!originalRevokeObjectURL) delete URL.revokeObjectURL;
});

describe("Services page", () => {
  it("keeps the loading strip visible until both page requests settle", async () => {
    let finishCategories;
    api.get.mockImplementation((url) => {
      if (url === "/categories") {
        return new Promise((resolve) => { finishCategories = resolve; });
      }
      return Promise.resolve({ data: [] });
    });
    renderApp();

    expect(await screen.findByText("No services available.")).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Loading page" })).toBeTruthy();
    finishCategories({ data: [] });
    await waitFor(() => expect(screen.queryByRole("progressbar")).toBeNull());
  });

  it("loads the API records in the dashboard", async () => {
    let resolveRequest;
    api.get.mockReturnValue(new Promise((resolve) => {
      resolveRequest = resolve;
    }));
    renderApp();

    expect(screen.getByRole("navigation")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Loading services...");
    expect(api.get).toHaveBeenCalledWith("/services");

    resolveRequest({
      data: [
        { id: 1, title: "Email", description: "Campus email", image: "https://example.com/email.png", url: "https://example.com/email" },
        { id: 2, title: "Library", description: "  ", image: null, url: "" },
      ],
    });

    expect(await screen.findByText("Campus email")).toBeTruthy();
    expect(screen.getByText("Email")).toBeTruthy();
    expect(screen.getByText("Library")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Email logo" }).getAttribute("src"))
      .toBe("https://example.com/email.png");
    const serviceLink = screen.getByRole("link", { name: "https://example.com/email" });
    expect(serviceLink.getAttribute("href")).toBe("https://example.com/email");
    expect(serviceLink.getAttribute("target")).toBe("_blank");
    expect(serviceLink.getAttribute("rel")).toBe("noopener noreferrer");
    expect(screen.getByLabelText("No service logo")).toBeTruthy();
    expect(screen.getByText("No description available.")).toBeTruthy();
    expect(screen.getByText("No URL available.")).toBeTruthy();

    expect(api.get).toHaveBeenCalledTimes(2);
    expect(api.get).toHaveBeenCalledWith("/categories", {
      params: { type: "service" },
    });
    expect(api.post).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();

    fireEvent.error(screen.getByRole("img", { name: "Email logo" }));
    expect(screen.getAllByLabelText("No service logo")).toHaveLength(2);
  });

  it("shows an empty state for an empty list", async () => {
    api.get.mockResolvedValue({ data: [] });
    renderApp();
    expect(await screen.findByText("No services available.")).toBeTruthy();
  });

  describe("deleting services", () => {
    const records = [
      { id: 1, title: "Email", description: "Campus email", category_id: 2 },
      { id: 2, title: "Library", description: "Campus library", category_id: 2 },
    ];

    beforeEach(() => {
      vi.clearAllMocks();
      api.get.mockImplementation((path) => Promise.resolve({
        data: path === "/services" ? records : [{ id: 2, name: "Tools", type: "service" }],
      }));
    });

    it.each(["list", "grid"])("deletes the selected service in %s view", async (view) => {
      let resolveDelete;
      api.delete.mockReturnValue(new Promise((resolve) => { resolveDelete = resolve; }));
      renderApp();
      await screen.findByText("Email");
      if (view === "grid") fireEvent.click(screen.getByRole("button", { name: "Grid View" }));
      fireEvent.change(screen.getByLabelText("Search services"), { target: { value: "Campus" } });
      fireEvent.click(screen.getByRole("button", { name: "Delete Email" }));
      const dialog = screen.getByRole("dialog", { name: "Delete Service" });
      expect(dialog.textContent).toContain('Delete service "Email"?');
      expect(api.delete).not.toHaveBeenCalled();
      fireEvent.click(within(dialog).getByRole("button", { name: "Delete Service" }));
      expect(api.delete).toHaveBeenCalledWith("/services/1");
      expect(within(dialog).getByRole("button", { name: "Deleting..." }).disabled).toBe(true);
      expect(within(dialog).getByRole("button", { name: "Cancel" }).disabled).toBe(true);
      fireEvent.keyDown(dialog, { key: "Escape" });
      fireEvent.mouseDown(dialog.parentElement);
      expect(screen.getByRole("dialog", { name: "Delete Service" })).toBeTruthy();
      expect(api.delete).toHaveBeenCalledTimes(1);
      resolveDelete({ data: { message: "Service deleted successfully" } });
      await waitFor(() => expect(screen.queryByText("Email")).toBeNull());
      expect(screen.getByText("Library")).toBeTruthy();
      expect(screen.getByLabelText("Search services").value).toBe("Campus");
      expect(toast.success).toHaveBeenCalledWith("Service deleted successfully.");
      fireEvent.click(screen.getByRole("button", { name: view === "list" ? "Grid View" : "List View" }));
      expect(screen.queryByText("Email")).toBeNull();
      expect(screen.getByText("Library")).toBeTruthy();
    });

    it("does not delete when confirmation is cancelled and restores focus", async () => {
      renderApp();
      const trigger = await screen.findByRole("button", { name: "Delete Email" });
      trigger.focus();
      fireEvent.click(trigger);
      const dialog = screen.getByRole("dialog", { name: "Delete Service" });
      expect(document.activeElement).toBe(dialog);
      fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(api.delete).not.toHaveBeenCalled();
      expect(screen.getByText("Email")).toBeTruthy();
      expect(document.activeElement).toBe(trigger);
    });

    it("keeps the service and reports failures", async () => {
      api.delete.mockRejectedValue({ response: { data: { message: "Cannot delete service" } } });
      renderApp();
      fireEvent.click(await screen.findByRole("button", { name: "Delete Email" }));
      const dialog = screen.getByRole("dialog", { name: "Delete Service" });
      fireEvent.click(within(dialog).getByRole("button", { name: "Delete Service" }));
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Cannot delete service"));
      expect(screen.getByText("Email")).toBeTruthy();
      expect(within(dialog).getByRole("button", { name: "Delete Service" }).disabled).toBe(false);
    });

    it.each(["Escape", "backdrop", "close"])("dismisses with %s without deleting", async (method) => {
      renderApp();
      fireEvent.click(await screen.findByRole("button", { name: "Delete Email" }));
      const dialog = screen.getByRole("dialog", { name: "Delete Service" });
      if (method === "Escape") fireEvent.keyDown(dialog, { key: "Escape" });
      if (method === "backdrop") fireEvent.mouseDown(dialog.parentElement);
      if (method === "close") fireEvent.click(within(dialog).getByRole("button", { name: "Close modal" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(api.delete).not.toHaveBeenCalled();
    });

    it.each([
      [{ role: "staff", can_access_services: false }, true],
      [{ role: "staff", can_access_services: true }, false],
    ])("respects service section access for %o", async (staff, disabled) => {
      render(
        <AuthContext.Provider value={{ user: staff }}>
          <Services />
        </AuthContext.Provider>,
      );
      const deleteButton = await screen.findByRole("button", { name: "Delete Email" });
      expect(deleteButton.disabled).toBe(disabled);
      fireEvent.click(screen.getByRole("button", { name: "Grid View" }));
      expect(screen.getByRole("button", { name: "Delete Email" }).disabled).toBe(disabled);
      if (disabled) {
        fireEvent.click(screen.getByRole("button", { name: "Delete Email" }));
        expect(api.delete).not.toHaveBeenCalled();
      }
    });
  });

  describe("Search and category filter", () => {
    const services = [
      { id: 1, title: "Student Portal", description: "Grades", category_id: 2 },
      { id: 2, title: "Library", description: "For STUDENT use", category_id: 3 },
      { id: 3, title: "Email", description: "Campus mail", category_id: 2 },
    ];
    const categories = [
      { id: 2, name: "Academic Services", type: "service" },
      { id: 3, name: "Support", type: "service" },
      { id: 4, name: "Rules", type: "policy" },
    ];

    beforeEach(() => {
      api.get.mockImplementation((path) => Promise.resolve({
        data: path === "/services" ? services : categories,
      }));
    });

    const search = (value) => fireEvent.change(
      screen.getByLabelText("Search services"), { target: { value } },
    );
    const category = (value) => fireEvent.change(
      screen.getByLabelText("Filter by category"), { target: { value } },
    );

    it("filters by title, description, category and both together", async () => {
      renderApp();
      await screen.findByText("Email");
      await waitFor(() => expect(screen.getByRole("option", { name: "Support" })).toBeTruthy());
      expect(screen.queryByRole("option", { name: "Rules" })).toBeNull();
      const options = screen.getByLabelText("Filter by category").options;
      expect(options[0].textContent).toBe("All Categories");
      expect(options[0].value).toBe("");

      search("  STUDENT ");
      expect(screen.getByText("Student Portal")).toBeTruthy();
      expect(screen.getByText("Library")).toBeTruthy();
      expect(screen.queryByText("Email")).toBeNull();

      category("2");
      expect(screen.getByText("Student Portal")).toBeTruthy();
      expect(screen.queryByText("Library")).toBeNull();

      search("");
      expect(screen.getByText("Email")).toBeTruthy();
      expect(screen.queryByText("Library")).toBeNull();

      search("stud");
      category("");
      expect(screen.getByText("Library")).toBeTruthy();
      expect(screen.queryByText("Email")).toBeNull();
    });

    it("keeps filters and shows the same records when switching to grid view", async () => {
      renderApp();
      await screen.findByText("Email");
      expect(screen.getByRole("table")).toBeTruthy();
      await waitFor(() => expect(screen.getByRole("option", { name: "Support" })).toBeTruthy());

      search("stud");
      category("2");
      fireEvent.click(screen.getByRole("button", { name: "Grid View" }));

      expect(screen.queryByRole("table")).toBeNull();
      expect(screen.getAllByRole("listitem")).toHaveLength(1);
      expect(screen.getByRole("heading", { name: "Student Portal" })).toBeTruthy();
      expect(screen.getByLabelText("Search services").value).toBe("stud");
      expect(screen.getByLabelText("Filter by category").value).toBe("2");

      fireEvent.click(screen.getByRole("button", { name: "List View" }));
      expect(screen.getByRole("table")).toBeTruthy();
    });

    it("shows empty states with a clear filters action", async () => {
      renderApp();
      await screen.findByText("Email");
      search("zzz");
      expect(screen.getByText("No services match your search.")).toBeTruthy();
      category("3");
      expect(screen.getByText("No services match your search in the selected category.")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
      expect(screen.getByText("Email")).toBeTruthy();
      expect(screen.getByLabelText("Search services").value).toBe("");
    });
  });

  describe("Service modal", () => {
    const service = {
      id: 1, title: "Email", url: "https://example.com", description: "Campus email",
      category_id: 2, image: "https://example.com/logo.png",
    };
    const categories = [
      { id: 2, name: "Tools", type: "service" },
      { id: 3, name: "Rules", type: "policy" },
    ];

    beforeEach(() => {
      api.get.mockImplementation((path) => {
        if (path === "/services") return Promise.resolve({ data: [service] });
        if (path === "/categories") return Promise.resolve({ data: categories });
        return Promise.reject(new Error("Unexpected request"));
      });
      toast.success.mockClear();
      toast.error.mockClear();
    });

    it("creates a service with an uploaded logo and refreshes the list", async () => {
      api.post.mockResolvedValue({ data: { message: "Created" } });
      renderApp();
      await screen.findByText("Campus email");
      fireEvent.click(screen.getByRole("button", { name: "Add Service" }));
      expect(screen.getByRole("dialog", { name: "Register a New Service" })).toBeTruthy();
      await screen.findByRole("option", { name: "Tools" });
      expect(screen.queryByRole("option", { name: "Rules" })).toBeNull();
      fireEvent.change(screen.getByLabelText("Category"), { target: { value: "2" } });
      fireEvent.change(screen.getByLabelText("Service Name"), { target: { value: "Portal" } });
      fireEvent.change(screen.getByLabelText("Service URL"), { target: { value: "https://example.com/portal" } });
      fireEvent.change(screen.getByLabelText("Summary"), { target: { value: "A portal" } });
      const logo = new File(["png data"], "new.png", { type: "image/png" });
      fireEvent.change(screen.getByLabelText("Service Logo"), {
        target: { files: [logo] },
      });
      expect(screen.getByRole("img", { name: "Service logo preview" }).getAttribute("src")).toBe("blob:service-logo-preview");
      api.get.mockImplementation((path) => path === "/services"
        ? Promise.resolve({ data: [service, { ...service, id: 4, title: "Portal" }] })
        : Promise.resolve({ data: categories }));
      fireEvent.click(screen.getByRole("button", { name: "Deploy Service" }));
      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(
          "/services",
          expect.any(FormData),
        ),
      );
      const formData = api.post.mock.calls[0][1];
      expect(formData.get("category_id")).toBe("2");
      expect(formData.get("title")).toBe("Portal");
      expect(formData.get("url")).toBe("https://example.com/portal");
      expect(formData.get("description")).toBe("A portal");
      expect(formData.get("image")).toBe(logo);
      await waitFor(() => expect(api.get.mock.calls.filter(([path]) => path === "/services")).toHaveLength(2));
      expect(await screen.findByText("Portal")).toBeTruthy();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(toast.success).toHaveBeenCalledWith("Service created successfully.");
    });

    it("edits existing values and preserves the existing logo", async () => {
      api.patch.mockResolvedValue({ data: { message: "Updated" } });
      renderApp();
      fireEvent.click(await screen.findByRole("button", { name: "Edit Email" }));
      await screen.findByRole("option", { name: "Tools" });
      expect(screen.getByRole("dialog", { name: "Edit Service" })).toBeTruthy();
      expect(screen.getByLabelText("Category").value).toBe("2");
      expect(screen.getByLabelText("Service Name").value).toBe("Email");
      expect(screen.getByLabelText("Service URL").value).toBe(service.url);
      expect(screen.getByLabelText("Summary").value).toBe(service.description);
      expect(screen.getByRole("img", { name: "Service logo preview" }).getAttribute("src")).toBe(service.image);
      fireEvent.change(screen.getByLabelText("Service Name"), { target: { value: "New email" } });
      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
      await waitFor(() =>
        expect(api.patch).toHaveBeenCalledWith(
          "/services/1",
          expect.any(FormData),
        ),
      );
      const formData = api.patch.mock.calls[0][1];
      expect(formData.get("category_id")).toBe("2");
      expect(formData.get("title")).toBe("New email");
      expect(formData.get("url")).toBe(service.url);
      expect(formData.get("description")).toBe(service.description);
      expect(formData.has("image")).toBe(false);
      await waitFor(() => expect(api.get.mock.calls.filter(([path]) => path === "/services")).toHaveLength(2));
      expect(toast.success).toHaveBeenCalledWith("Service updated successfully.");
    });

    it("closes and resets the form without submitting", async () => {
      renderApp();
      fireEvent.click(await screen.findByRole("button", { name: "Edit Email" }));
      await screen.findByRole("option", { name: "Tools" });
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      fireEvent.click(screen.getByRole("button", { name: "Add Service" }));
      expect(screen.getByLabelText("Service Name").value).toBe("");
      fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(api.post).not.toHaveBeenCalled();
      expect(api.patch).not.toHaveBeenCalled();
    });

    it("previews and submits a replacement logo", async () => {
      api.patch.mockResolvedValue({ data: {} });
      renderApp();
      fireEvent.click(await screen.findByRole("button", { name: "Edit Email" }));
      await screen.findByRole("option", { name: "Tools" });
      const replacement = new File(["webp data"], "replacement.webp", {
        type: "image/webp",
      });
      fireEvent.change(screen.getByLabelText("Service Logo"), {
        target: { files: [replacement] },
      });
      expect(screen.getByRole("img", { name: "Service logo preview" }).getAttribute("src")).toBe("blob:service-logo-preview");
      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
      await waitFor(() =>
        expect(api.patch).toHaveBeenCalledWith(
          "/services/1",
          expect.any(FormData),
        ),
      );
      expect(api.patch.mock.calls[0][1].get("image")).toBe(replacement);
    });

    it("supports drag-and-drop logo selection and rejects oversized files", async () => {
      renderApp();
      fireEvent.click(await screen.findByRole("button", { name: "Add Service" }));
      await screen.findByRole("option", { name: "Tools" });
      const dropTarget = screen.getByText("No logo selected.").parentElement;
      const logo = new File(["png data"], "drop.png", { type: "image/png" });
      fireEvent.drop(dropTarget, { dataTransfer: { files: [logo] } });
      expect(screen.getByRole("img", { name: "Service logo preview" }).getAttribute("src")).toBe("blob:service-logo-preview");

      const oversized = new File(
        [new Uint8Array(2 * 1024 * 1024 + 1)],
        "large.png",
        { type: "image/png" },
      );
      fireEvent.change(screen.getByLabelText("Service Logo"), {
        target: { files: [oversized] },
      });
      expect(screen.getByRole("alert").textContent).toBe(
        "Service logos must be 2 MB or smaller.",
      );

      fireEvent.change(screen.getByLabelText("Service Logo"), {
        target: { files: [logo] },
      });
      fireEvent.change(screen.getByLabelText("Category"), {
        target: { value: "2" },
      });
      fireEvent.change(screen.getByLabelText("Service Name"), {
        target: { value: "Dropped logo" },
      });
      fireEvent.change(screen.getByLabelText("Service URL"), {
        target: { value: "https://example.com/dropped" },
      });
      fireEvent.change(screen.getByLabelText("Summary"), {
        target: { value: "A dropped logo service" },
      });
      api.post.mockResolvedValue({ data: { message: "Created" } });
      fireEvent.click(screen.getByRole("button", { name: "Deploy Service" }));
      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(
          "/services",
          expect.any(FormData),
        ),
      );
      expect(api.post.mock.calls[0][1].get("image")).toBe(logo);
    });

    it("allows Escape and backdrop dismissal", async () => {
      renderApp();
      await screen.findByText("Campus email");
      fireEvent.click(screen.getByRole("button", { name: "Add Service" }));
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      fireEvent.click(screen.getByRole("button", { name: "Add Service" }));
      fireEvent.mouseDown(screen.getByRole("dialog").parentElement);
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    });

    it("prevents closing and duplicate submissions while saving, then reports failures", async () => {
      let rejectRequest;
      api.patch.mockReturnValue(new Promise((resolve, reject) => { rejectRequest = reject; }));
      renderApp();
      fireEvent.click(await screen.findByRole("button", { name: "Edit Email" }));
      await screen.findByRole("option", { name: "Tools" });
      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
      expect((await screen.findByRole("button", { name: "Saving..." })).disabled).toBe(true);
      expect(screen.getByRole("button", { name: "Cancel" }).disabled).toBe(true);
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
      fireEvent.submit(screen.getByRole("button", { name: "Saving..." }).closest("form"));
      expect(api.patch).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("dialog")).toBeTruthy();
      rejectRequest({ response: { data: { message: "Save failed" } } });
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Save failed"));
      expect(screen.getByRole("button", { name: "Save Changes" }).disabled).toBe(false);
    });

    it("shows a category error and prevents saving", async () => {
      api.get.mockImplementation((path) => path === "/categories"
        ? Promise.reject(new Error("network"))
        : Promise.resolve({ data: [service] }));
      renderApp();
      fireEvent.click(await screen.findByRole("button", { name: "Add Service" }));
      expect((await screen.findByRole("alert")).textContent).toBe("Unable to load service categories.");
      expect(screen.getByRole("button", { name: "Deploy Service" }).disabled).toBe(true);
    });

    it("shows field validation errors and blocks invalid submissions", async () => {
      renderApp();
      await screen.findByText("Campus email");
      fireEvent.click(screen.getByRole("button", { name: "Add Service" }));
      await screen.findByRole("option", { name: "Tools" });
      fireEvent.click(screen.getByRole("button", { name: "Deploy Service" }));
      expect(await screen.findByText("Select a service category.")).toBeTruthy();
      expect(screen.getByText("Service name is required.")).toBeTruthy();
      expect(screen.getByText("Service URL is required.")).toBeTruthy();
      expect(screen.getByText("Summary is required.")).toBeTruthy();
      fireEvent.change(screen.getByLabelText("Service URL"), { target: { value: "invalid" } });
      fireEvent.click(screen.getByRole("button", { name: "Deploy Service" }));
      expect(await screen.findByText("Enter a valid service URL.")).toBeTruthy();
      expect(api.post).not.toHaveBeenCalled();
    });

    it("opens a single modal for multiple services and resets values between edits", async () => {
      const second = { ...service, id: 2, title: "Library", description: "Library access", image: "" };
      api.get.mockImplementation((path) => path === "/services"
        ? Promise.resolve({ data: [service, second] })
        : Promise.resolve({ data: categories }));
      renderApp();
      fireEvent.click(await screen.findByRole("button", { name: "Edit Email" }));
      await screen.findByRole("option", { name: "Tools" });
      expect(screen.getAllByRole("dialog")).toHaveLength(1);
      fireEvent.change(screen.getByLabelText("Service Name"), { target: { value: "Unsaved" } });
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      fireEvent.click(screen.getByRole("button", { name: "Edit Library" }));
      await screen.findByRole("option", { name: "Tools" });
      expect(screen.getByLabelText("Service Name").value).toBe("Library");
      expect(screen.getByLabelText("Service Logo").value).toBe("");
    });

    it("resets fields when the selected service changes without unmounting", async () => {
      const { rerender } = render(<ServiceModal service={service} onClose={vi.fn()} onSaved={vi.fn()} />);
      await screen.findByRole("option", { name: "Tools" });
      fireEvent.change(screen.getByLabelText("Service Name"), { target: { value: "Unsaved" } });
      fireEvent.error(screen.getByRole("img", { name: "Service logo preview" }));
      const second = { ...service, id: 2, title: "Library", image: "https://example.com/library.png" };
      rerender(<ServiceModal service={second} onClose={vi.fn()} onSaved={vi.fn()} />);
      await waitFor(() => expect(screen.getByLabelText("Service Name").value).toBe("Library"));
      expect(screen.getByRole("img", { name: "Service logo preview" }).getAttribute("src")).toBe(second.image);
      rerender(<ServiceModal service={null} onClose={vi.fn()} onSaved={vi.fn()} />);
      await waitFor(() => expect(screen.getByLabelText("Service Name").value).toBe(""));
      expect(screen.getByLabelText("Service Logo").value).toBe("");
    });

    it("opens the create modal when there are no services", async () => {
      api.get.mockImplementation((path) => path === "/services"
        ? Promise.resolve({ data: [] })
        : Promise.resolve({ data: categories }));
      renderApp();
      await screen.findByText("No services available.");
      fireEvent.click(screen.getByRole("button", { name: "Add Service" }));
      expect(screen.getByRole("dialog", { name: "Register a New Service" })).toBeTruthy();
      await screen.findByRole("option", { name: "Tools" });
    });
  });

  it("shows an API error", async () => {
    api.get.mockRejectedValue({ response: { data: { message: "Services unavailable" } } });
    renderApp();
    expect((await screen.findByRole("alert")).textContent).toBe("Services unavailable");
  });

  it("reports an invalid response instead of showing an empty list", async () => {
    api.get.mockResolvedValue({ data: {} });
    renderApp();
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("Unable to load services."),
    );
  });
});
