import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, ArrowLeft, Edit2, Trash2, LayoutGrid, List, Search,
  CheckCircle2, Circle, Download, X, ChevronLeft, ChevronRight,
  Image as ImageIcon, FileText, Shield, ShieldOff, SortAsc, SortDesc,
  Calendar, MapPin, Tag, Euro, Ruler, Save, Archive, LogOut, Camera, Menu
} from "lucide-react";
import { supabase, photoURL, docURL } from "./supabase";
import Auth from "./Auth";

/* ═══════════════════════════════════════════════════════════════
   ArtVault — Catalogue de collection familiale
═══════════════════════════════════════════════════════════════ */

// ── Helpers ───────────────────────────────────────────────────
const uid = () => crypto.randomUUID();

async function compressImage(file) {
  return new Promise(res => {
    const fr = new FileReader();
    fr.onload = e => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1400;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w >= h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        const cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        cv.getContext("2d").drawImage(img, 0, 0, w, h);
        res({ data: cv.toDataURL("image/jpeg", 0.78), name: file.name });
      };
      img.src = e.target.result;
    };
    fr.readAsDataURL(file);
  });
}

async function readPDF(file) {
  if (file.size > 5 * 1024 * 1024) throw new Error("Fichier trop volumineux (max 5 MB)");
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = e => res({ data: e.target.result, name: file.name });
    fr.onerror = () => rej(new Error("Erreur de lecture"));
    fr.readAsDataURL(file);
  });
}

const eur = v => v !== "" && v !== null && v !== undefined
  ? new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(+v)
  : "—";

const fmtDate = d => {
  if (!d) return "—";
  try { return new Date(d + "T12:00:00").toLocaleDateString("fr-BE"); } catch { return d; }
};

// ── Default form ──────────────────────────────────────────────
const BLANK = {
  artist: "", title: "", technique: "", dateWork: "",
  datePurchase: "", locationPurchase: "",
  valuePurchase: "", valueCurrent: "",
  locationStorage: "", width: "", height: "", depth: "",
  dimensionUnit: "cm", isInsured: false, notes: ""
};

// ── DB mapping ─────────────────────────────────────────────────
const formToDB = f => ({
  artist: f.artist,
  title: f.title,
  technique: f.technique,
  date_work: f.dateWork,
  date_purchase: f.datePurchase,
  location_purchase: f.locationPurchase,
  value_purchase: f.valuePurchase,
  value_current: f.valueCurrent,
  location_storage: f.locationStorage,
  width: f.width,
  height: f.height,
  depth: f.depth,
  dimension_unit: f.dimensionUnit,
  is_insured: f.isInsured,
  notes: f.notes,
});

const dbToForm = d => ({
  artist: d.artist || "",
  title: d.title || "",
  technique: d.technique || "",
  dateWork: d.date_work || "",
  datePurchase: d.date_purchase || "",
  locationPurchase: d.location_purchase || "",
  valuePurchase: d.value_purchase || "",
  valueCurrent: d.value_current || "",
  locationStorage: d.location_storage || "",
  width: d.width || "",
  height: d.height || "",
  depth: d.depth || "",
  dimensionUnit: d.dimension_unit || "cm",
  isInsured: d.is_insured || false,
  notes: d.notes || "",
});

// ── dataURL → Blob / File ─────────────────────────────────────
function dataURLToBlob(dataURL) {
  const [meta, b64] = dataURL.split(",", 2);
  const mime = meta.match(/:(.*?);/)?.[1] || "application/octet-stream";
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

function dataURLToFile(dataURL, filename) {
  const blob = dataURLToBlob(dataURL);
  return new File([blob], filename, { type: blob.type });
}

// ── Theme (blue-gray) ─────────────────────────────────────────
const T = {
  bg:      "#122c44",
  s1:      "#336699",
  s2:      "#244d6b",
  s3:      "#4d7fa6",
  border:  "#4a6a80",
  accent:  "#3fc1c9",
  cream:   "#f0e6d2",
  dim:     "#a8b8c0",
  dim2:    "#7a8a90",
  green:   "#3a8050",
  red:     "#b03535",
  cyan:    "#3fc1c9",
  blue:    "#7ec8e3",
};

// ── Small reusable components ─────────────────────────────────

function Btn({ children, onClick, variant = "outline", disabled, style: sx, ...props }) {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "8px 16px", borderRadius: 4, cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "0.88rem", letterSpacing: "0.06em", fontFamily: "inherit",
    transition: "all 0.18s", border: "none", outline: "none", opacity: disabled ? 0.55 : 1,
  };
  const variants = {
    primary: { background: T.accent, color: T.bg, fontWeight: 600 },
    outline: { background: "transparent", color: T.cream, border: `1px solid ${T.border}` },
    ghost:   { background: "transparent", color: T.dim,   border: "none" },
    danger:  { background: "transparent", color: T.red,   border: `1px solid ${T.red}40` },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...base, ...variants[variant], ...sx }} {...props}>
      {children}
    </button>
  );
}

function Label({ children }) {
  return <div style={{ color: T.dim, fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{children}</div>;
}

function Field({ label, children }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", ...rest }) {
  return (
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%", background: T.s3, color: T.cream, border: `1px solid ${T.border}`,
        borderRadius: 4, padding: "9px 12px", fontSize: "0.95rem", fontFamily: "inherit",
        outline: "none", colorScheme: "dark",
      }}
onFocus={e => e.target.style.borderColor = T.cyan}
                    onBlur={e => e.target.style.borderColor = T.border}
      {...rest}
    />
  );
}

function Select({ value, onChange, children }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{
        width: "100%", background: T.s3, color: T.cream, border: `1px solid ${T.border}`,
        borderRadius: 4, padding: "9px 12px", fontSize: "0.95rem", fontFamily: "inherit",
        outline: "none", colorScheme: "dark", cursor: "pointer",
      }}>
      {children}
    </select>
  );
}

function Textarea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      style={{
        width: "100%", background: T.s3, color: T.cream, border: `1px solid ${T.border}`,
        borderRadius: 4, padding: "9px 12px", fontSize: "0.95rem", fontFamily: "inherit",
        outline: "none", resize: "vertical",
      }}
onFocus={e => e.target.style.borderColor = T.cyan}
                    onBlur={e => e.target.style.borderColor = T.border}
    />
  );
}

