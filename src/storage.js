// localStorage access. Keys:
//   wealth-profiles-v1              list of profiles (id, name, kuerzel, color, note, createdAt)
//   wealth-active-profile           id of the open profile
//   wealth-dark                     theme (device setting)
//   wealth-pwa-v3-{id}              profile state (see docs/DATA_MODEL.md)
//   wealth-pwa-v3-{id}-backup-v{n}  untouched copy written before migrating from schema version n
import { migrateProfile, SCHEMA_VERSION } from "./model/schema.js";

export const profileKey = (profileId) => "wealth-pwa-v3-" + profileId;

/** Writes the profile state. Returns false if the browser refused (e.g. storage full). */
export const saveState = (st, key) => {
  try { localStorage.setItem(key, JSON.stringify(st)); return true; } catch { return false; }
};

/** Loads and migrates a profile. Before upgrading an older schema, keeps an untouched backup copy. */
export const loadProfileState = (profileId) => {
  const key = profileKey(profileId);
  let raw = null;
  try { raw = localStorage.getItem(key); } catch { /* storage unavailable */ }
  if (!raw) return migrateProfile({ schemaVersion: SCHEMA_VERSION });
  try {
    const parsed = JSON.parse(raw);
    const version = parsed.schemaVersion || 1;
    if (version < SCHEMA_VERSION) {
      const backupKey = `${key}-backup-v${version}`;
      try { if (!localStorage.getItem(backupKey)) localStorage.setItem(backupKey, raw); } catch { /* best effort */ }
    }
    return migrateProfile(parsed);
  } catch {
    return migrateProfile({ schemaVersion: SCHEMA_VERSION });
  }
};

/** Removes a profile and its backups. */
export const deleteProfileData = (profileId) => {
  const key = profileKey(profileId);
  try {
    Object.keys(localStorage).filter(k => k === key || k.startsWith(key + "-backup-")).forEach(k => localStorage.removeItem(k));
  } catch { /* storage unavailable */ }
};
