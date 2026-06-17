import { useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const radius = outerRadius + 20;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#888" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={11}>
      {(percent * 100).toFixed(0)}%
    </text>
  );
};

const palette = [
  "#3fc1c9", "#f7976e", "#7c5cbf", "#4ecdc4", "#ff6b6b",
  "#45b7d1", "#96ceb4", "#ffeaa7", "#d4a5a5", "#9b59b6",
  "#1abc9c", "#e74c3c", "#3498db", "#e67e22", "#2ecc71",
  "#f39c12", "#9b59b6", "#1abc9c", "#e84393", "#6c5ce7",
];

export default function ChartsPage({ works, fmt, T, t }) {
  const chartCard = {
    background: T.s1, borderRadius: 8, border: `1px solid ${T.border}`,
    padding: "20px 20px 10px", flex: "1 1 320px", minWidth: 0,
  };
  const titleStyle = { margin: "0 0 16px 0", fontSize: "1.05rem", fontWeight: 600, color: T.cream };

  // Value by technique
  const valueByTechnique = useMemo(() => {
    const map = {};
    for (const w of works) {
      const v = +w.value_current || 0;
      if (v <= 0) continue;
      const key = w.technique || "—";
      map[key] = (map[key] || 0) + v;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [works]);

  // Value by location
  const valueByLocation = useMemo(() => {
    const map = {};
    for (const w of works) {
      const v = +w.value_current || 0;
      if (v <= 0) continue;
      const key = w.location_storage || "—";
      map[key] = (map[key] || 0) + v;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [works]);

  // Insured ratio
  const insuredData = useMemo(() => {
    let insured = 0, uninsured = 0;
    for (const w of works) {
      if (w.is_insured) insured++; else uninsured++;
    }
    return [
      { name: t("charts.insured"), value: insured },
      { name: t("charts.uninsured"), value: uninsured },
    ];
  }, [works, t]);

  // Top tags
  const topTags = useMemo(() => {
    const map = {};
    for (const w of works) {
      for (const tag of w.tags || []) {
        map[tag] = (map[tag] || 0) + 1;
      }
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));
  }, [works]);

  // Purchase vs current value (top 10 by combined value)
  const purchaseVsCurrent = useMemo(() => {
    const items = works
      .filter(w => +w.value_purchase || +w.value_current)
      .map(w => ({
        name: w.title || "—",
        purchase: +w.value_purchase || 0,
        current: +w.value_current || 0,
      }))
      .sort((a, b) => (b.purchase + b.current) - (a.purchase + a.current))
      .slice(0, 10);
    return items;
  }, [works]);

  const tooltipStyle = {
    background: T.s2, border: `1px solid ${T.border}`, borderRadius: 4,
    fontSize: "0.8rem", color: T.cream,
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px 80px" }}>
      <h1 style={{ margin: "0 0 8px 0", fontSize: "1.4rem", fontWeight: 700, color: T.cream }}>
        {t("charts.title")}
      </h1>
      <p style={{ margin: "0 0 24px 0", color: T.dim, fontSize: "0.9rem" }}>
        {t("charts.subtitle")}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {/* Value by technique */}
        <div style={chartCard}>
          <h3 style={titleStyle}>{t("charts.value_by_technique")}</h3>
          {valueByTechnique.length === 0 ? (
            <p style={{ color: T.dim, fontSize: "0.85rem" }}>{t("charts.no_data")}</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={valueByTechnique} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                  label={renderCustomLabel} labelLine={false}>
                  {valueByTechnique.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={v => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Value by location */}
        <div style={chartCard}>
          <h3 style={titleStyle}>{t("charts.value_by_location")}</h3>
          {valueByLocation.length === 0 ? (
            <p style={{ color: T.dim, fontSize: "0.85rem" }}>{t("charts.no_data")}</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={valueByLocation} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                  label={renderCustomLabel} labelLine={false}>
                  {valueByLocation.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={v => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Insured ratio */}
        <div style={chartCard}>
          <h3 style={titleStyle}>{t("charts.insured_ratio")}</h3>
          {insuredData[0].value === 0 && insuredData[1].value === 0 ? (
            <p style={{ color: T.dim, fontSize: "0.85rem" }}>{t("charts.no_data")}</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={insuredData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                  label={renderCustomLabel} labelLine={false}>
                  <Cell fill="#3fc1c9" />
                  <Cell fill="#ff6b6b" />
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Purchase vs current value */}
        <div style={{ ...chartCard, flex: "1 1 100%" }}>
          <h3 style={titleStyle}>{t("charts.purchase_vs_current")}</h3>
          {purchaseVsCurrent.length === 0 ? (
            <p style={{ color: T.dim, fontSize: "0.85rem" }}>{t("charts.no_data")}</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={purchaseVsCurrent} barSize={18} barGap={4}>
                <XAxis dataKey="name" tick={{ fill: T.dim, fontSize: 11 }} axisLine={{ stroke: T.border }} tickLine={false} />
                <YAxis tick={{ fill: T.dim, fontSize: 11 }} axisLine={{ stroke: T.border }} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => fmt(v)} />
                <Legend />
                <Bar dataKey="purchase" name={t("charts.purchase")} fill="#f7976e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="current" name={t("charts.current")} fill="#3fc1c9" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top tags */}
        <div style={{ ...chartCard, flex: "1 1 100%" }}>
          <h3 style={titleStyle}>{t("charts.top_tags")}</h3>
          {topTags.length === 0 ? (
            <p style={{ color: T.dim, fontSize: "0.85rem" }}>{t("charts.no_data")}</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topTags} layout="vertical" barSize={22}>
                <XAxis type="number" tick={{ fill: T.dim, fontSize: 11 }} axisLine={{ stroke: T.border }} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: T.dim, fontSize: 11 }} axisLine={{ stroke: T.border }} tickLine={false} width={100} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name={t("charts.count")} fill="#7c5cbf" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
