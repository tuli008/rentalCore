/**
 * Shared technician types used across labor items and crew assignments
 */
export const COMMON_TECHNICIAN_TYPES = [
  "Lighting Technician",
  "Sound Technician",
  "Camera Operator",
  "Driver",
  "Rigger",
  "Stagehand",
  "Lead",
  "Assistant",
  "Technician",
] as const;

export type TechnicianType = typeof COMMON_TECHNICIAN_TYPES[number];


