import * as THREE from "three";

export default class MobilePointerLockControls {
    constructor(camera) {
        this.camera = camera;

        this.minPolarAngle = 0;
        this.maxPolarAngle = Math.PI;
        this.pointerSpeed = 1.0;

        this._euler = new THREE.Euler(0, 0, 0, "YXZ");
        this._vector = new THREE.Vector3();

        this.joystickLook = { x: 0, y: 0 };
    }

    setLook(x, y) {
        this.joystickLook.x = x;
        this.joystickLook.y = y;
    }

    update(delta) {

        const movementX = this.joystickLook.x * 5;
        const movementY = this.joystickLook.y * 5;

        if (movementX !== 0 || movementY !== 0) {
            this._euler.setFromQuaternion(this.camera.quaternion);

            this._euler.y -= movementX * 0.002 * this.pointerSpeed;
            this._euler.x += movementY * 0.002 * this.pointerSpeed;

            const PI_2 = Math.PI / 2;

            this._euler.x = Math.max(
                PI_2 - this.maxPolarAngle,
                Math.min(PI_2 - this.minPolarAngle, this._euler.x)
            );

            this.camera.quaternion.setFromEuler(this._euler);
        }
    }

    moveForward(distance) {
        this._vector.setFromMatrixColumn(this.camera.matrix, 0);
        this._vector.crossVectors(this.camera.up, this._vector);
        this.camera.position.addScaledVector(this._vector, distance);
    }

    moveRight(distance) {
        this._vector.setFromMatrixColumn(this.camera.matrix, 0);
        this.camera.position.addScaledVector(this._vector, distance);
    }

    getObject() {
        return this.camera;
    }
}
