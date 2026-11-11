// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import ApplicationSnowfall from "./ApplicationSnowfall";

const publicPaths = ["/", "/about", "/policy-library", "/login", "/unauthorized"];
const adminPaths = ["/dashboard", "/services", "/policies", "/categories", "/users", "/activity-logs"];
const paths = [...publicPaths, ...adminPaths, "/future-admin-route"];

afterEach(cleanup);

function HistoryControls() {
  const navigate = useNavigate();
  return (
    <>
      <button onClick={() => navigate(-1)}>Back</button>
      <button onClick={() => navigate(1)}>Forward</button>
    </>
  );
}

function renderRoutes(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ApplicationSnowfall publicRoutes={publicPaths.map((publicPath) => ({ path: publicPath }))} />
      <HistoryControls />
      <Routes>
        {paths.map((route) => (
          <Route key={route} path={route} element={(
            <main>
              <h1>{route}</h1>
              {paths.map((destination) => <Link key={destination} to={destination}>{destination}</Link>)}
            </main>
          )} />
        ))}
      </Routes>
    </MemoryRouter>,
  );
}

describe("ApplicationSnowfall", () => {
  it.each(paths)("selects the correct preset on direct access to %s", (path) => {
    const { container } = renderRoutes(path);
    const preset = publicPaths.includes(path) ? "public" : "admin";
    expect(container.querySelectorAll(".christmas-snowfall")).toHaveLength(1);
    expect(container.querySelector(`.christmas-snowfall--${preset}`)).not.toBeNull();
    expect(container.querySelectorAll(".christmas-snowfall-layer")).toHaveLength(3);
  });

  it("retains the system and particle nodes across routes, preset switches and history", () => {
    const { container } = renderRoutes("/");
    const snow = container.querySelector(".christmas-snowfall");
    const layers = [...snow.children];
    const firstParticles = layers.map((layer) => layer.firstChild);
    for (const path of paths) {
      fireEvent.click(screen.getByRole("link", { name: path, exact: true }));
      expect(screen.getByRole("heading", { name: path, exact: true })).toBeTruthy();
      expect(container.querySelectorAll(".christmas-snowfall")).toHaveLength(1);
      expect(container.querySelector(".christmas-snowfall")).toBe(snow);
      expect([...snow.children]).toEqual(layers);
      expect([...snow.children].map((layer) => layer.firstChild)).toEqual(firstParticles);
    }
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "/activity-logs", exact: true })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Forward" }));
    expect(screen.getByRole("heading", { name: "/future-admin-route", exact: true })).toBeTruthy();
    expect(container.querySelector(".christmas-snowfall")).toBe(snow);
    expect([...snow.children].map((layer) => layer.firstChild)).toEqual(firstParticles);
  });
});
