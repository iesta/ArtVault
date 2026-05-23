import { photoURL } from "./supabase";

const W = 793;
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
  return `<tr><td style="color:#888;width:140px;vertical-align:top;padding:4px 0;font-size:11px;">${label}</td><td style="color:#222;padding:4px 0;font-size:11px;">${value}</td></tr>`;
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

function buildPage(work, num, total) {
  const el = document.createElement("div");
  el.style.cssText = `width:${W}px;background:#0d0c0a;color:#f0e6d2;font-family:Georgia,'Times New Roman',serif;padding:${P}px;box-sizing:border-box;display:flex;flex-direction:column;`;

  const imgUrl = work.photos?.[0]?.path ? photoURL(work.photos[0].path) : null;

  if (imgUrl) {
    const img = document.createElement("img");
    img.src = imgUrl;
    img.style.cssText = "display:block;max-width:100%;max-height:300px;object-fit:contain;margin:0 auto 22px;border-radius:3px;";
    el.appendChild(img);
  } else {
    const spacer = document.createElement("div");
    spacer.style.height = "60px";
    el.appendChild(spacer);
  }

  const title = document.createElement("h1");
  title.textContent = work.title || "Sans titre";
  title.style.cssText = "font-size:22px;margin:0 0 3px;font-weight:500;color:#c9a84c;";
  el.appendChild(title);

  const artist = document.createElement("h2");
  artist.textContent = work.artist || "Artiste inconnu";
  artist.style.cssText = "font-size:17px;margin:0 0 18px;font-weight:400;font-style:italic;color:#8a8070;";
  el.appendChild(artist);

  const hr1 = document.createElement("hr");
  hr1.style.cssText = "border:none;border-top:1px solid #35332a;margin:0 0 14px;";
  el.appendChild(hr1);

  const rows = [
    ["Technique", work.technique],
    ["Date", work.date_work],
    ["Dimensions", dims(work)],
    ["Entreposage", work.location_storage],
    ["Date d'achat", work.date_purchase ? fmtDate(work.date_purchase) : null],
    ["Lieu d'achat", work.location_purchase],
    ["Valeur d'achat", work.value_purchase ? eur(work.value_purchase) : null],
    ["Valeur actuelle", work.value_current ? eur(work.value_current) : null],
    ["Assurée", work.is_insured ? "Oui" : "Non"],
  ];

  const table = document.createElement("table");
  table.style.cssText = "width:100%;border-collapse:collapse;";
  for (const [l, v] of rows) {
    if (!v) continue;
    const tr = document.createElement("tr");
    const td1 = document.createElement("td");
    td1.textContent = l;
    td1.style.cssText = "color:#5a5448;width:140px;vertical-align:top;padding:4px 0;font-size:11px;";
    const td2 = document.createElement("td");
    td2.textContent = v;
    td2.style.cssText = "color:#f0e6d2;padding:4px 0;font-size:11px;";
    tr.appendChild(td1);
    tr.appendChild(td2);
    table.appendChild(tr);
  }
  el.appendChild(table);

  if (work.notes) {
    const hr2 = document.createElement("hr");
    hr2.style.cssText = "border:none;border-top:1px solid #35332a;margin:14px 0;";
    el.appendChild(hr2);
    const notes = document.createElement("div");
    notes.textContent = work.notes;
    notes.style.cssText = "font-size:10.5px;color:#8a8070;line-height:1.6;font-style:italic;";
    el.appendChild(notes);
  }

  const footer = document.createElement("div");
  footer.textContent = `ArtVault · ${num}/${total}`;
  footer.style.cssText = "margin-top:auto;font-size:9px;color:#5a5448;text-align:center;padding-top:24px;letter-spacing:0.08em;";
  el.appendChild(footer);

  return el;
}

export async function exportToPDF(works) {
  if (!works.length) return;

  const jsPDF = (await import("jspdf")).default;
  const html2canvas = (await import("html2canvas")).default;
  const pdf = new jsPDF("p", "pt", "a4");
  const PAGE_H = 841.89;

  for (let i = 0; i < works.length; i++) {
    const el = buildPage(works[i], i + 1, works.length);

    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;";
    container.appendChild(el);
    document.body.appendChild(container);

    // Wait for images
    const imgs = el.querySelectorAll("img");
    await Promise.all(
      [...imgs].map(
        img =>
          new Promise(res => {
            if (img.complete) res();
            else { img.onload = res; img.onerror = res; }
          })
      )
    );
    await new Promise(r => setTimeout(r, 300));

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#0d0c0a",
    });

    document.body.removeChild(container);

    if (i > 0) pdf.addPage();

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const ratio = canvas.height / canvas.width;
    const pageW = 595.28;
    const pageH = ratio * pageW;

    if (pageH > PAGE_H) {
      pdf.addImage(imgData, "JPEG", 0, 0, (PAGE_H / pageH) * pageW, PAGE_H);
    } else {
      pdf.addImage(imgData, "JPEG", 0, 0, pageW, pageH);
    }
  }

  pdf.save(`ArtVault_catalog_${new Date().toISOString().slice(0, 10)}.pdf`);
}
