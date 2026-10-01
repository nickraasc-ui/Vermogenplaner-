// The one id generator for every record (assets, streams, loans, scenarios, check-ins, snapshots, profiles).
export const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
