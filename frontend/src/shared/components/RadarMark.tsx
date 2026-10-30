/** Small live radar shown before the "LeadScout AI" wordmark: the same sweep and pin colours as the
 *  landing hero (lavender = website listed, amber = none listed). Purely decorative. Styles in layout.css. */
export default function RadarMark() {
  return (
    <span className="radar-mark" aria-hidden="true">
      <span className="radar-mark__ring" />
      <span className="radar-mark__sweep" />
      <span className="radar-mark__pin radar-mark__pin--listed" />
      <span className="radar-mark__pin radar-mark__pin--none" />
      <span className="radar-mark__centre" />
    </span>
  );
}
