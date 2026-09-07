export const movement = {
  fixedStep: 1 / 120, maxFrameTime: 0.08,
  walkSpeed: 7, sprintSpeed: 13, groundAcceleration: 12,
  airAcceleration: 5, gravity: 25, jumpSpeed: 11,
  bodyHeight: 1.8, radius: 0.38, coyoteTime: 0.12,
  maxSpeed: 64, grappleRange: 135, grappleAcceleration: 65,
  grappleReleaseDistance: 2.8, wingsuitMinSpeed: 17,
  wingsuitMaxSpeed: 55, parachuteSink: 3.5,
} as const;
export const cameraConfig = { sensitivity: 0.0022, distance: 7, minDistance: 3, maxDistance: 14, smoothing: 12 };
export const worldConfig = { size: 640, subdivisions: 128, chunkSize: 96, activeDistance: 230, seaLevel: 0.3 };
