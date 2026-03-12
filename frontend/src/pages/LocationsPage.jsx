import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "../styles/LocationsPage.css";

export default function LocationsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role_id === 2;

  // Locations (visible to all)
  const [locations, setLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsError, setLocationsError] = useState("");

  // Admin-only location objects
  const [locationObjects, setLocationObjects] = useState([]);
  const [objectsLoading, setObjectsLoading] = useState(false);
  const [objectsError, setObjectsError] = useState("");

  // Admin-only create form
  const [newName, setNewName] = useState("");
  const [newButtonLocation, setNewButtonLocation] = useState("");
  const [newInformation, setNewInformation] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  // Admin-only edit form
  const [editingLoc, setEditingLoc] = useState(null);
  const [editName, setEditName] = useState("");
  const [editButtonLocation, setEditButtonLocation] = useState("");
  const [editInformation, setEditInformation] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  const openEdit = (loc) => {
    setEditingLoc(loc);
    setEditName(loc.name);
    setEditButtonLocation(loc.button_location);
    setEditInformation(loc.information);
    setEditError("");
    setEditSuccess("");
  };

  const cancelEdit = () => {
    setEditingLoc(null);
    setEditError("");
    setEditSuccess("");
  };

  // Admin-only delete
  const [deletingId, setDeletingId] = useState(null);

  const handleDeleteLocation = async (locId) => {
    if (!window.confirm("Biztosan törölni szeretnéd ezt a helyszínt?")) return;

    try {
      setDeletingId(locId);
      await api.delete(`/locations/${locId}`);
      await fetchLocations();
    } catch (error) {
      console.error("Error deleting location:", error);
    } finally {
      setDeletingId(null);
    }
  };

  

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

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

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
    setCreateError("");
    setCreateSuccess("");

    const name = newName.trim();
    const buttonLocation = newButtonLocation.trim();
    const information = newInformation.trim();

    if (!name || !buttonLocation || !information) {
      setCreateError("Minden mező kötelező.");
      return;
    }

    try {
      setCreateLoading(true);

      await api.post("/locations/", {
        name,
        button_location: buttonLocation,
        information,
      });

      setCreateSuccess("A helyszín sikeresen létrejött.");
      setNewName("");
      setNewButtonLocation("");
      setNewInformation("");

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
    setEditError("");
    setEditSuccess("");

    const name = editName.trim();
    const buttonLocation = editButtonLocation.trim();
    const information = editInformation.trim();

    if (!name || !buttonLocation || !information) {
      setEditError("Minden mező kötelező.");
      return;
    }

    try {
      setEditLoading(true);

      await api.put(`/locations/${editingLoc.loc_id}`, {
        name,
        button_location: buttonLocation,
        information,
      });

      setEditSuccess("A helyszín sikeresen frissült.");
      setEditingLoc(null);
      await fetchLocations();
    } catch (error) {
      console.error("Error updating location:", error);
      setEditError("Nem sikerült frissíteni a helyszínt.");
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div>
      <h1>Fontosabb egyetemi helyszínek</h1>
      <p>Ismerd meg a Sapientia campus kulcsfontosságú helyszíneit</p>

      {isAdmin && (
        <section>
          <h2>Új helyszín létrehozása (admin)</h2>
          <form onSubmit={handleCreateLocation}>
            <input
              type="text"
              placeholder="Név"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Marker / button_location"
              value={newButtonLocation}
              onChange={(e) => setNewButtonLocation(e.target.value)}
            />
            <textarea
              placeholder="Leírás"
              value={newInformation}
              onChange={(e) => setNewInformation(e.target.value)}
              rows={4}
            />
            <button type="submit" disabled={createLoading}>
              {createLoading ? "Mentés..." : "Helyszín létrehozása"}
            </button>
          </form>

          {createError && <p>{createError}</p>}
          {createSuccess && <p>{createSuccess}</p>}
        </section>
      )}

      <section>
        <h2>Helyszínek</h2>
        {locationsLoading && <p>Betöltés...</p>}
        {locationsError && <p>{locationsError}</p>}

        {!locationsLoading && !locationsError && (
          <div>
            {locations.map((loc) => (
              <div key={loc.loc_id}>
                {isAdmin && editingLoc?.loc_id === loc.loc_id ? (
                  <form onSubmit={handleEditLocation}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Név"
                    />
                    <input
                      type="text"
                      value={editButtonLocation}
                      onChange={(e) => setEditButtonLocation(e.target.value)}
                      placeholder="Marker / button_location"
                    />
                    <textarea
                      value={editInformation}
                      onChange={(e) => setEditInformation(e.target.value)}
                      placeholder="Leírás"
                      rows={3}
                    />
                    {editError && <p>{editError}</p>}
                    <button type="submit" disabled={editLoading}>
                      {editLoading ? "Mentés..." : "Mentés"}
                    </button>
                    <button type="button" onClick={cancelEdit}>Mégse</button>
                  </form>
                ) : (
                  <>
                    <div>
                      <h3>{loc.name}</h3>
                      <p>Marker: {loc.button_location}</p>
                      <p>{loc.information}</p>
                    </div>
                    <Link
                      to="/app/model"
                      state={{ marker: loc.button_location }}
                    >
                      Indítsd el a 3D modellt
                    </Link>
                    {isAdmin && (
                      <>
                        <button type="button" onClick={() => openEdit(loc)}>Szerkesztés</button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLocation(loc.loc_id)}
                          disabled={deletingId === loc.loc_id}
                        >
                          {deletingId === loc.loc_id ? "Törlés..." : "Törlés"}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {isAdmin && (
        <section>
          <h2>Location objectek (admin)</h2>
          {objectsLoading && <p>Betöltés...</p>}
          {objectsError && <p>{objectsError}</p>}

          {!objectsLoading && !objectsError && (
            <ul>
              {locationObjects.map((obj) => (
                <li key={obj.object_name}>{obj.object_name}</li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}