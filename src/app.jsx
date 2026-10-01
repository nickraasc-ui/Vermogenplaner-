import { useState, useEffect } from "react";
import AppInner from "./AppInner.jsx";
import GuideModal from "./components/GuideModal.jsx";
import { DARK, LIGHT } from "./theme.js";
import { uid } from "./model/ids.js";
import { deleteProfileData, profileKey } from "./storage.js";
import { Sheet, Inp, Btn, IconBtn, RoundBtn, ListRow, Avatar, labelStyle, fmtE } from "./components/ui.jsx";

// ----------------------------------------------------------------- utils ---

const PROFILE_COLORS = [
  "#5b8def","#3cbf8a","#e3aa45","#a28bf6",
  "#e27aa8","#ea8a50","#4fc6a0","#7d8bf2"
];

const PROFILES_KEY = "wealth-profiles-v1";
const ACTIVE_KEY   = "wealth-active-profile";

const loadProfiles = () => {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
};

const saveProfiles = (profiles) => {
  try { localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); } catch {}
};

// ============================================================ MAIN APP ===
export default function App() {
  const [profiles,   setProfiles]   = useState(() => loadProfiles());
  const [activeId,   setActiveId]   = useState(() => localStorage.getItem(ACTIVE_KEY) || null);
  const [darkMode,   setDarkMode]   = useState(() => {
    try { return JSON.parse(localStorage.getItem("wealth-dark") ?? "true"); } catch { return true; }
  });
  const [modal, setModal] = useState(null); // "new" | "edit:{id}" | "delete:{id}" | "guide"

  const T = darkMode ? DARK : LIGHT;

  useEffect(() => { saveProfiles(profiles); }, [profiles]);
  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
    else localStorage.removeItem(ACTIVE_KEY);
  }, [activeId]);
  useEffect(() => {
    localStorage.setItem("wealth-dark", JSON.stringify(darkMode));
    document.documentElement.style.colorScheme = darkMode ? "dark" : "light";
    document.body.style.background = T.bg;
  }, [darkMode, activeId]);

  const activeProfile = profiles.find(p => p.id === activeId) || null;

  // If a profile is active, render the inner app
  if (activeProfile) {
    return (
      <AppInner
        profileId={activeProfile.id}
        profileName={activeProfile.name}
        profileColor={activeProfile.color}
        darkMode={darkMode}
        onBack={() => setActiveId(null)}
        onToggleDark={() => setDarkMode(d => !d)}
      />
    );
  }

  // --------------------------------------------------------- ProfileForm ---
  const ProfileForm = ({ existing }) => {
    const [name,  setName]  = useState(existing?.name  || "");
    const [kuerz, setKuerz] = useState(existing?.kuerzel || "");
    const [color, setColor] = useState(existing?.color || PROFILE_COLORS[profiles.length % PROFILE_COLORS.length]);
    const [note,  setNote]  = useState(existing?.note  || "");

    const autoKuerzel = (n) => n.trim().split(/\s+/).map(w=>w[0]?.toUpperCase()||"").join("").slice(0,2);

    const save = () => {
      if (!name.trim()) return;
      const kz = kuerz.trim() || autoKuerzel(name);
      if (existing) {
        setProfiles(ps => ps.map(p => p.id===existing.id ? {...p,name,kuerzel:kz,color,note} : p));
      } else {
        const np = { id:uid(), name:name.trim(), kuerzel:kz, color, note, createdAt:new Date().toISOString() };
        setProfiles(ps => [...ps, np]);
      }
      setModal(null);
    };

    return (
      <Sheet title={existing ? "Profil bearbeiten" : "Neues Profil anlegen"} onClose={() => setModal(null)} T={T}>
        <Inp label="Name (z.B. Familie Mustermann)" value={name} onChange={v=>{setName(v);if(!kuerz)setKuerz(autoKuerzel(v));}} placeholder="Familie / Person" T={T}/>
        <Inp label="Kürzel (max. 2 Zeichen)" value={kuerz} onChange={v=>setKuerz(v.slice(0,2).toUpperCase())} placeholder="FM" T={T}/>
        <Inp label="Notiz (optional)" value={note} onChange={setNote} placeholder="z.B. Beratungsmandat" T={T}/>
        <div style={{ marginBottom:20 }}>
          <div style={labelStyle(T)}>Farbe</div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {PROFILE_COLORS.map(c => (
              <button key={c} type="button" aria-label={"Farbe "+c} onClick={() => setColor(c)}
                style={{ width:34, height:34, borderRadius:"50%", background:c, cursor:"pointer", padding:0,
                  border:"2px solid "+(color===c ? T.surface : "transparent"),
                  boxShadow: color===c ? "0 0 0 2px "+c : "none" }}/>
            ))}
          </div>
        </div>
        {existing && (
          <div style={{ marginBottom:16, fontSize:13, color:T.textLow, lineHeight:1.5 }}>
            Alle gespeicherten Vermögensdaten dieses Profils bleiben erhalten. Nur Name, Kürzel und Farbe werden geändert.
          </div>
        )}
        <Btn full color={T.accent} T={T} onClick={save}>
          {existing ? "Änderungen speichern" : "Profil erstellen"}
        </Btn>
        {existing && (
          <div style={{ marginTop:10 }}>
            <Btn full danger T={T} onClick={() => setModal("delete:"+existing.id)}>Profil löschen</Btn>
          </div>
        )}
      </Sheet>
    );
  };

  const DeleteConfirm = ({ profile }) => (
    <Sheet title="Profil löschen?" onClose={() => setModal(null)} T={T}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:17, fontWeight:650, color:T.text, marginBottom:6 }}>{profile.name}</div>
        <div style={{ fontSize:15, color:T.textMid, lineHeight:1.55 }}>
          Alle Vermögensdaten, Positionen, Check-ins und Szenarien dieses Profils werden dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <Btn full danger T={T} onClick={() => {
          // Remove profile data from localStorage
          deleteProfileData(profile.id);
          setProfiles(ps => ps.filter(p => p.id !== profile.id));
          setModal(null);
        }}>Endgültig löschen</Btn>
        <Btn full T={T} onClick={() => setModal(null)}>Abbrechen</Btn>
      </div>
    </Sheet>
  );

  // --------------------------------------------------------- Home screen ---
  const totalAssets = (profileId) => {
    try {
      const raw = localStorage.getItem(profileKey(profileId));
      if (!raw) return null;
      const data = JSON.parse(raw);
      const gross = (data.assets||[]).reduce((t,a)=>t+(a.value||0),0);
      const debt  = (data.assets||[]).reduce((t,a)=>t+(a.debt||0),0);
      return gross - debt;
    } catch { return null; }
  };

  const fmtNet = (v) => v === null ? "Neu" : fmtE(v);

  const editTarget = modal?.startsWith("edit:") ? profiles.find(p=>p.id===modal.slice(5)) : null;
  const delTarget  = modal?.startsWith("delete:") ? profiles.find(p=>p.id===modal.slice(7)) : null;

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.text, paddingBottom:"calc(24px + env(safe-area-inset-bottom,0px))" }}>

      {modal==="new"    && <ProfileForm/>}
      {editTarget       && <ProfileForm existing={editTarget}/>}
      {delTarget        && <DeleteConfirm profile={delTarget}/>}
      {modal==="guide"  && <GuideModal T={T} onClose={() => setModal(null)} onCreateProfile={() => setModal("new")} />}

      <div style={{ maxWidth:600, margin:"0 auto", padding:"0 20px", minHeight:"100vh", display:"flex", flexDirection:"column" }}>

        {/* Top bar */}
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, paddingTop:"calc(12px + env(safe-area-inset-top,0px))" }}>
          <RoundBtn icon="help" label="Anleitung" onClick={() => setModal("guide")} T={T} size={38} />
          <RoundBtn icon={darkMode ? "sun" : "moon"} label={darkMode ? "Helles Design" : "Dunkles Design"} onClick={() => setDarkMode(d=>!d)} T={T} size={38} />
        </div>

        {/* Title */}
        <div style={{ marginTop:28, marginBottom:24 }}>
          <h1 style={{ fontSize:34, fontWeight:700, letterSpacing:"-0.035em", lineHeight:1.1, margin:0, color:T.text }}>
            {profiles.length === 0 ? "Willkommen" : "Profile"}
          </h1>
          <div style={{ fontSize:16, color:T.textLow, marginTop:8, lineHeight:1.5 }}>
            {profiles.length === 0
              ? "Plane Vermögen, Haushalt und Zukunft – für Immobilien, Depots, Beteiligungen und mehrere Eigentümer."
              : "Wähle ein Profil, um fortzufahren."}
          </div>
        </div>

        {/* Profile list */}
        {profiles.map((p, i) => {
          const net = totalAssets(p.id);
          return (
            <ListRow key={p.id} T={T} last={i === profiles.length - 1} onClick={() => setActiveId(p.id)}
              leading={<Avatar text={p.kuerzel} color={p.color} size={46} />}
              title={p.name}
              subtitle={p.note || "Erstellt "+new Date(p.createdAt).toLocaleDateString("de-DE")}
              value={fmtNet(net)}
              trailing={<IconBtn icon="edit" label={"„"+p.name+"“ bearbeiten"} onClick={() => setModal("edit:"+p.id)} T={T} />} />
          );
        })}

        <div style={{ flex:1 }} />

        {/* Actions */}
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:32 }}>
          {profiles.length === 0 ? (
            <>
              <Btn full T={T} onClick={() => setModal("guide")}>Anleitung ansehen</Btn>
              <Btn full color={T.textMid} T={T} onClick={() => setModal("new")}>Direkt Profil anlegen</Btn>
            </>
          ) : (
            <Btn full T={T} onClick={() => setModal("new")}>Neues Profil anlegen</Btn>
          )}
        </div>

        <div style={{ marginTop:16, fontSize:12, color:T.textDim, lineHeight:1.5, textAlign:"center" }}>
          Alle Daten bleiben lokal auf diesem Gerät. Kein Cloud-Sync, kein Passwortschutz.
        </div>
      </div>
    </div>
  );
}
