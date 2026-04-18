import { useState, useEffect, useCallback } from "react";
import AppInner from "./AppInner.jsx";

// ----------------------------------------------------------------- utils ---
const uid = () => Math.random().toString(36).slice(2, 9);

const PROFILE_COLORS = [
  "#38bdf8","#10b981","#f59e0b","#a78bfa",
  "#f472b6","#fb923c","#34d399","#818cf8"
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

// ---------------------------------------------------------------- themes ---
const DARK = {
  bg:"#04080f", surface:"#06101a", surfaceHigh:"#07111e",
  border:"#0a1c2c", text:"#c8ddf0", textMid:"#3a5570",
  textLow:"#1e3545", textDim:"#0f2030",
  accent:"#38bdf8", green:"#10b981", red:"#ef4444",
  amber:"#f59e0b", purple:"#a78bfa",
};
const LIGHT = {
  bg:"#f0f4f8", surface:"#ffffff", surfaceHigh:"#f8fafc",
  border:"#dde5ed", text:"#0f2535", textMid:"#4a6880",
  textLow:"#7a9ab8", textDim:"#a8c0d0",
  accent:"#0284c7", green:"#059669", red:"#dc2626",
  amber:"#d97706", purple:"#7c3aed",
};

// --------------------------------------------------------------- Sheet ---
const Sheet = ({ title, onClose, children, T }) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"flex-end" }}
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:"18px 18px 0 0", padding:"0 0 env(safe-area-inset-bottom,16px)", width:"100%", maxHeight:"85vh", overflowY:"auto" }}>
      <div style={{ padding:"12px 20px 0" }}>
        <div style={{ width:36, height:4, background:T.border, borderRadius:2, margin:"0 auto 16px" }} />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <div style={{ fontWeight:900, fontSize:15, color:T.text }}>{title}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:T.textMid, cursor:"pointer", fontSize:22, lineHeight:1 }}>x</button>
        </div>
      </div>
      <div style={{ padding:"0 20px 24px" }}>{children}</div>
    </div>
  </div>
);

const Inp = ({ label, value, onChange, placeholder="", T }) => (
  <div style={{ marginBottom:14 }}>
    {label && <label style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:4 }}>{label}</label>}
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width:"100%", background:T.bg, border:"1px solid "+T.border, borderRadius:8, padding:"11px 12px", color:T.text, fontSize:16, outline:"none", fontFamily:"inherit", WebkitAppearance:"none" }} />
  </div>
);

const Btn = ({ children, onClick, color, full=false, sm=false, danger=false, T }) => (
  <button onClick={onClick} style={{
    padding: sm ? "6px 12px" : "12px 18px", borderRadius:8,
    border:"1px solid "+(danger ? T.red+"44" : (color||T.accent)+"44"),
    background: danger ? T.red+"15" : (color||T.accent)+"15",
    color: danger ? T.red : (color||T.accent),
    cursor:"pointer", fontSize:sm?11:14, fontWeight:700, fontFamily:"inherit",
    width:full?"100%":"auto", WebkitTapHighlightColor:"transparent",
  }}>{children}</button>
);

