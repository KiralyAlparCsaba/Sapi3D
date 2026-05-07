export const BADGE_TIERS = [
  {
    id: "badge-bronze",
    name: "Bronz Felfedező",
    threshold: 2,
    icon: "🥉",
    flavor: "Megkezdted az utat az egyetem titkai felé.",
  },
  {
    id: "badge-silver",
    name: "Ezüst Navigátor",
    threshold: 4,
    icon: "🥈",
    flavor: "Már rutinosan mozogsz a fontos helyszínek között.",
  },
  {
    id: "badge-gold",
    name: "Arany Legendás",
    threshold: 6,
    icon: "🏆",
    flavor: "A teljes 3D egyetem felfedezés mesterfokon.",
  },
];

// ════════════════════════════════════════
// Requirement típus → megjelenítési szöveg
// ════════════════════════════════════════

export const requirementLabelMap = {
  model_view_count: "Modell megtekintese",
  location_count: "Helyszin megtekintese",
  panel_count: "Panel megnyitasa",
  time_spent: "Aktiv bejaras",
  location: "Helyszin megtekintese",
  panel: "Panel megnyitasa",
  location_any_of: "Kijelolt helyszinek",
  panel_any_of: "Kijelolt panelek",
};

export const requirementCategoryMap = {
  model_view_count: "3D",
  location_count: "Helyszín",
  panel_count: "Infó",
  time_spent: "Idő",
  location: "Helyszín",
  panel: "Infó",
  location_any_of: "Helyszín",
  panel_any_of: "Infó",
};

// ════════════════════════════════════════
// Helper: requirement összefoglaló szöveg + target
// ════════════════════════════════════════

export function buildRequirementSummary(requirements) {
  if (!Array.isArray(requirements) || requirements.length === 0) {
    return { condition: "Nincs kovetelmeny", target: 1 };
  }

  const byType = requirements.reduce((acc, req) => {
    if (!acc[req.req_type]) acc[req.req_type] = [];
    acc[req.req_type].push(req);
    return acc;
  }, {});

  // time_spent prioritása: ha van, mindig azt kezeljük elsőként
  // (megakadályozza, hogy egy másodlagos requirement elvegye a fókuszt)
  if (byType.time_spent) {
    const targetSeconds = byType.time_spent[0]?.value ?? 600;
    const targetMinutes = Math.max(1, Math.round(targetSeconds / 60));
    return {
      condition: `${targetMinutes} perc ${requirementLabelMap["time_spent"]}`,
      target: targetSeconds,
    };
  }

  const types = Object.keys(byType);
  const primaryType = types[0] || "";

  if (primaryType === "model_view_count") {
    const target = byType[primaryType][0]?.value ?? 1;
    return { condition: `${requirementLabelMap[primaryType]} ${target}x`, target };
  }

  if (primaryType === "location_count" || primaryType === "panel_count") {
    const target = byType[primaryType][0]?.value ?? 1;
    return { condition: `${target} ${requirementLabelMap[primaryType]}`, target };
  }

  if (primaryType === "location" || primaryType === "panel") {
    const target = byType[primaryType].length || 1;
    return { condition: `${target} ${requirementLabelMap[primaryType]}`, target };
  }

  if (primaryType === "location_any_of" || primaryType === "panel_any_of") {
    return { condition: "Legalabb 1 kijelolt elem", target: 1 };
  }

  return { condition: "Kovetelmeny teljesitese", target: 1 };
}

// ════════════════════════════════════════
// Helper: achievement megjelenítési adatok összeállítása
// ════════════════════════════════════════

export function buildDbAchievementDisplay(requirements, progressPayload, locationsById) {
  if (!Array.isArray(requirements) || requirements.length === 0) {
    return {
      condition: "Nincs kovetelmeny",
      target: 1,
      current: 0,
      displayTarget: 1,
      displayCurrent: 0,
      category: "Egyéb",
    };
  }

  const byType = requirements.reduce((acc, req) => {
    if (!acc[req.req_type]) acc[req.req_type] = [];
    acc[req.req_type].push(req);
    return acc;
  }, {});

  const visitedIds = new Set(
    (progressPayload?.locations || []).map((loc) => loc.location_id),
  );

  const types = Object.keys(byType);
  const primaryType = types[0] || "";
  const category = requirementCategoryMap[primaryType] || "Egyéb";

  // Helyszín-alapú achievement
  if (byType.location || byType.location_any_of) {
    const specificReqs = byType.location || [];
    const anyOfReq = (byType.location_any_of || [])[0];
    const specificIds = specificReqs.map((req) => req.location_id).filter(Boolean);
    const anyOfIds = anyOfReq?.requirement_data?.location_ids || [];

    const specificNames = specificIds.map((id) => locationsById[id]).filter(Boolean);
    const anyOfNames = anyOfIds.map((id) => locationsById[id]).filter(Boolean);

    let condition = "Kijelolt helyszinek megtekintese";
    if (specificIds.length && anyOfIds.length) {
      const resolvedSpecific = specificIds.map((id) => locationsById[id] || `Helyszín ${id}`);
      const resolvedAnyOf = anyOfIds.map((id) => locationsById[id] || `Helyszín ${id}`);
      condition = `${resolvedSpecific.join(", ")} és tanszékek megtekintése (${resolvedAnyOf.join(", ")})`;
    } else if (specificNames.length) {
      condition = `${specificNames.join(", ")} megtekintése`;
    } else if (anyOfNames.length) {
      condition = "Tanszékek közül legalább 1 megtekintése";
    }

    const target = specificIds.length + (anyOfIds.length ? 1 : 0);
    const currentSpecific = specificIds.filter((id) => visitedIds.has(id)).length;
    const anyOfMet = anyOfIds.some((id) => visitedIds.has(id)) ? 1 : 0;
    const current = currentSpecific + anyOfMet;

    return {
      condition,
      target: target || 1,
      current,
      displayTarget: target || 1,
      displayCurrent: current,
      category,
    };
  }

  const summary = buildRequirementSummary(requirements);
  const current = progressPayload?.visited ?? 0;

  // time_spent: ha BÁRMELY requirement time_spent típusú, következetesen kezeljük
  const hasTimeSpent = !!byType.time_spent;

  if (primaryType === "time_spent" || hasTimeSpent) {
    const timeReq = byType.time_spent?.[0];
    const targetSeconds = timeReq?.value || summary.target || 600;
    const targetMinutes = Math.max(1, Math.round(targetSeconds / 60));

    // A backend mindig másodpercben adja vissza time_spent értékét
    const currentSeconds = current;
    const currentMinutes = Math.floor(currentSeconds / 60);

    return {
      condition: `${targetMinutes} perc Aktív bejárás`,
      target: targetSeconds,
      current: currentSeconds,
      displayTarget: targetMinutes,
      displayCurrent: currentMinutes,
      displayUnit: "perc",
      category: "Idő",
    };
  }

  return {
    condition: summary.condition,
    target: summary.target || 1,
    current,
    displayTarget: summary.target || 1,
    displayCurrent: current,
    category,
  };
}

// ════════════════════════════════════════
// Helper: location ID-k összegyűjtése requirement-ekből
// ════════════════════════════════════════

export function collectLocationIds(requirements) {
  if (!Array.isArray(requirements)) return [];
  const ids = new Set();

  requirements.forEach((req) => {
    if (req.location_id) ids.add(req.location_id);
    const anyOf = req.requirement_data?.location_ids || [];
    anyOf.forEach((id) => ids.add(id));
  });

  return Array.from(ids);
}
