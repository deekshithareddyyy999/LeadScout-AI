// Hero illustration: one example search playing out — the area is swept, businesses appear (same colours as the
// real map: lavender = website listed, amber = no website listed), one is analysed, and a posted job arrives.
// It is an illustration with made-up names, labelled "Example"; nothing here is live data.

const PINS: { x: number; y: number; none?: boolean; delay: number }[] = [
  { x: 30, y: 34, delay: 0.55 },
  { x: 62, y: 26, none: true, delay: 0.7 },
  { x: 72, y: 58, delay: 0.85 },
  { x: 41, y: 66, none: true, delay: 1.0 },
  { x: 22, y: 55, delay: 1.1 },
  { x: 55, y: 74, delay: 1.2 },
  { x: 79, y: 38, none: true, delay: 1.3 },
];
const TARGET = { x: 46, y: 26 };

export default function ScoutScene() {
  return (
    <figure className="scout" aria-label="Example: a freelancer searches an area, one business is flagged as needing attention, and a business posts a job with a budget.">
      <div className="scout__map" aria-hidden="true">
        <svg className="scout__streets" viewBox="0 0 100 80" preserveAspectRatio="none">
          <rect x="6" y="8" width="16" height="12" rx="1.5" className="scout__park" />
          <rect x="70" y="64" width="20" height="10" rx="1.5" className="scout__park" />
          <path d="M0 22 L100 18" className="scout__road scout__road--main" />
          <path d="M0 60 L100 52" className="scout__road scout__road--main" />
          <path d="M34 0 L28 80" className="scout__road scout__road--main" />
          <path d="M70 0 L76 80" className="scout__road" />
          <path d="M0 40 L100 36" className="scout__road" />
          <path d="M52 0 L50 80" className="scout__road" />
          <path d="M12 0 L16 80" className="scout__road" />
          <path d="M0 72 C30 64 60 80 100 70" className="scout__road" />
        </svg>

        <div className="scout__radius" />
        <div className="scout__sweep" />

        {PINS.map((p) => (
          <span
            key={`${p.x}-${p.y}`}
            className={`scout__pin${p.none ? " scout__pin--none" : ""}`}
            style={{ left: `${p.x}%`, top: `${(p.y / 80) * 100}%`, animationDelay: `${p.delay}s` }}
          />
        ))}
        <span className="scout__pin scout__pin--none scout__pin--target" style={{ left: `${TARGET.x}%`, top: `${(TARGET.y / 80) * 100}%` }} />
        <span className="scout__centre" />
      </div>

      <figcaption className="scout__label">
        <span className="scout__example">Example</span> Bakeries within 2 km of Banjara Hills
      </figcaption>

      <div className="scout__card scout__analysis" aria-hidden="true">
        <div className="scout__card-head">
          <div>
            <p className="scout__name">Sunrise Bakery</p>
            <p className="scout__meta">Bakery · 400 m · 4.5★ from 230 reviews</p>
          </div>
          <span className="scout__priority">Needs attention</span>
        </div>
        <ul className="scout__reasons">
          <li>No website listed on Google</li>
          <li>Established: 230 reviews, but no site</li>
          <li>No opening hours listed</li>
        </ul>
        <p className="scout__draft">Draft message ready to copy</p>
      </div>

      <div className="scout__card scout__ticket" aria-hidden="true">
        <p className="scout__ticket-kind">Posted on LeadScout</p>
        <p className="scout__name">Website for our café</p>
        <p className="scout__budget">₹20,000–₹35,000 for the project</p>
        <p className="scout__applied">
          <span className="scout__faces">
            <span />
            <span />
            <span />
          </span>
          3 freelancers applied
        </p>
      </div>
    </figure>
  );
}
