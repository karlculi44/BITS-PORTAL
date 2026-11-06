// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../App";
import { AuthContext } from "../context/authContextValue";
import api from "../services/api";
import toast from "react-hot-toast";
import ServiceModal from "../components/ServiceModal";

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

const user = { first_name: "Test", last_name: "Admin", role: "admin" };

function renderApp() {
  window.history.pushState({}, "", "/services");
  return render(
    <AuthContext.Provider value={{ user, loading: false, logout: vi.fn() }}>
      <App />
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  vi.spyOn(api, "get");
  vi.spyOn(api, "post");
  vi.spyOn(api, "patch");
  vi.spyOn(api, "delete");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Services page", () => {
  it("loads the API records in the dashboard and keeps delete inert", async () => {
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
        { id: 1, title: "Email", description: "Campus email", image: "https://example.com/email.png" },
        { id: 2, title: "Library", description: "  ", image: null },
      ],
    });

    expect(await screen.findByText("Campus email")).toBeTruthy();
    expect(screen.getByText("Email")).toBeTruthy();
    expect(screen.getByText("Library")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Email logo" }).getAttribute("src"))
      .toBe("https://example.com/email.png");
    expect(screen.getByLabelText("No service logo")).toBeTruthy();
    expect(screen.getByText("No description available.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Delete Email" }));
    expect(api.get).toHaveBeenCalledTimes(1);
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

    it("creates a service, filters categories, previews the logo and refreshes the list", async () => {
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
      fireEvent.change(screen.getByLabelText("Service Logo"), { target: { value: "https://example.com/new.png" } });
      expect(screen.getByRole("img", { name: "Service logo preview" }).getAttribute("src")).toBe("https://example.com/new.png");
      api.get.mockImplementation((path) => path === "/services"
        ? Promise.resolve({ data: [service, { ...service, id: 4, title: "Portal" }] })
        : Promise.resolve({ data: categories }));
      fireEvent.click(screen.getByRole("button", { name: "Deploy Service" }));
      await waitFor(() => expect(api.post).toHaveBeenCalledWith("/services", {
        category_id: 2, title: "Portal", url: "https://example.com/portal",
        description: "A portal", image: "https://example.com/new.png",
      }));
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
      await waitFor(() => expect(api.patch).toHaveBeenCalledWith("/services/1", {
        category_id: 2, title: "New email", url: service.url,
        description: service.description, image: service.image,
      }));
      await waitFor(() => expect(api.get.mock.calls.filter(([path]) => path === "/services")).toHaveLength(2));
      expect(toast.success).toHaveBeenCalledWith("Service updated successfully.");
    });

    it("closes and resets the form without submitting", async () => {
      renderApp();
      fireEvent.click(await screen.findByRole("button", { name: "Edit Email" }));
      await screen.findByRole("option", { name: "Tools" });
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      fireEvent.click(screen.getByRole("button", { name: "Add Service" }));
      expect(screen.getByLabelText("Service Name").value).toBe("");
      fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(api.post).not.toHaveBeenCalled();
      expect(api.patch).not.toHaveBeenCalled();
    });

    it("can clear an existing logo and previews replacements", async () => {
      api.patch.mockResolvedValue({ data: {} });
      renderApp();
      fireEvent.click(await screen.findByRole("button", { name: "Edit Email" }));
      await screen.findByRole("option", { name: "Tools" });
      fireEvent.change(screen.getByLabelText("Service Logo"), { target: { value: "https://example.com/replacement.png" } });
      expect(screen.getByRole("img", { name: "Service logo preview" }).getAttribute("src")).toBe("https://example.com/replacement.png");
      fireEvent.change(screen.getByLabelText("Service Logo"), { target: { value: "" } });
      expect(screen.getByText("No logo selected.")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
      await waitFor(() => expect(api.patch).toHaveBeenCalledWith("/services/1", {
        category_id: 2, title: service.title, url: service.url,
        description: service.description, image: null,
      }));
    });

    it("allows Escape and backdrop dismissal", async () => {
      renderApp();
      await screen.findByText("Campus email");
      fireEvent.click(screen.getByRole("button", { name: "Add Service" }));
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Add Service" }));
      fireEvent.mouseDown(screen.getByRole("dialog").parentElement);
      expect(screen.queryByRole("dialog")).toBeNull();
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
