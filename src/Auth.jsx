import { useState } from "react";
import { supabase } from "./supabase";
import { Mail, Lock, Loader } from "lucide-react";
import { useTheme } from "./themes";
import { useI18n } from "./i18n";

export default function Auth() {
  const T = useTheme();
  const { t } = useI18n();
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
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Elms+Sans:wght@700&family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600&display=swap');`}</style>
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: T.s1,
          border: `1px solid ${T.border}`,
          borderTop: `3px solid ${T.cyan}`,
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
              background: T.accent,
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
                fontFamily: "'Elms Sans', sans-serif",
              }}
            >
              AV
            </span>
          </div>
          <h1
            style={{
              fontFamily: "'Elms Sans', sans-serif",
              fontSize: "1.5rem",
              fontWeight: 600,
              color: T.cream,
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
          {t(mode === "login" ? "auth.login_title" : "auth.signup_title")}
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
              {t("auth.email")}
            </div>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Mail size={15} style={{ position: "absolute", left: 10, color: T.dim, pointerEvents: "none" }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.email_placeholder")}
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
                onFocus={(e) => (e.target.style.borderColor = T.cyan)}
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
              {t("auth.password")}
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
                placeholder={t("auth.password_placeholder")}
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
                onFocus={(e) => (e.target.style.borderColor = T.cyan)}
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
              background: T.accent,
              color: T.bg,
              fontWeight: 600,
              marginTop: 4,
            }}
          >
            {loading && <Loader size={16} style={{ animation: "spin 0.8s linear infinite" }} />}
            {loading
              ? t("auth.wait")
              : t(mode === "login" ? "auth.login_btn" : "auth.signup_btn")}
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
              color: T.cyan,
              cursor: "pointer",
              fontSize: "0.85rem",
              fontFamily: "inherit",
              padding: 4,
              textAlign: "center",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            {t(mode === "login" ? "auth.to_signup" : "auth.to_login")}
          </button>
        </form>
      </div>
    </div>
  );
}
