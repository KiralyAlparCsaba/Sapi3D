import * as THREE from "three";

export class TeleportSystem {
  constructor(scene, camera, controls) {
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    this.locations = {};
  }

  registerLocation(name, objectName, heightOffset = 1.6) {
    const obj = this.scene.getObjectByName(objectName);
    if (!obj) {
      console.warn(`Teleport marker ${objectName} not found`);
      return;
    }

    this.locations[name] = {
      object: obj,
      heightOffset
    };
  }

  teleportTo(name) {
    const location = this.locations[name];
    if (!location) return;

    const worldPos = new THREE.Vector3();
    location.object.getWorldPosition(worldPos);

    const cameraPos = worldPos.clone();
    cameraPos.y += location.heightOffset;

    this.camera.position.copy(cameraPos);

    if (this.controls) {
      this.controls.target.copy(worldPos);
      this.controls.update();
    }
  }
}