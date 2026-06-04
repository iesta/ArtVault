import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, ArrowLeft, Edit2, Trash2, LayoutGrid, List, Search,
  CheckCircle2, Circle, Download, X, ChevronLeft, ChevronRight,
  Image as ImageIcon, FileText, Shield, ShieldOff, SortAsc, SortDesc,
  Calendar, MapPin, Tag, Euro, Ruler, Save, Archive, LogOut, Camera, Menu, Settings, Smartphone, Info, FileSpreadsheet, Share2, Copy, Check, Link as LinkIcon, Crop as CropIcon
} from "lucide-react";
import { supabase, photoURL, docURL } from "./supabase";
import Auth from "./Auth";
import ShareView from "./ShareView";

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

const fmtDate = (d, locale = "fr-BE") => {
  if (!d) return "—";
  try { return new Date(d + "T12:00:00").toLocaleDateString(locale); } catch { return d; }
};

// ── Default form ──────────────────────────────────────────────
const BLANK = {
  artist: "", title: "", technique: "", edition: "", dateWork: "",
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
  edition: f.edition,
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
  edition: d.edition || "",
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
import { themes, ThemeContext, useTheme, loadTheme, saveTheme, themeGroups, themeLabels } from "./themes";
import { I18nContext, formatCurrency, loadLang, saveLang, loadCurrency, saveCurrency, DEFAULT_LANG, DEFAULT_CURRENCY } from "./i18n";

// ── Small reusable components ─────────────────────────────────

function Btn({ children, onClick, variant = "outline", disabled, style: sx, ...props }) {
  const T = useTheme();
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
  const T = useTheme();
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
  const T = useTheme();
  return (
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%", background: T.s3, color: T.cream, border: `1px solid ${T.border}`,
        borderRadius: 4, padding: "9px 12px", fontSize: "0.95rem", fontFamily: "inherit",
        outline: "none", colorScheme: T.mode === "light" ? "light" : "dark",
      }}
onFocus={e => e.target.style.borderColor = T.cyan}
                    onBlur={e => e.target.style.borderColor = T.border}
      {...rest}
    />
  );
}

function Select({ value, onChange, children }) {
  const T = useTheme();
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{
        width: "100%", background: T.s3, color: T.cream, border: `1px solid ${T.border}`,
        borderRadius: 4, padding: "9px 12px", fontSize: "0.95rem", fontFamily: "inherit",
        outline: "none", colorScheme: T.mode === "light" ? "light" : "dark", cursor: "pointer",
      }}>
      {children}
    </select>
  );
}

