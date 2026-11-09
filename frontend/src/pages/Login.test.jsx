// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "../context/authContextValue";
import Login from "./Login";

afterEach(cleanup);

it("navigates home without submitting the login form", () => {
  const login = vi.fn();
  render(
    <AuthContext.Provider value={{ login }}>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<h1>Homepage</h1>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  const home = screen.getByRole("link", { name: "Home" });
  expect(home.getAttribute("href")).toBe("/");
  expect(home.closest("form")).toBeNull();
  expect(home.parentElement).toBe(screen.getByRole("main"));
  expect(home.querySelector("svg").classList.contains("lucide-arrow-left")).toBe(true);
  fireEvent.click(home);
  expect(screen.getByRole("heading", { name: "Homepage" })).toBeTruthy();
  expect(login).not.toHaveBeenCalled();
});
