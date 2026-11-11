// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AuthContext } from "../context/authContextValue";
import { deleteCategory, getCategories, setDefaultCategory } from "../services/categoryService";
import toast from "react-hot-toast";
import Categories from "./Categories";

vi.mock("../services/categoryService", () => ({
  deleteCategory: vi.fn(),
  getCategories: vi.fn(),
  setDefaultCategory: vi.fn(),
}));
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const serviceCategories = [
  {
    id: 1,
    name: "IT Services",
    type: "service",
    item_count: 2,
    is_active: true,
    is_default: false,
  },
  {
    id: 2,
    name: "Others",
    type: "service",
    item_count: 0,
    is_active: true,
    is_default: false,
  },
];
const policyCategories = [
  {
    id: 3,
    name: "Executive Orders",
    type: "policy",
    item_count: 1,
    is_active: true,
    is_default: false,
  },
];

const renderPage = () =>
  render(
    <AuthContext.Provider
      value={{ user: { role: "admin" }, loading: false, logout: vi.fn() }}
    >
      <Categories />
    </AuthContext.Provider>,
  );

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("Categories page item counts", () => {
  it("shows service totals, zero counts, and policy-only counts", async () => {
    getCategories.mockImplementation((type) =>
      Promise.resolve(type === "service" ? serviceCategories : policyCategories),
    );

    renderPage();

    const serviceTable = await screen.findByRole("table");
    expect(
      within(serviceTable).getByRole("columnheader", { name: "Items" }),
    ).toBeTruthy();
    expect(
      within(
        within(serviceTable).getByRole("row", { name: /All Categories/ }),
      ).getByText("2"),
    ).toBeTruthy();
    expect(
      within(within(serviceTable).getByRole("row", { name: /Others/ })).getByText(
        "0",
      ),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Policy Categories" }));

    const policyTable = await screen.findByRole("table");
    expect(
      within(policyTable).getByRole("columnheader", { name: "Items" }),
    ).toBeTruthy();
    expect(
      within(
        within(policyTable).getByRole("row", { name: /Executive Orders/ }),
      ).getByText("1"),
    ).toBeTruthy();
    expect(
      within(policyTable).queryByRole("row", { name: /All Categories/ }),
    ).toBeNull();
    expect(within(policyTable).queryByRole("columnheader", { name: "Default" })).toBeNull();
    expect(within(policyTable).queryByRole("checkbox")).toBeNull();
  });

  it("switches the service default and persists the virtual All Categories selection", async () => {
    getCategories.mockResolvedValue(serviceCategories);
    setDefaultCategory.mockResolvedValue({});
    renderPage();

    const all = await screen.findByRole("checkbox", { name: "Set All Categories as default service category" });
    const first = screen.getByRole("checkbox", { name: "Set IT Services as default service category" });
    const second = screen.getByRole("checkbox", { name: "Set Others as default service category" });
    expect(all.checked).toBe(true);

    fireEvent.click(first);
    await waitFor(() => expect(first.checked).toBe(true));
    expect(setDefaultCategory).toHaveBeenLastCalledWith(1, true);
    expect(all.checked).toBe(false);

    fireEvent.click(second);
    await waitFor(() => expect(second.checked).toBe(true));
    expect(setDefaultCategory).toHaveBeenLastCalledWith(2, true);
    expect(first.checked).toBe(false);

    fireEvent.click(all);
    await waitFor(() => expect(all.checked).toBe(true));
    expect(setDefaultCategory).toHaveBeenLastCalledWith(2, false);
    expect(second.checked).toBe(false);
  });

  describe("Category deletion", () => {
    it.each(["service", "policy"])("confirms and reloads after deleting a %s category", async (type) => {
      getCategories.mockImplementation((categoryType) =>
        Promise.resolve(categoryType === "service" ? serviceCategories : policyCategories),
      );
      deleteCategory.mockResolvedValue({});
      renderPage();
      await screen.findByRole("button", { name: "Delete IT Services" });
      if (type === "policy") fireEvent.click(screen.getByRole("tab", { name: "Policy Categories" }));
      const name = type === "service" ? "IT Services" : "Executive Orders";
      const id = type === "service" ? 1 : 3;
      fireEvent.click(await screen.findByRole("button", { name: `Delete ${name}` }));
      const dialog = screen.getByRole("dialog", { name: "Delete Category" });
      expect(dialog.textContent).toContain(`Delete category "${name}"?`);
      expect(deleteCategory).not.toHaveBeenCalled();
      fireEvent.click(within(dialog).getByRole("button", { name: "Delete Category" }));
      await waitFor(() => expect(deleteCategory).toHaveBeenCalledWith(id));
      await waitFor(() => expect(screen.queryByRole("dialog", { name: "Delete Category" })).toBeNull());
      expect(toast.success).toHaveBeenCalledWith("Category deleted successfully.");
      await waitFor(() => expect(getCategories.mock.calls.filter(([tab]) => tab === type)).toHaveLength(2));
    });

    it("keeps the confirmation open after a failed deletion", async () => {
      getCategories.mockResolvedValue(serviceCategories);
      deleteCategory.mockRejectedValue({ response: { data: { message: "Category in use" } } });
      renderPage();
      fireEvent.click(await screen.findByRole("button", { name: "Delete IT Services" }));
      const dialog = screen.getByRole("dialog", { name: "Delete Category" });
      fireEvent.click(within(dialog).getByRole("button", { name: "Delete Category" }));
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Category in use"));
      expect(within(dialog).getByRole("button", { name: "Delete Category" }).disabled).toBe(false);
    });
  });
});
