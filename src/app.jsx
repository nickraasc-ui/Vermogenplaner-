import { useState, useEffect } from "react";
import AppInner from "./AppInner.jsx";
import GuideModal from "./components/GuideModal.jsx";
import { DARK, LIGHT } from "./theme.js";
import { Sheet, Inp, Btn, Icon, IconBtn, labelStyle } from "./components/ui.jsx";

// ----------------------------------------------------------------- utils ---
const uid = () => Math.random().toString(36).slice(2, 9);

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
          <div style={{ background:T.surfaceHigh, border:"1px solid "+T.border, borderRadius:10, padding:"10px 13px", marginBottom:16, fontSize:13, color:T.textMid, lineHeight:1.5 }}>
            Alle gespeicherten Vermögensdaten dieses Profils bleiben erhalten. Nur Name, Kürzel und Farbe werden geändert.
          </div>
        )}
        <Btn full color={T.accent} T={T} onClick={save}>
          {existing ? "Änderungen speichern" : "Profil erstellen"}
        </Btn>
      </Sheet>
    );
  };

  const DeleteConfirm = ({ profile }) => (
    <Sheet title="Profil löschen?" onClose={() => setModal(null)} T={T}>
      <div style={{ background:T.red+"10", border:"1px solid "+T.red+"33", borderRadius:12, padding:16, marginBottom:20 }}>
        <div style={{ fontSize:15, fontWeight:600, color:T.text, marginBottom:6 }}>{profile.name}</div>
        <div style={{ fontSize:13, color:T.textMid, lineHeight:1.6 }}>
          Alle Vermögensdaten, Positionen, Check-ins und Szenarien dieses Profils werden dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
        </div>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <Btn full color={T.textMid} T={T} onClick={() => setModal(null)}>Abbrechen</Btn>
        <Btn full danger T={T} onClick={() => {
          // Remove profile data from localStorage
          localStorage.removeItem("wealth-pwa-v3-" + profile.id);
          setProfiles(ps => ps.filter(p => p.id !== profile.id));
          setModal(null);
        }}>Endgültig löschen</Btn>
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
    if (Math.abs(v) >= 1_000_000) return "€"+(v/1_000_000).toFixed(1)+"M";
    if (Math.abs(v) >= 1_000) return "€"+(v/1_000).toFixed(0)+"k";
    return "€"+Math.round(v);
  };

  const editTarget = modal?.startsWith("edit:") ? profiles.find(p=>p.id===modal.slice(5)) : null;
  const delTarget  = modal?.startsWith("delete:") ? profiles.find(p=>p.id===modal.slice(7)) : null;

  const pillBtn = { display:"inline-flex", alignItems:"center", gap:6, background:T.surface, border:"1px solid "+T.border, borderRadius:10, padding:"7px 12px", cursor:"pointer", fontSize:13, fontWeight:500, color:T.textMid, WebkitTapHighlightColor:"transparent" };

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.text, paddingBottom:"env(safe-area-inset-bottom,24px)" }}>

      {modal==="new"    && <ProfileForm/>}
      {editTarget       && <ProfileForm existing={editTarget}/>}
      {delTarget        && <DeleteConfirm profile={delTarget}/>}
      {modal==="guide"  && <GuideModal T={T} onClose={() => setModal(null)} onCreateProfile={() => setModal("new")} />}

      {/* Header */}
      <div style={{ background:T.header+"e6", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", borderBottom:"1px solid "+T.border, padding:"14px 16px", paddingTop:"calc(14px + env(safe-area-inset-top,0px))", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", maxWidth:600, margin:"0 auto" }}>
          <div>
            <div style={{ fontSize:12, color:T.textLow, fontWeight:500 }}>Vermögensplaner</div>
            <div style={{ fontSize:22, fontWeight:650, color:T.text, letterSpacing:"-0.02em", marginTop:1 }}>Profile</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => setModal("guide")} style={pillBtn}>
              <Icon name="help" size={16} /> Anleitung
            </button>
            <IconBtn icon={darkMode ? "sun" : "moon"} label={darkMode ? "Helles Design" : "Dunkles Design"} onClick={() => setDarkMode(d=>!d)} T={T} size={36} />
          </div>
        </div>
      </div>

      <div style={{ padding:"20px 16px", maxWidth:600, margin:"0 auto" }}>

        {/* Empty state */}
        {profiles.length === 0 && (
          <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:16, padding:"32px 24px", textAlign:"center", marginBottom:16, boxShadow:T.shadow }}>
            <div style={{ width:52, height:52, borderRadius:14, background:T.accent+"18", color:T.accent, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
              <Icon name="pie" size={26} />
            </div>
            <div style={{ fontSize:19, fontWeight:650, color:T.text, marginBottom:8, letterSpacing:"-0.015em" }}>Willkommen im Vermögensplaner</div>
            <div style={{ fontSize:14, color:T.textMid, marginBottom:24, lineHeight:1.6, maxWidth:400, marginLeft:"auto", marginRight:"auto" }}>
              Ein privates Tool für komplexe Vermögensstrukturen — Immobilien, ETFs, Beteiligungen, mehrere Eigentümer, 35-Jahres-Projektion.
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <Btn full color={T.accent} T={T} onClick={() => setModal("guide")}>
                Anleitung ansehen (empfohlen)
              </Btn>
              <Btn full color={T.textMid} T={T} onClick={() => setModal("new")}>
                Direkt Profil anlegen
              </Btn>
            </div>
          </div>
        )}

        {profiles.length > 0 && (
          <div style={{ fontSize:13, color:T.textLow, fontWeight:500, margin:"0 2px 10px" }}>
            {profiles.length} {profiles.length === 1 ? "Profil" : "Profile"}
          </div>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:12 }}>
          {profiles.map(p => {
            const net = totalAssets(p.id);
            return (
              <div key={p.id} className="vp-hover"
                style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:14, padding:"14px 14px 14px 16px", display:"flex", alignItems:"center", gap:14, cursor:"pointer", WebkitTapHighlightColor:"transparent", boxShadow:T.shadow }}
                onClick={() => setActiveId(p.id)}>

                {/* Avatar */}
                <div style={{ width:44, height:44, borderRadius:12, background:p.color+"22", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ fontSize:15, fontWeight:650, color:p.color }}>{p.kuerzel}</span>
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:15, fontWeight:600, color:T.text, letterSpacing:"-0.01em", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                  <div style={{ display:"flex", gap:8, marginTop:2, alignItems:"baseline", flexWrap:"wrap" }}>
                    <div className="vp-num" style={{ fontSize:14, fontWeight:600, color:T.text }}>{fmtNet(net)}</div>
                    {p.note && <div style={{ fontSize:12, color:T.textLow }}>· {p.note}</div>}
                  </div>
                  <div style={{ fontSize:12, color:T.textDim, marginTop:2 }}>
                    Erstellt {new Date(p.createdAt).toLocaleDateString("de-DE")}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display:"flex", gap:6, flexShrink:0 }} onClick={e => e.stopPropagation()}>
                  <IconBtn icon="edit"  label="Profil bearbeiten" onClick={() => setModal("edit:"+p.id)} T={T} />
                  <IconBtn icon="trash" label="Profil löschen" danger onClick={() => setModal("delete:"+p.id)} T={T} />
                </div>

                <div style={{ color:T.textDim, flexShrink:0 }}><Icon name="chevron" size={18} /></div>
              </div>
            );
          })}
        </div>

        {/* Add new profile button */}
        {profiles.length > 0 && (
          <button onClick={() => setModal("new")}
            style={{ width:"100%", background:"transparent", border:"1px dashed "+T.borderHigh, borderRadius:14, padding:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, color:T.textMid, fontSize:14, fontWeight:500, WebkitTapHighlightColor:"transparent" }}>
            <Icon name="plus" size={16} /> Neues Profil anlegen
          </button>
        )}

        {/* Info box */}
        <div style={{ marginTop:20, fontSize:12, color:T.textLow, lineHeight:1.6, textAlign:"center", padding:"0 12px" }}>
          Alle Daten werden lokal auf diesem Gerät gespeichert. Jedes Profil ist vollständig isoliert. Kein Cloud-Sync, kein Passwortschutz.
        </div>
      </div>
    </div>
  );
}
