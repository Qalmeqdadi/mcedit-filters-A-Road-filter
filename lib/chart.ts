/**
 * Chart palette — validated (lightness band, chroma floor, CVD separation,
 * normal-vision floor, contrast) with the dataviz validator against #FCFCFB.
 * Categorical hues are assigned in this fixed order, never cycled.
 */
export const CHART = {
  series: ["#3A66A7", "#B8860B", "#B8196B"] as const,
  grid: "#ECE9E3",
  axis: "#8A96AD",
  ink: "#0F2240",
  inkMuted: "#5B6F92",
  reference: "#8A96AD",
};