function Textarea({ value, onChange, placeholder, rows = 4 }) {
  const T = useTheme();
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
  const [themeName, setThemeName] = useState(loadTheme);
  const [lang, setLang] = useState(loadLang);
  const [currency, setCurrency] = useState(loadCurrency);
  const [msgs, setMsgs] = useState(null);
  const T = themes[themeName];

  const [works,    setWorks]    = useState([]);
  const [screen,   setScreen]  = useState("gallery");
  const [gridMode, setGridMode] = useState(true);
  const [search,   setSearch]  = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [sortField, setSortField] = useState("artist");
  const [sortDir,  setSortDir]  = useState("asc");
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [delModal, setDelModal] = useState(false);
  const [fileErr,  setFileErr]  = useState("");
  const [exporting, setExporting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [xlsLoading, setXlsLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [prefPanel, setPrefPanel] = useState(false);
  const [iosInstallModal, setIosInstallModal] = useState(false);
  const [shareToken, setShareToken] = useState(null);
  const [shareData, setShareData] = useState(null);
  const [shareDialog, setShareDialog] = useState(false);
  const [showValuesShare, setShowValuesShare] = useState(true);
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [shareErr, setShareErr] = useState("");

  // Form state
  const [editWork, setEditWork] = useState(null);
  const [form,     setForm]     = useState(BLANK);
  const [formTab,  setFormTab]  = useState("info");
  const [fPhotos,  setFPhotos]  = useState([]);
  const [fExp,     setFExp]     = useState(null);
  const [fAtt,     setFAtt]     = useState(null);
  const [fTags,    setFTags]    = useState([]);

  // Detail state
  const [detWork,  setDetWork]  = useState(null);
  const [dPhotos,  setDPhotos]  = useState([]);
  const [dExp,     setDExp]     = useState(null);
  const [dAtt,     setDAtt]     = useState(null);
  const [pIdx,     setPIdx]     = useState(0);

  // Fullscreen photo
  const [fullscreenPhoto, setFullscreenPhoto] = useState(null);
  const [cropMode, setCropMode] = useState(false);
  const [cropRect, setCropRect] = useState(null);
  const dragRef = useRef(false);
  const cropRectRef = useRef(null);
  const cropActionRef = useRef(null); // "create" | "move" | null
  const cropOffRef = useRef({ dx: 0, dy: 0 });
  const cropImgRef = useRef(null);

  // returns natural coords from a mouse event on the img element
  const imgCoords = useCallback(e => {
    const img = cropImgRef.current;
    if (!img) return { x: 0, y: 0 };
    const r = img.getBoundingClientRect();
    const s = Math.min(r.width / img.naturalWidth, r.height / img.naturalHeight);
    const cx = r.left + (r.width - img.naturalWidth * s) / 2;
    const cy = r.top + (r.height - img.naturalHeight * s) / 2;
    return { x: (e.clientX - cx) / s, y: (e.clientY - cy) / s, s, cx, cy };
  }, []);

  // Thumbnails {id: url}
  const [thumbs, setThumbs] = useState({});

  const photoRef = useRef();
  const cameraRef = useRef();
  const videoRef = useRef();
  const streamRef = useRef(null);
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

  // ── Camera stream ─────────────────────────────────────────────
  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOpen]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── PWA install ───────────────────────────────────────────────
  useEffect(() => {
    const handler = e => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const handleInstallIOS = () => {
    setIosInstallModal(true);
  };

  // ── Load messages ───────────────────────────────────────────
  useEffect(() => {
    import(`./i18n/${lang}.json`).then(m => setMsgs(m.default));
  }, [lang]);

  const t = useCallback((key, vars) => {
    if (!msgs) return key;
    let v = msgs[key];
    if (v === undefined && frMsgs.current) { v = frMsgs.current[key]; }
    if (v === undefined) v = key;
    if (vars && typeof v === "string") {
      for (const [k, val] of Object.entries(vars)) v = v.replace(`{${k}}`, val);
    }
    return v;
  }, [msgs]);

  const frMsgs = useRef(null);
  useEffect(() => {
    import("./i18n/fr.json").then(m => { frMsgs.current = m.default; });
  }, []);

  const fmt = useCallback((v) => {
    if (v === "" || v === null || v === undefined) return "—";
    return formatCurrency(v, currency);
  }, [currency]);

  const fmtLocale = useCallback((d) => fmtDate(d, currency === "USD" ? "en-US" : currency === "CNY" ? "zh-CN" : "fr-BE"), [currency]);

  // ── Persist theme / lang / currency ─────────────────────────
  useEffect(() => { saveTheme(themeName); }, [themeName]);
  useEffect(() => { saveLang(lang); }, [lang]);
  useEffect(() => { saveCurrency(currency); }, [currency]);

  // ── Share route detection ───────────────────────────────────────
  useEffect(() => {
    const m = window.location.pathname.match(/^\/share\/([\w-]+)$/);
    if (m) setShareToken(m[1]);
  }, []);

  useEffect(() => {
    if (!shareToken) return;
    supabase.rpc("get_shared_collection", { token: shareToken }).then(({ data, error }) => {
      setShareData(error ? { error: "invalid_token" } : data);
    });
  }, [shareToken]);

  const handleCreateShare = async () => {
    setShareErr("");
    const token = crypto.randomUUID();
    const { error } = await supabase.from("share_links").insert({
      user_id: session.user.id,
      token,
      show_values: showValuesShare,
    });
    if (error) { setShareErr(error.message); return; }
    const url = `${window.location.origin}/share/${token}`;
    setShareLink(url);
    try { await navigator.clipboard.writeText(url); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleRevokeShare = async () => {
    if (!shareLink) return;
    const token = shareLink.split("/").pop();
    await supabase.from("share_links").delete().eq("token", token);
    setShareLink("");
    setShareErr("");
  };

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

  // ── URL sync with browser history ──────────────────────
  useEffect(() => {
    const path = window.location.pathname;
    if (screen === "detail" && detWork?.id) {
      if (path !== `/item/${detWork.id}`)
        window.history.replaceState(null, "", `/item/${detWork.id}`);
    } else if (screen === "gallery" && path.startsWith("/item/")) {
      window.history.replaceState(null, "", "/");
    }
  }, [screen, detWork?.id]);

  // ── Handle browser back/forward ────────────────────────
  useEffect(() => {
    const handler = () => {
      const m = window.location.pathname.match(/^\/item\/([\w-]+)$/);
      if (m) {
        const id = m[1];
        const w = works.find(x => x.id === id);
        if (w) openDetail(w);
      } else if (screen === "detail") {
        goGallery();
      }
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [screen, works]);

  // ── Direct navigation to /item/:id ─────────────────────
  useEffect(() => {
    if (authLoading || loading || !session) return;
    const m = window.location.pathname.match(/^\/item\/([\w-]+)$/);
    if (!m) return;
    const id = m[1];
    const w = works.find(x => x.id === id);
    if (w) {
      openDetail(w);
    } else if (!loading) {
      supabase.from("artworks").select("*").eq("id", id).single().then(({ data, error }) => {
        if (data && !error) openDetail(data);
      });
    }
  }, [session, authLoading, loading, works]);

  // ── Navigation ───────────────────────────────────────────────
  const goGallery = () => { setScreen("gallery"); setMenuOpen(false); };
  const navigateDetail = dir => {
    const target = dir === -1 ? prevWork : nextWork;
    if (target) openDetail(target);
  };

  const confirmCrop = async () => {
    const cr = cropRectRef.current;
    if (!cr || cr.w < 10 || cr.h < 10) return;
    try {
      const resp = await fetch(fullscreenPhoto);
      const blob = await resp.blob();
      const img = new Image();
      img.src = URL.createObjectURL(blob);
      await img.decode();
      const cv = document.createElement("canvas");
      cv.width = Math.round(cr.w);
      cv.height = Math.round(cr.h);
      const ctx = cv.getContext("2d");
      ctx.drawImage(img, cr.x, cr.y, cr.w, cr.h, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(img.src);
      const dataUrl = cv.toDataURL("image/jpeg", 0.78);
      const photo = dPhotos[pIdx];
      if (!photo) return;
      const ext = photo.name.match(/\.\w+$/)?.[0] || ".jpg";
      const newPath = `photos/${session.user.id}/${detWork.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
      const file = dataURLToFile(dataUrl, photo.name);
      const { error: upErr } = await supabase.storage.from("artwork-photos").upload(newPath, file, { upsert: true });
      if (upErr) throw upErr;
      await supabase.storage.from("artwork-photos").remove([photo.path]);
      const newPhotos = detWork.photos.map((p, i) => i === pIdx ? { ...p, path: newPath } : p);
      const { error: dbErr } = await supabase.from("artworks").update({ photos: newPhotos }).eq("id", detWork.id);
      if (dbErr) throw dbErr;
      const newUrl = photoURL(newPath);
      setDPhotos(prev => prev.map((p, i) => i === pIdx ? { ...p, path: newPath, url: newUrl } : p));
      setDetWork(prev => ({ ...prev, photos: newPhotos }));
      setWorks(prev => prev.map(w => w.id === detWork.id ? { ...w, photos: newPhotos } : w));
      setFullscreenPhoto(newUrl);
      setCropMode(false);
      setCropRect(null);
      cropRectRef.current = null; dragRef.current = false; cropActionRef.current = null;
    } catch (err) {
      console.error("Crop error:", err);
    }
  };

  // ── Crop drag (document-level) ─────────────────────────────────
  useEffect(() => {
    if (!cropMode) return;
    const onMove = e => {
      if (!dragRef.current || !cropRectRef.current) return;
      const img = cropImgRef.current;
      if (!img) return;
      const c = imgCoords(e);
      if (cropActionRef.current === "move") {
        setCropRect(prev => {
          const next = { x: c.x - cropOffRef.current.dx, y: c.y - cropOffRef.current.dy, w: prev.w, h: prev.h };
          cropRectRef.current = next;
          return next;
        });
      } else {
        setCropRect(prev => {
          const next = { ...prev, w: c.x - prev.x, h: c.y - prev.y };
          cropRectRef.current = next;
          return next;
        });
      }
    };
    const onUp = e => {
      if (!dragRef.current || !cropRectRef.current) { dragRef.current = false; return; }
      dragRef.current = false;
      cropActionRef.current = null;
      const cr = cropRectRef.current;
      let { x, y, w, h } = cr;
      if (Math.abs(w) < 10 || Math.abs(h) < 10) { setCropRect(null); cropRectRef.current = null; return; }
      if (w < 0) { x += w; w = -w; }
      if (h < 0) { y += h; h = -h; }
      const next = { x, y, w, h };
      cropRectRef.current = next;
      setCropRect(next);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, [cropMode, imgCoords]);

  // ── ESC key ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = e => {
      if (e.key === "Escape") {
        if (cropMode) { setCropMode(false); setCropRect(null); cropRectRef.current = null; dragRef.current = false; cropActionRef.current = null; }
        else if (fullscreenPhoto) setFullscreenPhoto(null);
        else if (screen === "detail") goGallery();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [screen, fullscreenPhoto, cropMode]);

  const openAdd = () => {
    setEditWork(null); setForm(BLANK); setFormTab("info");
    setFPhotos([]); setFExp(null); setFAtt(null); setFTags([]); setFileErr("");
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

    setFTags(w.tags || []);

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
        tags: fTags,
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
      setFileErr(t("form.err_prefix") + err.message);
    }
  };

  // ── Cmd/Ctrl+S save shortcut ───────────────────────────────
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  useEffect(() => {
    const handler = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s" && screenRef.current === "form") {
        e.preventDefault();
        handleSaveRef.current();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── E key → edit detail ─────────────────────────────────────
  const detWorkRef = useRef(detWork);
  detWorkRef.current = detWork;
  const openEditRef = useRef(openEdit);
  openEditRef.current = openEdit;
  useEffect(() => {
    const handler = e => {
      if ((e.key === "e" || e.key === "E") && screenRef.current === "detail" && detWorkRef.current) {
        openEditRef.current(detWorkRef.current);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── ESC → return from edit to detail ─────────────────────────
  const editWorkRef = useRef(editWork);
  editWorkRef.current = editWork;
  const openDetailRef = useRef(openDetail);
  openDetailRef.current = openDetail;
  const goGalleryRef = useRef(goGallery);
  goGalleryRef.current = goGallery;
  useEffect(() => {
    const handler = e => {
      if (e.key === "Escape" && screenRef.current === "form") {
        if (editWorkRef.current) {
          openDetailRef.current(editWorkRef.current);
        } else {
          goGalleryRef.current();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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
      setFileErr(t("form.err_upload") + err.message);
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
      setFileErr(t("form.err_export") + err.message);
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
      setFileErr(t("form.err_export_pdf") + err.message);
    }
    setPdfLoading(false);
  };

  // ── Export XLS ──────────────────────────────────────────────────
  const handleExportXLS = async () => {
    if (!works.length) return;
    setXlsLoading(true);
    try {
      const XLSX = await import("xlsx");
      const xlsLocale = currency === "USD" ? "en-US" : currency === "CNY" ? "zh-CN" : "fr-FR";
      const rows = works.map(w => ({
        [t("xls.col_artist")]: w.artist,
        [t("xls.col_title")]: w.title,
        [t("xls.col_technique")]: w.technique || "",
        [t("xls.col_edition")]: w.edition || "",
        [t("xls.col_date")]: w.date_work || "",
        [t("xls.col_location")]: w.location_storage || "",
        [t("xls.col_width")]: w.width || "",
        [t("xls.col_height")]: w.height || "",
        [t("xls.col_depth")]: w.depth || "",
        [t("xls.col_unit")]: w.dimension_unit || "cm",
        [t("xls.col_purchase_date")]: w.date_purchase || "",
        [t("xls.col_purchase_loc")]: w.location_purchase || "",
        [t("xls.col_purchase_value")]: w.value_purchase || "",
        [t("xls.col_current_value")]: w.value_current || "",
        [t("xls.col_insured")]: w.is_insured ? t("xls.yes") : t("xls.no"),
        [t("xls.col_notes")]: w.notes || "",
        [t("xls.col_created")]: w.created_at ? new Date(w.created_at).toLocaleDateString(xlsLocale) : "",
        [t("xls.col_photos")]: w.photos?.length || 0,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t("xls.sheet_name"));
      const colWidths = Object.keys(rows[0] || {}).map(k => ({ wch: 22 }));
      ws["!cols"] = colWidths;
      XLSX.writeFile(wb, `ArtVault_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      setFileErr(t("form.err_export_xls") + err.message);
    }
    setXlsLoading(false);
  };

  // ── Camera ─────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch {
      cameraRef.current?.click();
    }
  };

  const captureFromCamera = () => {
    const video = videoRef.current;
    if (!video) return;
    const cv = document.createElement("canvas");
    cv.width = video.videoWidth;
    cv.height = video.videoHeight;
    cv.getContext("2d").drawImage(video, 0, 0);
    const data = cv.toDataURL("image/jpeg", 0.78);
    stopCamera();
    setFPhotos(p => [...p, { data, name: `camera_${Date.now()}.jpg`, _temp: true }]);
  };

  const removeFormPhoto = i => setFPhotos(p => p.filter((_, j) => j !== i));

  const addPhoto = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setFPhotos(p => [...p, { data: ev.target.result, name: file.name, _temp: true }]);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
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
    if (selectedTags.length) {
      const wt = w.tags || [];
      if (!selectedTags.every(t => wt.includes(t))) return false;
    }
    if (!search) return true;
    const q = search.toLowerCase();
    return [w.title, w.artist, w.technique, w.edition, w.location_storage, w.location_purchase]
      .concat(w.tags?.map(t => " " + t) || [])
      .some(f => f?.toLowerCase().includes(q));
  }).sort((a, b) => {
    let va = a[sortField] ?? "", vb = b[sortField] ?? "";
    if (sortField === "value_current" || sortField === "value_purchase") {
      return sortDir === "asc" ? (+va || 0) - (+vb || 0) : (+vb || 0) - (+va || 0);
    }
    if (typeof va === "string") { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });

  const workIndex = filtered.findIndex(w => w.id === detWork?.id);
  const prevWork = workIndex > 0 ? filtered[workIndex - 1] : null;
  const nextWork = workIndex < filtered.length - 1 ? filtered[workIndex + 1] : null;

  const toggleSort = f => {
    if (sortField === f) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(f); setSortDir("asc"); }
  };

  // ── Statistics ────────────────────────────────────────────────
  const totalCurrent = works.reduce((s, w) => s + (+w.value_current || +w.value_purchase || 0), 0);
  const insuredCount = works.filter(w => w.is_insured).length;

  // ── Auth guard ─────────────────────────────────────────────────
  const wrap = children => (
    <ThemeContext.Provider value={T}>
      <I18nContext.Provider value={{ t, lang, setLang, currency, setCurrency, fmt, fmtLocale, formatCurrency }}>
        {children}
      </I18nContext.Provider>
    </ThemeContext.Provider>
  );

  if (authLoading) {
    return wrap(
      <div style={{ background: T.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>
        <div style={{ color: T.cyan, fontStyle: "italic", letterSpacing: "0.1em" }}>Chargement…</div>
      </div>
    );
  }

  if (!session) {
    return wrap(<Auth />);
  }

  // ── Render ────────────────────────────────────────────────────
  if (shareToken) return <ShareView data={shareData} />;
  return wrap(
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
        .menu-item:hover { background: ${T.s3} !important; }
        @media (max-width: 768px) { .menu-hamburger { position: fixed !important; top: 58px !important; left: 0 !important; right: 0 !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; } }
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
              {works.length} {t(works.length === 1 ? "nav.works" : "nav.works_plural")} · {fmt(totalCurrent)}
            </span>
          )}
          {screen === "detail" && detWork && (
            <span style={{ color: T.dim, fontSize: "0.9rem", fontStyle: "italic" }}>
              {detWork.title}
            </span>
          )}
          {screen === "form" && (
            <span style={{ color: T.dim, fontSize: "0.9rem" }}>
              {t(editWork ? "nav.edit_work" : "nav.new_work")}
            </span>
          )}
        </div>

        {/* ── RIGHT NAV ─────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
            </>
          )}
          {screen === "detail" && (
            <>
              <Btn variant="outline" onClick={() => openEdit(detWork)} sx={{ padding: "6px 14px" }} className="desk-only">
                <Edit2 size={14} /> {t("menu.edit")}
              </Btn>
              <button className="ghost-btn" onClick={() => setDelModal(true)}
                style={{ background: "none", border: "none", color: T.red, cursor: "pointer", padding: 6, display: "flex", transition: "opacity 0.2s" }}>
                <Trash2 size={18} />
              </button>
            </>
          )}
          {screen === "form" && (
            <Btn variant="primary" onClick={handleSave} disabled={saving} sx={{ padding: "8px 20px" }}>
              <Save size={14} /> {saving ? t("form.save_saving") : t(editWork ? "form.save_update" : "form.save_create")}
            </Btn>
          )}

          {/* ── HAMBURGER ───────────────────────────────────── */}
          {screen !== "form" && <div style={{ position: "relative" }}>
            <button onClick={() => setMenuOpen(o => !o)}
              style={{ background: "none", border: "none", color: T.cream, cursor: "pointer", padding: 6, display: "flex" }}>
              <Menu size={22} />
            </button>

            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 98 }} />
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 99,
                  background: T.s1, border: `1px solid ${T.border}`, borderRadius: 6,
                  padding: 6, minWidth: 210,
                  display: "flex", flexDirection: "column", gap: 2,
                }}
                  className="menu-hamburger">
                  {screen === "gallery" && (
                    <>
                      <button className="ghost-btn menu-item" onClick={() => { handleExportPDF(); setMenuOpen(false); }} disabled={pdfLoading || works.length === 0}
                        style={{ background: "none", border: "none", color: T.dim, cursor: pdfLoading || works.length === 0 ? "not-allowed" : "pointer", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit", fontSize: "0.9rem", borderRadius: 4, opacity: pdfLoading || works.length === 0 ? 0.5 : 1 }}>
                        <FileText size={16} /> {t("menu.export_pdf")}
                      </button>
                      <button className="ghost-btn menu-item" onClick={() => { handleExport(); setMenuOpen(false); }} disabled={exporting || works.length === 0}
                        style={{ background: "none", border: "none", color: T.dim, cursor: exporting || works.length === 0 ? "not-allowed" : "pointer", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit", fontSize: "0.9rem", borderRadius: 4, opacity: exporting || works.length === 0 ? 0.5 : 1 }}>
                        <Archive size={16} /> {t("menu.export_zip")}
                      </button>
                      <button className="ghost-btn menu-item" onClick={() => { handleExportXLS(); setMenuOpen(false); }} disabled={xlsLoading || works.length === 0}
                        style={{ background: "none", border: "none", color: T.dim, cursor: xlsLoading || works.length === 0 ? "not-allowed" : "pointer", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit", fontSize: "0.9rem", borderRadius: 4, opacity: xlsLoading || works.length === 0 ? 0.5 : 1 }}>
                        <FileSpreadsheet size={16} /> {t("menu.export_xls")}
                      </button>
                      <div style={{ height: 1, background: T.border, margin: "3px 8px" }} />
                      <button className="ghost-btn menu-item" onClick={() => { if (deferredPrompt) { handleInstall(); } else { handleInstallIOS(); } setMenuOpen(false); }}
                        style={{ background: "none", border: "none", color: T.accent, cursor: "pointer", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit", fontSize: "0.9rem", borderRadius: 4 }}>
                        <Download size={16} /> {t("menu.install_app")}
                      </button>
                      <button className="ghost-btn menu-item" onClick={() => { setShareDialog(true); setMenuOpen(false); }}
                        style={{ background: "none", border: "none", color: T.dim, cursor: "pointer", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit", fontSize: "0.9rem", borderRadius: 4 }}>
                        <Share2 size={16} /> {t("menu.share")}
                      </button>
                      <button className="ghost-btn menu-item" onClick={() => { setPrefPanel(true); setMenuOpen(false); }}
                        style={{ background: "none", border: "none", color: T.dim, cursor: "pointer", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit", fontSize: "0.9rem", borderRadius: 4 }}>
                        <Settings size={16} /> {t("menu.preferences")}
                      </button>
                      <div style={{ height: 1, background: T.border, margin: "3px 8px" }} />
                      <button className="ghost-btn menu-item" onClick={() => { handleLogout(); setMenuOpen(false); }}
                        style={{ background: "none", border: "none", color: T.red, cursor: "pointer", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit", fontSize: "0.9rem", borderRadius: 4 }}>
                        <LogOut size={16} /> {t("menu.logout")}
                      </button>
                    </>
                  )}
                  {screen === "detail" && (
                    <>
                      <button className="ghost-btn menu-item" onClick={() => { openEdit(detWork); setMenuOpen(false); }}
                        style={{ background: "none", border: "none", color: T.dim, cursor: "pointer", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit", fontSize: "0.9rem", borderRadius: 4 }}>
                        <Edit2 size={16} /> {t("menu.edit")}
                      </button>
                      <button className="ghost-btn menu-item" onClick={() => { setDelModal(true); setMenuOpen(false); }}
                        style={{ background: "none", border: "none", color: T.red, cursor: "pointer", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit", fontSize: "0.9rem", borderRadius: 4 }}>
                        <Trash2 size={16} /> {t("menu.delete")}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>}
        </div>
      </nav>

      {/* ── SEARCH / SORT BAR ────────────────────────────────── */}
      {screen === "gallery" && (
        <div style={{ background: T.s1, borderBottom: `1px solid ${T.border}` }}>
          <div style={{ padding: "10px 20px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 160, maxWidth: 380, position: "relative", display: "flex", alignItems: "center" }}>
              <Search size={17} style={{ position: "absolute", left: 10, color: T.dim, pointerEvents: "none" }} />
              <input
                placeholder={t("search.placeholder")}
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
              {[["artist","sort.artist"],["title","sort.title"],["value_current","sort.value"],["value_purchase","sort.value_purchase"],["location_storage","sort.location"],["is_insured","sort.insured"],["tags","sort.tags"]].map(([f, k]) => (
                <button key={f} onClick={() => f === "tags" ? setShowTagFilter(s => !s) : toggleSort(f)} className="ghost-btn"
                  style={{ background: "none", border: `1px solid ${f === "tags" && showTagFilter ? T.accent : sortField === f ? T.cyan : T.border}`, color: f === "tags" && showTagFilter ? T.accent : sortField === f ? T.cyan : T.dim, borderRadius: 3, padding: "5px 10px", fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, transition: "all 0.18s" }}>
                  {t(k)}
                  {f === "tags" && selectedTags.length > 0 && (
                    <span style={{ background: T.accent, color: T.bg, fontSize: "0.65rem", fontWeight: 700, borderRadius: 8, padding: "1px 6px", lineHeight: "1.4" }}>{selectedTags.length}</span>
                  )}
                  {f !== "tags" && sortField === f && (sortDir === "asc" ? <SortAsc size={12} /> : <SortDesc size={12} />)}
                </button>
              ))}
            </div>
            {(exporting || pdfLoading || xlsLoading) && (
              <span style={{ color: T.accent, fontSize: "0.82rem", fontStyle: "italic" }}>
                {pdfLoading ? t("export_pdf.loading") : xlsLoading ? t("export_xls.loading") : t("export_zip.loading")}
              </span>
            )}
          </div>

          {showTagFilter && (() => {
            const allTags = [...new Set(works.flatMap(w => w.tags || []))];
            if (!allTags.length) return null;
            return (
              <div style={{ padding: "0 20px 10px 20px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ color: T.dim, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                  <Tag size={13} /> {t("tags_label")}
                </span>
                {allTags.map(t => {
                  const active = selectedTags.includes(t);
                  return (
                    <button key={t} onClick={() => setSelectedTags(ts => active ? ts.filter(x => x !== t) : [...ts, t])}
                      style={{ background: active ? T.accent : T.s3, border: `1px solid ${active ? T.accent : T.border}`, color: active ? T.bg : T.dim, borderRadius: 12, padding: "3px 10px", fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                      {t}
                    </button>
                  );
                })}
                {!!selectedTags.length && (
                  <button onClick={() => setSelectedTags([])}
                    style={{ background: "none", border: "none", color: T.dim, fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", padding: 2, opacity: 0.6 }}>
                    {t("tags_clear")}
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── LOADING ──────────────────────────────────────────── */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 100, color: T.accent, fontStyle: "italic", letterSpacing: "0.1em" }}>
          {t("loading_collection")}
        </div>
      )}

      {/* ── GALLERY ──────────────────────────────────────────── */}
      {!loading && screen === "gallery" && gridMode && (
        <div style={{ padding: "24px 20px", maxWidth: 1280, margin: "0 auto" }}>
          {works.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { key: "stats.works", value: works.length, icon: <ImageIcon size={16} /> },
                { key: "stats.total_value", value: fmt(totalCurrent), icon: <Euro size={16} /> },
                { key: "stats.insured", value: `${insuredCount} / ${works.length}`, icon: <Shield size={16} /> },
                { key: "stats.artists", value: new Set(works.map(w => w.artist).filter(Boolean)).size, icon: <Tag size={16} /> },
              ].map(({ key, value, icon }) => (
                <div key={key} style={{ background: T.s2, border: `1px solid ${key === "stats.total_value" ? T.cyan + "60" : T.border}`, borderLeft: `3px solid ${key === "stats.total_value" ? T.cyan : "transparent"}`, borderRadius: 6, padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.dim, fontSize: "0.78rem", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {icon} {t(key)}
                  </div>
                  <div style={{ fontSize: "1.15rem", color: T.cream }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", paddingTop: 80, color: T.dim, fontStyle: "italic", fontSize: "1.05rem" }}>
              {works.length === 0 ? t("gallery.empty") : t("gallery.no_results")}
            </div>
          ) : (
            <div className="resp-gallery" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
              {filtered.map(w => (
                <div key={w.id} className="art-card" onClick={() => openDetail(w)}
                  style={{ background: T.s2, border: `1px solid ${T.border}`, borderRadius: 6, overflow: "hidden", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                  <div style={{ aspectRatio: "4/3", background: T.s3, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {thumbs[w.id]
                      ? <img src={thumbs[w.id]} alt={w.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: T.s3, color: T.border, fontSize: 28, fontWeight: 600, fontFamily: "system-ui, sans-serif", letterSpacing: 4 }}>AV</div>
                    }
                  </div>
                  <div style={{ padding: "14px 15px" }}>
                    <div style={{ fontSize: "1.15rem", color: T.cream, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {w.title || t("gallery.untitled")}
                    </div>
                    <div style={{ color: T.dim, fontSize: "0.88rem", marginBottom: 8, fontStyle: "italic" }}>{w.artist || t("gallery.unknown_artist")}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: T.accent, fontSize: "0.9rem" }}>
                        {fmt(w.value_current || w.value_purchase)}
                      </span>
                      <span style={{ color: w.is_insured ? T.green : T.dim2, fontSize: "0.78rem", display: "flex", alignItems: "center", gap: 3 }}>
                        {w.is_insured ? <><CheckCircle2 size={12} /> {t("gallery.insured")}</> : <><ShieldOff size={12} /></>}
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
              {works.length === 0 ? t("list_view.empty") : t("gallery.no_results")}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.accent}40` }}>
                  <th style={{ width: 48, padding: "10px 12px 10px 4px" }}></th>
                  {[
                    ["artist","xls.col_artist"], ["title","xls.col_title"], ["technique","table_header.technique"],
                    ["edition","table_header.edition"], ["date_work","table_header.date"], ["location_storage","table_header.location"],
                    ["value_purchase","table_header.purchase"], ["value_current","table_header.current_value"], ["is_insured","table_header.insured_short"]
                  ].map(([f, k]) => (
                    <th key={f} onClick={() => toggleSort(f)}
                      className={["technique","edition","date_work","location_storage","value_purchase","is_insured"].includes(f) ? "tb-hide" : ""}
                      style={{ textAlign: "left", padding: "10px 12px", color: sortField === f ? T.accent : T.dim, fontWeight: 400, letterSpacing: "0.07em", textTransform: "uppercase", fontSize: "0.75rem", cursor: "pointer", whiteSpace: "nowrap", userSelect: "none" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {t(k)} {sortField === f && (sortDir === "asc" ? "↑" : "↓")}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                  {filtered.map((w, i) => (
                    <tr key={w.id} className="row-hover" onClick={() => openDetail(w)}
                      style={{ borderBottom: `1px solid ${T.border}`, cursor: "pointer", background: i % 2 === 0 ? "transparent" : T.s1, transition: "background 0.15s" }}>
                      <td style={{ padding: "8px 12px 8px 4px", width: 48 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 4, overflow: "hidden", background: T.s3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {thumbs[w.id]
                            ? <img src={thumbs[w.id]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: T.s3, color: T.border, fontSize: 15, fontWeight: 600, fontFamily: "system-ui, sans-serif", letterSpacing: 2 }}>AV</div>
                          }
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", color: T.cream, fontStyle: "italic" }}>{w.artist || "—"}</td>
                    <td style={{ padding: "10px 12px" }}>{w.title || "—"}</td>
                    <td className="tb-hide" style={{ padding: "10px 12px", color: T.dim }}>{w.technique || "—"}</td>
                    <td className="tb-hide" style={{ padding: "10px 12px", color: T.dim }}>{w.edition || "—"}</td>
                    <td className="tb-hide" style={{ padding: "10px 12px", color: T.dim }}>{w.date_work || "—"}</td>
                    <td className="tb-hide" style={{ padding: "10px 12px", color: T.dim }}>{w.location_storage || "—"}</td>
                    <td className="tb-hide" style={{ padding: "10px 12px", color: T.dim }}>{fmt(w.value_purchase)}</td>
                    <td style={{ padding: "10px 12px", color: T.accent }}>{fmt(w.value_current)}</td>
                    <td className="tb-hide" style={{ padding: "10px 12px", textAlign: "center" }}>
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
            {[["info","form.tab_infos"],["photos","form.tab_photos"],["finance","form.tab_finance"],["dims","form.tab_dims"],["docs","form.tab_docs"]].map(([tab, key]) => (
              <button key={tab} className="tab-btn" onClick={() => setFormTab(tab)}
                style={{ background: "none", border: "none", borderBottom: `2px solid ${formTab === tab ? T.cyan : "transparent"}`, color: formTab === tab ? T.cyan : T.dim, padding: "10px 20px", fontSize: "0.88rem", letterSpacing: "0.07em", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "color 0.18s" }}>
                {t(key)}
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
                <Field label={t("form.title_label")}>
                  <Input value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder={t("form.title_placeholder")} />
                </Field>
                <Field label={t("form.artist_label")}>
                  <Input value={form.artist} onChange={v => setForm(f => ({ ...f, artist: v }))} placeholder={t("form.artist_placeholder")} />
                </Field>
              </div>
              <div className="resp-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label={t("form.technique_label")}>
                  <Input value={form.technique} onChange={v => setForm(f => ({ ...f, technique: v }))} placeholder={t("form.technique_placeholder")} />
                </Field>
                <Field label={t("form.edition_label")}>
                  <Input value={form.edition} onChange={v => setForm(f => ({ ...f, edition: v }))} placeholder={t("form.edition_placeholder")} />
                </Field>
              </div>
              <div className="resp-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
                <Field label={t("form.date_label")}>
                  <Input value={form.dateWork} onChange={v => setForm(f => ({ ...f, dateWork: v }))} placeholder={t("form.date_placeholder")} />
                </Field>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: form.isInsured ? T.s2 : T.s3, border: `1px solid ${form.isInsured ? T.accent : T.border}`, borderRadius: 4, cursor: "pointer", transition: "all 0.18s", marginTop: 22 }}
                  onClick={() => setForm(f => ({ ...f, isInsured: !f.isInsured }))}>
                  {form.isInsured
                    ? <CheckCircle2 size={20} color={T.accent} />
                    : <Circle size={20} color={T.dim2} />}
                  <span style={{ fontSize: "0.95rem", userSelect: "none", color: form.isInsured ? T.accent : T.cream }}>{t("form.insured_label")}</span>
                  {form.isInsured && <span style={{ marginLeft: "auto", color: T.accent, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 4 }}><Shield size={14} /> {t("form.insured_badge")}</span>}
                </div>
              </div>
              <Field label={t("form.location_label")}>
                <Input value={form.locationStorage} onChange={v => setForm(f => ({ ...f, locationStorage: v }))} placeholder={t("form.location_placeholder")} />
              </Field>
              <Field label={t("form.tags_label")}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 10px", background: T.s3, border: `1px solid ${T.border}`, borderRadius: 4, minHeight: 40, alignItems: "center" }}>
                  {fTags.map(t => (
                    <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: T.s2, color: T.cream, fontSize: "0.82rem", padding: "2px 8px", borderRadius: 12, border: `1px solid ${T.border}` }}>
                      {t}
                      <button onClick={() => setFTags(ts => ts.filter(x => x !== t))} style={{ background: "none", border: "none", color: T.dim, cursor: "pointer", display: "flex", padding: 0, fontSize: "1rem", lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                  <input
                    placeholder={fTags.length ? t("form.tags_add_placeholder") : t("form.tags_first_placeholder")}
                    style={{ flex: 1, minWidth: 120, background: "none", border: "none", color: T.cream, fontSize: "0.88rem", fontFamily: "inherit", outline: "none" }}
                    onKeyDown={e => {
                      if ((e.key === "Enter" || e.key === ",") && e.target.value.trim()) {
                        e.preventDefault();
                        const v = e.target.value.trim().replace(/,+$/, "");
                        if (v && !fTags.includes(v)) setFTags(ts => [...ts, v]);
                        e.target.value = "";
                      }
                    }}
                  />
                </div>
              </Field>
              <Field label={t("form.notes_label")}>
                <Textarea value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} placeholder={t("form.notes_placeholder")} />
              </Field>
            </div>
          )}

          {/* ── Tab: Dimensions ──────────────────────────────── */}
          {formTab === "dims" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div className="resp-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                <Field label={t("form.width_label")}><Input value={form.width} onChange={v => setForm(f => ({ ...f, width: v }))} type="number" placeholder="0" /></Field>
                <Field label={t("form.height_label")}><Input value={form.height} onChange={v => setForm(f => ({ ...f, height: v }))} type="number" placeholder="0" /></Field>
                <Field label={t("form.depth_label")}><Input value={form.depth} onChange={v => setForm(f => ({ ...f, depth: v }))} type="number" placeholder={t("form.depth_placeholder")} /></Field>
              </div>
              <Field label={t("form.unit_label")}>
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
              <Field label={t("form.purchase_date_label")}>
                <Input value={form.datePurchase} onChange={v => setForm(f => ({ ...f, datePurchase: v }))} type="date" />
              </Field>
              <Field label={t("form.purchase_location_label")}>
                <Input value={form.locationPurchase} onChange={v => setForm(f => ({ ...f, locationPurchase: v }))} placeholder={t("form.purchase_location_placeholder")} />
              </Field>
              <div className="resp-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label={`${t("form.purchase_value_label")} (${currency})`}>
                  <Input value={form.valuePurchase} onChange={v => setForm(f => ({ ...f, valuePurchase: v }))} type="number" placeholder="0" />
                </Field>
                <Field label={`${t("form.current_value_label")} (${currency})`}>
                  <Input value={form.valueCurrent} onChange={v => setForm(f => ({ ...f, valueCurrent: v }))} type="number" placeholder="0" />
                </Field>
              </div>
              {form.valuePurchase && form.valueCurrent && +form.valuePurchase > 0 && (
                <div style={{ background: T.s3, border: `1px solid ${T.border}`, borderRadius: 4, padding: "14px 16px" }}>
                  <Label>{t("form.value_evolution")}</Label>
                  {(() => {
                    const pct = ((+form.valueCurrent - +form.valuePurchase) / +form.valuePurchase * 100).toFixed(1);
                    const diff = +form.valueCurrent - +form.valuePurchase;
                    const isUp = diff >= 0;
                    return (
                      <div style={{ color: isUp ? T.green : T.red, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: 8 }}>
                        {isUp ? "▲" : "▼"} {Math.abs(pct)}% {t(isUp ? "form.gain" : "form.loss")}
                        <span style={{ color: T.dim, fontSize: "0.88rem" }}>({isUp ? "+" : ""}{fmt(diff)})</span>
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
                  <span style={{ color: T.cream, fontSize: "0.9rem" }}>{t("form.doc_expertise")}</span>
                </div>
                {fExp ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <FileText size={16} color={T.dim} />
                    <span style={{ flex: 1, color: T.cream, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.9rem" }}>{fExp.name}</span>
                    <a href={fExp._saved ? fExp.url : fExp.data} download={fExp.name} target="_blank" rel="noreferrer"
                      style={{ color: T.accent, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 4 }}><Download size={13} /> {t("form.doc_open")}</a>
                    <button onClick={() => setFExp(null)} style={{ background: "none", border: "none", color: T.red, cursor: "pointer", display: "flex" }}><X size={16} /></button>
                  </div>
                ) : (
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", color: T.dim, fontSize: "0.88rem", border: `1px dashed ${T.border}`, borderRadius: 4, padding: "10px 16px", transition: "border-color 0.2s, color 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.dim; }}>
                    <Plus size={15} /> {t("form.doc_upload")}
                    <input ref={expRef} type="file" accept=".pdf,application/pdf" style={{ display: "none" }} onChange={e => addPDF(e, setFExp)} />
                  </label>
                )}
              </div>

              <div style={{ background: T.s2, border: `1px solid ${T.border}`, borderRadius: 6, padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <FileText size={16} color={T.accent} />
                  <span style={{ color: T.cream, fontSize: "0.9rem" }}>{t("form.doc_certificate")}</span>
                </div>
                {fAtt ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <FileText size={16} color={T.dim} />
                    <span style={{ flex: 1, color: T.cream, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.9rem" }}>{fAtt.name}</span>
                    <a href={fAtt._saved ? fAtt.url : fAtt.data} download={fAtt.name} target="_blank" rel="noreferrer"
                      style={{ color: T.accent, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 4 }}><Download size={13} /> {t("form.doc_open")}</a>
                    <button onClick={() => setFAtt(null)} style={{ background: "none", border: "none", color: T.red, cursor: "pointer", display: "flex" }}><X size={16} /></button>
                  </div>
                ) : (
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", color: T.dim, fontSize: "0.88rem", border: `1px dashed ${T.border}`, borderRadius: 4, padding: "10px 16px", transition: "border-color 0.2s, color 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.dim; }}>
                    <Plus size={15} /> {t("form.doc_upload")}
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
                {t("form.photos_count", { n: fPhotos.length })}
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
                        {t("form.photos_primary")}
                      </span>
                    )}
                  </div>
                ))}
                {fPhotos.length < 5 && (
                  <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, marginTop: 4 }}>
                    <div onClick={startCamera}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 16px", background: T.s3, border: `2px dashed ${T.border}`, borderRadius: 6, cursor: "pointer", color: T.dim, fontSize: "0.88rem", transition: "border-color 0.2s, color 0.2s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.dim; }}>
                      <Camera size={18} />
                      <span>{t("form.photos_take")}</span>
                    </div>
                    <label style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 16px", background: T.s3, border: `2px dashed ${T.border}`, borderRadius: 6, cursor: "pointer", color: T.dim, fontSize: "0.88rem", transition: "border-color 0.2s, color 0.2s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.dim; }}>
                      <ImageIcon size={18} />
                      <span>{t("form.photos_gallery")}</span>
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <h2 onClick={goGallery} style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "2rem", fontWeight: 500, color: T.cream, lineHeight: 1.2, cursor: "pointer" }}>
                {detWork.title || t("detail.untitled")}
              </h2>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button onClick={() => navigateDetail(-1)} disabled={!prevWork}
                  style={{ background: "none", border: `1px solid ${prevWork ? T.border : "transparent"}`, color: prevWork ? T.dim : T.border, borderRadius: 4, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: prevWork ? "pointer" : "default", fontFamily: "inherit", fontSize: "1rem", transition: "all 0.15s", opacity: prevWork ? 1 : 0.3 }}>
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => navigateDetail(1)} disabled={!nextWork}
                  style={{ background: "none", border: `1px solid ${nextWork ? T.border : "transparent"}`, color: nextWork ? T.dim : T.border, borderRadius: 4, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: nextWork ? "pointer" : "default", fontFamily: "inherit", fontSize: "1rem", transition: "all 0.15s", opacity: nextWork ? 1 : 0.3 }}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div style={{ color: T.accent, fontSize: "1.15rem", fontStyle: "italic", marginBottom: 10 }}>{detWork.artist}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              {detWork.technique && <span style={{ background: T.s3, border: `1px solid ${T.border}`, color: T.dim, padding: "3px 10px", borderRadius: 12, fontSize: "0.82rem" }}>{detWork.technique}</span>}
              {detWork.edition && <span style={{ color: T.dim, fontSize: "0.88rem" }}>{t("detail.edition")} {detWork.edition}</span>}
              {detWork.date_work && <span style={{ color: T.dim, fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 4 }}><Calendar size={13} /> {detWork.date_work}</span>}
              {detWork.is_insured && (
                <span style={{ background: "#3a805020", border: `1px solid ${T.green}40`, color: T.green, padding: "3px 10px", borderRadius: 12, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle2 size={12} /> {t("detail.insured")}
                </span>
              )}
              {(detWork.tags || []).map(t => (
                <span key={t} style={{ background: T.s2, border: `1px solid ${T.accent}40`, color: T.accent, padding: "3px 10px", borderRadius: 12, fontSize: "0.78rem" }}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {dPhotos.length > 0 ? (
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
          ) : (
            <div style={{ marginBottom: 28, background: T.s2, borderRadius: 8, height: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ color: T.border, fontSize: 40, fontWeight: 600, fontFamily: "system-ui, sans-serif", letterSpacing: 6, opacity: 0.3 }}>AV</div>
            </div>
          )}

          <div className="resp-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
            <div>
              <div style={{ color: T.cyan, fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>{t("detail.section_info")}</div>
              {[
                ["detail.info_location", detWork.location_storage, <MapPin size={13} />],
                ["detail.info_dims", (detWork.width || detWork.height) ? `${detWork.width || "?"}×${detWork.height || "?"}${detWork.depth ? `×${detWork.depth}` : ""} ${detWork.dimension_unit || "cm"}` : null, <Ruler size={13} />],
              ].filter(([, v]) => v).map(([k, v, ico]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.border}30`, gap: 12 }}>
                  <span style={{ color: T.dim, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>{ico}{t(k)}</span>
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
              <div style={{ color: T.cyan, fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>{t("detail.section_finance")}</div>
              {[
                ["detail.finance_date", detWork.date_purchase ? fmtLocale(detWork.date_purchase) : null, <Calendar size={13} />],
                ["detail.finance_location", detWork.location_purchase, <MapPin size={13} />],
                ["detail.finance_purchase_value", detWork.value_purchase ? fmt(detWork.value_purchase) : null, <Euro size={13} />],
                ["detail.finance_current_value", detWork.value_current ? fmt(detWork.value_current) : null, <Euro size={13} />, true],
              ].filter(([, v]) => v).map(([k, v, ico, gold]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.border}30`, gap: 12 }}>
                  <span style={{ color: T.dim, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>{ico}{t(k)}</span>
                  <span style={{ color: gold ? T.accent : T.cream, fontSize: "0.9rem", fontWeight: gold ? 500 : 400 }}>{v}</span>
                </div>
              ))}
              {detWork.value_purchase && detWork.value_current && +detWork.value_purchase > 0 && (() => {
                const pct = ((+detWork.value_current - +detWork.value_purchase) / +detWork.value_purchase * 100).toFixed(1);
                const up = +detWork.value_current >= +detWork.value_purchase;
                return (
                  <div style={{ marginTop: 10, color: up ? T.green : T.red, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: 6 }}>
                    {up ? "▲" : "▼"} {Math.abs(pct)}% {t(up ? "detail.finance_gain" : "detail.finance_loss")}
                  </div>
                );
              })()}
            </div>
          </div>

          {(dExp || dAtt) && (
            <div style={{ marginTop: 8, marginBottom: 24 }}>
              <div style={{ color: T.accent, fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>{t("detail.section_docs")}</div>
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
            <div style={{ fontSize: "1.1rem", marginBottom: 10, fontFamily: "'Playfair Display', Georgia, serif" }}>{t("delete.title")}</div>
            <div style={{ color: T.dim, fontSize: "0.88rem", marginBottom: 26, lineHeight: 1.6 }}>
              « {detWork?.title} » — {detWork?.artist}<br />
              <span style={{ color: T.red }}>{t("delete.irreversible")}</span>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Btn variant="outline" onClick={() => setDelModal(false)}>{t("delete.cancel")}</Btn>
              <Btn variant="danger" onClick={handleDelete} sx={{ background: "#b0353520" }}>
                <Trash2 size={14} /> {t("delete.confirm")}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── FULLSCREEN PHOTO ─────────────────────────────────── */}
      {fullscreenPhoto && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}
          onClick={() => { if (!cropMode) setFullscreenPhoto(null); }}>
          {/* Top bar */}
          <div style={{ position: "absolute", top: 14, right: 14, display: "flex", gap: 8, zIndex: 501 }}>
            {!cropMode && (
              <button onClick={e => { e.stopPropagation(); setCropMode(true); setCropRect(null); cropRectRef.current = null; }}
                style={{ background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", width: 36, height: 36, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CropIcon size={18} />
              </button>
            )}
            <button onClick={() => { setFullscreenPhoto(null); setCropMode(false); setCropRect(null); cropRectRef.current = null; dragRef.current = false; cropActionRef.current = null; }}
              style={{ background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", width: 36, height: 36, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={20} />
            </button>
          </div>
          {/* Crop confirm bar */}
          {cropMode && (
            <div style={{ position: "absolute", bottom: 30, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12, zIndex: 501 }}>
              <button onClick={e => { e.stopPropagation(); confirmCrop(); }}
                style={{ background: "#3fc1c9", border: "none", color: "#122c44", padding: "8px 20px", borderRadius: 4, cursor: "pointer", fontFamily: "inherit", fontSize: "0.9rem", fontWeight: 600, opacity: cropRect && cropRect.w >= 10 ? 1 : 0.5 }}>
                ✓ {t("crop.confirm")}
              </button>
              <button onClick={e => { e.stopPropagation(); setCropMode(false); setCropRect(null); cropRectRef.current = null; dragRef.current = false; cropActionRef.current = null; }}
                style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "8px 20px", borderRadius: 4, cursor: "pointer", fontFamily: "inherit", fontSize: "0.9rem" }}>
                ✕ {t("crop.cancel")}
              </button>
            </div>
          )}
          {/* Image + crop overlay */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", maxWidth: "95vw", maxHeight: "95vh" }}>
            <img ref={cropImgRef} src={fullscreenPhoto} alt="" crossOrigin="anonymous" onClick={e => e.stopPropagation()}
              style={{ display: "block", maxWidth: "95vw", maxHeight: "95vh", objectFit: "contain", cursor: cropMode ? (cropRect ? "move" : "crosshair") : "default", userSelect: "none", WebkitUserSelect: "none" }}
              onMouseDown={cropMode ? (e => {
                e.preventDefault();
                const c = imgCoords(e);
                const cr = cropRectRef.current;
                if (cr && c.x >= cr.x && c.x <= cr.x + cr.w && c.y >= cr.y && c.y <= cr.y + cr.h) {
                  // click inside existing rect → move mode
                  cropActionRef.current = "move";
                  cropOffRef.current = { dx: c.x - cr.x, dy: c.y - cr.y };
                } else {
                  // click outside → create new selection
                  cropActionRef.current = "create";
                  const start = { x: c.x, y: c.y, w: 0, h: 0 };
                  cropRectRef.current = start;
                  setCropRect(start);
                }
                dragRef.current = true;
              }) : undefined}
            />
            {cropMode && cropRect && (cropRect.w !== 0 || dragRef.current) && (() => {
              const img = cropImgRef.current;
              if (!img) return null;
              const r = img.getBoundingClientRect();
              const s = Math.min(r.width / img.naturalWidth, r.height / img.naturalHeight);
              const left = (r.width - img.naturalWidth * s) / 2;
              const top = (r.height - img.naturalHeight * s) / 2;
              const l = Math.min(cropRect.x, cropRect.x + cropRect.w) * s + left;
              const t = Math.min(cropRect.y, cropRect.y + cropRect.h) * s + top;
              const w = Math.abs(cropRect.w) * s;
              const h = Math.abs(cropRect.h) * s;
              if (w < 1 && h < 1) return (
                <div style={{ position: "absolute", left: l - 3, top: t - 3, width: 6, height: 6, borderRadius: "50%", background: "#fff", pointerEvents: "none" }} />
              );
              return (
                <div style={{ position: "absolute", border: "2px dashed #fff", background: "rgba(255,255,255,0.08)", pointerEvents: "none", boxSizing: "border-box", left: l, top: t, width: w, height: h }} />
              );
            })()}
          </div>
        </div>
      )}

      {/* ── CAMERA OVERLAY ──────────────────────────────────── */}
      {cameraOpen && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 600, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <video ref={videoRef} autoPlay playsInline
            style={{ width: "100%", maxWidth: "100vw", maxHeight: "calc(100vh - 100px)", objectFit: "contain" }} />
          <div style={{ position: "absolute", bottom: 30, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 40 }}>
            <button onClick={stopCamera}
              style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: 48, height: 48, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={22} />
            </button>
            <button onClick={captureFromCamera}
              style={{ background: "#fff", border: "none", width: 64, height: 64, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", border: "3px solid #333" }} />
            </button>
          </div>
        </div>
      )}

      {/* ── PREFERENCES PANEL ────────────────────────────────── */}
      {prefPanel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setPrefPanel(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.s1, border: `1px solid ${T.border}`, borderRadius: 10, padding: 28, maxWidth: 400, width: "90%", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.3rem", color: T.cream }}>{t("prefs.title")}</h2>
              <button onClick={() => setPrefPanel(false)} style={{ background: "none", border: "none", color: T.dim, cursor: "pointer", display: "flex" }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ color: T.dim, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{t("prefs.language")}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[["fr","Français (🇫🇷)"],["en","English (🇬🇧)"]].map(([code, label]) => (
                  <button key={code} onClick={() => setLang(code)}
                    style={{
                      background: lang === code ? T.accent : T.s3,
                      border: `1px solid ${lang === code ? T.accent : T.border}`,
                      color: lang === code ? T.bg : T.dim,
                      borderRadius: 4, padding: "5px 12px", fontSize: "0.82rem",
                      cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ color: T.dim, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{t("prefs.currency")}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[["EUR","EUR (€)"],["USD","USD ($)"],["CNY","CNY (¥)"]].map(([code, label]) => (
                  <button key={code} onClick={() => setCurrency(code)}
                    style={{
                      background: currency === code ? T.accent : T.s3,
                      border: `1px solid ${currency === code ? T.accent : T.border}`,
                      color: currency === code ? T.bg : T.dim,
                      borderRadius: 4, padding: "5px 12px", fontSize: "0.82rem",
                      cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ color: T.dim, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{t("prefs.theme")}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {themeGroups.map(g => (
                  <div key={g.label}>
                    <div style={{ color: T.dim2, fontSize: "0.72rem", marginBottom: 4 }}>{g.label}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {g.keys.map(k => {
                        const active = themeName === k;
                        return (
                          <button key={k} onClick={() => setThemeName(k)}
                            style={{
                              background: active ? T.accent : T.s3, border: `1px solid ${active ? T.accent : T.border}`,
                              color: active ? T.bg : T.dim, borderRadius: 4, padding: "4px 10px", fontSize: "0.78rem",
                              cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                            }}>
                            {themeLabels[k]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ color: T.dim, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{t("prefs.about")}</div>
              <div style={{ color: T.cream, fontSize: "0.95rem", lineHeight: 1.7 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 4 }}><span style={{ color: T.dim, minWidth: 80 }}>{t("prefs.app_name")}</span> ArtVault</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 4 }}><span style={{ color: T.dim, minWidth: 80 }}>{t("prefs.version")}</span> 1.0.0</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 4 }}><span style={{ color: T.dim, minWidth: 80 }}>{t("prefs.description")}</span> {t("prefs.app_desc")}</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 4 }}><span style={{ color: T.dim, minWidth: 80 }}>{t("prefs.tech")}</span> React · Supabase · Vite</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 4 }}><span style={{ color: T.dim, minWidth: 80 }}>{t("prefs.github")}</span> <a href="https://github.com/iesta/ArtVault" target="_blank" rel="noreferrer" style={{ color: T.accent, textDecoration: "none" }}>GitHub</a></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SHARE DIALOG ──────────────────────────────────────── */}
      {shareDialog && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => { setShareDialog(false); setShareLink(""); setShareErr(""); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.s1, border: `1px solid ${T.border}`, borderRadius: 10, padding: 28, maxWidth: 400, width: "90%", textAlign: "center" }}>
            <Share2 size={32} style={{ color: T.accent, marginBottom: 12 }} />
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.1rem", color: T.cream, marginBottom: 6 }}>{t("share.title")}</div>
            <div style={{ color: T.dim, fontSize: "0.85rem", marginBottom: 20, lineHeight: 1.6 }}>
              {t("share.desc")}
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: T.s2, border: `1px solid ${T.border}`, borderRadius: 6, cursor: "pointer", marginBottom: 18, textAlign: "left" }}
              onClick={() => setShowValuesShare(v => !v)}>
              <div style={{ width: 20, height: 20, borderRadius: 3, border: `2px solid ${showValuesShare ? T.accent : T.border}`, background: showValuesShare ? T.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                {showValuesShare && <Check size={14} color={T.bg} />}
              </div>
              <div>
                <div style={{ color: T.cream, fontSize: "0.9rem", fontWeight: 500 }}>{t("share.include_values")}</div>
                <div style={{ color: T.dim, fontSize: "0.8rem" }}>{t("share.values_hint")}</div>
              </div>
            </label>

            {!shareLink ? (
              <>
                <Btn variant="primary" onClick={handleCreateShare} sx={{ width: "100%", padding: "10px 0" }}>
                  <LinkIcon size={16} /> {t("share.generate")}
                </Btn>
                {shareErr && <div style={{ color: T.red, fontSize: "0.82rem", marginTop: 8 }}>{shareErr}</div>}
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.s2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 12px" }}>
                  <input readOnly value={shareLink} style={{ flex: 1, background: "none", border: "none", color: T.cream, fontSize: "0.82rem", fontFamily: "monospace", outline: "none" }} />
                  <button onClick={() => { navigator.clipboard.writeText(shareLink); setCopied(true); setTimeout(() => setCopied(false), 2500); }}
                    style={{ background: "none", border: "none", color: copied ? T.green : T.accent, cursor: "pointer", display: "flex", padding: 4 }}>
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
                {copied && <div style={{ color: T.green, fontSize: "0.82rem" }}>{t("share.copied")}</div>}
                <button onClick={handleRevokeShare} style={{ background: "none", border: "none", color: T.red, cursor: "pointer", fontSize: "0.85rem", fontFamily: "inherit", padding: 6 }}>
                  {t("share.revoke")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── iOS INSTALL MODAL ────────────────────────────────── */}
      {iosInstallModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setIosInstallModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.s1, border: `1px solid ${T.border}`, borderRadius: 10, padding: 28, maxWidth: 360, width: "90%", textAlign: "center" }}>
            <Smartphone size={36} style={{ color: T.accent, marginBottom: 12 }} />
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.1rem", color: T.cream, marginBottom: 8 }}>{t("install.title")}</div>
            <div style={{ color: T.dim, fontSize: "0.88rem", lineHeight: 1.7, marginBottom: 20, textAlign: "left" }}>
              {t("install.step1")} <span style={{ fontSize: "1rem" }}>⎙</span><br />
              {t("install.step2")}<br />
              {t("install.step3")}
            </div>
            <button onClick={() => setIosInstallModal(false)}
              style={{ background: T.accent, border: "none", color: T.bg, padding: "8px 24px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: "0.9rem", fontWeight: 600 }}>
              {t("install.got_it")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
