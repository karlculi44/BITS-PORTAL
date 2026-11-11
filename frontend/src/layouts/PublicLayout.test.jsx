// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "../context/authContextValue";
import { ThemeProvider } from "../context/ThemeProvider";
import PublicLayout from "./PublicLayout";
import { ApplicationSnowfall } from "../features/seasonal";

afterEach(cleanup);

const publicPaths = ["/", "/about", "/policy-library", "/login", "/unauthorized"];
const publicRoutes = publicPaths.map((path) => ({ path }));

function renderLayout(path = "/") {
  return render(
    <AuthContext.Provider value={{ user: null, loading: false }}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[path]}>
          <div className="seasonal-scene">
            <ApplicationSnowfall publicRoutes={publicRoutes} />
            <Routes>
              <Route element={<PublicLayout />}>
                {publicPaths.map((route, index) => (
                  <Route
                    key={route}
                    path={route}
                    element={<Link to={publicPaths[(index + 1) % publicPaths.length]}>Next route</Link>}
                  />
                ))}
              </Route>
            </Routes>
          </div>
        </MemoryRouter>
      </ThemeProvider>
    </AuthContext.Provider>,
  );
}

describe("PublicLayout snowfall", () => {
  it.each(publicPaths)("provides all layers on direct access to %s", (path) => {
    const { container } = renderLayout(path);
    expect(container.querySelectorAll(".christmas-snowfall--public")).toHaveLength(1);
    expect(container.querySelectorAll(".christmas-snowfall-layer")).toHaveLength(3);
  });

  it("retains snow across every public route and leaves existing header decorations intact", () => {
    const { container } = renderLayout();
    const snow = container.querySelector(".christmas-snowfall--public");
    const firstParticle = snow.querySelector("span");
    const lights = container.querySelector(".christmas-lights");
    const garland = container.querySelector(".christmas-garland");
    expect(snow.querySelectorAll(".christmas-snowfall-layer")).toHaveLength(3);
    expect(snow.parentElement.className).toBe("seasonal-scene");
    expect(container.querySelector(".public-outlet-transition .christmas-snowfall")).toBeNull();
    for (let index = 0; index < publicPaths.length; index += 1) {
      fireEvent.click(screen.getByRole("link", { name: "Next route" }));
      expect(container.querySelectorAll(".christmas-snowfall")).toHaveLength(1);
      expect(container.querySelector(".christmas-snowfall")).toBe(snow);
      expect(snow.querySelector("span")).toBe(firstParticle);
    }
    expect(container.querySelector(".christmas-lights")).toBe(lights);
    expect(container.querySelector(".christmas-garland")).toBe(garland);
  });
});
