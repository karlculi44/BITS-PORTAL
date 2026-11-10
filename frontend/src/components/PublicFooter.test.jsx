// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PublicFooter from "./PublicFooter";

afterEach(cleanup);

describe("Public footer", () => {
  it("shows the organization marks, current copyright year, and attribution", () => {
    render(
      <MemoryRouter>
        <PublicFooter />
      </MemoryRouter>,
    );

    const footer = screen.getByRole("contentinfo");
    const logos = within(footer).getAllByRole("img");
    expect(logos.map((logo) => logo.getAttribute("alt"))).toEqual([
      "BITS Portal",
      "Bayawan City seal",
      "Information Technology Section",
    ]);
    expect(
      within(footer).getByText(
        `© ${new Date().getFullYear()} BITS Portal. All rights reserved.`,
      ),
    ).toBeTruthy();
    expect(
      footer.querySelector(".public-footer-developer").textContent,
    ).toContain("Developed by");
    const mpbLink = within(footer).getByRole("link", { name: "MPB" });
    expect(mpbLink.getAttribute("href")).toBe("https://mbmyportfolio.netlify.app/");
    expect(mpbLink.getAttribute("target")).toBe("_blank");
    expect(mpbLink.getAttribute("rel")).toBe("noopener noreferrer");
    const kzcLink = within(footer).getByRole("link", { name: "KZC" });
    expect(kzcLink.getAttribute("href")).toBe(
      "https://karl-culi-portfolio.vercel.app/",
    );
    expect(kzcLink.getAttribute("target")).toBe("_blank");
    expect(kzcLink.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("links only to the implemented home route when contact destinations are unavailable", () => {
    render(
      <MemoryRouter>
        <PublicFooter />
      </MemoryRouter>,
    );

    const footer = screen.getByRole("contentinfo");
    expect(
      within(footer).getByRole("link", { name: "BITS Portal home" }).getAttribute("href"),
    ).toBe("/");
    expect(
      within(footer).getByText(
        "Official contact and social links will appear here when available.",
      ).closest("a"),
    ).toBeNull();
  });
});
