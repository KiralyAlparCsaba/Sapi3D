import nipplejs from "nipplejs";

export function createMobileJoystick(onMove, onLook) {
  const moveZone = document.createElement("div");
  moveZone.id = "joystick-move";
  Object.assign(moveZone.style, {
    position: "absolute",
    bottom: "20px",
    right: "20px",
    width: "140px",
    height: "140px",
    zIndex: 999,
  });
  document.body.appendChild(moveZone);

  const lookZone = document.createElement("div");
  lookZone.id = "joystick-look";
  Object.assign(lookZone.style, {
    position: "absolute",
    bottom: "20px",
    left: "20px",
    width: "140px",
    height: "140px",
    zIndex: 999,
  });
  document.body.appendChild(lookZone);

  const moveJoystick = nipplejs.create({
    zone: moveZone,
    mode: "static",
    position: { left: "70px", top: "70px" },
    color: "white",
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
    position: { left: "70px", top: "70px" },
    color: "white",
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
