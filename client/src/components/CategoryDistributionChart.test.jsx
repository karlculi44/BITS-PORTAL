// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import CategoryDistributionChart from "./CategoryDistributionChart";
import { ThemeContext } from "../context/themeContext";

const { mockGetDataURL, mockPdf, mockAutoTable } = vi.hoisted(() => ({
  mockGetDataURL: vi.fn(() => "data:image/png;base64,chart"),
  mockPdf: {
    addImage: vi.fn(),
    getImageProperties: vi.fn(() => ({ width: 600, height: 300 })),
    save: vi.fn(),
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
  },
  mockAutoTable: vi.fn(),
}));

vi.mock("echarts/core", () => ({ use: vi.fn() }));
vi.mock("echarts-for-react/esm/core", async () => {
  const React = await import("react");
  return {
    default: React.forwardRef(function MockChart({ option }, ref) {
      React.useImperativeHandle(ref, () => ({
        getEchartsInstance: () => ({ getDataURL: mockGetDataURL }),
      }));
      return (
        <div
          data-testid="chart"
          data-category-count={option.series[0].data.length}
          data-border-width={option.series[0].itemStyle.borderWidth}
          data-colors={option.color.join(",")}
        />
      );
    }),
  };
});
vi.mock("jspdf", () => ({
  jsPDF: vi.fn(function MockJsPDF() {
    return mockPdf;
  }),
}));
vi.mock("jspdf-autotable", () => ({ default: mockAutoTable }));

const categories = [
  { name: 'IT, "Support"', count: 2 },
  { name: "Academic", count: 1 },
];

function renderChart(props = {}) {
  return render(
    <ThemeContext.Provider value={{ theme: "light" }}>
      <CategoryDistributionChart
        title="Services by Category"
        description="Distribution of registered services across categories."
        categories={categories}
        filename="services-by-category"
        loading={false}
        error=""
        onRetry={vi.fn()}
        {...props}
      />
    </ThemeContext.Provider>,
  );
}

beforeEach(() => {
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:category-report"),
    revokeObjectURL: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  window.requestAnimationFrame = (callback) => {
    callback();
    return 1;
  };
  mockGetDataURL.mockClear();
  mockAutoTable.mockClear();
  Object.values(mockPdf).forEach((mock) => mock.mockClear());
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("CategoryDistributionChart", () => {
  it("shows loading, empty, and retryable error states", () => {
    const { rerender } = renderChart({ loading: true });
    expect(screen.getByRole("status").textContent).toContain("Loading chart data");

    rerender(
      <ThemeContext.Provider value={{ theme: "light" }}>
        <CategoryDistributionChart
          title="Services by Category"
          description="Services"
          categories={[]}
          filename="services-by-category"
          loading={false}
          error=""
          onRetry={vi.fn()}
        />
      </ThemeContext.Provider>,
    );
    expect(screen.getByText("No records available")).toBeTruthy();

    const onRetry = vi.fn();
    rerender(
      <ThemeContext.Provider value={{ theme: "light" }}>
        <CategoryDistributionChart
          title="Services by Category"
          description="Services"
          categories={[]}
          filename="services-by-category"
          loading={false}
          error="Unable to load dashboard data."
          onRetry={onRetry}
        />
      </ThemeContext.Provider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders positive categories in distinct colors without segment outlines", () => {
    renderChart({
      categories: [...categories, { name: "Unused", count: 0 }],
    });

    expect(screen.getByText("Total records:")).toBeTruthy();
    expect(screen.getByTestId("chart").getAttribute("data-category-count")).toBe("2");
    expect(screen.getByTestId("chart").getAttribute("data-border-width")).toBe("0");
    const colors = screen.getByTestId("chart").getAttribute("data-colors").split(",");
    expect(colors[0]).not.toBe(colors[1]);
    expect(colors[1]).toBe("#10B981");
  });

  it("exports escaped category names and percentages as CSV", async () => {
    renderChart();

    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledOnce());
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();

    const csvBlob = URL.createObjectURL.mock.calls[0][0];
    const csv = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsText(csvBlob);
    });

    expect(csv).toContain('"Category","Count","Percentage"');
    expect(csv).toContain('"IT, ""Support"""');
    expect(csv).toContain("66.67%");
    expect(csv).toContain("33.33%");
  });

  it("exports the rendered chart and category table to PDF", async () => {
    renderChart();

    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));
    await waitFor(() => expect(mockPdf.save).toHaveBeenCalledWith(
      "services-by-category.pdf",
    ));

    expect(mockGetDataURL).toHaveBeenCalledWith(
      expect.objectContaining({ type: "png", pixelRatio: 2 }),
    );
    expect(mockPdf.addImage).toHaveBeenCalled();
    expect(mockAutoTable.mock.calls[0][1].body).toEqual([
      ['IT, "Support"', "2", "66.67%"],
      ["Academic", "1", "33.33%"],
    ]);
  });
});
