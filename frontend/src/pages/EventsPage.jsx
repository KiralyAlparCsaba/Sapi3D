import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "../styles/EventsPage.css";
import CTAButton from "../components/CTAButton";
import GuestWall from "../components/auth/GuestWall";

const EVENT_COLORS = [
  { color: "#1A3A6B", colorLight: "#2A52A0" },
  { color: "#6B2A1A", colorLight: "#9C3A22" },
  { color: "#1A5A4A", colorLight: "#207860" },
  { color: "#2C3550", colorLight: "#3D4870" },
  { color: "#1A3B6C", colorLight: "#1E4D8C" },
  { color: "#4A1A5A", colorLight: "#6B2A80" },
];

const PATTERNS = [
  "repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 14px)",
  "radial-gradient(circle, rgba(255,255,255,0.09) 1px, transparent 1px) center/24px 24px",
  "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 20px)",
  "repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 20px)",
  "radial-gradient(ellipse at 60% 30%, rgba(255,255,255,0.10) 0%, transparent 65%)",
  "linear-gradient(135deg, rgba(255,255,255,0.05) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.05) 75%) 0 0/36px 36px",
];

const MONTH_NAMES = ["JAN","FEB","MÁR","ÁPR","MÁJ","JÚN","JÚL","AUG","SZEP","OKT","NOV","DEC"];
const DAY_NAMES = ["H","K","SZ","CS","P","SZ","V"];

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" });
}

function resolveImageUrl(imagePath) {
  if (!imagePath) return "";
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  const envBase = (import.meta.env.VITE_API_URL || "").trim();
  const base = envBase || `${window.location.protocol}//${window.location.hostname}:8000`;
  return `${base.replace(/\/$/, "")}${imagePath.startsWith("/") ? imagePath : `/${imagePath}`}`;
}

const IconPin = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const IconArrowRight = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
const IconArrowLeft = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <path d="M19 12H5M12 5l-7 7 7 7" />
  </svg>
);
const IconClose = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);
const IconPlus = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const IconSearch = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);
const IconCalendar = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

function CalendarWidget({ events }) {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toDateStr(today), [today]);

  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);

  const eventsByDate = useMemo(() => {
    const map = new Map();
    events.forEach(ev => {
      if (ev.event_date) {
        if (!map.has(ev.event_date)) map.set(ev.event_date, []);
        map.get(ev.event_date).push(ev);
      }
    });
    return map;
  }, [events]);

  const upcomingCount = useMemo(() =>
    events.filter(ev => ev.event_date && ev.event_date >= todayStr).length,
    [events, todayStr]
  );

  const monthGrid = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const startDow = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calYear, calMonth]);

  const prevMonth = () => {
    setSelectedDay(null);
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };

  const nextMonth = () => {
    setSelectedDay(null);
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const handleDayClick = (dateStr, hasEvs) => {
    if (!hasEvs) return;
    setSelectedDay(prev => prev === dateStr ? null : dateStr);
  };

  return (
    <div className="ev-calendar-widget">
      <div className="ev-cal-top">
        <div className="ev-cal-date-display">
          <span className="ev-cal-day-big">{today.getDate()}</span>
          <span className="ev-cal-month-year">{MONTH_NAMES[today.getMonth()]} · {today.getFullYear()}</span>
        </div>
        <div className="ev-cal-nav">
          <button className="ev-cal-nav-btn" onClick={prevMonth} aria-label="Előző hónap"><IconArrowLeft /></button>
          <span className="ev-cal-nav-label">{MONTH_NAMES[calMonth]}</span>
          <button className="ev-cal-nav-btn" onClick={nextMonth} aria-label="Következő hónap"><IconArrowRight /></button>
        </div>
      </div>

      <div className="ev-cal-grid">
        {DAY_NAMES.map((d, i) => <span key={i} className="ev-cal-grid-head">{d}</span>)}
        {monthGrid.map((day, i) => {
          if (!day) return <span key={`e-${i}`} />;
          const dateStr = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const dayEvs = eventsByDate.get(dateStr) || [];
          const isToday = dateStr === todayStr;
          const isSelected = selectedDay === dateStr;
          return (
            <button
              key={dateStr}
              className={`ev-cal-grid-day${isToday ? " today" : ""}${dayEvs.length ? " has-ev" : ""}${isSelected ? " selected" : ""}`}
              onClick={() => handleDayClick(dateStr, dayEvs.length > 0)}
              title={dayEvs.length ? dayEvs.map(e => e.name).join(", ") : undefined}
            >
              {day}
              {dayEvs.length > 0 && <span className="ev-cal-grid-dot" />}
            </button>
          );
        })}
      </div>

      {selectedDay && eventsByDate.has(selectedDay) && (
        <div className="ev-cal-selected-events">
          {eventsByDate.get(selectedDay).map(ev => (
            <div key={ev.event_id} className="ev-cal-selected-event-item">
              <IconCalendar />
              <span>{ev.name}</span>
            </div>
          ))}
        </div>
      )}

      <div className="ev-cal-footer">
        <span className="ev-cal-upcoming-count"><strong>{upcomingCount}</strong> KÖZELGŐ</span>
        <span className="ev-cal-naptár">Naptár</span>
      </div>
    </div>
  );
}

