"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart, HeatmapChart, SankeyChart, ScatterChart, CustomChart } from "echarts/charts";
import { GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, MarkAreaComponent, VisualMapComponent, DatasetComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import { LegacyGridContainLabel } from "echarts/features";
import type { EChartsCoreOption } from "echarts/core";

echarts.use([BarChart, LineChart, HeatmapChart, SankeyChart, ScatterChart, CustomChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, MarkAreaComponent, VisualMapComponent, DatasetComponent, SVGRenderer, LegacyGridContainLabel]);

export type ChartOption = EChartsCoreOption;

export function EChart({ option, height = 260, className, onClick }: { option: ChartOption; height?: number | string; className?: string; onClick?: (p: { name?: string; seriesName?: string; dataIndex?: number; data?: unknown }) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const clickRef = useRef(onClick);
  useEffect(() => {
    clickRef.current = onClick;
  }, [onClick]);

  useEffect(() => {
    if (!ref.current) return;
    const c = echarts.init(ref.current, undefined, { renderer: "svg" });
    chart.current = c;
    c.on("click", (p) => clickRef.current?.(p as never));
    const ro = new ResizeObserver(() => c.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      c.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    chart.current?.setOption(option, { replaceMerge: ["series", "xAxis", "yAxis", "legend", "visualMap"], lazyUpdate: true });
  }, [option]);

  // charts mirror themselves through their options; the container stays LTR so SVG text anchors are not flipped twice
  return <div ref={ref} dir="ltr" className={className} style={{ height, width: "100%" }} />;
}
