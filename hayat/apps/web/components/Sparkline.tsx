interface Props {
  values: number[];
  target: number;
  width?: number;
  height?: number;
  color: string;
}

/** Projected days of cover with the safety target as a dashed reference line. */
export function Sparkline({ values, target, width = 220, height = 54, color }: Props) {
  const max = Math.max(target * 1.6, ...values);
  const x = (i: number) => (i / Math.max(1, values.length - 1)) * width;
  const y = (v: number) => height - 4 - (v / max) * (height - 8);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  return (
    <svg className="spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden>
      <line x1="0" x2={width} y1={y(target)} y2={y(target)} className="spark-target" />
      <path d={`${line}L${width},${height}L0,${height}Z`} fill={color} opacity="0.12" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
