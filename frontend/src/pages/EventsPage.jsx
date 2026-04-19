import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "../styles/EventsPage.css";

function resolveImageUrl(imagePath) {
  if (!imagePath) return "";
  if (/^https?:\/\//i.test(imagePath)) return imagePath;

  const envBase = (import.meta.env.VITE_API_URL || "").trim();
  const base = envBase || `${window.location.protocol}//${window.location.hostname}:8000`;
  const normalizedBase = base.replace(/\/$/, "");
  const normalizedPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${normalizedBase}${normalizedPath}`;
}

export default function EventsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role_id === 2;

  const [events, setEvents] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [locationFilter, setLocationFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newLocId, setNewLocId] = useState("");
  const [newImageFile, setNewImageFile] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  const [editingEventId, setEditingEventId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLocId, setEditLocId] = useState("");
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
    setLoading(true);
    setError("");

    try {
      const [eventsResponse, locationsResponse] = await Promise.all([
        api.get("/events/"),
        api.get("/locations/"),
      ]);

      const nextEvents = Array.isArray(eventsResponse.data) ? eventsResponse.data : [];
      setEvents(nextEvents);
      setLocations(Array.isArray(locationsResponse.data) ? locationsResponse.data : []);

      setSelectedEvent((prevSelected) => {
        if (!prevSelected) return null;
        return nextEvents.find((evt) => evt.event_id === prevSelected.event_id) || null;
      });
    } catch (fetchError) {
      console.error("Error fetching events page data:", fetchError);
      setError("Nem sikerült betölteni az eseményeket.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const locationNameById = useMemo(() => {
    const map = new Map();
    locations.forEach((loc) => map.set(loc.loc_id, loc.name));
    return map;
  }, [locations]);

  const filteredEvents = useMemo(() => {
    const loweredSearch = searchTerm.trim().toLowerCase();

    return events.filter((event) => {
      const matchesLocation = !locationFilter || String(event.loc_id) === locationFilter;

      const searchableText = `${event.name || ""} ${event.description || ""}`.toLowerCase();
      const matchesSearch = !loweredSearch || searchableText.includes(loweredSearch);

      return matchesLocation && matchesSearch;
    });
  }, [events, locationFilter, searchTerm]);

  const resetCreateForm = () => {
    setNewName("");
    setNewDescription("");
    setNewLocId("");
    setNewImageFile(null);
  };

  const openEdit = (event) => {
    setEditingEventId(event.event_id);
    setEditName(event.name || "");
    setEditDescription(event.description || "");
    setEditLocId(String(event.loc_id || ""));
    setEditImageFile(null);
    setEditError("");
  };

  const cancelEdit = () => {
    setEditingEventId(null);
    setEditError("");
    setEditImageFile(null);
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");

    const payloadName = newName.trim();
    const payloadDescription = newDescription.trim();
    const payloadLocId = Number(newLocId);

    if (!payloadName || !payloadDescription || !Number.isInteger(payloadLocId)) {
      setCreateError("Név, leírás és helyszín kiválasztása kötelező.");
      return;
    }

    try {
      setCreateLoading(true);

      const createResponse = await api.post("/events/", {
        name: payloadName,
        description: payloadDescription,
        loc_id: payloadLocId,
        image_path: null,
      });

      const createdEvent = createResponse?.data;
      if (newImageFile && createdEvent?.event_id) {
        const formData = new FormData();
        formData.append("file", newImageFile);
        await api.post(`/events/${createdEvent.event_id}/image`, formData);
      }

      resetCreateForm();
      setCreateSuccess("Az esemény sikeresen létrejött.");
      await fetchData();
    } catch (createErr) {
      console.error("Error creating event:", createErr);
      setCreateError(getErrorMessage(createErr, "Nem sikerült létrehozni az eseményt."));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    if (!editingEventId) return;

    setEditError("");

    const payloadName = editName.trim();
    const payloadDescription = editDescription.trim();
    const payloadLocId = Number(editLocId);

    if (!payloadName || !payloadDescription || !Number.isInteger(payloadLocId)) {
      setEditError("Név, leírás és helyszín kiválasztása kötelező.");
      return;
    }

    try {
      setEditLoading(true);

      await api.put(`/events/${editingEventId}`, {
        name: payloadName,
        description: payloadDescription,
        loc_id: payloadLocId,
      });

      if (editImageFile) {
        const formData = new FormData();
        formData.append("file", editImageFile);
        await api.put(`/events/${editingEventId}/image`, formData);
      }

      cancelEdit();
      await fetchData();
    } catch (updateErr) {
      console.error("Error updating event:", updateErr);
      setEditError(getErrorMessage(updateErr, "Nem sikerült frissíteni az eseményt."));
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Biztosan törölni szeretnéd ezt az eseményt?")) return;

    try {
      setDeletingId(eventId);
      await api.delete(`/events/${eventId}`);

      setSelectedEvent((prev) => (prev?.event_id === eventId ? null : prev));
      if (editingEventId === eventId) cancelEdit();

      await fetchData();
    } catch (deleteErr) {
      console.error("Error deleting event:", deleteErr);
      alert(getErrorMessage(deleteErr, "Nem sikerült törölni az eseményt."));
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteImage = async (eventId) => {
    if (!window.confirm("Biztosan törölni szeretnéd az esemény képét?")) return;

    try {
      setImageDeleteId(eventId);
      await api.delete(`/events/${eventId}/image`);
      await fetchData();
    } catch (deleteErr) {
      console.error("Error deleting event image:", deleteErr);
      alert(getErrorMessage(deleteErr, "Nem sikerült törölni az esemény képét."));
    } finally {
      setImageDeleteId(null);
    }
  };

  return (
    <div className="events-page">
      <header className="events-hero-head">
        <h1>Események</h1>
        <p className="events-subtitle">
          Böngészd az egyetemi eseményeket helyszín szerint. A kiválasztott eseményből
          egy kattintással átjuthatsz a kapcsolódó helyszín részletes nézetére.
        </p>
      </header>

      {isAdmin && (
        <section className="events-admin-create">
          <h2>Új esemény létrehozása</h2>
          <form onSubmit={handleCreateEvent} className="events-create-form">
            <input
              type="text"
              placeholder="Esemény neve"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />

            <select value={newLocId} onChange={(e) => setNewLocId(e.target.value)}>
              <option value="">Válassz helyszínt</option>
              {locations.map((loc) => (
                <option key={loc.loc_id} value={String(loc.loc_id)}>
                  {loc.name}
                </option>
              ))}
            </select>

            <textarea
              rows={3}
              placeholder="Esemény leírása"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />

            <label className="events-file-label">
              Kép feltöltése (opcionális)
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => setNewImageFile(e.target.files?.[0] || null)}
              />
            </label>

            <button type="submit" className="events-btn-view" disabled={createLoading}>
              {createLoading ? "Mentés..." : "Esemény létrehozása"}
            </button>
          </form>

          {createError && <p className="events-error">{createError}</p>}
          {createSuccess && <p className="events-success">{createSuccess}</p>}
        </section>
      )}

      <section className="events-filters" aria-label="Esemény szűrők">
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="events-filter-select"
        >
          <option value="">Összes helyszín</option>
          {locations.map((loc) => (
            <option key={loc.loc_id} value={String(loc.loc_id)}>
              {loc.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Keresés név vagy leírás alapján"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="events-filter-search"
        />
      </section>

      {loading && <p>Betöltés...</p>}
      {error && <p className="events-error">{error}</p>}

      {!loading && !error && selectedEvent && (
        <section className="events-detail-view">
          <div className="events-detail-header">
            <button type="button" className="events-back-btn" onClick={() => setSelectedEvent(null)}>
              Vissza az eseményekhez
            </button>
          </div>

          <article className="events-detail-card">
            {selectedEvent.image_path && (
              <div className="events-detail-media-shell">
                <img
                  src={resolveImageUrl(selectedEvent.image_path)}
                  alt={selectedEvent.name}
                  className="events-detail-image"
                />
              </div>
            )}

            <div className="events-detail-content-shell">
              <h2 className="events-detail-title">{selectedEvent.name}</h2>
              <p className="events-detail-location">
                Helyszín: {locationNameById.get(selectedEvent.loc_id) || "Ismeretlen helyszín"}
              </p>
              <p className="events-detail-description">{selectedEvent.description}</p>

              <div className="events-detail-actions">
                <Link
                  to={`/app/locations?loc_id=${selectedEvent.loc_id}`}
                  className="events-location-link"
                >
                  Helyszín részleteinek megnyitása
                </Link>
                {isAdmin && (
                  <button
                    type="button"
                    className="events-btn-edit"
                    onClick={() => {
                      setSelectedEvent(null);
                      openEdit(selectedEvent);
                    }}
                  >
                    Szerkesztés
                  </button>
                )}
              </div>
            </div>
          </article>
        </section>
      )}

      {!loading && !error && !selectedEvent && filteredEvents.length > 0 && (
        <section className="events-grid" aria-label="Eseménylista">
          {filteredEvents.map((event) => (
            <article key={event.event_id} className="events-card">
              {isAdmin && editingEventId === event.event_id ? (
                <form onSubmit={handleUpdateEvent} className="events-edit-form">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Esemény neve"
                  />

                  <select value={editLocId} onChange={(e) => setEditLocId(e.target.value)}>
                    <option value="">Válassz helyszínt</option>
                    {locations.map((loc) => (
                      <option key={loc.loc_id} value={String(loc.loc_id)}>
                        {loc.name}
                      </option>
                    ))}
                  </select>

                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Esemény leírása"
                  />

                  <label className="events-file-label">
                    Új kép (opcionális)
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={(e) => setEditImageFile(e.target.files?.[0] || null)}
                    />
                  </label>

                  {editError && <p className="events-error">{editError}</p>}

                  <div className="events-admin-actions">
                    <button type="submit" className="events-btn-save" disabled={editLoading}>
                      {editLoading ? "Mentés..." : "Mentés"}
                    </button>
                    <button type="button" className="events-btn-cancel" onClick={cancelEdit}>
                      Mégse
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {event.image_path ? (
                    <div className="events-card-image-shell">
                      <img src={resolveImageUrl(event.image_path)} alt={event.name} className="events-card-image" />
                    </div>
                  ) : (
                    <div className="events-card-image-placeholder">Nincs kép</div>
                  )}

                  <div className="events-card-body">
                    <h3>{event.name}</h3>
                    <p className="events-card-location">
                      {locationNameById.get(event.loc_id) || "Ismeretlen helyszín"}
                    </p>
                    <p className="events-card-description">{event.description}</p>
                  </div>

                  <div className="events-card-actions">
                    <button type="button" className="events-btn-view" onClick={() => setSelectedEvent(event)}>
                      Részletek megtekintése
                    </button>

                    {isAdmin && (
                      <div className="events-admin-actions">
                        <button type="button" className="events-btn-edit" onClick={() => openEdit(event)}>
                          Szerkesztés
                        </button>
                        <button
                          type="button"
                          className="events-btn-delete"
                          onClick={() => handleDeleteEvent(event.event_id)}
                          disabled={deletingId === event.event_id}
                        >
                          {deletingId === event.event_id ? "Törlés..." : "Törlés"}
                        </button>
                        {event.image_path && (
                          <button
                            type="button"
                            className="events-btn-image-delete"
                            onClick={() => handleDeleteImage(event.event_id)}
                            disabled={imageDeleteId === event.event_id}
                          >
                            {imageDeleteId === event.event_id ? "Kép törlése..." : "Kép törlése"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </article>
          ))}
        </section>
      )}

      {!loading && !error && !selectedEvent && filteredEvents.length === 0 && (
        <p>Nincs találat a megadott szűrők alapján.</p>
      )}
    </div>
  );
}
