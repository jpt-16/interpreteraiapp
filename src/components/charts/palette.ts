/**
 * Categorical series colors for charts on the dark surface (#10141d).
 * Validated with the dataviz palette validator (lightness band, chroma,
 * CVD separation ΔE ≥ 9.4, normal-vision ΔE ≥ 26.5, contrast ≥ 3:1).
 * Assign in this fixed order; charts never use more than three series.
 */
export const SERIES = ["#3987e5", "#d95926", "#199e70"] as const;

export const CHART = {
  grid: "#1f2633",
  axis: "#5d6678",
  text: "#8b94a6",
  surface: "#10141d",
};
