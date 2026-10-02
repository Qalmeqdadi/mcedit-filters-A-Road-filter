/**
 * ECharts option builders implementing the house chart style:
 * recessive grid, thin marks, 2 px lines, rounded bar ends at the data end,
 * fixed categorical order, a single value axis, hover tooltips, and RTL mirroring.
 */
import type { ChartOption } from "./echart";

export const VIZ = ["#2f62a6", "#d07a1c", "#159a83", "#8a5cc0", "#d4a017", "#b5453a"];
export const SEQ = ["#e3edfa", "#b7d3f6", "#86b6ef", "#5598e7", "#2a78d6", "#1c5cab", "#104281", "#0a2c57"];
export const DIV_NEG = "#b5453a";
export const DIV_POS = "#2f62a6";
export const MALE = "#2f62a6";
export const FEMALE = "#d07a1c";
export const INK = { primary: "#141a24", secondary: "#5f6876", muted: "#808896", grid: "#ece7dc", axis: "#cfc6b4" };
const FONT = "IBM Plex Sans, IBM Plex Sans Arabic, system-ui, sans-serif";

export interface Opts {
  rtl?: boolean;
  fmt?: (v: number) => string;
  height?: number;
}

const tooltipBase = {
  backgroundColor: "#fffefb",
  borderColor: "#e3ddd0",
  borderWidth: 1,
  padding: [6, 10],
  textStyle: { color: INK.primary, fontFamily: FONT, fontSize: 12 },
  extraCssText: "box-shadow:0 4px 14px rgba(20,26,36,.12);border-radius:6px;",
};

export function base(rtl = false): ChartOption {
  return {
    animationDuration: 350,
    animationDurationUpdate: 300,
    textStyle: { fontFamily: FONT, color: INK.secondary, fontSize: 11 },
    grid: { left: rtl ? 12 : 8, right: rtl ? 8 : 12, top: 18, bottom: 6, containLabel: true },
    tooltip: { ...tooltipBase },
  };
}

const valueAxis = (fmt?: (v: number) => string) => ({
  type: "value" as const,
  axisLine: { show: false },
  axisTick: { show: false },
  splitLine: { lineStyle: { color: INK.grid } },
  axisLabel: { color: INK.muted, fontSize: 10.5, formatter: fmt ? (v: number) => fmt(v) : undefined },
});

const catAxis = (data: string[], extra: Record<string, unknown> = {}) => ({
  type: "category" as const,
  data,
  axisLine: { lineStyle: { color: INK.axis } },
  axisTick: { show: false },
  axisLabel: { color: INK.secondary, fontSize: 11 },
  ...extra,
});

/** Horizontal bars (categories on the y axis). */
export function barH(categories: string[], series: { name: string; data: number[]; color?: string }[], o: Opts & { stack?: boolean; showLabels?: boolean; legend?: boolean } = {}): ChartOption {
  const multi = series.length > 1;
  return {
    ...base(o.rtl),
    grid: { left: o.showLabels && o.rtl ? 48 : 8, right: o.showLabels && !o.rtl ? 48 : 16, top: multi && o.legend !== false ? 28 : 6, bottom: 4, containLabel: true },
    legend: multi && o.legend !== false ? { top: 0, [o.rtl ? "right" : "left"]: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: INK.secondary, fontSize: 11 } } : undefined,
    tooltip: { ...tooltipBase, trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: "rgba(47,98,166,0.06)" } }, valueFormatter: o.fmt },
    xAxis: { ...valueAxis(o.fmt), inverse: o.rtl },
    yAxis: { ...catAxis(categories), inverse: true, position: o.rtl ? "right" : "left" },
    series: series.map((s, i) => ({
      type: "bar",
      name: s.name,
      data: s.data,
      stack: o.stack ? "s" : undefined,
      barMaxWidth: 16,
      itemStyle: { color: s.color ?? VIZ[i % VIZ.length], borderRadius: o.stack ? 0 : o.rtl ? [4, 0, 0, 4] : [0, 4, 4, 0], borderColor: "#fffefb", borderWidth: o.stack ? 1 : 0 },
      label: o.showLabels ? { show: true, position: o.rtl ? "left" : "right", color: INK.secondary, fontSize: 10.5, formatter: (p: { value: number }) => (o.fmt ? o.fmt(p.value) : String(p.value)) } : undefined,
      emphasis: { focus: "none" },
    })),
  };
}

