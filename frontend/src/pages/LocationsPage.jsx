import { useSearchParams, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import CTAButton from "../components/CTAButton";
import "../styles/LocationsPage.css";
import GuestWall from "../components/auth/GuestWall";

// ── geometry constants ──────────────────────────────────────────────────────
const ARC_R       = 660;
const STEP_DEG    = 24;
const STEP_RAD    = STEP_DEG * Math.PI / 180;
const DRAG_COEFF  = 130;
const SNAP_THRESH = 55;

function layoutCards(cardEls, active, dragOffset) {
  const N = cardEls.length;
  if (!N) return;
  cardEls.forEach((el, i) => {
    if (!el) return;
    let offset = i - active;
    if (offset >  N / 2) offset -= N;
    if (offset < -N / 2) offset += N;
    const visual = offset + dragOffset;
    const theta  = visual * STEP_RAD;
    const x      = ARC_R * Math.sin(theta);
    const z      = -(ARC_R - ARC_R * Math.cos(theta));
    const rotY   = -visual * STEP_DEG;
    const absV   = Math.abs(visual);
    const scale  = Math.max(0.55, 1 - absV * 0.10);
    const opa    = Math.max(0,    1 - absV * 0.22);
    const blur   = absV >= 2 ? `${Math.min((absV - 1.5) * 1.2, 3)}px` : "0";

    el.style.transform = `translate(calc(-50% + ${x}px), 0) translateZ(${z}px) rotateY(${rotY}deg) scale(${scale})`;
    el.style.opacity   = String(opa);
    el.style.zIndex    = String(1000 - Math.round(absV * 10));
    el.style.filter    = blur === "0" ? "" : `blur(${blur})`;
    el.classList.toggle("loc-card-active", Math.round(visual) === 0);
  });
}

function getKind(locId) {
  const kinds = ["Kozponti", "Tudaskozpont", "Tanszek"];
  return kinds[locId % 3];
}

function resolveImageUrl(imagePath) {
  if (!imagePath) return "";
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  const envBase = (import.meta.env.VITE_API_URL || "").trim();
  const base = envBase || `${window.location.protocol}//${window.location.hostname}:8000`;
  return `${base.replace(/\/$/, "")}${imagePath.startsWith("/") ? imagePath : `/${imagePath}`}`;
}

// ── SVG icons ───────────────────────────────────────────────────────────────
const IconArrowLeft = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <path d="M19 12H5M12 5l-7 7 7 7" />
  </svg>
);
const IconArrowRight = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
const IconPin = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const IconCheck = () => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);
const IconSwap = () => (
  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
  </svg>
);
const IconSearch = () => (
  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);