// ============================================================ MAIN APP ===
export default function App() {
  const [profiles,   setProfiles]   = useState(() => loadProfiles());
  const [activeId,   setActiveId]   = useState(() => localStorage.getItem(ACTIVE_KEY) || null);
  const [darkMode,   setDarkMode]   = useState(() => {
    try { return JSON.parse(localStorage.getItem("wealth-dark") ?? "true"); } catch { return true; }
  });
  const [modal, setModal] = useState(null); // "new" | "edit:{id}" | "delete:{id}"

  const T = darkMode ? DARK : LIGHT;

  useEffect(() => { saveProfiles(profiles); }, [profiles]);
  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
    else localStorage.removeItem(ACTIVE_KEY);
  }, [activeId]);
  useEffect(() => {
    localStorage.setItem("wealth-dark", JSON.stringify(darkMode));
    document.body.style.background = T.bg;
  }, [darkMode]);

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
        <Inp label="Kurzel (max 2 Zeichen)" value={kuerz} onChange={v=>setKuerz(v.slice(0,2).toUpperCase())} placeholder="FM" T={T}/>
        <Inp label="Notiz (optional)" value={note} onChange={setNote} placeholder="z.B. Beratungsmandat" T={T}/>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:9, color:T.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Farbe</div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {PROFILE_COLORS.map(c => (
              <div key={c} onClick={() => setColor(c)}
                style={{ width:36, height:36, borderRadius:"50%", background:c, cursor:"pointer", border: color===c ? "3px solid "+T.text : "3px solid transparent", transition:"border 0.15s" }}/>
            ))}
          </div>
        </div>
        {existing && (
          <div style={{ background:T.red+"10", border:"1px solid "+T.red+"33", borderRadius:8, padding:"10px 13px", marginBottom:14, fontSize:11, color:T.red }}>
            Achtung: Alle gespeicherten Vermogensdaten dieses Profils bleiben erhalten. Nur Name, Kurzel und Farbe werden geandert.
          </div>
        )}
        <Btn full color={T.green} T={T} onClick={save}>
          {existing ? "Anderungen speichern" : "Profil erstellen"}
        </Btn>
      </Sheet>
    );
  };

  const DeleteConfirm = ({ profile }) => (
    <Sheet title="Profil loschen?" onClose={() => setModal(null)} T={T}>
      <div style={{ background:T.red+"10", border:"1px solid "+T.red+"33", borderRadius:10, padding:16, marginBottom:20 }}>
        <div style={{ fontSize:14, fontWeight:700, color:T.red, marginBottom:6 }}>{profile.name}</div>
        <div style={{ fontSize:12, color:T.textMid, lineHeight:1.7 }}>
          Alle Vermogensdaten, Positionen, Check-ins und Buckets dieses Profils werden dauerhaft geloscht. Diese Aktion kann nicht ruckgangig gemacht werden.
        </div>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <Btn full T={T} onClick={() => setModal(null)}>Abbrechen</Btn>
        <Btn full danger T={T} onClick={() => {
          // Remove profile data from localStorage
          localStorage.removeItem("wealth-pwa-v3-" + profile.id);
          setProfiles(ps => ps.filter(p => p.id !== profile.id));
          setModal(null);
        }}>Endgultig loschen</Btn>
      </div>
    </Sheet>
  );

  // --------------------------------------------------------- Home screen ---
  const totalAssets = (profileId) => {
    try {
      const raw = localStorage.getItem("wealth-pwa-v3-" + profileId);
      if (!raw) return null;
      const data = JSON.parse(raw);
      const gross = (data.assets||[]).reduce((t,a)=>t+(a.value||0),0);
      const debt  = (data.assets||[]).reduce((t,a)=>t+(a.debt||0),0);
      return gross - debt;
    } catch { return null; }
  };

  const fmtNet = (v) => {
    if (v === null) return "Neu";
    if (Math.abs(v) >= 1_000_000) return "\u20AC"+(v/1_000_000).toFixed(1)+"M";
    if (Math.abs(v) >= 1_000) return "\u20AC"+(v/1_000).toFixed(0)+"k";
    return "\u20AC"+Math.round(v);
  };

  const editTarget = modal?.startsWith("edit:") ? profiles.find(p=>p.id===modal.slice(5)) : null;
  const delTarget  = modal?.startsWith("delete:") ? profiles.find(p=>p.id===modal.slice(7)) : null;

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.text, fontFamily:"system-ui,-apple-system,'Helvetica Neue',sans-serif", paddingBottom:"env(safe-area-inset-bottom,24px)" }}>

      {modal==="new"    && <ProfileForm/>}
      {editTarget       && <ProfileForm existing={editTarget}/>}
      {delTarget        && <DeleteConfirm profile={delTarget}/>}

      {/* Header */}
      <div style={{ background:T.surface, borderBottom:"1px solid "+T.border, padding:"16px 18px 14px", paddingTop:"calc(16px + env(safe-area-inset-top,0px))", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:8, letterSpacing:"0.25em", color:T.textDim, fontWeight:700, textTransform:"uppercase" }}>Vermogensplaner</div>
            <div style={{ fontSize:20, fontWeight:900, color:T.text, letterSpacing:"-0.02em", marginTop:2 }}>Profile</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => setDarkMode(d=>!d)}
              style={{ background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:20, padding:"6px 12px", cursor:"pointer", fontSize:13, color:T.textMid, WebkitTapHighlightColor:"transparent" }}>
              {darkMode ? "Light" : "Dark"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding:"20px 16px", maxWidth:600, margin:"0 auto" }}>

        {/* Profile grid */}
        {profiles.length === 0 && (
          <div style={{ background:T.surface, border:"1px dashed "+T.border, borderRadius:14, padding:40, textAlign:"center", marginBottom:16 }}>
            <div style={{ fontSize:32, marginBottom:12 }}>+</div>
            <div style={{ fontSize:14, fontWeight:700, color:T.textMid, marginBottom:6 }}>Kein Profil vorhanden</div>
            <div style={{ fontSize:11, color:T.textDim, marginBottom:20, lineHeight:1.6 }}>
              Lege dein erstes Profil an. Jedes Profil hat eigene Vermogensdaten, Haushaltswerte und Projektionen.
            </div>
            <Btn color={T.accent} T={T} onClick={() => setModal("new")}>Erstes Profil anlegen</Btn>
          </div>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
          {profiles.map(p => {
            const net = totalAssets(p.id);
            return (
              <div key={p.id}
                style={{ background:T.surface, border:"1px solid "+p.color+"33", borderRadius:14, padding:16, display:"flex", alignItems:"center", gap:14, cursor:"pointer", WebkitTapHighlightColor:"transparent" }}
                onClick={() => setActiveId(p.id)}>

                {/* Avatar */}
                <div style={{ width:48, height:48, borderRadius:"50%", background:p.color+"22", border:"2px solid "+p.color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ fontSize:16, fontWeight:900, color:p.color }}>{p.kuerzel}</span>
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:15, fontWeight:800, color:T.text, letterSpacing:"-0.01em" }}>{p.name}</div>
                  <div style={{ display:"flex", gap:10, marginTop:3, alignItems:"center" }}>
                    <div style={{ fontSize:14, fontWeight:900, color:p.color }}>{fmtNet(net)}</div>
                    {p.note && <div style={{ fontSize:9, color:T.textDim }}>{p.note}</div>}
                  </div>
                  <div style={{ fontSize:8, color:T.textDim, marginTop:2 }}>
                    Erstellt {new Date(p.createdAt).toLocaleDateString("de-DE")}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => setModal("edit:"+p.id)}
                    style={{ background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:6, padding:"5px 10px", cursor:"pointer", fontSize:10, color:T.textMid, fontWeight:600, WebkitTapHighlightColor:"transparent" }}>
                    Bearbeiten
                  </button>
                  <button onClick={() => setModal("delete:"+p.id)}
                    style={{ background:T.red+"10", border:"1px solid "+T.red+"22", borderRadius:6, padding:"5px 10px", cursor:"pointer", fontSize:10, color:T.red, fontWeight:600, WebkitTapHighlightColor:"transparent" }}>
                    Loschen
                  </button>
                </div>

                {/* Arrow */}
                <div style={{ fontSize:18, color:p.color, flexShrink:0 }}>{">"}</div>
              </div>
            );
          })}
        </div>

        {/* Add new profile button */}
        {profiles.length > 0 && (
          <button onClick={() => setModal("new")}
            style={{ width:"100%", background:T.surface, border:"1px dashed "+T.border, borderRadius:14, padding:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, WebkitTapHighlightColor:"transparent" }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:T.accent+"15", border:"1px solid "+T.accent+"44", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:20, color:T.accent, lineHeight:1 }}>+</span>
            </div>
            <span style={{ fontSize:13, fontWeight:700, color:T.accent }}>Neues Profil anlegen</span>
          </button>
        )}

        {/* Info box */}
        <div style={{ marginTop:20, background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:10, padding:"11px 14px", fontSize:10, color:T.textDim, lineHeight:1.7 }}>
          Alle Daten werden lokal auf diesem Gerat gespeichert. Jedes Profil ist vollstandig isoliert. Kein Cloud-Sync, kein Passwortschutz.
        </div>
      </div>
    </div>
  );
}
