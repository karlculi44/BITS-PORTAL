// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { AuthContext } from "../context/authContextValue";
import { getCategories } from "../services/categoryService";
import Categories from "./Categories";

vi.mock("../services/categoryService", () => ({
  deleteCategory: vi.fn(),
  getCategories: vi.fn(),
  setDefaultCategory: vi.fn(),
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
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
  });
});
