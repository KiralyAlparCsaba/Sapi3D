import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import "../../styles/HeroSection.css";

const HU_MONTHS = [
  "jan",
  "feb",
  "márc",
  "ápr",
  "máj",
  "jún",
  "júl",
  "aug",
  "szept",
  "okt",
  "nov",
  "dec",
];

function todayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseEvDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return { day: d.getDate(), month: HU_MONTHS[d.getMonth()] };
}

const MARQUEE_ITEMS = [
  "Interaktív 3D",
  "Szabad mozgás",
  "Valós helyszínek",
  "Sapientia EMTE",
  "Kihívások",
  "Marosvásárhely",
];

const RING_R = 60;
const RING_C = 2 * Math.PI * RING_R;

const ArrowIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const PinIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 22s-8-6-8-13a8 8 0 1 1 16 0c0 7-8 13-8 13z" />
    <circle cx="12" cy="9" r="3" />
  </svg>
);

const MedalIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M7 3h10l-2 5H9z" />
    <circle cx="12" cy="14" r="6" />
  </svg>
);

export default function HeroSection() {
  const ctaBtnRef = useRef(null);
  const feat0Ref = useRef(null);
  const feat1Ref = useRef(null);
  const feat2Ref = useRef(null);

  const [events, setEvents] = useState([]);
  const [locations, setLocations] = useState([]);
  const [eventsReady, setEventsReady] = useState(false);

  const [profileInitial, setProfileInitial] = useState("?");
  const [progressPct, setProgressPct] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [evRes, locRes] = await Promise.all([
          api.get("/events/"),
          api.get("/locations/"),
        ]);
        if (cancelled) return;
        setEvents(Array.isArray(evRes.data) ? evRes.data : []);
        setLocations(Array.isArray(locRes.data) ? locRes.data : []);
      } catch {

      } finally {
        if (!cancelled) setEventsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [meRes, achRes] = await Promise.all([
          api.get("/auth/me"),
          api.get("/achievements/user/progress"),
        ]);
        if (cancelled) return;
        const username = meRes.data?.username || "?";
        setProfileInitial(username[0].toUpperCase());

        const unlocked = Array.isArray(achRes.data?.unlocked)
          ? achRes.data.unlocked
          : [];
        const inProg = Array.isArray(achRes.data?.in_progress)
          ? achRes.data.in_progress
          : [];
        const locked = Array.isArray(achRes.data?.locked)
          ? achRes.data.locked
          : [];
        const total = unlocked.length + inProg.length + locked.length;
        const done = unlocked.length;

        setProgressPct(total > 0 ? Math.round((done / total) * 100) : 0);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const btn = ctaBtnRef.current;
    if (!btn) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const STRENGTH = 0.35;
    const RADIUS = 140;
    const onMove = (e) => {
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      if (d < RADIUS) {
        const t = (RADIUS - d) / RADIUS;
        btn.style.transform = `translate(${dx * STRENGTH * t}px, ${dy * STRENGTH * t}px)`;
      } else {
        btn.style.transform = "";
      }
    };
    const onLeave = () => {
      btn.style.transform = "";
    };
    window.addEventListener("pointermove", onMove);
    btn.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      btn.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  useEffect(() => {
    const cards = [feat0Ref.current, feat1Ref.current, feat2Ref.current];
    const cleanups = [];
    cards.forEach((el) => {
      if (!el) return;
      const handler = (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", e.clientX - r.left + "px");
        el.style.setProperty("--my", e.clientY - r.top + "px");
      };
      el.addEventListener("pointermove", handler);
      cleanups.push(() => el.removeEventListener("pointermove", handler));
    });
    return () => cleanups.forEach((fn) => fn());
  }, []);

  const today = todayDateStr();
  const locMap = Object.fromEntries(locations.map((l) => [l.loc_id, l.name]));
  const upcomingEvents = events
    .filter((ev) => ev.event_date && ev.event_date >= today)
    .sort((a, b) =>
      a.event_date < b.event_date ? -1 : a.event_date > b.event_date ? 1 : 0,
    )
    .slice(0, 3);

  const recentPastEvents = events
    .filter((ev) => ev.event_date && ev.event_date < today)
    .sort((a, b) =>
      a.event_date > b.event_date ? -1 : a.event_date < b.event_date ? 1 : 0,
    )
    .slice(0, 3);

  const ringOffset = RING_C * (1 - progressPct / 100);

  return (
    <div className="home-page">
      <aside className="home-siderail" aria-hidden="true">
        <span>Sapientia · 3D · Marosvásárhely</span>
      </aside>

      <div className="home-inner">
        <section className="home-hero" aria-label="Főoldal hero">
          <div className="home-hero-poster" aria-hidden="true" />

          <video
            className="home-hero-video"
            src="/campus-video.mp4"
            autoPlay
            loop
            muted
            playsInline
          />

          <div className="home-hero-noise" aria-hidden="true">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <filter id="hGrain">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.65"
                  numOctaves="3"
                  stitchTiles="stitch"
                />
                <feColorMatrix type="saturate" values="0" />
              </filter>
              <rect width="100%" height="100%" filter="url(#hGrain)" />
            </svg>
          </div>

          <div className="home-hero-veil" aria-hidden="true" />

          <div className="home-hero-corners" aria-hidden="true">
            <div className="hc hc-tl" />
            <div className="hc hc-tr" />
            <div className="hc hc-bl" />
            <div className="hc hc-br" />
          </div>

          <div className="home-hero-content">
            <div className="home-hero-top">
              <span />
              <span className="home-chip-mono">
                Sapientia EMTE · <strong>Marosvásárhelyi Kar</strong>
              </span>
            </div>

            <div className="home-hero-middle">
              <p className="home-eyebrow">Interaktív egyetem</p>
              <h1 className="home-hero-title">
                <span className="hw" style={{ animationDelay: "0.10s" }}>
                  Üdvözlünk
                </span>{" "}
                <span className="hw" style={{ animationDelay: "0.18s" }}>
                  a
                </span>{" "}
                <span className="hw" style={{ animationDelay: "0.26s" }}>
                  <em>Sapientia</em>
                </span>{" "}
                <span className="hw" style={{ animationDelay: "0.34s" }}>
                  egyetem
                </span>{" "}
                <span className="hw" style={{ animationDelay: "0.42s" }}>
                  oldalán
                </span>
              </h1>
              <p className="home-hero-sub">
                Fedezd fel az egyetemet egy interaktív 3D modellen keresztül —
                sétálj végig az aulán, tanszékeken és helyszíneken úgy, mintha
                ott lennél.
              </p>
              <div className="home-hero-cta">
                <Link
                  to="/app/model"
                  className="home-btn-primary home-btn-magnetic"
                  ref={ctaBtnRef}
                >
                  Indítsd el a 3D modellt
                  <span className="home-btn-arrow" aria-hidden="true">
                    <ArrowIcon />
                  </span>
                </Link>
              </div>
            </div>

            <div className="home-feats">
              <span className="home-feat-pill">
                <ArrowIcon />
                Szabad mozgás
              </span>
              <span className="home-feat-pill">
                <PinIcon />
                Valós helyszínek
              </span>
              <span className="home-feat-pill">
                <MedalIcon />
                Kihívások
              </span>
            </div>
          </div>
        </section>

        <div className="home-divider" aria-hidden="true">
          <div className="home-divider-line" />
          <div className="home-divider-cue">
            <span className="home-cue-label">GÖRGESS</span>
            <div className="home-cue-bar" />
          </div>
          <div className="home-divider-line" />
        </div>

        <div className="home-marquee" aria-hidden="true">
          <div className="home-marquee-track">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
              <span key={i}>
                {item}
                <em> ·</em>
              </span>
            ))}
          </div>
        </div>

        <section className="home-features-section" aria-label="Főbb funkciók">
          <div className="home-features-head">
            <div className="home-features-lhs">
              <p className="home-section-mark">Mit találsz itt</p>
              <h2 className="home-features-h2">
                Fedezd fel, böngészd, <em>kövesd.</em>
              </h2>
            </div>
          </div>

          <div className="home-features-grid">
            <Link
              to="/app/events"
              className="home-feat home-feat-events"
              ref={feat0Ref}
            >
              <div className="home-feat-head">
                <span className="home-feat-num">01 — Események</span>
                <span className="home-feat-tag">Előrejelzés</span>
              </div>

              <div className="home-feat-vis">
                <div className="home-ev-stack">
                  {eventsReady && upcomingEvents.length === 0 && recentPastEvents.length === 0 && (
                    <div className="home-ev-empty">Nincs közelgő esemény</div>
                  )}
                  {eventsReady && upcomingEvents.length === 0 && recentPastEvents.length > 0 && (
                    <div className="home-ev-past-label">↩ Korábbi</div>
                  )}
                  {(upcomingEvents.length > 0 ? upcomingEvents : recentPastEvents).map((ev, idx) => {
                    const parsed = parseEvDate(ev.event_date);
                    const locName = (locMap[ev.loc_id] || "Ismeretlen").slice(
                      0,
                      18,
                    );
                    const title = (ev.name || "").slice(0, 25);
                    const isPast = upcomingEvents.length === 0;
                    return (
                      <div
                        key={ev.event_id}
                        className={`home-ev-tile home-ev-tile--${idx}${isPast ? " home-ev-tile--past" : ""}`}
                      >
                        <div className="home-ev-row">
                          <div className="home-ev-date">
                            <span className="home-ev-day">
                              {parsed?.day ?? "—"}
                            </span>
                            <span className="home-ev-month">
                              {parsed?.month ?? ""}
                            </span>
                          </div>
                          <div className="home-ev-info">
                            <div className="home-ev-title">{title}</div>
                            <div className="home-ev-sub">{locName}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="home-feat-text">
                <h3>Események az egyetemen</h3>
                <p>
                  Lásd milyen előadások és programok lesznek — minden eseményhez
                  a helyszín részletes leírása is elérhető.
                </p>
                <span className="home-feat-link">
                  Böngészem
                  <span className="home-feat-link-badge" aria-hidden="true">
                    <ArrowIcon />
                  </span>
                </span>
              </div>
            </Link>

            <Link
              to="/app/locations"
              className="home-feat home-feat-locations"
              ref={feat1Ref}
            >
              <div className="home-feat-head">
                <span className="home-feat-num">02 — Helyszínek</span>
                <span className="home-feat-tag">Teleport</span>
              </div>

              <div className="home-feat-vis">
                <div className="home-map">
                  <div className="home-map-grid" aria-hidden="true" />
                  <svg
                    className="home-map-roads"
                    viewBox="0 0 300 200"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M30,100 Q100,30 200,80 T280,120"
                      stroke="var(--h-line)"
                      strokeWidth="6"
                      fill="none"
                      opacity="0.5"
                    />
                    <path
                      d="M20,150 Q80,100 160,120 T290,60"
                      stroke="var(--h-line)"
                      strokeWidth="6"
                      fill="none"
                      opacity="0.5"
                    />
                    <path
                      className="home-map-hi"
                      d="M50,80 Q130,150 220,100 T270,140"
                      stroke="var(--h-accent)"
                      strokeWidth="2.5"
                      fill="none"
                      strokeDasharray="4 6"
                      opacity="0.9"
                    />
                  </svg>
                  <div className="home-pin home-pin--a home-pin--ping">
                    <span>A</span>
                  </div>
                  <div className="home-pin home-pin--b">
                    <span>I</span>
                  </div>
                  <div className="home-pin home-pin--c">
                    <span>K</span>
                  </div>
                </div>
              </div>

              <div className="home-feat-text">
                <h3>Az egyetem fontos pontjai</h3>
                <p>
                  Válassz egy helyszínt, és teleportálj a 3D modellbe. Minden
                  ponthoz részletes leírás tartozik.
                </p>
                <span className="home-feat-link">
                  Megnézem
                  <span className="home-feat-link-badge" aria-hidden="true">
                    <ArrowIcon />
                  </span>
                </span>
              </div>
            </Link>

            <Link
              to="/app/profil"
              className="home-feat home-feat-profile"
              ref={feat2Ref}

            >
              <div className="home-feat-head">
                <span className="home-feat-num">03 — Profil</span>
                <span className="home-feat-tag">Kihívások</span>
              </div>

              <div className="home-feat-vis">
                <div className="home-pv">
                  <div className="home-pv-avatar">
                    <svg
                      className="home-pv-ring"
                      viewBox="0 0 130 130"
                      aria-hidden="true"
                      style={{ transform: "rotate(-90deg)" }}
                    >
                      <circle
                        className="home-pv-ring-track"
                        cx="65"
                        cy="65"
                        r={RING_R}
                      />
                      <circle
                        className="home-pv-ring-fill"
                        cx="65"
                        cy="65"
                        r={RING_R}
                        style={{
                          strokeDasharray: RING_C,
                          strokeDashoffset: ringOffset,
                        }}
                      />
                    </svg>
                    <div
                      className="home-pv-face"
                      aria-label={`Profil kezdőbetű: ${profileInitial}`}
                    >
                      {profileInitial}
                    </div>
                    <div className="home-pv-pct" aria-hidden="true">
                      {progressPct}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="home-feat-text">
                <h3>A te haladásod</h3>
                <p>
                  Lásd az adataid, tölts fel avatart, és kövesd a kihívásokat
                  amiket a 3D modellben teljesíthetsz.
                </p>
                <span className="home-feat-link">
                  Megnyitom
                  <span className="home-feat-link-badge" aria-hidden="true">
                    <ArrowIcon />
                  </span>
                </span>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
