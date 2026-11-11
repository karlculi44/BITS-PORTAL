// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "../context/authContextValue";
import { ThemeProvider } from "../context/ThemeProvider";
import AdminLayout from "./AdminLayout";

afterEach(cleanup);

describe("AdminLayout seasonal decorations", () => {
  it("keeps a single restrained decoration outside page content across routes", () => {
    const { container } = render(
      <AuthContext.Provider value={{ user: { role: "admin", first_name: "Admin" } }}>
        <ThemeProvider>
          <MemoryRouter initialEntries={["/dashboard"]}>
            <Routes>
              <Route element={<AdminLayout />}>
                <Route path="/dashboard" element={<p>Dashboard content</p>} />
                <Route path="/services" element={<p>Services content</p>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </AuthContext.Provider>,
    );
    const band = container.querySelector(".christmas-ornaments--admin");
    expect(band.querySelectorAll(".christmas-ornament")).toHaveLength(3);
    expect(band.previousElementSibling.tagName).toBe("HEADER");
    expect(band.nextElementSibling.tagName).toBe("MAIN");

    fireEvent.click(screen.getByRole("link", { name: /services/i }));
    expect(screen.getByText("Services content")).toBeTruthy();
    expect(container.querySelectorAll(".christmas-ornaments--admin")).toHaveLength(1);
    expect(container.querySelector(".christmas-ornaments--admin")).toBe(band);
  });
});
