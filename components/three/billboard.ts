import { Camera, Vector3 } from "three";

const _up = new Vector3();

/**
 * The Y rotation that keeps a flat, ground-plane label (number tokens, port
 * buoys) aligned to the screen's "up" as the camera orbits. Derived from the
 * camera's orientation (its screen-up vector projected to the ground), so it
 * stays stable even at a bird's-eye angle — unlike using the camera's position,
 * which degenerates when the camera is directly overhead.
 */
export function screenUpYaw(camera: Camera): number {
  _up.set(0, 1, 0).applyQuaternion(camera.quaternion);
  return Math.atan2(-_up.x, -_up.z);
}
