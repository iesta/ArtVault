import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { photoURL } from "./supabase";

const W = 793;
const H = 1122;
const P = 52;

const eur = v =>
  v !== "" && v !== null && v !== undefined
    ? new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(+v)
    : "—";

const fmtDate = d => {
  if (!d) return "—";
  try { return new Date(d + "T12:00:00").toLocaleDateString("fr-BE"); } catch { return d; }
};

function field(label, value) {
  if (!value) return "";
  return `<tr><td style="color:#888;width:140px;vertical-align:top;padding:4px 0;">${label}</td><td style="color:#222;padding:4px 0;">${value}</td></tr>`;
}

function dims(w) {
  const p = [w.width, w.height, w.depth].filter(Boolean);
  if (!p.length) return null;
  return p.join(" × ") + (w.dimension_unit ? ` ${w.dimension_unit}` : "");
}

function esc(s) {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function pageHTML(work, num, total) {
  const imgUrl = work.photos?.[0]?.path ? photoURL(work.photos[0].path) : null;

  const photoBlock = imgUrl
    ? `<div style="text-align:center;margin-bottom:22px;">
         <img src="${imgUrl}" style="max-width:100%;max-height:300px;object-fit:contain;border-radius:3px;" />
       </div>`
    : `<div style="height:60px;"></div>`;

  return `<!doctype html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#fff;">
<div style="width:${W}px;min-height:${H}px;background:#fff;color:#222;font-family:Georgia,'Times New Roman',serif;padding:${P}px;box-sizing:border-box;display:flex;flex-direction:column;">
  ${photoBlock}

  <h1 style="font-size:22px;margin:0 0 3px;font-weight:500;color:#111;">${esc(work.title) || "Sans titre"}</h1>
  <h2 style="font-size:17px;margin:0 0 18px;font-weight:400;font-style:italic;color:#666;">${esc(work.artist) || "Artiste inconnu"}</h2>

  <hr style="border:none;border-top:1px solid #ddd;margin:0 0 14px;" />

  <table style="width:100%;font-size:11px;line-height:1.7;border-collapse:collapse;">
    ${field("Technique", esc(work.technique))}
    ${field("Date", esc(work.date_work))}
    ${field("Dimensions", dims(work))}
    ${field("Entreposage", esc(work.location_storage))}
    ${field("Date d'achat", work.date_purchase ? fmtDate(work.date_purchase) : null)}
    ${field("Lieu d'achat", esc(work.location_purchase))}
    ${field("Valeur d'achat", work.value_purchase ? eur(work.value_purchase) : null)}
    ${field("Valeur actuelle", work.value_current ? eur(work.value_current) : null)}
    ${field("Assurée", work.is_insured ? "Oui" : "Non")}
  </table>

  ${work.notes
    ? `<hr style="border:none;border-top:1px solid #ddd;margin:14px 0;" />
       <div style="font-size:10.5px;color:#444;line-height:1.6;font-style:italic;">${esc(work.notes)}</div>`
    : ""}

  <div style="margin-top:auto;font-size:9px;color:#aaa;text-align:center;padding-top:24px;letter-spacing:0.08em;">
    ArtVault · ${num}/${total}
  </div>
</div>
</body>
</html>`;
}

function waitImages(el) {
  const imgs = [...el.querySelectorAll("img")];
  return Promise.all(
    imgs.map(
      img =>
        new Promise(res => {
          if (img.complete) res();
          else { img.onload = res; img.onerror = res; }
        })
    )
  );
}

export async function exportToPDF(works) {
  if (!works.length) return;

  const pdf = new jsPDF("p", "pt", "a4");

  for (let i = 0; i < works.length; i++) {
    const html = pageHTML(works[i], i + 1, works.length);
    const div = document.createElement("div");
    div.innerHTML = html;
    div.style.cssText = "position:absolute;left:-9999px;top:0;";
    document.body.appendChild(div);

    await waitImages(div);
    await new Promise(r => setTimeout(r, 200));

    const el = div.firstElementChild;
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      width: W,
      height: el.scrollHeight,
    });

    document.body.removeChild(div);

    if (i > 0) pdf.addPage();

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const ratio = canvas.height / canvas.width;
    const pageW = 595.28;
    const pageH = ratio * pageW;

    if (pageH > 841.89) {
      pdf.addImage(imgData, "JPEG", 0, 0, (841.89 / pageH) * pageW, 841.89);
    } else {
      pdf.addImage(imgData, "JPEG", 0, 0, pageW, pageH);
    }
  }

  pdf.save(`ArtVault_catalog_${new Date().toISOString().slice(0, 10)}.pdf`);
}