function SmallCard({ event, locationName, colorIdx, onClick, animIdx, expired }) {
  const { color, colorLight } = EVENT_COLORS[colorIdx % EVENT_COLORS.length];
  const pattern = PATTERNS[colorIdx % PATTERNS.length];
  const imageUrl = resolveImageUrl(event.image_path);
  const bg = imageUrl
    ? `linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 55%, transparent 100%), url(${imageUrl}) top left/cover no-repeat`
    : `linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.1) 55%, transparent 100%), ${pattern}, linear-gradient(160deg, ${colorLight} 0%, ${color} 100%)`;

  return (
    <div onClick={onClick} className="ev-small-card" role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && onClick()} style={{ background: bg, animationDelay: `${animIdx * 0.07}s` }}>
      {expired && <div className="ev-small-card-expired">LEJÁRT</div>}
      <div className="ev-small-card-hover-label">Részletek →</div>
      <div className="ev-small-card-content">
        <div className="ev-small-card-location"><IconPin /> {locationName || "Ismeretlen"}</div>
        <div className="ev-small-card-title">{event.name}</div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const { user, isGuest } = useAuth();
  const isAdmin = user?.role_id === 2;

  const [events, setEvents] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [locationFilter, setLocationFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newLocId, setNewLocId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newImageFile, setNewImageFile] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  const [editingEvent, setEditingEvent] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLocId, setEditLocId] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editImageFile, setEditImageFile] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const [deletingId, setDeletingId] = useState(null);
  const [imageDeleteId, setImageDeleteId] = useState(null);

  const getErrorMessage = (err, fallback) => {
    const detail = err?.response?.data?.detail;
    return typeof detail === "string" && detail.trim() ? detail : fallback;
  };

  const fetchData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [evRes, locRes] = await Promise.all([api.get("/events/"), api.get("/locations/")]);
      const nextEvents = Array.isArray(evRes.data) ? evRes.data : [];
      setEvents(nextEvents);
      setLocations(Array.isArray(locRes.data) ? locRes.data : []);
      setSelectedEvent(prev => prev ? nextEvents.find(e => e.event_id === prev.event_id) || null : null);
    } catch { setError("Nem sikerült betölteni az eseményeket."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const locationNameById = useMemo(() => {
    const map = new Map();
    locations.forEach(loc => map.set(loc.loc_id, loc.name));
    return map;
  }, [locations]);

  const filteredEvents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return events.filter(ev => {
      const matchLoc = !locationFilter || String(ev.loc_id) === locationFilter;
      const matchSearch = !q || `${ev.name} ${ev.description}`.toLowerCase().includes(q);
      return matchLoc && matchSearch;
    });
  }, [events, locationFilter, searchTerm]);

  useEffect(() => { setCurrentIdx(0); setAnimKey(k => k + 1); }, [locationFilter, searchTerm]);

  const navigate = (dir) => {
    if (!filteredEvents.length) return;
    setCurrentIdx(prev => (prev + dir + filteredEvents.length) % filteredEvents.length);
    setAnimKey(k => k + 1);
  };

  const goTo = (idx) => { setCurrentIdx(idx); setAnimKey(k => k + 1); };

  const todayStr = useMemo(() => toDateStr(new Date()), []);
  const isExpired = (ev) => !!ev.event_date && ev.event_date < todayStr;

  useEffect(() => {
    const handleKey = (e) => {
      if (selectedEvent || showAdminPanel) return;
      if (e.key === "ArrowRight") navigate(1);
      if (e.key === "ArrowLeft") navigate(-1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  const resetCreateForm = () => {
    setNewName(""); setNewDescription(""); setNewLocId(""); setNewDate("");
    setNewImageFile(null); setCreateError(""); setCreateSuccess("");
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setCreateError(""); setCreateSuccess("");
    const name = newName.trim(), desc = newDescription.trim(), locId = Number(newLocId);
    if (!name || !desc || !Number.isInteger(locId) || !locId) { setCreateError("Név, leírás és helyszín kötelező."); return; }
    try {
      setCreateLoading(true);
      const res = await api.post("/events/", { name, description: desc, loc_id: locId, event_date: newDate || null, image_path: null });
      if (newImageFile && res.data?.event_id) {
        const fd = new FormData(); fd.append("file", newImageFile);
        await api.post(`/events/${res.data.event_id}/image`, fd);
      }
      resetCreateForm(); setCreateSuccess("Az esemény sikeresen létrejött."); await fetchData();
    } catch (err) { setCreateError(getErrorMessage(err, "Nem sikerült létrehozni az eseményt.")); }
    finally { setCreateLoading(false); }
  };

  const openEdit = (ev) => {
    setEditingEvent(ev); setEditName(ev.name || ""); setEditDescription(ev.description || "");
    setEditLocId(String(ev.loc_id || "")); setEditDate(ev.event_date || "");
    setEditImageFile(null); setEditError(""); setShowAdminPanel(true);
  };

  const cancelEdit = () => { setEditingEvent(null); setEditError(""); setEditDate(""); setEditImageFile(null); };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    if (!editingEvent) return;
    setEditError("");
    const name = editName.trim(), desc = editDescription.trim(), locId = Number(editLocId);
    if (!name || !desc || !Number.isInteger(locId) || !locId) { setEditError("Név, leírás és helyszín kötelező."); return; }
    try {
      setEditLoading(true);
      await api.put(`/events/${editingEvent.event_id}`, { name, description: desc, loc_id: locId, event_date: editDate || null });
      if (editImageFile) {
        const fd = new FormData(); fd.append("file", editImageFile);
        await api.put(`/events/${editingEvent.event_id}/image`, fd);
      }
      cancelEdit(); await fetchData();
    } catch (err) { setEditError(getErrorMessage(err, "Nem sikerült frissíteni az eseményt.")); }
    finally { setEditLoading(false); }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Biztosan törölni szeretnéd ezt az eseményt?")) return;
    try {
      setDeletingId(eventId);
      await api.delete(`/events/${eventId}`);
      setSelectedEvent(prev => prev?.event_id === eventId ? null : prev);
      if (editingEvent?.event_id === eventId) cancelEdit();
      await fetchData();
    } catch (err) { alert(getErrorMessage(err, "Nem sikerült törölni az eseményt.")); }
    finally { setDeletingId(null); }
  };

  const handleDeleteImage = async (eventId) => {
    if (!window.confirm("Biztosan törölni szeretnéd az esemény képét?")) return;
    try {
      setImageDeleteId(eventId);
      await api.delete(`/events/${eventId}/image`);
      await fetchData();
    } catch (err) { alert(getErrorMessage(err, "Nem sikerült törölni az esemény képét.")); }
    finally { setImageDeleteId(null); }
  };

  const n = filteredEvents.length;
  const hero = filteredEvents[currentIdx] || null;
  const heroColors = hero ? EVENT_COLORS[currentIdx % EVENT_COLORS.length] : null;
  const heroPattern = hero ? PATTERNS[currentIdx % PATTERNS.length] : null;
  const heroImageUrl = hero ? resolveImageUrl(hero.image_path) : null;

  const smallCards = n > 1
    ? Array.from({ length: Math.min(3, n - 1) }, (_, i) => {
        const idx = (currentIdx + i + 1) % n;
        return { event: filteredEvents[idx], idx };
      })
    : [];

  if (isGuest) return <GuestWall label="az eseményeket" />;

  return (
    <div className="events-page">

      {selectedEvent && (
        <div className="ev-detail-overlay">
          <div className="ev-detail-split">
            <div className="ev-detail-left-panel">
              <button className="ev-detail-back" onClick={() => setSelectedEvent(null)}>
                <IconArrowLeft /> Vissza
              </button>
              <div className="ev-detail-left-header">
                <span className="ev-detail-img-label">RÉSZLETES LEÍRÁS</span>
                <p className="ev-detail-img-intro">
                  Itt találhatod a(z) <strong>{selectedEvent.name}</strong> nevű esemény részletes leírását.
                </p>
              </div>
              <div className="ev-detail-left-img-wrap">
                {selectedEvent.image_path ? (
                  <img src={resolveImageUrl(selectedEvent.image_path)} alt={selectedEvent.name} className="ev-detail-left-img" />
                ) : (
                  <div className="ev-detail-left-noimg" style={{ background: `${PATTERNS[currentIdx % PATTERNS.length]}, linear-gradient(155deg, ${EVENT_COLORS[currentIdx % EVENT_COLORS.length].colorLight} 0%, ${EVENT_COLORS[currentIdx % EVENT_COLORS.length].color} 100%)` }}>
                    <span>{selectedEvent.name}</span>
                  </div>
                )}
              </div>
              <div className="ev-detail-left-institution">
                <span className="ev-detail-left-inst-dot" />
                Sapientia EMTE · Marosvásárhelyi Kar
              </div>
            </div>

            <div className="ev-detail-right-panel">
              <h1 className="ev-detail-title">{selectedEvent.name}</h1>
              <p className="ev-detail-desc">{selectedEvent.description}</p>
              <div className="ev-detail-divider" />
              {selectedEvent.event_date && selectedEvent.event_date < todayStr && (
                <div className="ev-expired-notice">
                  <span className="ev-expired-notice-icon">⏰</span>
                  <div className="ev-expired-notice-text">
                    <strong>Ez az esemény már lezárult.</strong>
                    <span>Az esemény időpontja {formatDate(selectedEvent.event_date)} volt.</span>
                  </div>
                </div>
              )}
              <div className="ev-detail-info-row">
                {selectedEvent.event_date && (
                  <div className="ev-detail-info-card">
                    <span className="ev-detail-info-card-icon"><IconCalendar /></span>
                    <div>
                      <div className="ev-detail-info-card-label">IDŐPONT</div>
                      <div className="ev-detail-info-card-value">{formatDate(selectedEvent.event_date)}</div>
                    </div>
                  </div>
                )}
                <div className="ev-detail-info-card">
                  <span className="ev-detail-info-card-icon"><IconPin /></span>
                  <div>
                    <div className="ev-detail-info-card-label">HELYSZÍN</div>
                    <div className="ev-detail-info-card-value">{locationNameById.get(selectedEvent.loc_id) || "Ismeretlen helyszín"}</div>
                  </div>
                </div>
              </div>
              <div className="ev-detail-venue-section">
                <p className="ev-detail-venue-hint">
                  Ha meg szeretnéd tekinteni az eseménynek otthont adó helyszínt, a gombra kattintva láthatod a részletes leírását.
                </p>
                <Link to={`/app/locations?loc_id=${selectedEvent.loc_id}`} className="ev-venue-btn">
                  <span>Helyszín megtekintése</span><IconArrowRight />
                </Link>
              </div>
              {isAdmin && (
                <div className="ev-detail-admin-row">
                  <button className="ev-btn-edit" onClick={() => { setSelectedEvent(null); openEdit(selectedEvent); }}>Szerkesztés</button>
                  <button className="ev-btn-delete" onClick={() => handleDeleteEvent(selectedEvent.event_id)} disabled={deletingId === selectedEvent.event_id}>
                    {deletingId === selectedEvent.event_id ? "Törlés..." : "Törlés"}
                  </button>
                  {selectedEvent.image_path && (
                    <button className="ev-btn-img-delete" onClick={() => handleDeleteImage(selectedEvent.event_id)} disabled={imageDeleteId === selectedEvent.event_id}>
                      {imageDeleteId === selectedEvent.event_id ? "Kép törlése..." : "Kép törlése"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!selectedEvent && (
        <>
          {loading && <div className="ev-state-msg">Betöltés...</div>}
          {error && <div className="ev-error-toast">{error}</div>}

          {!loading && !error && (
            <div className="ev-page-content">
              <div className="ev-page-header">
                <div className="ev-header-left">
                  <span className="ev-page-badge">+ Aktuális események</span>
                  <h1 className="ev-page-title">Egyetemünk eseményei</h1>
                  <p className="ev-page-subtitle">
                    Itt találod a Sapientia EMTE Marosvásárhelyi Kar rendezvényeit.
                  </p>
                </div>
                <div className="ev-header-right">
                  <div className="ev-search-bar">
                    <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} className="ev-search-select">
                      <option value="">Összes helyszín</option>
                      {locations.map(loc => <option key={loc.loc_id} value={String(loc.loc_id)}>{loc.name}</option>)}
                    </select>
                    <div className="ev-search-divider" />
                    <div className="ev-search-input-wrap">
                      <IconSearch />
                      <input type="text" placeholder="Esemény keresése..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="ev-search-input" />
                    </div>
                  </div>
                </div>
              </div>

              {n === 0 && <div className="ev-empty-msg">Nincs találat a megadott szűrők alapján.</div>}

              {hero && (
                <>
                  <div className="ev-main-layout">
                    <div className="ev-hero-card" key={`hero-${animKey}`}>
                      {heroImageUrl ? (
                        <div className="ev-hero-card-bg ev-hero-card-bg--img" style={{ backgroundImage: `url(${heroImageUrl})` }} />
                      ) : (
                        <div className="ev-hero-card-bg" style={{ background: `${heroPattern}, linear-gradient(155deg, ${heroColors.colorLight} 0%, ${heroColors.color} 42%, #06090F 100%)` }} />
                      )}
                      <div className="ev-hero-card-vignette" />
                      {!heroImageUrl && <div className="ev-hero-placeholder">esemény borítókép</div>}
                      <div className="ev-hero-card-content">
                        {isExpired(hero) && <div className="ev-expired-hero-badge">⏰ LEJÁRT</div>}
                        <div className="ev-hero-location"><IconPin /> {locationNameById.get(hero.loc_id) || "Ismeretlen helyszín"}</div>
                        <h2 className="ev-hero-title">{hero.name}</h2>
                        {hero.event_date && <div className="ev-hero-date"><IconCalendar /> {formatDate(hero.event_date)}</div>}
                        <CTAButton onClick={() => setSelectedEvent(hero)} />
                      </div>
                    </div>

                    <div className="ev-sidebar">
                      <CalendarWidget events={events} />
                      {smallCards.length > 0 && (
                        <div className="ev-sidebar-more">
                          <div className="ev-sidebar-more-label">TOVÁBBI ESEMÉNYEK</div>
                          <div className="ev-sidebar-cards">
                            {smallCards.map(({ event, idx }, i) => (
                              <SmallCard key={`${animKey}-sm-${i}`} event={event} locationName={locationNameById.get(event.loc_id)} colorIdx={idx} onClick={() => goTo(idx)} animIdx={i} expired={isExpired(event)} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="ev-bottom-nav">
                    <div className="ev-bottom-arrows">
                      {[-1, 1].map(dir => (
                        <button key={dir} onClick={() => navigate(dir)} className="ev-arrow-btn" aria-label={dir === -1 ? "Előző" : "Következő"}>
                          {dir === -1 ? <IconArrowLeft /> : <IconArrowRight />}
                        </button>
                      ))}
                    </div>
                    <div className="ev-dots">
                      {filteredEvents.map((_, i) => (
                        <button key={i} onClick={() => goTo(i)} className={`ev-dot${i === currentIdx ? " active" : ""}`} aria-label={`${i + 1}. esemény`} />
                      ))}
                    </div>
                    {n > 0 && (
                      <div className="ev-big-counter">
                        <span className="ev-big-counter-cur">{String(currentIdx + 1).padStart(2, "0")}</span>
                        <span className="ev-big-counter-sep"> /</span>
                        <span className="ev-big-counter-tot"> {String(n).padStart(2, "0")}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {isAdmin && (
            <button className="ev-admin-fab" onClick={() => setShowAdminPanel(p => !p)} aria-label="Admin panel">
              {showAdminPanel ? <IconClose /> : <IconPlus />}
            </button>
          )}
        </>
      )}

      {isAdmin && showAdminPanel && (
        <div className="ev-admin-overlay">
          <div className="ev-admin-panel">
            <div className="ev-admin-panel-header">
              <span>{editingEvent ? "Esemény szerkesztése" : "Új esemény létrehozása"}</span>
              <button onClick={() => { setShowAdminPanel(false); cancelEdit(); }}><IconClose /></button>
            </div>
            {editingEvent ? (
              <form onSubmit={handleUpdateEvent} className="ev-admin-form">
                <input type="text" placeholder="Esemény neve" value={editName} onChange={e => setEditName(e.target.value)} />
                <select value={editLocId} onChange={e => setEditLocId(e.target.value)}>
                  <option value="">Válassz helyszínt</option>
                  {locations.map(loc => <option key={loc.loc_id} value={String(loc.loc_id)}>{loc.name}</option>)}
                </select>
                <textarea rows={4} placeholder="Esemény leírása" value={editDescription} onChange={e => setEditDescription(e.target.value)} />
                <label className="ev-file-label">
                  Időpont (opcionális)
                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
                </label>
                <label className="ev-file-label">
                  Új kép (opcionális)
                  <input type="file" accept="image/png,image/jpeg" onChange={e => setEditImageFile(e.target.files?.[0] || null)} />
                </label>
                {editError && <p className="ev-form-error">{editError}</p>}
                <div className="ev-form-actions">
                  <button type="submit" className="ev-btn-save" disabled={editLoading}>{editLoading ? "Mentés..." : "Mentés"}</button>
                  <button type="button" className="ev-btn-cancel" onClick={cancelEdit}>Mégse</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateEvent} className="ev-admin-form">
                <input type="text" placeholder="Esemény neve" value={newName} onChange={e => setNewName(e.target.value)} />
                <select value={newLocId} onChange={e => setNewLocId(e.target.value)}>
                  <option value="">Válassz helyszínt</option>
                  {locations.map(loc => <option key={loc.loc_id} value={String(loc.loc_id)}>{loc.name}</option>)}
                </select>
                <textarea rows={4} placeholder="Esemény leírása" value={newDescription} onChange={e => setNewDescription(e.target.value)} />
                <label className="ev-file-label">
                  Időpont (opcionális)
                  <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
                </label>
                <label className="ev-file-label">
                  Kép feltöltése (opcionális)
                  <input type="file" accept="image/png,image/jpeg" onChange={e => setNewImageFile(e.target.files?.[0] || null)} />
                </label>
                {createError && <p className="ev-form-error">{createError}</p>}
                {createSuccess && <p className="ev-form-success">{createSuccess}</p>}
                <button type="submit" className="ev-btn-save" disabled={createLoading}>{createLoading ? "Mentés..." : "Esemény létrehozása"}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