/** Vertical bars / columns. */
export function barV(categories: string[], series: { name: string; data: number[]; color?: string }[], o: Opts & { stack?: boolean; legend?: boolean; rotate?: number } = {}): ChartOption {
  const multi = series.length > 1;
  return {
    ...base(o.rtl),
    grid: { left: 8, right: 8, top: multi && o.legend !== false ? 30 : 12, bottom: 4, containLabel: true },
    legend: multi && o.legend !== false ? { top: 0, [o.rtl ? "right" : "left"]: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: INK.secondary, fontSize: 11 } } : undefined,
    tooltip: { ...tooltipBase, trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: "rgba(47,98,166,0.06)" } }, valueFormatter: o.fmt },
    xAxis: { ...catAxis(categories, { axisLabel: { color: INK.secondary, fontSize: 10.5, rotate: o.rotate ?? 0, interval: 0 } }), inverse: o.rtl },
    yAxis: { ...valueAxis(o.fmt), position: o.rtl ? "right" : "left" },
    series: series.map((s, i) => ({
      type: "bar",
      name: s.name,
      data: s.data,
      stack: o.stack ? "s" : undefined,
      barMaxWidth: 22,
      itemStyle: { color: s.color ?? VIZ[i % VIZ.length], borderRadius: o.stack ? 0 : [4, 4, 0, 0], borderColor: "#fffefb", borderWidth: o.stack ? 1 : 0 },
    })),
  };
}

/** Line / area over an ordered x axis. */
export function line(x: (string | number)[], series: { name: string; data: (number | null)[]; color?: string; dashed?: boolean; area?: boolean }[], o: Opts & { yMax?: number; markX?: string | number; legend?: boolean } = {}): ChartOption {
  const multi = series.length > 1;
  return {
    ...base(o.rtl),
    grid: { left: 8, right: 12, top: multi && o.legend !== false ? 30 : 12, bottom: 4, containLabel: true },
    legend: multi && o.legend !== false ? { top: 0, [o.rtl ? "right" : "left"]: 0, itemWidth: 14, itemHeight: 2, textStyle: { color: INK.secondary, fontSize: 11 } } : undefined,
    tooltip: { ...tooltipBase, trigger: "axis", axisPointer: { type: "line", lineStyle: { color: INK.axis } }, valueFormatter: o.fmt },
    xAxis: { ...catAxis(x.map(String), { boundaryGap: false }), inverse: o.rtl },
    yAxis: { ...valueAxis(o.fmt), max: o.yMax, position: o.rtl ? "right" : "left" },
    series: series.map((s, i) => ({
      type: "line",
      name: s.name,
      data: s.data,
      showSymbol: false,
      symbolSize: 8,
      lineStyle: { width: 2, type: s.dashed ? "dashed" : "solid", color: s.color ?? VIZ[i % VIZ.length] },
      itemStyle: { color: s.color ?? VIZ[i % VIZ.length] },
      areaStyle: s.area ? { color: s.color ?? VIZ[i % VIZ.length], opacity: 0.08 } : undefined,
      markLine: o.markX !== undefined && i === 0 ? { symbol: "none", silent: true, lineStyle: { color: INK.secondary, type: "dashed", width: 1 }, label: { show: false }, data: [{ xAxis: String(o.markX) }] } : undefined,
    })),
  };
}