const IconLocation = () => (
  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
    <circle cx="12" cy="9" r="2.5" />
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
const IconBuilding = () => (
  <svg width={110} height={110} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="1" />
    <path d="M9 21V9h6v12" />
    <path d="M3 9h18" />
    <path d="M9 3v6" />
    <path d="M15 3v6" />
    <path d="M6 12h1m5 0h1m-1 4h1M6 16h1" />
  </svg>
);
const IconImage = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

export default function LocationsPage() {
  const { user, isGuest } = useAuth();
  const isAdmin    = user?.role_id === 2;
  const navigate   = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const locationTrackRef = useRef({});

  const getObjectName = (obj) =>
    typeof obj === "string" ? obj : obj?.object_name || "";

  // ── locations state ────────────────────────────────────────────────────────
  const [locations, setLocations]               = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsError, setLocationsError]     = useState("");
  const [selectedLocation, setSelectedLocation] = useState(null);

  // ── admin state ────────────────────────────────────────────────────────────
  const [locationObjects, setLocationObjects]       = useState([]);
  const [objectsLoading, setObjectsLoading]         = useState(false);
  const [objectsError, setObjectsError]             = useState("");
  const [newName, setNewName]                       = useState("");
  const [newButtonLocation, setNewButtonLocation]   = useState("");
  const [newInformation, setNewInformation]         = useState("");
  const [newImageFile, setNewImageFile]             = useState(null);
  const [createLoading, setCreateLoading]           = useState(false);
  const [createError, setCreateError]               = useState("");
  const [createSuccess, setCreateSuccess]           = useState("");
  const [editingLoc, setEditingLoc]                 = useState(null);
  const [editName, setEditName]                     = useState("");
  const [editButtonLocation, setEditButtonLocation] = useState("");
  const [editInformation, setEditInformation]       = useState("");
  const [editImageFile, setEditImageFile]           = useState(null);
  const [editLoading, setEditLoading]               = useState(false);
  const [editError, setEditError]                   = useState("");
  const [editSuccess, setEditSuccess]               = useState("");
  const [deletingId, setDeletingId]                 = useState(null);
  const [imageDeleteId, setImageDeleteId]           = useState(null);

  // ── admin overlay state ────────────────────────────────────────────────────
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // ── carousel state ─────────────────────────────────────────────────────────
  const [active, setActive]           = useState(0);
  const [displayedIdx, setDisplayedIdx] = useState(0);
  const [infoFlashing, setInfoFlashing] = useState(false);

  const activeRef    = useRef(0);
  const cardRefs     = useRef([]);
  const trackRef     = useRef(null);
  const locationsRef = useRef([]);
  const didDrag      = useRef(false);
  locationsRef.current = locations;

  // ── admin helpers ──────────────────────────────────────────────────────────
  const openEdit = (loc) => {
    setEditingLoc(loc);
    setEditName(loc.name);
    setEditButtonLocation(loc.button_location);
    setEditInformation(loc.information);
    setEditImageFile(null);
    setEditError("");
    setEditSuccess("");
    setShowAdminPanel(true);
  };
  const cancelEdit = () => {
    setEditingLoc(null);
    setEditImageFile(null);
    setEditError("");
    setEditSuccess("");
  };
  const closeAdminPanel = () => {
    setShowAdminPanel(false);
    cancelEdit();
  };

  const handleDeleteLocation = async (locId) => {
    if (!window.confirm("Biztosan törölni szeretnéd ezt a helyszínt?")) return;
    try {
      setDeletingId(locId);
      await api.delete(`/locations/${locId}`);
      if (selectedLocation?.loc_id === locId) setSelectedLocation(null);
      await fetchLocations();
    } catch (error) {
      console.error("Error deleting location:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteImage = async (locId) => {
    if (!window.confirm("Biztosan törölni szeretnéd a helyszín képét?")) return;
    try {
      setImageDeleteId(locId);
      const res = await api.delete(`/locations/${locId}/image`);
      // Update selectedLocation in-place so detail view reflects change
      if (selectedLocation?.loc_id === locId) {
        setSelectedLocation(res.data);
      }
      await fetchLocations();
    } catch (error) {
      console.error("Error deleting location image:", error);
    } finally {
      setImageDeleteId(null);
    }
  };

  // ── data fetching ──────────────────────────────────────────────────────────
  const fetchLocations = useCallback(async () => {
    setLocationsLoading(true);
    setLocationsError("");
    try {
      const response = await api.get("/locations/");
      setLocations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching locations:", error);
      setLocationsError("Nem sikerült betölteni a helyszíneket.");
    } finally {
      setLocationsLoading(false);
    }
  }, []);

  const trackLocationTeleport = (locId) => {
    if (!locId) return;
    const now = Date.now();
    const lastSentAt = locationTrackRef.current[locId] || 0;
    if (now - lastSentAt < 2000) return;
    locationTrackRef.current[locId] = now;
    api
      .post("/achievements/track/location", null, { params: { location_id: locId } })
      .then(() => { window.dispatchEvent(new CustomEvent("achievements-updated")); })
      .catch((error) => { console.error("Location achievement tracking failed:", error); });
  };

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  // ── deep link handler ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!locations.length) return;
    const requestedLocIdRaw = searchParams.get("loc_id");
    if (!requestedLocIdRaw) return;
    const requestedLocId = Number(requestedLocIdRaw);
    if (!Number.isInteger(requestedLocId)) return;
    const targetLocation = locations.find((loc) => loc.loc_id === requestedLocId);
    if (!targetLocation) return;
    setSelectedLocation(targetLocation);
    setSearchParams(
      (prev) => { const next = new URLSearchParams(prev); next.delete("loc_id"); return next; },
      { replace: true },
    );
  }, [locations, searchParams, setSearchParams]);

  // ── admin location objects ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    const fetchLocationObjects = async () => {
      setObjectsLoading(true);
      setObjectsError("");
      try {
        const response = await api.get("/locations/location_objects");
        setLocationObjects(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Error fetching location objects:", error);
        setObjectsError("Nem sikerült betölteni a location objecteket.");
      } finally {
        setObjectsLoading(false);
      }
    };
    fetchLocationObjects();
  }, [isAdmin]);

  const handleCreateLocation = async (e) => {
    e.preventDefault();
    setCreateError(""); setCreateSuccess("");
    const name = newName.trim();
    const buttonLocation = newButtonLocation.trim();
    const information = newInformation.trim();
    if (!name || !buttonLocation || !information) { setCreateError("Minden mező kötelező."); return; }
    try {
      setCreateLoading(true);
      const res = await api.post("/locations/", { name, button_location: buttonLocation, information });
      // Upload image if provided
      if (newImageFile && res.data?.loc_id) {
        const fd = new FormData();
        fd.append("file", newImageFile);
        await api.post(`/locations/${res.data.loc_id}/image`, fd);
      }
      setCreateSuccess("A helyszín sikeresen létrejött.");
      setNewName(""); setNewButtonLocation(""); setNewInformation(""); setNewImageFile(null);
      await fetchLocations();
    } catch (error) {
      console.error("Error creating location:", error);
      setCreateError("Nem sikerült létrehozni a helyszínt.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditLocation = async (e) => {
    e.preventDefault();
    setEditError(""); setEditSuccess("");
    const name = editName.trim();
    const buttonLocation = editButtonLocation.trim();
    const information = editInformation.trim();
    if (!name || !buttonLocation || !information) { setEditError("Minden mező kötelező."); return; }
    try {
      setEditLoading(true);
      await api.put(`/locations/${editingLoc.loc_id}`, { name, button_location: buttonLocation, information });
      if (editImageFile) {
        const fd = new FormData();
        fd.append("file", editImageFile);
        await api.put(`/locations/${editingLoc.loc_id}/image`, fd);
      }
      setEditSuccess("A helyszín sikeresen frissült.");
      setEditingLoc(null);
      setEditImageFile(null);
      await fetchLocations();
    } catch (error) {
      console.error("Error updating location:", error);
      setEditError("Nem sikerült frissíteni a helyszínt.");
    } finally {
      setEditLoading(false);
    }
  };

  // detail megnyitásakor: tetejére görget (navbar látható marad), body lockot állít
  useEffect(() => {
    if (selectedLocation) {
      window.scrollTo({ top: 0, behavior: "instant" });
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [selectedLocation]);

  // ── carousel: apply layout whenever active or locations change ─────────────
  useEffect(() => {
    if (!locations.length || selectedLocation) return;
    const id = setTimeout(() => {
      layoutCards(cardRefs.current.slice(0, locations.length), activeRef.current, 0);
    }, 0);
    return () => clearTimeout(id);
  }, [active, locations, selectedLocation]);

  // ── carousel: active info flash animation ──────────────────────────────────
  const prevActiveRef = useRef(-1);
  useEffect(() => {
    if (!locations.length) return;
    if (prevActiveRef.current === -1) {
      prevActiveRef.current = active;
      setDisplayedIdx(active);
      return;
    }
    if (prevActiveRef.current === active) return;
    prevActiveRef.current = active;

    setInfoFlashing(true);
    const t1 = setTimeout(() => {
      setDisplayedIdx(active);
      setTimeout(() => setInfoFlashing(false), 60);
    }, 120);
    return () => clearTimeout(t1);
  }, [active, locations]);

  // ── carousel: drag and keyboard events ────────────────────────────────────
  const goTo = useCallback((newActive) => {
    const locs = locationsRef.current;
    if (!locs.length) return;
    const clamped = ((newActive % locs.length) + locs.length) % locs.length;
    if (clamped === activeRef.current) return;
    activeRef.current = clamped;
    setActive(clamped);
    layoutCards(cardRefs.current.slice(0, locs.length), clamped, 0);
  }, []);

  useEffect(() => {
    if (selectedLocation) return;

    const track = trackRef.current;
    if (!track) return;

    let startX  = 0;
    let dragX   = 0;
    let pulling = false;
    let rafId   = null;

    const enableTransitions = (on) => {
      cardRefs.current.forEach((el) => {
        if (el) el.style.transition = on ? "" : "none";
      });
    };

    const onPointerDown = (e) => {
      pulling = true;
      startX  = e.clientX;
      dragX   = 0;
      didDrag.current = false;
      track.setPointerCapture(e.pointerId);
      track.classList.add("loc-track-dragging");
      enableTransitions(false);
    };

    const onPointerMove = (e) => {
      if (!pulling) return;
      dragX = e.clientX - startX;
      if (Math.abs(dragX) > 4) didDrag.current = true;

      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        layoutCards(
          cardRefs.current.slice(0, locationsRef.current.length),
          activeRef.current,
          dragX / DRAG_COEFF,
        );
        rafId = null;
      });
    };

    const onPointerUp = () => {
      if (!pulling) return;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      pulling = false;
      track.classList.remove("loc-track-dragging");
      enableTransitions(true);

      const N = locationsRef.current.length;
      if (!N) return;

      let newActive = activeRef.current;
      if (dragX > SNAP_THRESH)       newActive = (activeRef.current - 1 + N) % N;
      else if (dragX < -SNAP_THRESH) newActive = (activeRef.current + 1) % N;

      dragX = 0;
      activeRef.current = newActive;
      setActive(newActive);
      layoutCards(cardRefs.current.slice(0, N), newActive, 0);
    };

    track.addEventListener("pointerdown",  onPointerDown);
    track.addEventListener("pointermove",  onPointerMove);
    track.addEventListener("pointerup",    onPointerUp);
    track.addEventListener("pointerleave", onPointerUp);
    track.addEventListener("pointercancel",onPointerUp);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      track.removeEventListener("pointerdown",  onPointerDown);
      track.removeEventListener("pointermove",  onPointerMove);
      track.removeEventListener("pointerup",    onPointerUp);
      track.removeEventListener("pointerleave", onPointerUp);
      track.removeEventListener("pointercancel",onPointerUp);
    };
  }, [locations, selectedLocation]);

  // ── keyboard navigation ────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedLocation) return;
    const handleKey = (e) => {
      if (e.key === "ArrowLeft")  goTo(activeRef.current - 1);
      if (e.key === "ArrowRight") goTo(activeRef.current + 1);
      if (e.key === "Enter") {
        const loc = locationsRef.current[activeRef.current];
        if (loc) setSelectedLocation(loc);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedLocation, goTo]);

  // ── teleport handler ───────────────────────────────────────────────────────
  const handleTeleport = () => {
    if (!selectedLocation) return;
    trackLocationTeleport(selectedLocation.loc_id);
    navigate(`/app/model?marker=${encodeURIComponent(selectedLocation.button_location)}`);
  };

  const displayedLoc = locations[displayedIdx] || locations[0];
  const N = locations.length;
  // A kiválasztott helyszín sorszáma a tömbben (1-alapú), nem a loc_id
  const selectedLocationIndex = selectedLocation
    ? locations.findIndex(l => l.loc_id === selectedLocation.loc_id) + 1
    : 1;

  // ── render ─────────────────────────────────────────────────────────────────
  if (isGuest) return <GuestWall label="a helyszíneket" />;

  return (
    <>
      {/* ━━━ HÁTTÉR ALAKZATOK ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {createPortal(
        <div className="loc-bg-shapes" aria-hidden="true">
          {/* Bal oldal */}
          <svg className="loc-shape loc-shape--s1" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="20" cy="20" r="18"/></svg>
          <svg className="loc-shape loc-shape--s2" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 2v12M2 8h12"/></svg>
          <span className="loc-shape loc-shape--s3" />
          <svg className="loc-shape loc-shape--s4" viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="15" cy="15" r="13"/></svg>
          <span className="loc-shape loc-shape--s5" />
          <svg className="loc-shape loc-shape--s6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="12" cy="12" r="10"/></svg>
          <svg className="loc-shape loc-shape--s7" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 2v12M2 8h12"/></svg>
          {/* Jobb oldal */}
          <svg className="loc-shape loc-shape--s8" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="20" cy="20" r="18"/></svg>
          <svg className="loc-shape loc-shape--s9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 2v12M2 8h12"/></svg>
          <span className="loc-shape loc-shape--s10" />
          <svg className="loc-shape loc-shape--s11" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="25" cy="25" r="22"/></svg>
          <span className="loc-shape loc-shape--s12" />
          <svg className="loc-shape loc-shape--s13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="12" cy="12" r="10"/></svg>
          <svg className="loc-shape loc-shape--s14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 2v12M2 8h12"/></svg>
          {/* Also szoras */}
          <svg className="loc-shape loc-shape--s15" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="20" cy="20" r="18"/></svg>
          <span className="loc-shape loc-shape--s16" />
          <svg className="loc-shape loc-shape--s17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 2v12M2 8h12"/></svg>
          <svg className="loc-shape loc-shape--s18" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="25" cy="25" r="22"/></svg>
          <span className="loc-shape loc-shape--s19" />
          <svg className="loc-shape loc-shape--s20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="12" cy="12" r="10"/></svg>
          {/* Extra bal oldal */}
          <svg className="loc-shape loc-shape--s21" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 2v12M2 8h12"/></svg>
          <svg className="loc-shape loc-shape--s22" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="22" cy="22" r="19"/></svg>
          <span className="loc-shape loc-shape--s23" />
          {/* Extra jobb oldal */}
          <span className="loc-shape loc-shape--s24" />
          <svg className="loc-shape loc-shape--s25" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 2v14M2 9h14"/></svg>
          <svg className="loc-shape loc-shape--s26" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="22" cy="22" r="19"/></svg>
        </div>,
        document.body
      )}

    <div className="loc-page">

      {/* ━━━ HERO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header className="loc-hero">
        <div className="loc-eyebrow-rail">
          <span className="loc-eyebrow-pill">
            <span className="loc-pulse-dot" aria-hidden="true" />
            EGYETEM NAVIGÁTOR
          </span>
          <span className="loc-eyebrow-line" aria-hidden="true" />
        </div>
        <div className="loc-hero-columns">
          <div className="loc-hero-left">
            <span className="loc-hero-accent-bar" aria-hidden="true" />
            <h1 className="loc-hero-title">
              Fontosabb <em>egyetemi</em> helyszínek
            </h1>
          </div>
          <div className="loc-hero-right">
            <div className="loc-tagline">
              <span className="loc-tagline-bar" aria-hidden="true" />
              <div className="loc-tagline-text">
                <p className="loc-tagline-row loc-tagline-row-1">
                  <strong className="loc-tagline-em">Felfedezés</strong> egy húzással,
                </p>
                <p className="loc-tagline-row loc-tagline-row-2">
                  <strong className="loc-tagline-em">teleportáció</strong> egy kattintással.
                </p>
                <p className="loc-tagline-sig">→ A 3D EGYETEMEN.</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ━━━ STEPS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="loc-steps" aria-label="Használati lépések">
        <div className="loc-steps-inner">
          <div className="loc-steps-connector" aria-hidden="true">
            <div className="loc-steps-connector-fill" />
          </div>
          <div className="loc-steps-grid">
            {[
              { num: "01", label: "BÖNGÉSZÉS", desc: <><strong>Húzd</strong> a kártyákat balra-jobbra a választáshoz.</>, Icon: IconSwap },
              { num: "02", label: "RÉSZLETEK", desc: <><strong>Kattints</strong> a részletek megtekintése gombra a teljes leíráshoz.</>, Icon: IconSearch },
              { num: "03", label: "TELEPORT",  desc: <><strong>Teleportálj</strong> a 3D modellbe a pulzáló zöld gombbal.</>, Icon: IconLocation },
            ].map(({ num, label, desc, Icon }) => (
              <div key={num} className="loc-step">
                <div className="loc-step-node-wrap">
                  <div className="loc-step-node">
                    <span className="loc-step-number">{num}</span>
                    <span className="loc-step-badge" aria-hidden="true"><Icon /></span>
                  </div>
                </div>
                <span className="loc-step-label">{label}</span>
                <p className="loc-step-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ LOCATIONS SECTION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="loc-locations">
        {locationsLoading && <p className="loc-state">Betöltés...</p>}
        {locationsError   && <p className="loc-error">{locationsError}</p>}

        {/* ── DETAIL OVERLAY ── */}
        {!locationsLoading && !locationsError && selectedLocation && (
          <div className="loc-detail-overlay">

            {/* Háttér atmoszféra */}
            <div className="loc-detail-atmo loc-detail-atmo--glow-l" aria-hidden="true" />
            <div className="loc-detail-atmo loc-detail-atmo--glow-r" aria-hidden="true" />
            <div className="loc-detail-atmo loc-detail-atmo--noise"  aria-hidden="true" />

            {/* Dekoratív geometriai elemek */}
            <div className="loc-detail-geo" aria-hidden="true">
              <svg className="loc-geo loc-geo--plus-tr" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 5v14M5 12h14"/></svg>
              <svg className="loc-geo loc-geo--plus-bl" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 5v14M5 12h14"/></svg>
              <svg className="loc-geo loc-geo--circle-1" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="50" cy="50" r="46"/></svg>
              <svg className="loc-geo loc-geo--circle-2" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="50" cy="50" r="46"/></svg>
              <svg className="loc-geo loc-geo--triangle" viewBox="0 0 52 46" fill="none" stroke="currentColor" strokeWidth="1"><path d="M26 2L50 44H2L26 2z"/></svg>
            </div>

            {/* Függőleges bal oldali címke */}
            <div className="loc-detail-vert-label" aria-hidden="true">
              HELYSZÍN · {String(selectedLocationIndex).padStart(2, "0")}
            </div>

            {/* Vissza gomb */}
            <button type="button" className="loc-detail-back loc-anim-back" onClick={() => setSelectedLocation(null)}>
              <IconArrowLeft /> Vissza a kártyákhoz
            </button>

            <div className="loc-detail-split">

              {/* ── BAL PANEL — kártya ── */}
              <div className="loc-detail-left">
                <div className="loc-detail-card-glow" aria-hidden="true" />
                <div className="loc-detail-card-scene">
                  <div className="loc-detail-card-wrap">
                    <div className="loc-detail-tilt-group">
                      <div
                        className="loc-detail-tilt-card"
                        data-kind={getKind(selectedLocation.loc_id)}
                      >
                        <div className="loc-detail-tilt-poster">
                          {!selectedLocation.image_path && (
                            <svg className="loc-card-topo" viewBox="0 0 300 540" preserveAspectRatio="none" aria-hidden="true">
                              <path d="M-20 120 Q 80 80, 160 110 T 320 100" />
                              <path d="M-20 200 Q 90 165, 170 195 T 320 185" />
                              <path d="M-20 280 Q 80 250, 160 280 T 320 270" />
                              <path d="M-20 360 Q 90 330, 170 360 T 320 350" />
                              <path d="M-20 440 Q 80 410, 160 440 T 320 430" />
                            </svg>
                          )}
                        </div>
                        {selectedLocation.image_path && (
                          <img
                            src={resolveImageUrl(selectedLocation.image_path)}
                            alt={selectedLocation.name}
                            className="loc-detail-tilt-img"
                          />
                        )}
                      </div>
                      <span className="loc-detail-corner loc-detail-corner--tl" aria-hidden="true" />
                      <span className="loc-detail-corner loc-detail-corner--tr" aria-hidden="true" />
                      <span className="loc-detail-corner loc-detail-corner--bl" aria-hidden="true" />
                      <span className="loc-detail-corner loc-detail-corner--br" aria-hidden="true" />
                    </div>
                    <div className="loc-detail-card-floor" aria-hidden="true" />
                  </div>
                </div>
              </div>

              {/* ── JOBB PANEL — tartalom ── */}
              <div className="loc-detail-right">

                {/* Nagy háttérszám */}
                <div className="loc-detail-bg-num" aria-hidden="true">
                  {String(selectedLocationIndex).padStart(2, "0")}
                </div>

                <div className="loc-detail-eyebrow loc-anim-item" style={{"--anim-delay":"0.15s"}}>
                  <span className="loc-detail-eyebrow-line" />
                  HELYSZÍN
                </div>

                <div className="loc-detail-title-line loc-anim-item" style={{"--anim-delay":"0.21s"}} aria-hidden="true">
                  <span className="loc-detail-title-line-fill" />
                </div>

                <h1 className="loc-detail-title loc-anim-item" style={{"--anim-delay":"0.23s"}}>
                  {selectedLocation.name}
                </h1>

                <div className="loc-detail-chip loc-anim-item" style={{"--anim-delay":"0.31s"}}>
                  <IconPin />
                  Marosvásárhelyi Kar
                </div>

                <p className="loc-detail-text loc-desc loc-anim-item" style={{"--anim-delay":"0.39s"}}>
                  {selectedLocation.information}
                </p>

                <div className="loc-detail-cta loc-anim-item" style={{"--anim-delay":"0.48s"}}>
                  <CTAButton label="Teleport a helyszínre" onClick={handleTeleport} className="loc-teleport-cta" />
                </div>

                {isAdmin && (
                  <div className="loc-detail-admin-row">
                    <button type="button" className="loc-btn-edit-detail" onClick={() => openEdit(selectedLocation)}>
                      Szerkesztés
                    </button>
                    <button
                      type="button"
                      className="loc-btn-delete-detail"
                      onClick={() => handleDeleteLocation(selectedLocation.loc_id)}
                      disabled={deletingId === selectedLocation.loc_id}
                    >
                      {deletingId === selectedLocation.loc_id ? "Törlés..." : "Törlés"}
                    </button>
                    {selectedLocation.image_path && (
                      <button
                        type="button"
                        className="loc-btn-img-delete"
                        onClick={() => handleDeleteImage(selectedLocation.loc_id)}
                        disabled={imageDeleteId === selectedLocation.loc_id}
                      >
                        {imageDeleteId === selectedLocation.loc_id ? "Kép törlése..." : "Kép törlése"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── CAROUSEL VIEW ── */}
        {!locationsLoading && !locationsError && !selectedLocation && N > 0 && (
          <div className="loc-carousel-wrap">

            {/* meta header */}
            <div className="loc-carousel-meta" aria-live="polite">
              <span className="loc-pulse-dot" aria-hidden="true" />
              <span className="loc-meta-counter">
                <span key={active} className="loc-meta-num loc-meta-num-pop">
                  {String(active + 1).padStart(2, "0")}
                </span>
                <span className="loc-meta-denom">/{String(N).padStart(2, "0")}</span>
              </span>
              <span className="loc-meta-sep" aria-hidden="true" />
              <span className="loc-meta-label">HÚZD A KÁRTYÁKAT</span>
            </div>

            {/* stage */}
            <div className="loc-stage">
              <div className="loc-stage-fade-l" aria-hidden="true" />
              <div className="loc-stage-fade-r" aria-hidden="true" />
              <div className="loc-stage-spotlight" aria-hidden="true" />

              {/* 3D track */}
              <div className="loc-track" ref={trackRef} role="region" aria-label="Helyszínek körkörösen">
                {locations.map((loc, i) => {
                  const imgUrl = resolveImageUrl(loc.image_path);
                  return (
                    <article
                      key={loc.loc_id}
                      ref={(el) => { cardRefs.current[i] = el; }}
                      data-kind={getKind(loc.loc_id)}
                      className="loc-card"
                      aria-label={loc.name}
                      onClick={() => {
                        if (!didDrag.current && i !== activeRef.current) goTo(i);
                      }}
                    >
                      {imgUrl ? (
                        /* photo background */
                        <div
                          className="loc-card-poster loc-card-poster--photo"
                          style={{ backgroundImage: `url(${imgUrl})` }}
                        />
                      ) : (
                        /* gradient + topo fallback */
                        <div className="loc-card-poster">
                          <svg className="loc-card-topo" viewBox="0 0 300 540" preserveAspectRatio="none" aria-hidden="true">
                            <path d="M-20 120 Q 80 80, 160 110 T 320 100" />
                            <path d="M-20 200 Q 90 165, 170 195 T 320 185" />
                            <path d="M-20 280 Q 80 250, 160 280 T 320 270" />
                            <path d="M-20 360 Q 95 330, 175 360 T 320 350" />
                            <path d="M-20 440 Q 80 410, 160 440 T 320 430" />
                          </svg>
                        </div>
                      )}
                      <div className="loc-card-veil" />
                    </article>
                  );
                })}
              </div>

              {/* floating active info */}
              <div className={`loc-active-info${infoFlashing ? " loc-active-info-flash" : ""}`}>
                <h3 className="loc-active-name">{displayedLoc?.name || ""}</h3>
                <CTAButton
                  label="Részletek megtekintése"
                  onClick={() => { if (displayedLoc) setSelectedLocation(displayedLoc); }}
                />
              </div>
            </div>

            {/* dots */}
            <div className="loc-dots" role="tablist" aria-label="Helyszín kiválasztása">
              {locations.map((_, i) => (
                <button
                  key={i}
                  role="tab"
                  aria-selected={i === active}
                  className={`loc-dot${i === active ? " loc-dot-active" : ""}`}
                  onClick={() => goTo(i)}
                  aria-label={`${i + 1}. helyszín`}
                />
              ))}
            </div>
          </div>
        )}

        {!locationsLoading && !locationsError && N === 0 && (
          <p className="loc-state">Még nincsenek feltöltött helyszínek.</p>
        )}
      </section>

      {/* ━━━ ADMIN FAB ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isAdmin && (
        <button
          type="button"
          className="loc-admin-fab"
          onClick={() => setShowAdminPanel((p) => !p)}
          aria-label="Admin panel"
        >
          {showAdminPanel ? <IconClose /> : <IconPlus />}
        </button>
      )}

      {/* ━━━ ADMIN OVERLAY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isAdmin && showAdminPanel && (
        <div className="loc-admin-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeAdminPanel(); }}>
          <div className="loc-admin-panel">
            <div className="loc-admin-panel-header">
              <span>{editingLoc ? "Helyszín szerkesztése" : "Új helyszín létrehozása"}</span>
              <button type="button" onClick={closeAdminPanel} aria-label="Bezárás"><IconClose /></button>
            </div>

            {/* available objects */}
            {locationObjects.length > 0 && (
              <div className="loc-admin-objects-list">
                <p className="loc-admin-objects-title">Elérhető location objectek</p>
                <div className="loc-admin-objects-chips">
                  {locationObjects.map((obj) => {
                    const name = getObjectName(obj);
                    return name ? <span key={name} className="loc-admin-obj-chip">{name}</span> : null;
                  })}
                </div>
              </div>
            )}
            {objectsError && <p className="loc-admin-form-error">{objectsError}</p>}

            {editingLoc ? (
              /* ── edit form ── */
              <form onSubmit={handleEditLocation} className="loc-admin-form">
                <input
                  type="text"
                  placeholder="Név"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <select
                  value={editButtonLocation}
                  onChange={(e) => setEditButtonLocation(e.target.value)}
                  disabled={objectsLoading || (locationObjects.length === 0 && !editButtonLocation)}
                >
                  <option value="">{objectsLoading ? "Betöltés..." : "Válassz location objectet"}</option>
                  {editButtonLocation && !locationObjects.some((obj) => getObjectName(obj) === editButtonLocation) && (
                    <option value={editButtonLocation}>{editButtonLocation} (jelenlegi)</option>
                  )}
                  {locationObjects.map((obj) => {
                    const name = getObjectName(obj);
                    return name ? <option key={name} value={name}>{name}</option> : null;
                  })}
                </select>
                <textarea
                  placeholder="Leírás"
                  value={editInformation}
                  onChange={(e) => setEditInformation(e.target.value)}
                  rows={4}
                />
                <label className="loc-admin-file-label">
                  Kép feltöltése (opcionális)
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) => setEditImageFile(e.target.files?.[0] || null)}
                  />
                </label>
                {editError && <p className="loc-admin-form-error">{editError}</p>}
                <div className="loc-admin-form-actions">
                  <button type="submit" disabled={editLoading} className="loc-btn-create">
                    {editLoading ? "Mentés..." : "Mentés"}
                  </button>
                  <button type="button" onClick={cancelEdit} className="loc-btn-cancel">
                    Mégse
                  </button>
                </div>
              </form>
            ) : (
              /* ── create form ── */
              <form onSubmit={handleCreateLocation} className="loc-admin-form">
                <input
                  type="text"
                  placeholder="Név"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <select
                  value={newButtonLocation}
                  onChange={(e) => setNewButtonLocation(e.target.value)}
                  disabled={objectsLoading || locationObjects.length === 0}
                >
                  <option value="">{objectsLoading ? "Betöltés..." : "Válassz location objectet"}</option>
                  {locationObjects.map((obj) => {
                    const name = getObjectName(obj);
                    return name ? <option key={name} value={name}>{name}</option> : null;
                  })}
                </select>
                <textarea
                  placeholder="Leírás"
                  value={newInformation}
                  onChange={(e) => setNewInformation(e.target.value)}
                  rows={4}
                />
                <label className="loc-admin-file-label">
                  Kép feltöltése (opcionális)
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) => setNewImageFile(e.target.files?.[0] || null)}
                  />
                </label>
                {createError   && <p className="loc-admin-form-error">{createError}</p>}
                {createSuccess && <p className="loc-admin-form-success">{createSuccess}</p>}
                <button type="submit" disabled={createLoading} className="loc-btn-create">
                  {createLoading ? "Mentés..." : "Helyszín létrehozása"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
