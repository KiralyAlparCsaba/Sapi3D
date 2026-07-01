import nipplejs from "nipplejs";

// --- Joystick layout konstansok ---
const ZONE_MARGIN = "20px"; // távolság a képernyő szélétől
const ZONE_SIZE = "140px"; // joystick zóna mérete
const ZONE_Z_INDEX = 999;
const NIPPLE_CENTER = "70px"; // a nipple középpontja a zónán belül (ZONE_SIZE / 2)
const NIPPLE_COLOR = "white";

export function createMobileJoystick(onMove, onLook) {
  const moveZone = document.createElement("div");
  moveZone.id = "joystick-move";
  Object.assign(moveZone.style, {
    position: "absolute",
    bottom: ZONE_MARGIN,
    right: ZONE_MARGIN,
    width: ZONE_SIZE,
    height: ZONE_SIZE,
    zIndex: ZONE_Z_INDEX,
  });
  document.body.appendChild(moveZone);

  const lookZone = document.createElement("div");
  lookZone.id = "joystick-look";
  Object.assign(lookZone.style, {
    position: "absolute",
    bottom: ZONE_MARGIN,
    left: ZONE_MARGIN,
    width: ZONE_SIZE,
    height: ZONE_SIZE,
    zIndex: ZONE_Z_INDEX,
  });
  document.body.appendChild(lookZone);

  const moveJoystick = nipplejs.create({
    zone: moveZone,
    mode: "static",
    position: { left: NIPPLE_CENTER, top: NIPPLE_CENTER },
    color: NIPPLE_COLOR,
  });

  moveJoystick.on("move", (_, data) => {
    if (!data || !data.vector) return;
    onMove(data.vector.x, data.vector.y); 
  });

  moveJoystick.on("end", () => {
    onMove(0, 0);
  });

  const lookJoystick = nipplejs.create({
    zone: lookZone,
    mode: "static",
    position: { left: NIPPLE_CENTER, top: NIPPLE_CENTER },
    color: NIPPLE_COLOR,
  });

  lookJoystick.on("move", (_, data) => {
    if (!data || !data.vector) return;
    onLook(data.vector.x, data.vector.y);
  });

  lookJoystick.on("end", () => {
    onLook(0, 0);
  });

  return () => {
    moveZone.remove();
    lookZone.remove();
  };
}
