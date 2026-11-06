import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileText } from "lucide-react";
import ReactEChartsCore from "echarts-for-react/esm/core";
import * as echarts from "echarts/core";
import { PieChart } from "echarts/charts";
import { LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { useTheme } from "../context/themeContext";

echarts.use([PieChart, LegendComponent, TooltipComponent, CanvasRenderer]);

const CATEGORY_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#F97316",
  "#06B6D4",
  "#EC4899",
  "#84CC16",
  "#EF4444",
  "#6366F1",
];

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

const csvCell = (value) => `"${String(value).replace(/"/g, '""')}"`;

function getThemeColors(theme) {
  const styles = getComputedStyle(document.documentElement);
  const isDark = theme === "dark";
  const readColor = (name, fallback) =>
    styles.getPropertyValue(name).trim() || fallback;

  return {
    text: readColor("--app-text", isDark ? "#EAF2FF" : "#172B4D"),
    secondary: readColor(
      "--app-text-secondary",
      isDark ? "#B0BFD4" : "#586B83",
    ),
    surface: readColor("--app-surface", isDark ? "#111C2E" : "#FFFFFF"),
    border: readColor("--app-border", isDark ? "#293B55" : "#DCE6F1"),
  };
}

function CategoryDistributionChart({
  title,
  description,
  categories,
  filename,
  loading,
  error,
  onRetry,
}) {
  const { theme } = useTheme();
  const chartRef = useRef(null);
  const [exportError, setExportError] = useState("");
  const isDark = theme === "dark";
  const [themeColors, setThemeColors] = useState(() => getThemeColors(theme));
  const data = useMemo(
    () => categories.filter((category) => Number(category.count) > 0),
    [categories],
  );
  const total = data.reduce((sum, category) => sum + Number(category.count), 0);
  const {
    text: textColor,
    secondary: secondaryColor,
    surface: surfaceColor,
    border: borderColor,
  } = themeColors;
  const palette = useMemo(
    () =>
      data.map((_, index) => {
        if (CATEGORY_COLORS[index]) return CATEGORY_COLORS[index];
        const hue = Math.round((index * 137.508 + 24) % 360);
        return `hsl(${hue}, 68%, ${isDark ? 62 : 48}%)`;
      }),
    [data, isDark],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setThemeColors(getThemeColors(theme));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [theme]);

  const chartOption = useMemo(() => ({
    animationDuration: 550,
    animationDurationUpdate: 450,
    animationEasing: "cubicOut",
    color: palette,
    tooltip: {
      trigger: "item",
      confine: true,
      transitionDuration: 0.15,
      backgroundColor: surfaceColor,
      borderColor,
      borderWidth: 1,
      borderRadius: 10,
      padding: [10, 12],
      textStyle: { color: textColor, fontSize: 13 },
      extraCssText: "box-shadow: 0 8px 24px rgb(15 23 42 / 16%);",
      formatter: ({ name, value, percent }) =>
        `<div style="font-weight:600;margin-bottom:4px">${escapeHtml(name)}</div>` +
        `<div style="color:${secondaryColor}">${Number(value).toLocaleString()} records · ${percent}%</div>`,
    },
    legend: {
      type: "scroll",
      orient: "horizontal",
      left: 8,
      right: 8,
      bottom: 4,
      itemWidth: 9,
      itemHeight: 9,
      itemGap: 12,
      pageIconColor: secondaryColor,
      pageTextStyle: { color: secondaryColor },
      textStyle: { color: secondaryColor, fontSize: 12 },
      formatter: (name) =>
        name.length > 28 ? `${name.slice(0, 25)}...` : name,
    },
    series: [
      {
        name: title,
        type: "pie",
        radius: ["43%", "72%"],
        center: ["50%", "43%"],
        avoidLabelOverlap: true,
        selectedMode: false,
        itemStyle: {
          borderWidth: 0,
          borderColor: "transparent",
        },
        label: {
          show: data.length <= 5,
          color: textColor,
          fontSize: 12,
          formatter: "{d}%",
        },
        labelLine: { show: false },
        labelLayout: { hideOverlap: true },
        emphasis: {
          scale: true,
          scaleSize: 4,
          itemStyle: {
            borderWidth: 0,
            borderColor: "transparent",
          },
        },
        data: data.map(({ name, count }) => ({
          name,
          value: Number(count),
        })),
      },
    ],
  }), [
    borderColor,
    data,
    palette,
    secondaryColor,
    surfaceColor,
    textColor,
    title,
  ]);

  const exportCsv = () => {
    try {
      const rows = [
        ["Category", "Count", "Percentage"],
        ...data.map(({ name, count }) => [
          name,
          count,
          `${((Number(count) / total) * 100).toFixed(2)}%`,
        ]),
      ];
      const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
      const url = URL.createObjectURL(
        new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setExportError("");
    } catch (exportFailure) {
      console.error("Unable to export category data as CSV:", exportFailure);
      setExportError("Unable to export CSV. Please try again.");
    }
  };

  const exportPdf = async () => {
    try {
      const chart = chartRef.current?.getEchartsInstance();
      if (!chart) throw new Error("The category chart is not ready.");
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const chartImage = chart.getDataURL({
        type: "png",
        pixelRatio: 2,
        backgroundColor: surfaceColor,
      });
      const pdf = new jsPDF();
      pdf.setTextColor(23, 43, 77);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("BITS PORTAL", 15, 17);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Generated ${new Date().toLocaleString()}`, 15, 24);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.setTextColor(23, 43, 77);
      pdf.text(`${title} Report`, 15, 36);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.text(`Total records: ${total.toLocaleString()}`, 15, 44);

      const imageProperties = pdf.getImageProperties(chartImage);
      const imageWidth = 180;
      const imageHeight = Math.min(
        96,
        imageWidth * imageProperties.height / imageProperties.width,
      );
      pdf.addImage(chartImage, "PNG", 15, 52, imageWidth, imageHeight);
      autoTable(pdf, {
        startY: 52 + imageHeight + 8,
        head: [["Category", "Count", "Percentage"]],
        body: data.map(({ name, count }) => [
          name,
          Number(count).toLocaleString(),
          `${((Number(count) / total) * 100).toFixed(2)}%`,
        ]),
        theme: "grid",
        margin: { left: 15, right: 15 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255 },
        styles: { overflow: "linebreak", cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 112 },
          1: { cellWidth: 28, halign: "right" },
          2: { cellWidth: 35, halign: "right" },
        },
      });
      pdf.save(`${filename}.pdf`);
      setExportError("");
    } catch (exportFailure) {
      console.error("Unable to export category data as PDF:", exportFailure);
      setExportError("Unable to export PDF. Please try again.");
    }
  };

  const actionsDisabled = loading || Boolean(error) || total === 0;

  return (
    <section className="rounded-lg border border-slate-200 bg-[var(--app-surface)] p-5 shadow-sm">
      <header className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={exportCsv}
            disabled={actionsDisabled}
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={exportPdf}
            disabled={actionsDisabled}
          >
            <FileText size={14} />
            Export PDF
          </button>
        </div>
      </header>

      <div className="mb-1 text-sm text-slate-500">
        Total records: <span className="font-semibold text-slate-700">{total.toLocaleString()}</span>
      </div>

      {exportError && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {exportError}
        </p>
      )}

      {loading ? (
        <div
          className="flex h-72 animate-pulse flex-col items-center justify-center gap-3 rounded-md bg-slate-50"
          role="status"
        >
          <div className="h-36 w-36 rounded-full border-[18px] border-slate-200" />
          <span className="text-sm text-slate-500">Loading chart data...</span>
        </div>
      ) : error ? (
        <div className="flex h-72 flex-col items-center justify-center gap-3 text-center">
          <p role="alert" className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      ) : total === 0 ? (
        <div className="flex h-72 flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm font-medium text-slate-700">No records available</p>
          <p className="text-sm text-slate-500">
            There are no records available for this chart.
          </p>
        </div>
      ) : (
        <ReactEChartsCore
          ref={chartRef}
          echarts={echarts}
          option={chartOption}
          notMerge
          lazyUpdate
          style={{ height: 288, width: "100%" }}
        />
      )}
    </section>
  );
}

export default CategoryDistributionChart;
