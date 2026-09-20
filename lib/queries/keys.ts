/** Query key factory — ทุก key ของข้อมูลจาก backend ต้องมาจากที่นี่ */
export const limsKeys = {
  users: ["users"] as const,
  samples: ["samples"] as const,
  equipment: ["equipment"] as const,
  inventory: ["inventory"] as const,
  documents: ["documents"] as const,
  tests: ["tests"] as const,
  notifications: ["notifications"] as const,
};
