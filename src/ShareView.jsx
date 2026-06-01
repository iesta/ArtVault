import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, ImageIcon } from "lucide-react";
import { photoURL } from "./supabase";

const T = {
  bg: "#f8f9fa",
  card: "#fff",
  text: "#1a1a2e",
  dim: "#6b7280",
  border: "#e2e8f0",
  accent: "#3fc1c9",
  shadow: "rgba(0,0,0,0.08)",
  overlay: "rgba(0,0,0,0.92)",
};

export default function ShareView({ data }) {
  const [sel, setSel] = useState(null);

  const works = data?.artworks || [];
  const showValues = data?.show_values !== false;

  const goNext = useCallback(() => {
    if (sel === null || sel >= works.length - 1) return;
    setSel(s => s + 1);
  }, [sel, works.length]);

  const goPrev = useCallback(() => {
    if (sel === null || sel <= 0) return;
    setSel(s => s - 1);
  }, [sel]);

  useEffect(() => {
    if (sel === null) return;
    const handler = e => {
      if (e.key === "Escape") setSel(null);
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sel, goNext, goPrev]);

  if (data?.error === "invalid_token") {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: T.dim, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ fontSize: 48, opacity: 0.3 }}>🔗</div>
        <div style={{ fontSize: "1.1rem" }}>Lien invalide ou expiré</div>
        <div style={{ fontSize: "0.85rem" }}>Vérifiez le lien reçu et réessayez.</div>
      </div>
    );
  }

  if (!works.length) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: T.dim, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ fontSize: "1.1rem" }}>Collection vide</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${T.border}`, background: T.card }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 26, height: 26, background: T.accent, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em" }}>AV</span>
          </div>
          <span style={{ fontSize: "1.1rem", fontWeight: 600, color: T.text }}>Collection ArtVault</span>
          <span style={{ color: T.dim, fontSize: "0.85rem", marginLeft: "auto" }}>
            {works.length} œuvre{works.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
          {works.map((w, i) => (
            <div key={w.id} onClick={() => setSel(i)}
              style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 6, overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.2s, transform 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 4px 16px ${T.shadow}`; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}>
              <div style={{ aspectRatio: "1", background: T.border, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {w.photos?.[0]?.path
                  ? <img src={photoURL(w.photos[0].path)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <ImageIcon size={24} color={T.dim} style={{ opacity: 0.4 }} />}
              </div>
              <div style={{ padding: "10px 12px" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.title || "Sans titre"}</div>
                <div style={{ fontSize: "0.8rem", color: T.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.artist}</div>
                {w.date_work && <div style={{ fontSize: "0.75rem", color: T.dim, marginTop: 2, opacity: 0.7 }}>{w.date_work}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${T.border}`, padding: "16px 20px", textAlign: "center", color: T.dim, fontSize: "0.78rem", letterSpacing: "0.04em" }}>
        Propulsé par ArtVault
      </div>

      {/* Lightbox */}
      {sel !== null && works[sel] && (
        <div style={{ position: "fixed", inset: 0, background: T.overlay, zIndex: 500, display: "flex", flexDirection: "column" }}>
          {/* Toolbar */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, display: "flex", alignItems: "center", padding: "12px 16px" }}>
            <button onClick={() => setSel(null)}
              style={{ background: "rgba(0,0,0,0.4)", border: "none", color: "#fff", width: 36, height: 36, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={20} />
            </button>
            <span style={{ color: "#fff", fontSize: "0.82rem", marginLeft: 16, opacity: 0.6 }}>
              {sel + 1} / {works.length}
            </span>
          </div>

          {/* Prev / Next */}
          {sel > 0 && (
            <button onClick={goPrev}
              style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", zIndex: 10, background: "rgba(0,0,0,0.4)", border: "none", color: "#fff", width: 44, height: 44, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ChevronLeft size={24} />
            </button>
          )}
          {sel < works.length - 1 && (
            <button onClick={goNext}
              style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", zIndex: 10, background: "rgba(0,0,0,0.4)", border: "none", color: "#fff", width: 44, height: 44, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ChevronRight size={24} />
            </button>
          )}

          {/* Image area */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            {works[sel].photos?.[0]?.path
              ? <img src={photoURL(works[sel].photos[0].path)} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 4 }} />
              : <div style={{ color: "#fff", opacity: 0.3 }}><ImageIcon size={64} /></div>}
          </div>

          {/* Info panel — bottom right */}
          <div style={{ position: "absolute", bottom: 16, right: 16, zIndex: 10, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)", borderRadius: 8, padding: "16px 18px", maxWidth: 260, color: "#fff", display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: "0.95rem", fontWeight: 600, lineHeight: 1.3 }}>{works[sel].title || "Sans titre"}</div>
            <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", fontStyle: "italic" }}>{works[sel].artist}</div>
            <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", display: "flex", flexWrap: "wrap", gapX: 12, gapY: 2 }}>
              {works[sel].date_work && <span>📅 {works[sel].date_work}</span>}
              {works[sel].technique && <span>🎨 {works[sel].technique}</span>}
              {(works[sel].width || works[sel].height) && (
                <span>📏 {[works[sel].width, works[sel].height, works[sel].depth].filter(Boolean).join(" × ")}{works[sel].dimension_unit ? ` ${works[sel].dimension_unit}` : ""}</span>
              )}
              {works[sel].is_insured && <span>🛡️ Assurée</span>}
            </div>
            {showValues && (works[sel].value_current || works[sel].value_purchase) && (
              <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", display: "flex", flexDirection: "column", gap: 1, marginTop: 2 }}>
                {works[sel].value_purchase && <span>Achat : {new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(+works[sel].value_purchase)}</span>}
                {works[sel].value_current && <span>Estimation : {new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(+works[sel].value_current)}</span>}
              </div>
            )}
            {works[sel].notes && (
              <div style={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.4)", fontStyle: "italic", marginTop: 1, maxHeight: 50, overflowY: "auto" }}>
                {works[sel].notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