// ── Main App ──────────────────────────────────────────────────
export default function ArtVault() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [works,    setWorks]    = useState([]);
  const [screen,   setScreen]  = useState("gallery");
  const [gridMode, setGridMode] = useState(true);
  const [search,   setSearch]  = useState("");
  const [sortField, setSortField] = useState("artist");
  const [sortDir,  setSortDir]  = useState("asc");
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [delModal, setDelModal] = useState(false);
  const [fileErr,  setFileErr]  = useState("");
  const [exporting, setExporting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Form state
  const [editWork, setEditWork] = useState(null);
  const [form,     setForm]     = useState(BLANK);
  const [formTab,  setFormTab]  = useState("info");
  const [fPhotos,  setFPhotos]  = useState([]);
  const [fExp,     setFExp]     = useState(null);
  const [fAtt,     setFAtt]     = useState(null);

  // Detail state
  const [detWork,  setDetWork]  = useState(null);
  const [dPhotos,  setDPhotos]  = useState([]);
  const [dExp,     setDExp]     = useState(null);
  const [dAtt,     setDAtt]     = useState(null);
  const [pIdx,     setPIdx]     = useState(0);

  // Fullscreen photo
  const [fullscreenPhoto, setFullscreenPhoto] = useState(null);

  // Thumbnails {id: url}
  const [thumbs, setThumbs] = useState({});

  const photoRef = useRef();
  const cameraRef = useRef();
  const expRef   = useRef();
  const attRef   = useRef();

  // ── Auth ──────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setScreen("gallery");
  };

  // ── Load ────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) {
      setWorks([]);
      setThumbs({});
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("artworks")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setWorks(data || []);
      } catch (e) {
        console.error("Load error:", e);
      }
      setLoading(false);
    })();
  }, [session]);

  // ── Thumbnails ──────────────────────────────────────────────
  useEffect(() => {
    if (!works.length) return;
    const map = {};
    for (const w of works) {
      if (w.photos?.[0]?.path) {
        map[w.id] = photoURL(w.photos[0].path);
      }
    }
    setThumbs(map);
  }, [works]);

  // ── Navigation ───────────────────────────────────────────────
  const goGallery = () => { setScreen("gallery"); setMenuOpen(false); };

  // ── ESC key ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = e => {
      if (e.key === "Escape") {
        if (fullscreenPhoto) setFullscreenPhoto(null);
        else if (screen === "detail") goGallery();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [screen, fullscreenPhoto]);

  const openAdd = () => {
    setEditWork(null); setForm(BLANK); setFormTab("info");
    setFPhotos([]); setFExp(null); setFAtt(null); setFileErr("");
    setScreen("form");
  };

  const openEdit = w => {
    setEditWork(w);
    setForm(dbToForm(w));
    setFormTab("info");
    setFileErr("");

    setFPhotos(
      (w.photos || []).map(p => ({
        name: p.name,
        path: p.path,
        url: photoURL(p.path),
        _saved: true,
      }))
    );

    if (w.expertise) {
      setFExp({ name: w.expertise.name, path: w.expertise.path, url: docURL(w.expertise.path), _saved: true });
    } else {
      setFExp(null);
    }

    if (w.certificate) {
      setFAtt({ name: w.certificate.name, path: w.certificate.path, url: docURL(w.certificate.path), _saved: true });
    } else {
      setFAtt(null);
    }

    setScreen("form");
  };

  const openDetail = w => {
    setDetWork(w);
    setPIdx(0);
    setDelModal(false);

    setDPhotos(
      (w.photos || []).map(p => ({
        name: p.name,
        path: p.path,
        url: photoURL(p.path),
      }))
    );

    if (w.expertise) {
      setDExp({ name: w.expertise.name, path: w.expertise.path, url: docURL(w.expertise.path) });
    } else {
      setDExp(null);
    }

    if (w.certificate) {
      setDAtt({ name: w.certificate.name, path: w.certificate.path, url: docURL(w.certificate.path) });
    } else {
      setDAtt(null);
    }

    setScreen("detail");
  };

  // ── Save ─────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.artist?.trim() || !form.title?.trim()) {
      setFileErr("L'artiste et le titre sont obligatoires.");
      return;
    }

    setSaving(true);
    setFileErr("");

    const userId = session.user.id;
    const isNew = !editWork;
    const artworkId = editWork?.id || uid();

    try {
      // ── Photos ──────────────────────────────────────────────
      const oldPhotos = editWork?.photos || [];
      const keptPathSet = new Set(fPhotos.map(p => p.path).filter(Boolean));
      const toDeleteFromStorage = oldPhotos.filter(p => !keptPathSet.has(p.path));

      const newPhotoRecords = [];
      for (const p of fPhotos) {
        if (p._saved) {
          newPhotoRecords.push({ name: p.name, path: p.path });
        } else {
          const ext = p.name.match(/\.\w+$/)?.[0] || ".jpg";
          const storagePath = `photos/${userId}/${artworkId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
          const file = dataURLToFile(p.data, p.name);
          const { error: upErr } = await supabase.storage
            .from("artwork-photos")
            .upload(storagePath, file, { upsert: true });
          if (upErr) throw upErr;
          newPhotoRecords.push({ name: p.name, path: storagePath });
        }
      }

      for (const p of toDeleteFromStorage) {
        await supabase.storage.from("artwork-photos").remove([p.path]);
      }

      // ── Documents ───────────────────────────────────────────
      let expertiseRecord = null;
      if (fExp) {
        if (fExp._saved) {
          expertiseRecord = { name: fExp.name, path: fExp.path };
        } else {
          const storagePath = `documents/${userId}/${artworkId}/expertise_${Date.now()}_${fExp.name}`;
          const file = dataURLToFile(fExp.data, fExp.name);
          const { error: upErr } = await supabase.storage
            .from("artwork-documents")
            .upload(storagePath, file, { upsert: true });
          if (upErr) throw upErr;
          expertiseRecord = { name: fExp.name, path: storagePath };
        }
      } else if (editWork?.expertise) {
        await supabase.storage.from("artwork-documents").remove([editWork.expertise.path]);
      }

      let certificateRecord = null;
      if (fAtt) {
        if (fAtt._saved) {
          certificateRecord = { name: fAtt.name, path: fAtt.path };
        } else {
          const storagePath = `documents/${userId}/${artworkId}/certificat_${Date.now()}_${fAtt.name}`;
          const file = dataURLToFile(fAtt.data, fAtt.name);
          const { error: upErr } = await supabase.storage
            .from("artwork-documents")
            .upload(storagePath, file, { upsert: true });
          if (upErr) throw upErr;
          certificateRecord = { name: fAtt.name, path: storagePath };
        }
      } else if (editWork?.certificate) {
        await supabase.storage.from("artwork-documents").remove([editWork.certificate.path]);
      }

      // ── DB ──────────────────────────────────────────────────
      const payload = {
        ...formToDB(form),
        photos: newPhotoRecords,
        expertise: expertiseRecord,
        certificate: certificateRecord,
        updated_at: new Date().toISOString(),
        user_id: userId,
      };

      let refreshed;
      if (isNew) {
        payload.id = artworkId;
        payload.created_at = new Date().toISOString();
        const { error: insErr } = await supabase.from("artworks").insert(payload);
        if (insErr) throw insErr;
        refreshed = payload;
      } else {
        const { error: updErr } = await supabase
          .from("artworks")
          .update(payload)
          .eq("id", artworkId);
        if (updErr) throw updErr;
        refreshed = { ...editWork, ...payload };
      }

      if (isNew) {
        setWorks(prev => [refreshed, ...prev]);
      } else {
        setWorks(prev => prev.map(w => w.id === artworkId ? refreshed : w));
      }

      setSaving(false);
      openDetail(refreshed);
    } catch (err) {
      setSaving(false);
      setFileErr("Erreur: " + err.message);
    }
  };

  // ── Delete ────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!detWork) return;
    try {
      for (const p of (detWork.photos || [])) {
        await supabase.storage.from("artwork-photos").remove([p.path]);
      }
      if (detWork.expertise?.path) {
        await supabase.storage.from("artwork-documents").remove([detWork.expertise.path]);
      }
      if (detWork.certificate?.path) {
        await supabase.storage.from("artwork-documents").remove([detWork.certificate.path]);
      }
      await supabase.from("artworks").delete().eq("id", detWork.id);
      setWorks(prev => prev.filter(w => w.id !== detWork.id));
      setScreen("gallery");
      setDetWork(null);
    } catch (err) {
      setFileErr("Erreur lors de la suppression: " + err.message);
    }
  };

  // ── Export ─────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const meta = [];

      for (const w of works) {
        const entry = { ...w };

        if (w.photos?.length) {
          const folder = zip.folder(`photos/${w.id}`);
          for (let i = 0; i < w.photos.length; i++) {
            const { data: blob, error } = await supabase.storage
              .from("artwork-photos")
              .download(w.photos[i].path);
            if (!error && blob) {
              const ext = w.photos[i].name.match(/\.\w+$/)?.[0] || ".jpg";
              folder.file(`photo_${i + 1}${ext}`, blob);
            }
          }
          entry._photoCount = w.photos.length;
        }

        if (w.expertise?.path) {
          const { data: blob, error } = await supabase.storage
            .from("artwork-documents")
            .download(w.expertise.path);
          if (!error && blob) {
            zip.file(`documents/${w.id}/expertise_${w.expertise.name}`, blob);
          }
        }

        if (w.certificate?.path) {
          const { data: blob, error } = await supabase.storage
            .from("artwork-documents")
            .download(w.certificate.path);
          if (!error && blob) {
            zip.file(`documents/${w.id}/certificat_${w.certificate.name}`, blob);
          }
        }

        delete entry.photos;
        delete entry.expertise;
        delete entry.certificate;
        delete entry.user_id;

        meta.push(entry);
      }

      zip.file("collection.json", JSON.stringify(meta, null, 2));

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ArtVault_export_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setFileErr("Erreur d'export : " + err.message);
    }
    setExporting(false);
  };

  // ── Export PDF ─────────────────────────────────────────────────
  const handleExportPDF = async () => {
    if (!works.length) return;
    setPdfLoading(true);
    try {
      const { exportToPDF } = await import("./exportPDF.js");
      await exportToPDF(works);
    } catch (err) {
      setFileErr("Erreur d'export PDF : " + err.message);
    }
    setPdfLoading(false);
  };

  // ── Photo / PDF handlers ──────────────────────────────────────
  const addPhoto = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    if (fPhotos.length >= 5) { setFileErr("Maximum 5 photos."); return; }
    try {
      const img = await compressImage(file);
      setFPhotos(p => [...p, { ...img, _temp: true }]);
    } catch (err) { setFileErr(err.message); }
    e.target.value = "";
  };

  const removeFormPhoto = i => {
    setFPhotos(ps => ps.filter((_, j) => j !== i));
  };

  const addPDF = async (e, setter) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const doc = await readPDF(file);
      setter({ ...doc, _temp: true });
    } catch (err) { setFileErr(err.message); }
    e.target.value = "";
  };

  // ── Filtered & sorted ─────────────────────────────────────────
  const filtered = works.filter(w => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [w.title, w.artist, w.technique, w.location_storage, w.location_purchase]
      .some(f => f?.toLowerCase().includes(q));
  }).sort((a, b) => {
    let va = a[sortField] ?? "", vb = b[sortField] ?? "";
    if (typeof va === "string") { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });

  const toggleSort = f => {
    if (sortField === f) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(f); setSortDir("asc"); }
  };

  // ── Statistics ────────────────────────────────────────────────
  const totalCurrent = works.reduce((s, w) => s + (+w.value_current || +w.value_purchase || 0), 0);
  const insuredCount = works.filter(w => w.is_insured).length;

  // ── Auth guard ─────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ background: T.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>
        <div style={{ color: T.cyan, fontStyle: "italic", letterSpacing: "0.1em" }}>Chargement…</div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  // ── Render ────────────────────────────────────────────────────
  return (
<div style={{ background: T.bg, minHeight: "100vh", color: T.cream, fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontSize: "1.05rem" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Elms+Sans:wght@700&family=Inter:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Playfair+Display:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${T.bg}; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        .art-card { transition: transform 0.2s, box-shadow 0.2s; }
        .art-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important; }
        .tab-btn:hover { color: ${T.cream} !important; }
        .ghost-btn:hover { color: ${T.cyan} !important; }
        .row-hover:hover { background: ${T.s3} !important; }
        ::placeholder { color: ${T.dim}; opacity: 1; }
        ::-ms-input-placeholder { color: ${T.dim}; }
        @media (max-width: 768px) { .desk-only { display: none !important; } .resp-grid { grid-template-columns: 1fr !important; } .resp-cols { grid-template-columns: 1fr !important; } .resp-gallery { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)) !important; } .tb-hide { display: none !important; } }
        @media (min-width: 769px) { .mob-only { display: none !important; } }
      `}</style>

      {/* ── NAV ────────────────────────────────────────────────── */}
      <nav style={{ background: T.s1, borderBottom: `1px solid ${T.border}`, height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {(screen === "form" || screen === "detail") && (
            <button className="ghost-btn" onClick={goGallery}
              style={{ background: "none", border: "none", color: T.dim, cursor: "pointer", display: "flex", alignItems: "center", padding: 4, transition: "color 0.2s" }}>
              <ArrowLeft size={22} />
            </button>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, background: T.accent, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: T.bg, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", fontFamily: "'Elms Sans', sans-serif" }}>AV</span>
            </div>
            <h1 onClick={goGallery} style={{ fontFamily: "'Elms Sans', sans-serif", fontSize: "1.4rem", fontWeight: 600, color: T.accent, letterSpacing: "0.04em", cursor: "pointer" }}>
              ArtVault
            </h1>
          </div>
          {screen === "gallery" && (
            <span style={{ color: T.cream, fontSize: "0.82rem", marginLeft: 2, borderLeft: `1px solid ${T.border}`, paddingLeft: 12 }}>
              {works.length} {works.length === 1 ? "œuvre" : "œuvres"} · {eur(totalCurrent)}
            </span>
          )}
          {screen === "detail" && detWork && (
            <span style={{ color: T.dim, fontSize: "0.9rem", fontStyle: "italic" }}>
              {detWork.title}
            </span>
          )}
          {screen === "form" && (
            <span style={{ color: T.dim, fontSize: "0.9rem" }}>
              {editWork ? "Modifier l'œuvre" : "Nouvelle œuvre"}
            </span>
          )}
        </div>

        {/* ── RIGHT NAV ─────────────────────────────────────── */}
        <div className="desk-only" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {screen === "gallery" && (
            <>
              <button className="ghost-btn" onClick={() => setGridMode(true)}
                style={{ background: "none", border: "none", color: gridMode ? T.accent : T.dim, cursor: "pointer", padding: 6, transition: "color 0.2s", display: "flex" }}>
                <LayoutGrid size={20} />
              </button>
              <button className="ghost-btn" onClick={() => setGridMode(false)}
                style={{ background: "none", border: "none", color: !gridMode ? T.accent : T.dim, cursor: "pointer", padding: 6, transition: "color 0.2s", display: "flex" }}>
                <List size={20} />
              </button>
              <button className="ghost-btn" onClick={handleExportPDF} disabled={pdfLoading || works.length === 0}
                style={{ background: "none", border: "none", color: T.dim, cursor: pdfLoading || works.length === 0 ? "not-allowed" : "pointer", padding: 6, display: "flex", transition: "color 0.2s", opacity: pdfLoading || works.length === 0 ? 0.5 : 1 }}
                title="Export PDF catalogue">
                <FileText size={19} />
              </button>
              <button className="ghost-btn" onClick={handleExport} disabled={exporting || works.length === 0}
                style={{ background: "none", border: "none", color: T.dim, cursor: exporting || works.length === 0 ? "not-allowed" : "pointer", padding: 6, display: "flex", transition: "color 0.2s", opacity: exporting || works.length === 0 ? 0.5 : 1 }}
                title="Export ZIP collection">
                <Archive size={20} />
              </button>
              <div style={{ width: 1, height: 20, background: T.border, margin: "0 4px" }} />
              <button className="ghost-btn" onClick={handleLogout}
                style={{ background: "none", border: "none", color: T.dim, cursor: "pointer", padding: 6, display: "flex", transition: "color 0.2s" }}
                title="Déconnexion">
                <LogOut size={19} />
              </button>
            </>
          )}
          {screen === "detail" && (
            <>
              <Btn variant="outline" onClick={() => openEdit(detWork)} sx={{ padding: "6px 14px" }}>
                <Edit2 size={14} /> Modifier
              </Btn>
              <button className="ghost-btn" onClick={() => setDelModal(true)}
                style={{ background: "none", border: "none", color: T.red, cursor: "pointer", padding: 6, display: "flex", transition: "opacity 0.2s" }}>
                <Trash2 size={18} />
              </button>
            </>
          )}
          {screen === "form" && (
            <Btn variant="primary" onClick={handleSave} disabled={saving} sx={{ padding: "8px 20px" }}>
              <Save size={14} /> {saving ? "Enregistrement…" : editWork ? "Mettre à jour" : "Enregistrer"}
            </Btn>
          )}
        </div>

        {/* ── MOBILE HAMBURGER ───────────────────────────────── */}
        <button className="mob-only" onClick={() => setMenuOpen(o => !o)}
          style={{ background: "none", border: "none", color: T.cream, cursor: "pointer", padding: 6, display: "flex" }}>
          <Menu size={22} />
        </button>

        {/* ── MOBILE MENU OVERLAY ────────────────────────────── */}
        {menuOpen && (
          <>
            <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 98 }} />
            <div style={{ position: "fixed", top: 58, left: 0, right: 0, background: T.s1, borderBottom: `1px solid ${T.border}`, padding: "12px 20px", zIndex: 99, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            {screen === "gallery" && (
              <>
                <button className="ghost-btn" onClick={() => { setGridMode(true); setMenuOpen(false); }}
                  style={{ background: "none", border: `1px solid ${gridMode ? T.accent : T.border}`, color: gridMode ? T.accent : T.dim, borderRadius: 4, cursor: "pointer", padding: "8px 14px", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit", fontSize: "0.9rem" }}>
                  <LayoutGrid size={18} /> Mode grille
                </button>
                <button className="ghost-btn" onClick={() => { setGridMode(false); setMenuOpen(false); }}
                  style={{ background: "none", border: `1px solid ${!gridMode ? T.accent : T.border}`, color: !gridMode ? T.accent : T.dim, borderRadius: 4, cursor: "pointer", padding: "8px 14px", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit", fontSize: "0.9rem" }}>
                  <List size={18} /> Mode liste
                </button>
                <button className="ghost-btn" onClick={() => { handleExportPDF(); setMenuOpen(false); }} disabled={pdfLoading || works.length === 0}
                  style={{ background: "none", border: `1px solid ${T.border}`, color: T.dim, borderRadius: 4, cursor: pdfLoading || works.length === 0 ? "not-allowed" : "pointer", padding: "8px 14px", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit", fontSize: "0.9rem", opacity: pdfLoading || works.length === 0 ? 0.5 : 1 }}>
                  <FileText size={17} /> Export PDF
                </button>
                <button className="ghost-btn" onClick={() => { handleExport(); setMenuOpen(false); }} disabled={exporting || works.length === 0}
                  style={{ background: "none", border: `1px solid ${T.border}`, color: T.dim, borderRadius: 4, cursor: exporting || works.length === 0 ? "not-allowed" : "pointer", padding: "8px 14px", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit", fontSize: "0.9rem", opacity: exporting || works.length === 0 ? 0.5 : 1 }}>
                  <Archive size={18} /> Export ZIP
                </button>
                <button className="ghost-btn" onClick={() => { handleLogout(); setMenuOpen(false); }}
                  style={{ background: "none", border: `1px solid ${T.border}`, color: T.dim, borderRadius: 4, cursor: "pointer", padding: "8px 14px", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit", fontSize: "0.9rem" }}>
                  <LogOut size={17} /> Déconnexion
                </button>
              </>
            )}
            {screen === "detail" && (
              <>
                <button className="ghost-btn" onClick={() => { openEdit(detWork); setMenuOpen(false); }}
                  style={{ background: "none", border: `1px solid ${T.border}`, color: T.dim, borderRadius: 4, cursor: "pointer", padding: "8px 14px", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit", fontSize: "0.9rem" }}>
                  <Edit2 size={16} /> Modifier
                </button>
                <button className="ghost-btn" onClick={() => { setDelModal(true); setMenuOpen(false); }}
                  style={{ background: "none", border: `1px solid ${T.red}40`, color: T.red, borderRadius: 4, cursor: "pointer", padding: "8px 14px", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit", fontSize: "0.9rem" }}>
                  <Trash2 size={16} /> Supprimer
                </button>
              </>
            )}
            {screen === "form" && (
              <Btn variant="primary" onClick={() => { handleSave(); setMenuOpen(false); }} disabled={saving} sx={{ width: "fit-content" }}>
                <Save size={16} /> {saving ? "Enregistrement…" : editWork ? "Mettre à jour" : "Enregistrer"}
              </Btn>
            )}
          </div>
          </>
        )}
      </nav>

      {/* ── SEARCH / SORT BAR ────────────────────────────────── */}
      {screen === "gallery" && (
        <div style={{ background: T.s1, borderBottom: `1px solid ${T.border}`, padding: "10px 20px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 160, maxWidth: 380, position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={17} style={{ position: "absolute", left: 10, color: T.dim, pointerEvents: "none" }} />
            <input
              placeholder="Rechercher…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", background: "#1e3a5f", color: T.cream, border: `1px solid ${T.border}`, borderRadius: 4, padding: "7px 10px 7px 32px", fontSize: "0.9rem", fontFamily: "inherit", outline: "none" }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, background: "none", border: "none", color: T.dim, cursor: "pointer", display: "flex" }}>
                <X size={14} />
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[["artist","Artiste"],["title","Titre"],["value_current","Valeur"],["location_storage","Lieu"],["is_insured","Assurée"]].map(([f, l]) => (
              <button key={f} onClick={() => toggleSort(f)} className="ghost-btn"
                style={{ background: "none", border: `1px solid ${sortField === f ? T.cyan : T.border}`, color: sortField === f ? T.cyan : T.dim, borderRadius: 3, padding: "5px 10px", fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, transition: "all 0.18s" }}>
                {l}
                {sortField === f && (sortDir === "asc" ? <SortAsc size={12} /> : <SortDesc size={12} />)}
              </button>
            ))}
          </div>
          {(exporting || pdfLoading) && (
            <span style={{ color: T.accent, fontSize: "0.82rem", fontStyle: "italic" }}>
              {pdfLoading ? "Génération du PDF…" : "Export en cours…"}
            </span>
          )}
        </div>
      )}

      {/* ── LOADING ──────────────────────────────────────────── */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 100, color: T.accent, fontStyle: "italic", letterSpacing: "0.1em" }}>
          Chargement de la collection…
        </div>
      )}

      {/* ── GALLERY ──────────────────────────────────────────── */}
      {!loading && screen === "gallery" && gridMode && (
        <div style={{ padding: "24px 20px", maxWidth: 1280, margin: "0 auto" }}>
          {works.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Œuvres", value: works.length, icon: <ImageIcon size={16} /> },
                { label: "Valeur totale", value: eur(totalCurrent), icon: <Euro size={16} /> },
                { label: "Assurées", value: `${insuredCount} / ${works.length}`, icon: <Shield size={16} /> },
                { label: "Artistes", value: new Set(works.map(w => w.artist).filter(Boolean)).size, icon: <Tag size={16} /> },
              ].map(({ label, value, icon }) => (
                <div key={label} style={{ background: T.s2, border: `1px solid ${label === "Valeur totale" ? T.cyan + "60" : T.border}`, borderLeft: `3px solid ${label === "Valeur totale" ? T.cyan : "transparent"}`, borderRadius: 6, padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.dim, fontSize: "0.78rem", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {icon} {label}
                  </div>
                  <div style={{ fontSize: "1.15rem", color: T.cream }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", paddingTop: 80, color: T.dim, fontStyle: "italic", fontSize: "1.05rem" }}>
              {works.length === 0 ? "La collection est vide. Ajoutez votre première œuvre ↓" : "Aucun résultat."}
            </div>
          ) : (
            <div className="resp-gallery" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
              {filtered.map(w => (
                <div key={w.id} className="art-card" onClick={() => openDetail(w)}
                  style={{ background: T.s2, border: `1px solid ${T.border}`, borderRadius: 6, overflow: "hidden", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                  <div style={{ aspectRatio: "4/3", background: T.s3, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {thumbs[w.id]
                      ? <img src={thumbs[w.id]} alt={w.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <ImageIcon size={36} color={T.border} />
                    }
                  </div>
                  <div style={{ padding: "14px 15px" }}>
                    <div style={{ fontSize: "1.15rem", color: T.cream, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {w.title || "Sans titre"}
                    </div>
                    <div style={{ color: T.dim, fontSize: "0.88rem", marginBottom: 8, fontStyle: "italic" }}>{w.artist || "Artiste inconnu"}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: T.accent, fontSize: "0.9rem" }}>
                        {eur(w.value_current || w.value_purchase)}
                      </span>
                      <span style={{ color: w.is_insured ? T.green : T.dim2, fontSize: "0.78rem", display: "flex", alignItems: "center", gap: 3 }}>
                        {w.is_insured ? <><CheckCircle2 size={12} /> Assurée</> : <><ShieldOff size={12} /></>}
                      </span>
                    </div>
                    {w.location_storage && (
                      <div style={{ color: T.dim2, fontSize: "0.78rem", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                        <MapPin size={11} /> {w.location_storage}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── LIST VIEW ────────────────────────────────────────── */}
      {!loading && screen === "gallery" && !gridMode && (
        <div style={{ padding: "24px 20px", maxWidth: 1280, margin: "0 auto", overflowX: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", paddingTop: 80, color: T.dim, fontStyle: "italic" }}>
              {works.length === 0 ? "La collection est vide." : "Aucun résultat."}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.accent}40` }}>
                  {[
                    ["artist","Artiste"], ["title","Titre"], ["technique","Technique"],
                    ["date_work","Date"], ["location_storage","Lieu"],
                    ["value_purchase","Achat"], ["value_current","Valeur act."], ["is_insured","Ass."]
                  ].map(([f, l]) => (
                    <th key={f} onClick={() => toggleSort(f)}
                      className={["technique","date_work","location_storage","value_purchase"].includes(f) ? "tb-hide" : ""}
                      style={{ textAlign: "left", padding: "10px 12px", color: sortField === f ? T.accent : T.dim, fontWeight: 400, letterSpacing: "0.07em", textTransform: "uppercase", fontSize: "0.75rem", cursor: "pointer", whiteSpace: "nowrap", userSelect: "none" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {l} {sortField === f && (sortDir === "asc" ? "↑" : "↓")}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((w, i) => (
                  <tr key={w.id} className="row-hover" onClick={() => openDetail(w)}
                    style={{ borderBottom: `1px solid ${T.border}`, cursor: "pointer", background: i % 2 === 0 ? "transparent" : T.s1, transition: "background 0.15s" }}>
                    <td style={{ padding: "10px 12px", color: T.cream, fontStyle: "italic" }}>{w.artist || "—"}</td>
                    <td style={{ padding: "10px 12px" }}>{w.title || "—"}</td>
                    <td className="tb-hide" style={{ padding: "10px 12px", color: T.dim }}>{w.technique || "—"}</td>
                    <td className="tb-hide" style={{ padding: "10px 12px", color: T.dim }}>{w.date_work || "—"}</td>
                    <td className="tb-hide" style={{ padding: "10px 12px", color: T.dim }}>{w.location_storage || "—"}</td>
                    <td className="tb-hide" style={{ padding: "10px 12px", color: T.dim }}>{eur(w.value_purchase)}</td>
                    <td style={{ padding: "10px 12px", color: T.accent }}>{eur(w.value_current)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      {w.is_insured ? <CheckCircle2 size={15} color={T.green} /> : <Circle size={15} color={T.border} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── FORM ─────────────────────────────────────────────── */}
      {screen === "form" && (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 80px" }}>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, marginBottom: 28, overflowX: "auto" }}>
            {[["info","Informations"],["dims","Dimensions"],["finance","Finance"],["docs","Documents"],["photos","Photos"]].map(([t, l]) => (
              <button key={t} className="tab-btn" onClick={() => setFormTab(t)}
                style={{ background: "none", border: "none", borderBottom: `2px solid ${formTab === t ? T.cyan : "transparent"}`, color: formTab === t ? T.cyan : T.dim, padding: "10px 20px", fontSize: "0.88rem", letterSpacing: "0.07em", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "color 0.18s" }}>
                {l}
              </button>
            ))}
          </div>

          {fileErr && (
            <div style={{ background: "#b0353520", border: `1px solid ${T.red}`, color: "#e07070", padding: "10px 14px", borderRadius: 4, marginBottom: 20, fontSize: "0.88rem" }}>
              {fileErr}
            </div>
          )}

          {/* ── Tab: Informations ─────────────────────────────── */}
          {formTab === "info" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div className="resp-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Artiste *">
                  <Input value={form.artist} onChange={v => setForm(f => ({ ...f, artist: v }))} placeholder="Nom de l'artiste" />
                </Field>
                <Field label="Titre de l'œuvre *">
                  <Input value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="Titre" />
                </Field>
              </div>
              <Field label="Technique / Catégorie">
                <Input value={form.technique} onChange={v => setForm(f => ({ ...f, technique: v }))} placeholder="Huile sur toile, Aquarelle, Sculpture, Photographie…" />
              </Field>
              <Field label="Date de l'œuvre">
                <Input value={form.dateWork} onChange={v => setForm(f => ({ ...f, dateWork: v }))} placeholder="ex: 1923, vers 1950, 12/03/1987" />
              </Field>
              <Field label="Lieu d'entreposage">
                <Input value={form.locationStorage} onChange={v => setForm(f => ({ ...f, locationStorage: v }))} placeholder="Salon, Chambre, Cave, Coffre…" />
              </Field>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: form.isInsured ? T.s2 : T.s3, border: `1px solid ${form.isInsured ? T.accent : T.border}`, borderRadius: 4, cursor: "pointer", transition: "all 0.18s" }}
                onClick={() => setForm(f => ({ ...f, isInsured: !f.isInsured }))}>
                {form.isInsured
                  ? <CheckCircle2 size={20} color={T.accent} />
                  : <Circle size={20} color={T.dim2} />}
                <span style={{ fontSize: "0.95rem", userSelect: "none", color: form.isInsured ? T.accent : T.cream }}>Œuvre assurée</span>
                {form.isInsured && <span style={{ marginLeft: "auto", color: T.accent, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 4 }}><Shield size={14} /> Assurée</span>}
              </div>
              <Field label="Notes / Provenance">
                <Textarea value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} placeholder="Provenance, historique, conditions de conservation, état…" />
              </Field>
            </div>
          )}

          {/* ── Tab: Dimensions ──────────────────────────────── */}
          {formTab === "dims" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div className="resp-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                <Field label="Largeur"><Input value={form.width} onChange={v => setForm(f => ({ ...f, width: v }))} type="number" placeholder="0" /></Field>
                <Field label="Hauteur"><Input value={form.height} onChange={v => setForm(f => ({ ...f, height: v }))} type="number" placeholder="0" /></Field>
                <Field label="Profondeur"><Input value={form.depth} onChange={v => setForm(f => ({ ...f, depth: v }))} type="number" placeholder="Optionnel" /></Field>
              </div>
              <Field label="Unité de mesure">
                <Select value={form.dimensionUnit} onChange={v => setForm(f => ({ ...f, dimensionUnit: v }))}>
                  <option value="cm">cm</option>
                  <option value="mm">mm</option>
                  <option value="m">m</option>
                  <option value="in">pouces (in)</option>
                </Select>
              </Field>
              {(form.width || form.height) && (
                <div style={{ background: T.s3, border: `1px solid ${T.border}`, borderRadius: 4, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, color: T.dim }}>
                  <Ruler size={16} color={T.accent} />
                  <span style={{ color: T.cream }}>
                    {form.width || "?"} × {form.height || "?"}{form.depth ? ` × ${form.depth}` : ""} {form.dimensionUnit}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Finance ─────────────────────────────────── */}
          {formTab === "finance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <Field label="Date d'achat">
                <Input value={form.datePurchase} onChange={v => setForm(f => ({ ...f, datePurchase: v }))} type="date" />
              </Field>
              <Field label="Lieu d'achat">
                <Input value={form.locationPurchase} onChange={v => setForm(f => ({ ...f, locationPurchase: v }))} placeholder="Galerie, Maison de vente, Vente privée…" />
              </Field>
              <div className="resp-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Valeur d'achat (€)">
                  <Input value={form.valuePurchase} onChange={v => setForm(f => ({ ...f, valuePurchase: v }))} type="number" placeholder="0" />
                </Field>
                <Field label="Valeur actuelle estimée (€)">
                  <Input value={form.valueCurrent} onChange={v => setForm(f => ({ ...f, valueCurrent: v }))} type="number" placeholder="0" />
                </Field>
              </div>
              {form.valuePurchase && form.valueCurrent && +form.valuePurchase > 0 && (
                <div style={{ background: T.s3, border: `1px solid ${T.border}`, borderRadius: 4, padding: "14px 16px" }}>
                  <Label>Évolution de valeur</Label>
                  {(() => {
                    const pct = ((+form.valueCurrent - +form.valuePurchase) / +form.valuePurchase * 100).toFixed(1);
                    const diff = +form.valueCurrent - +form.valuePurchase;
                    const isUp = diff >= 0;
                    return (
                      <div style={{ color: isUp ? T.green : T.red, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: 8 }}>
                        {isUp ? "▲" : "▼"} {Math.abs(pct)}%
                        <span style={{ color: T.dim, fontSize: "0.88rem" }}>({isUp ? "+" : ""}{eur(diff)})</span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Documents ───────────────────────────────── */}
          {formTab === "docs" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: T.s2, border: `1px solid ${T.border}`, borderRadius: 6, padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <FileText size={16} color={T.accent} />
                  <span style={{ color: T.cream, fontSize: "0.9rem" }}>Expertise</span>
                </div>
                {fExp ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <FileText size={16} color={T.dim} />
                    <span style={{ flex: 1, color: T.cream, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.9rem" }}>{fExp.name}</span>
                    <a href={fExp._saved ? fExp.url : fExp.data} download={fExp.name} target="_blank" rel="noreferrer"
                      style={{ color: T.accent, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 4 }}><Download size={13} /> Ouvrir</a>
                    <button onClick={() => setFExp(null)} style={{ background: "none", border: "none", color: T.red, cursor: "pointer", display: "flex" }}><X size={16} /></button>
                  </div>
                ) : (
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", color: T.dim, fontSize: "0.88rem", border: `1px dashed ${T.border}`, borderRadius: 4, padding: "10px 16px", transition: "border-color 0.2s, color 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.dim; }}>
                    <Plus size={15} /> Charger un PDF (max 5 MB)
                    <input ref={expRef} type="file" accept=".pdf,application/pdf" style={{ display: "none" }} onChange={e => addPDF(e, setFExp)} />
                  </label>
                )}
              </div>

              <div style={{ background: T.s2, border: `1px solid ${T.border}`, borderRadius: 6, padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <FileText size={16} color={T.accent} />
                  <span style={{ color: T.cream, fontSize: "0.9rem" }}>Attestation / Certificat d'authenticité</span>
                </div>
                {fAtt ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <FileText size={16} color={T.dim} />
                    <span style={{ flex: 1, color: T.cream, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.9rem" }}>{fAtt.name}</span>
                    <a href={fAtt._saved ? fAtt.url : fAtt.data} download={fAtt.name} target="_blank" rel="noreferrer"
                      style={{ color: T.accent, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 4 }}><Download size={13} /> Ouvrir</a>
                    <button onClick={() => setFAtt(null)} style={{ background: "none", border: "none", color: T.red, cursor: "pointer", display: "flex" }}><X size={16} /></button>
                  </div>
                ) : (
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", color: T.dim, fontSize: "0.88rem", border: `1px dashed ${T.border}`, borderRadius: 4, padding: "10px 16px", transition: "border-color 0.2s, color 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.dim; }}>
                    <Plus size={15} /> Charger un PDF (max 5 MB)
                    <input ref={attRef} type="file" accept=".pdf,application/pdf" style={{ display: "none" }} onChange={e => addPDF(e, setFAtt)} />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* ── Tab: Photos ───────────────────────────────────── */}
          {formTab === "photos" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ color: T.dim, fontSize: "0.85rem" }}>
                {fPhotos.length}/5 photos · La première sera utilisée comme vignette
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12 }}>
                {fPhotos.map((p, i) => (
                  <div key={i} style={{ position: "relative", aspectRatio: "1", background: T.s3, borderRadius: 6, overflow: "hidden", border: `1px solid ${T.border}` }}>
                    <img src={p._saved ? p.url : p.data} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button onClick={() => removeFormPhoto(i)}
                      style={{ position: "absolute", top: 5, right: 5, background: "rgba(0,0,0,0.75)", border: "none", color: "#fff", width: 24, height: 24, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <X size={12} />
                    </button>
                    {i === 0 && (
                      <span style={{ position: "absolute", bottom: 5, left: 5, background: T.accent, color: T.bg, fontSize: "0.65rem", padding: "2px 6px", borderRadius: 2, fontWeight: 700 }}>
                        Principale
                      </span>
                    )}
                  </div>
                ))}
                {fPhotos.length < 5 && (
                  <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, marginTop: 4 }}>
                    <label style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 16px", background: T.s3, border: `2px dashed ${T.border}`, borderRadius: 6, cursor: "pointer", color: T.dim, fontSize: "0.88rem", transition: "border-color 0.2s, color 0.2s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.dim; }}>
                      <Camera size={18} />
                      <span>Prendre photo</span>
                      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={addPhoto} />
                    </label>
                    <label style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 16px", background: T.s3, border: `2px dashed ${T.border}`, borderRadius: 6, cursor: "pointer", color: T.dim, fontSize: "0.88rem", transition: "border-color 0.2s, color 0.2s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.dim; }}>
                      <ImageIcon size={18} />
                      <span>Choisir dans la galerie</span>
                      <input ref={photoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={addPhoto} />
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DETAIL ────────────────────────────────────────────── */}
      {screen === "detail" && detWork && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 60px" }}>
          <div style={{ marginBottom: 28 }}>
            <h2 onClick={goGallery} style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "2rem", fontWeight: 500, color: T.cream, lineHeight: 1.2, marginBottom: 8, cursor: "pointer" }}>
              {detWork.title || "Sans titre"}
            </h2>
            <div style={{ color: T.accent, fontSize: "1.15rem", fontStyle: "italic", marginBottom: 10 }}>{detWork.artist}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              {detWork.technique && <span style={{ background: T.s3, border: `1px solid ${T.border}`, color: T.dim, padding: "3px 10px", borderRadius: 12, fontSize: "0.82rem" }}>{detWork.technique}</span>}
              {detWork.date_work && <span style={{ color: T.dim, fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 4 }}><Calendar size={13} /> {detWork.date_work}</span>}
              {detWork.is_insured && (
                <span style={{ background: "#3a805020", border: `1px solid ${T.green}40`, color: T.green, padding: "3px 10px", borderRadius: 12, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle2 size={12} /> Assurée
                </span>
              )}
            </div>
          </div>

          {dPhotos.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ background: T.s2, borderRadius: 8, overflow: "hidden", maxHeight: 500, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <img src={dPhotos[pIdx].url} alt="" onClick={() => setFullscreenPhoto(dPhotos[pIdx].url)} style={{ maxWidth: "100%", maxHeight: 500, objectFit: "contain", cursor: "pointer" }} />
                {dPhotos.length > 1 && (
                  <>
                    <button onClick={() => setPIdx(i => (i - 1 + dPhotos.length) % dPhotos.length)}
                      style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.6)", border: "none", color: T.cream, width: 38, height: 38, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ChevronLeft size={20} />
                    </button>
                    <button onClick={() => setPIdx(i => (i + 1) % dPhotos.length)}
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.6)", border: "none", color: T.cream, width: 38, height: 38, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ChevronRight size={20} />
                    </button>
                    <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
                      {dPhotos.map((_, i) => (
                        <div key={i} onClick={() => setPIdx(i)}
                          style={{ width: 8, height: 8, borderRadius: "50%", background: i === pIdx ? T.cyan : "rgba(255,255,255,0.35)", cursor: "pointer", transition: "background 0.2s" }} />
                      ))}
                    </div>
                  </>
                )}
              </div>
              {dPhotos.length > 1 && (
                <div style={{ display: "flex", gap: 8, marginTop: 10, overflowX: "auto", paddingBottom: 4 }}>
                  {dPhotos.map((p, i) => (
                    <div key={i} onClick={() => setPIdx(i)}
                      style={{ flexShrink: 0, width: 62, height: 62, borderRadius: 4, overflow: "hidden", border: `2px solid ${i === pIdx ? T.cyan : T.border}`, cursor: "pointer", transition: "border-color 0.2s" }}>
                      <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="resp-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
            <div>
              <div style={{ color: T.cyan, fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Informations</div>
              {[
                ["Lieu d'entreposage", detWork.location_storage, <MapPin size={13} />],
                ["Dimensions", (detWork.width || detWork.height) ? `${detWork.width || "?"}×${detWork.height || "?"}${detWork.depth ? `×${detWork.depth}` : ""} ${detWork.dimension_unit || "cm"}` : null, <Ruler size={13} />],
              ].filter(([, v]) => v).map(([l, v, ico]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.border}30`, gap: 12 }}>
                  <span style={{ color: T.dim, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>{ico}{l}</span>
                  <span style={{ color: T.cream, fontSize: "0.9rem", textAlign: "right" }}>{v}</span>
                </div>
              ))}
              {detWork.notes && (
                <div style={{ marginTop: 14, padding: "12px 14px", background: T.s2, border: `1px solid ${T.border}`, borderRadius: 4, color: T.dim, fontSize: "0.88rem", lineHeight: 1.65, fontStyle: "italic" }}>
                  {detWork.notes}
                </div>
              )}
            </div>
            <div>
              <div style={{ color: T.cyan, fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Finance</div>
              {[
                ["Date d'achat", detWork.date_purchase ? fmtDate(detWork.date_purchase) : null, <Calendar size={13} />],
                ["Lieu d'achat", detWork.location_purchase, <MapPin size={13} />],
                ["Valeur d'achat", detWork.value_purchase ? eur(detWork.value_purchase) : null, <Euro size={13} />],
                ["Valeur actuelle", detWork.value_current ? eur(detWork.value_current) : null, <Euro size={13} />, true],
              ].filter(([, v]) => v).map(([l, v, ico, gold]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.border}30`, gap: 12 }}>
                  <span style={{ color: T.dim, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>{ico}{l}</span>
                  <span style={{ color: gold ? T.accent : T.cream, fontSize: "0.9rem", fontWeight: gold ? 500 : 400 }}>{v}</span>
                </div>
              ))}
              {detWork.value_purchase && detWork.value_current && +detWork.value_purchase > 0 && (() => {
                const pct = ((+detWork.value_current - +detWork.value_purchase) / +detWork.value_purchase * 100).toFixed(1);
                const up = +detWork.value_current >= +detWork.value_purchase;
                return (
                  <div style={{ marginTop: 10, color: up ? T.green : T.red, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: 6 }}>
                    {up ? "▲" : "▼"} {Math.abs(pct)}% {up ? "de plus-value" : "de moins-value"}
                  </div>
                );
              })()}
            </div>
          </div>

          {(dExp || dAtt) && (
            <div style={{ marginTop: 8, marginBottom: 24 }}>
              <div style={{ color: T.accent, fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Documents</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {dExp && (
                  <a href={dExp.url} download={dExp.name}
                    style={{ display: "flex", alignItems: "center", gap: 8, background: T.s2, border: `1px solid ${T.border}`, borderRadius: 4, padding: "10px 16px", color: T.cream, textDecoration: "none", fontSize: "0.88rem" }}>
                    <FileText size={15} color={T.accent} /> Expertise · {dExp.name}
                    <Download size={13} color={T.dim} />
                  </a>
                )}
                {dAtt && (
                  <a href={dAtt.url} download={dAtt.name}
                    style={{ display: "flex", alignItems: "center", gap: 8, background: T.s2, border: `1px solid ${T.border}`, borderRadius: 4, padding: "10px 16px", color: T.cream, textDecoration: "none", fontSize: "0.88rem" }}>
                    <FileText size={15} color={T.accent} /> Attestation · {dAtt.name}
                    <Download size={13} color={T.dim} />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FAB ──────────────────────────────────────────────── */}
      {screen === "gallery" && (
        <button onClick={openAdd}
          style={{ position: "fixed", bottom: 28, right: 24, width: 56, height: 56, borderRadius: "50%", background: T.accent, color: T.bg, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.5)", zIndex: 200, transition: "transform 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
          <Plus size={28} />
        </button>
      )}

      {/* ── DELETE MODAL ─────────────────────────────────────── */}
      {delModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400 }}>
          <div style={{ background: T.s1, border: `1px solid ${T.border}`, borderRadius: 10, padding: 32, maxWidth: 380, width: "90%", textAlign: "center" }}>
            <Trash2 size={28} color={T.red} style={{ marginBottom: 14 }} />
            <div style={{ fontSize: "1.1rem", marginBottom: 10, fontFamily: "'Playfair Display', Georgia, serif" }}>Supprimer cette œuvre ?</div>
            <div style={{ color: T.dim, fontSize: "0.88rem", marginBottom: 26, lineHeight: 1.6 }}>
              « {detWork?.title} » — {detWork?.artist}<br />
              <span style={{ color: T.red }}>Cette action est irréversible.</span>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Btn variant="outline" onClick={() => setDelModal(false)}>Annuler</Btn>
              <Btn variant="danger" onClick={handleDelete} sx={{ background: "#b0353520" }}>
                <Trash2 size={14} /> Supprimer définitivement
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── FULLSCREEN PHOTO ─────────────────────────────────── */}
      {fullscreenPhoto && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setFullscreenPhoto(null)}>
          <button onClick={() => setFullscreenPhoto(null)}
            style={{ position: "absolute", top: 14, right: 14, background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", width: 36, height: 36, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 501 }}>
            <X size={20} />
          </button>
          <img src={fullscreenPhoto} alt="" onClick={e => e.stopPropagation()}
            style={{ maxWidth: "95vw", maxHeight: "95vh", objectFit: "contain" }} />
        </div>
      )}
    </div>
  );
}
