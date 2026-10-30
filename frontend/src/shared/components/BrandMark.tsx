import RadarMark from "./RadarMark";

export default function BrandMark() {
  return (
    <span className="brand">
      <RadarMark />
      <span className="brand__name">LeadScout</span>
      <span className="brand__badge">AI</span>
    </span>
  );
}
