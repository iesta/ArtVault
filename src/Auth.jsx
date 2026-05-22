import { useState } from "react";
import { supabase } from "./supabase";
import { Mail, Lock, Loader } from "lucide-react";

const T = {
  bg: "#0d0c0a",
  s1: "#171612",
  s3: "#27261f",
  border: "#35332a",
  gold: "#c9a84c",
  cream: "#f0e6d2",
  dim: "#8a8070",
  red: "#b03535",
};

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: err } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (err) setError(err.message);
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: T.s1,
          border: `1px solid ${T.border}`,
          borderRadius: 10,
          padding: "40px 32px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              background: T.gold,
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                color: T.bg,
                fontSize: "0.85rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              AV
            </span>
          </div>
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "1.5rem",
              fontWeight: 500,
              color: T.gold,
              letterSpacing: "0.04em",
            }}
          >
            ArtVault
          </h1>
        </div>
        <p
          style={{
            textAlign: "center",
            color: T.dim,
            fontSize: "0.88rem",
            marginBottom: 32,
            fontStyle: "italic",
          }}
        >
          {mode === "login"
            ? "Connectez-vous à votre collection"
            : "Créez votre compte"}
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {error && (
            <div
              style={{
                background: "#b0353520",
                border: `1px solid ${T.red}`,
                color: "#e07070",
                padding: "10px 14px",
                borderRadius: 4,
                fontSize: "0.85rem",
              }}
            >
              {error}
            </div>
          )}

          <div>
            <div
              style={{
                color: T.dim,
                fontSize: "0.75rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Email
            </div>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Mail
                size={15}
                style={{ position: "absolute", left: 10, color: T.dim, pointerEvents: "none" }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                required
                style={{
                  width: "100%",
                  background: T.s3,
                  color: T.cream,
                  border: `1px solid ${T.border}`,
                  borderRadius: 4,
                  padding: "9px 12px 9px 32px",
                  fontSize: "0.95rem",
                  fontFamily: "inherit",
                  outline: "none",
                  colorScheme: "dark",
                }}
                onFocus={(e) => (e.target.style.borderColor = T.gold)}
                onBlur={(e) => (e.target.style.borderColor = T.border)}
              />
            </div>
          </div>

          <div>
            <div
              style={{
                color: T.dim,
                fontSize: "0.75rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Mot de passe
            </div>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Lock
                size={15}
                style={{ position: "absolute", left: 10, color: T.dim, pointerEvents: "none" }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                style={{
                  width: "100%",
                  background: T.s3,
                  color: T.cream,
                  border: `1px solid ${T.border}`,
                  borderRadius: 4,
                  padding: "9px 12px 9px 32px",
                  fontSize: "0.95rem",
                  fontFamily: "inherit",
                  outline: "none",
                  colorScheme: "dark",
                }}
                onFocus={(e) => (e.target.style.borderColor = T.gold)}
                onBlur={(e) => (e.target.style.borderColor = T.border)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "11px 20px",
              borderRadius: 4,
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "0.95rem",
              letterSpacing: "0.06em",
              fontFamily: "inherit",
              transition: "all 0.18s",
              border: "none",
              outline: "none",
              opacity: loading ? 0.6 : 1,
              background: T.gold,
              color: T.bg,
              fontWeight: 600,
              marginTop: 4,
            }}
          >
            {loading && <Loader size={16} style={{ animation: "spin 0.8s linear infinite" }} />}
            {loading
              ? "Patientez…"
              : mode === "login"
                ? "Se connecter"
                : "Créer le compte"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === "login" ? "signup" : "login"));
              setError("");
            }}
            style={{
              background: "none",
              border: "none",
              color: T.gold,
              cursor: "pointer",
              fontSize: "0.85rem",
              fontFamily: "inherit",
              padding: 4,
              textAlign: "center",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            {mode === "login"
              ? "Pas encore de compte ? Créez-en un"
              : "Déjà un compte ? Connectez-vous"}
          </button>
        </form>
      </div>
    </div>
  );
}