/** Population pyramid: males and females mirrored around zero. */
export function pyramid(labels: string[], m: number[], f: number[], o: Opts & { maleLabel: string; femaleLabel: string; compare?: { m: number[]; f: number[]; label: string } }): ChartOption {
  const max = Math.max(...m, ...f, ...(o.compare ? [...o.compare.m, ...o.compare.f] : [])) * 1.05;
  const leftIsMale = !o.rtl;
  const series: Record<string, unknown>[] = [
    { type: "bar", name: o.maleLabel, stack: "p", data: m.map((v) => (leftIsMale ? -v : v)), barCategoryGap: "12%", itemStyle: { color: MALE, borderRadius: leftIsMale ? [4, 0, 0, 4] : [0, 4, 4, 0] } },
    { type: "bar", name: o.femaleLabel, stack: "p", data: f.map((v) => (leftIsMale ? v : -v)), itemStyle: { color: FEMALE, borderRadius: leftIsMale ? [0, 4, 4, 0] : [4, 0, 0, 4] } },
  ];
  if (o.compare) {
    series.push({ type: "line", name: o.compare.label, step: "middle", symbol: "none", data: o.compare.m.map((v) => (leftIsMale ? -v : v)), lineStyle: { color: INK.primary, width: 1.5, type: "dashed" }, itemStyle: { color: INK.primary } });
    series.push({ type: "line", name: `${o.compare.label} `, step: "middle", symbol: "none", data: o.compare.f.map((v) => (leftIsMale ? v : -v)), lineStyle: { color: INK.primary, width: 1.5, type: "dashed" }, itemStyle: { color: INK.primary }, legendHoverLink: false });
  }
  return {
    ...base(o.rtl),
    grid: { left: 8, right: 8, top: 28, bottom: 4, containLabel: true },
    legend: { top: 0, data: [o.maleLabel, o.femaleLabel, ...(o.compare ? [o.compare.label] : [])], itemWidth: 10, itemHeight: 10, textStyle: { color: INK.secondary, fontSize: 11 } },
    tooltip: { ...tooltipBase, trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: "rgba(47,98,166,0.06)" } }, valueFormatter: (v: number) => (o.fmt ? o.fmt(Math.abs(v)) : String(Math.abs(v))) },
    xAxis: { ...valueAxis(), min: -max, max, axisLabel: { color: INK.muted, fontSize: 10, formatter: (v: number) => (o.fmt ? o.fmt(Math.abs(v)) : String(Math.abs(v))) } },
    yAxis: { ...catAxis(labels), position: o.rtl ? "right" : "left", axisLabel: { color: INK.secondary, fontSize: 10 } },
    series,
  };
}

export function heatmap(x: string[], y: string[], data: [number, number, number][], o: Opts & { min?: number; max?: number }): ChartOption {
  const max = o.max ?? Math.max(...data.map((d) => d[2]), 1);
  return {
    ...base(o.rtl),
    grid: { left: 8, right: 8, top: 8, bottom: 40, containLabel: true },
    tooltip: { ...tooltipBase, formatter: (p: { value: [number, number, number] }) => `${y[p.value[1]]} → ${x[p.value[0]]}<br/><b>${o.fmt ? o.fmt(p.value[2]) : p.value[2]}</b>` },
    xAxis: { ...catAxis(x, { axisLabel: { color: INK.secondary, fontSize: 10, rotate: 45, interval: 0 } }), inverse: o.rtl, splitArea: { show: false } },
    yAxis: { ...catAxis(y, { axisLabel: { color: INK.secondary, fontSize: 10.5 } }), inverse: true, position: o.rtl ? "right" : "left" },
    visualMap: { min: o.min ?? 0, max, calculable: false, orient: "horizontal", left: "center", bottom: 0, itemWidth: 10, itemHeight: 120, inRange: { color: SEQ }, textStyle: { color: INK.muted, fontSize: 10 }, formatter: (v: number) => (o.fmt ? o.fmt(v) : String(Math.round(v))) },
    series: [{ type: "heatmap", data, itemStyle: { borderColor: "#fffefb", borderWidth: 2, borderRadius: 2 }, emphasis: { itemStyle: { borderColor: INK.primary, borderWidth: 1 } } }],
  };
}

export function sankey(nodes: { name: string; color?: string }[], links: { source: string; target: string; value: number }[], o: Opts): ChartOption {
  return {
    ...base(o.rtl),
    tooltip: { ...tooltipBase, trigger: "item", valueFormatter: o.fmt },
    series: [{
      type: "sankey",
      left: 8, right: 90, top: 8, bottom: 8,
      orient: "horizontal",
      nodeGap: 6,
      nodeWidth: 10,
      draggable: false,
      emphasis: { focus: "adjacency" },
      data: nodes.map((n, i) => ({ name: n.name, itemStyle: { color: n.color ?? VIZ[i % VIZ.length], borderWidth: 0 } })),
      links,
      lineStyle: { color: "gradient", opacity: 0.32, curveness: 0.5 },
      label: { color: INK.primary, fontSize: 10.5, fontFamily: FONT },
    }],
  };
}

export function seqColor(t: number): string {
  const i = Math.max(0, Math.min(SEQ.length - 1, Math.floor(t * SEQ.length)));
  return SEQ[i];
}
