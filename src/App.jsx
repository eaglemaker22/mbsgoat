import React, { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

const API_URL = "https://www.mbsgoat.com/.netlify/functions/getMarketData";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function asNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function fmt(value, digits = 2, suffix = "") {
  const n = asNum(value);
  if (n === null) return "—";
  return `${n.toFixed(digits)}${suffix}`;
}

function fmtSigned(value, digits = 2, suffix = "") {
  const n = asNum(value);
  if (n === null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}${suffix}`;
}

function toneText(value, inverse = false) {
  const n = asNum(value);
  if (n === null || n === 0) return "text-slate-300";
  const worse = inverse ? n < 0 : n > 0;
  return worse ? "text-red-300" : "text-green-300";
}

function impactTone(value, inverse = false) {
  const n = asNum(value);
  if (n === null || n === 0) return "text-slate-300 border-slate-700 bg-slate-900/50";
  const worse = inverse ? n < 0 : n > 0;
  return worse
    ? "text-red-300 border-red-500/60 bg-red-950/30 shadow-[0_0_22px_rgba(239,68,68,0.12)]"
    : "text-green-300 border-green-500/60 bg-green-950/30 shadow-[0_0_22px_rgba(34,197,94,0.12)]";
}

function Pill({ children, tone = "neutral" }) {
  const styles = {
    good: "border-green-500/60 bg-green-950/40 text-green-300",
    bad: "border-red-500/60 bg-red-950/40 text-red-300",
    warn: "border-yellow-500/60 bg-yellow-950/40 text-yellow-300",
    neutral: "border-cyan-700/60 bg-cyan-950/30 text-cyan-200",
  };

  return (
    <span className={cx("rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em]", styles[tone])}>
      {children}
    </span>
  );
}

function Shell({ children }) {
  return (
    <main className="min-h-screen bg-[#020710] text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-4 md:px-6 md:py-6">
        {children}
      </div>
    </main>
  );
}

function TopNav({ data, loading }) {
  const quality = data?.lockiqSignal?.data_quality || "LOADING";
  const qualityTone = quality === "GOOD" ? "good" : quality === "LIMITED" ? "warn" : "neutral";

  return (
    <header className="mb-4 rounded-2xl border border-cyan-900/70 bg-slate-950/90 px-4 py-3 shadow-[0_0_30px_rgba(0,180,255,0.08)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-mono text-xl font-black tracking-[0.18em] text-cyan-200">MBSGOAT</div>
          <div className="text-xs uppercase tracking-[0.26em] text-slate-500">LockIQ Beta 2 Dashboard</div>
        </div>

        <nav className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-300">
          <span className="rounded-lg border border-cyan-700/60 bg-cyan-950/30 px-3 py-2 text-cyan-200">Dashboard</span>
          <span className="rounded-lg border border-slate-800 px-3 py-2">Markets</span>
          <span className="rounded-lg border border-slate-800 px-3 py-2">Rates</span>
          <span className="rounded-lg border border-slate-800 px-3 py-2">Econ Report</span>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={qualityTone}>Quality: {quality}</Pill>
          <Pill tone="neutral">{loading ? "Refreshing" : "Live API"}</Pill>
        </div>
      </div>

      <div className="mt-3 grid gap-2 border-t border-cyan-950 pt-3 text-xs text-slate-400 md:grid-cols-3">
        <div>Fetched: <span className="font-mono text-slate-200">{data?.fetchedAt || "—"}</span></div>
        <div>LockIQ Updated: <span className="font-mono text-slate-200">{data?.lockiqSignal?.last_updated || "—"}</span></div>
        <div>Anchor: <span className="font-mono text-slate-200">{data?.lockiqSignal?.anchor_time || "—"}</span></div>
      </div>
    </header>
  );
}

function LockIQPanel({ signal }) {
  const rows = [
    { label: "CONV", bps: signal?.conv_change_bps, dollars: signal?.conv_dollars_per_100k, text: signal?.conv_signal },
    { label: "FHA", bps: signal?.fha_change_bps, dollars: signal?.fha_dollars_per_100k, text: signal?.fha_signal },
    { label: "VA", bps: signal?.va_change_bps, dollars: signal?.va_dollars_per_100k, text: signal?.va_signal },
  ];

  const headline = rows[0]?.text || "WAITING";
  const headlineTone = headline === "WORSE" ? "text-red-300" : headline === "BETTER" ? "text-green-300" : "text-cyan-200";

  return (
    <section className="rounded-2xl border border-cyan-800/70 bg-slate-950/90 p-4 shadow-[0_0_36px_rgba(0,180,255,0.10)]">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">LockIQ Rate Impact</div>
          <h1 className={cx("mt-1 font-mono text-4xl font-black tracking-tight md:text-5xl", headlineTone)}>{headline}</h1>
        </div>

        <div className="text-sm text-slate-400">
          <div>Model: <span className="font-mono text-slate-200">{signal?.model_version || "—"}</span></div>
          <div>Source: <span className="font-mono text-slate-200">{signal?.anchor_source || "—"}</span></div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label} className={cx("rounded-xl border p-4", impactTone(row.bps))}>
            <div className="flex items-center justify-between">
              <div className="font-mono text-lg font-black tracking-[0.18em]">{row.label}</div>
              <div className="text-xs font-bold uppercase tracking-[0.16em]">{row.text || "—"}</div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">BPS</div>
                <div className="font-mono text-3xl font-black">{fmtSigned(row.bps, 1)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">$/100k</div>
                <div className="font-mono text-3xl font-black">{fmtSigned(row.dollars, 0)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(signal?.missing_inputs?.length || signal?.warnings?.length) ? (
        <div className="mt-4 rounded-xl border border-yellow-700/60 bg-yellow-950/20 p-3 text-sm text-yellow-200">
          <div className="font-bold uppercase tracking-[0.16em]">Signal Notes</div>
          <div className="mt-1">Missing: {signal?.missing_inputs?.join(", ") || "None"}</div>
          <div>Warnings: {signal?.warnings?.join(", ") || "None"}</div>
        </div>
      ) : null}
    </section>
  );
}

function MarketPulse({ data }) {
  const rows = [
    { label: "US10Y", current: fmt(data?.shadowBonds?.us10y_current, 3, "%"), open: fmt(data?.shadowBonds?.us10y_open, 3, "%"), delta: data?.shadowBonds?.us10y_delta, suffix: " bps", inverse: false },
    { label: "US30Y", current: fmt(data?.us30y?.us30y_current, 3, "%"), open: fmt(data?.us30y?.us30y_open, 3, "%"), delta: data?.us30y?.us30y_delta, suffix: " bps", inverse: false },
    { label: "UMBS 5.0", current: fmt(data?.mbsProducts?.umbs50_price, 2), open: fmt(data?.mbsProducts?.umbs50_open, 2), delta: data?.mbsProducts?.umbs50_delta, suffix: "", inverse: true },
    { label: "UMBS 5.5", current: fmt(data?.mbsProducts?.umbs55_price, 2), open: fmt(data?.mbsProducts?.umbs55_open, 2), delta: data?.mbsProducts?.umbs55_delta, suffix: "", inverse: true },
    { label: "MBB", current: fmt(data?.shadowBonds?.mbb_current, 2), open: fmt(data?.shadowBonds?.mbb_open, 2), delta: data?.shadowBonds?.mbb_delta, suffix: "", inverse: true },
    { label: "ZN", current: fmt(data?.treasuryFutures?.zn_current, 5), open: fmt(data?.treasuryFutures?.zn_open, 5), delta: data?.treasuryFutures?.zn_delta, suffix: "", inverse: true },
    { label: "VIX", current: fmt(data?.riskIndicators?.vix_current, 2), open: "—", delta: null, suffix: "", inverse: false },
    { label: "Brent", current: fmt(data?.riskIndicators?.oil_brent_current, 2), open: "—", delta: data?.riskIndicators?.oil_brent_change, suffix: "", inverse: false },
  ];

  return (
    <section className="rounded-2xl border border-cyan-900/70 bg-slate-950/90 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-[0.22em] text-cyan-300">Market Pulse</h2>
        <span className="text-xs text-slate-500">Current / Open / Change</span>
      </div>

      <div className="divide-y divide-cyan-950/80">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[1fr_80px_80px_90px] items-center gap-2 py-2 text-sm">
            <div className="font-bold tracking-[0.08em] text-slate-200">{row.label}</div>
            <div className="text-right font-mono text-slate-200">{row.current}</div>
            <div className="text-right font-mono text-slate-500">{row.open}</div>
            <div className={cx("text-right font-mono font-black", toneText(row.delta, row.inverse))}>
              {fmtSigned(row.delta, row.suffix.includes("bps") ? 1 : 3, row.suffix)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SignalDrivers({ signal }) {
  const deltas = signal?.deltas || {};
  const current = signal?.current_values || {};
  const anchor = signal?.anchor_values || {};
  const rows = [
    { label: "UMBS 5.0", key: "umbs50", deltaKey: "delta_umbs50_bps", suffix: " bps" },
    { label: "UMBS 5.5", key: "umbs55", deltaKey: "delta_umbs55_bps", suffix: " bps" },
    { label: "GNMA 5.0", key: "gnma50", deltaKey: "delta_gnma50_bps", suffix: " bps" },
    { label: "MBB", key: "mbb", deltaKey: "delta_mbb_bps", suffix: " bps" },
    { label: "ZN", key: "zn", deltaKey: "delta_zn_bps", suffix: " bps" },
    { label: "US10Y", key: "us10y", deltaKey: "delta_us10y_yield_bps", suffix: " bps" },
  ];

  return (
    <section className="rounded-2xl border border-cyan-900/70 bg-slate-950/90 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-[0.22em] text-cyan-300">Signal Drivers</h2>
        <span className="text-xs text-slate-500">Current vs Anchor</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr className="border-b border-cyan-950">
              <th className="py-2 text-left">Input</th>
              <th className="py-2 text-right">Current</th>
              <th className="py-2 text-right">Anchor</th>
              <th className="py-2 text-right">Delta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cyan-950/80">
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="py-2 font-bold text-slate-200">{row.label}</td>
                <td className="py-2 text-right font-mono">{fmt(current[row.key], row.key === "zn" ? 5 : 3)}</td>
                <td className="py-2 text-right font-mono text-slate-500">{fmt(anchor[row.key], row.key === "zn" ? 5 : 3)}</td>
                <td className={cx("py-2 text-right font-mono font-black", toneText(deltas[row.deltaKey]))}>
                  {fmtSigned(deltas[row.deltaKey], 1, row.suffix)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BPITable({ bpi }) {
  const rows = bpi?.rates || [];

  return (
    <section className="rounded-2xl border border-cyan-900/70 bg-slate-950/90 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-[0.22em] text-cyan-300">Broker Pricing Index</h2>
        <span className="text-xs text-slate-500">As of {bpi?.as_of || "—"}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr className="border-b border-cyan-950">
              <th className="py-2 text-left">Product</th>
              <th className="py-2 text-right">Rate</th>
              <th className="py-2 text-right">Day Chg</th>
              <th className="py-2 text-right">Intraday</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cyan-950/80">
            {rows.map((row) => (
              <tr key={row.product}>
                <td className="py-2 font-bold text-slate-200">{row.product}</td>
                <td className="py-2 text-right font-mono">{fmt(row.rate, 3, "%")}</td>
                <td className={cx("py-2 text-right font-mono font-black", toneText(row.change))}>{fmtSigned(row.change, 3, "%")}</td>
                <td className={cx("py-2 text-right font-mono font-black", toneText(row.change_intraday))}>{fmtSigned(row.change_intraday, 3, "%")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PricingTimeline({ signal }) {
  const conv = asNum(signal?.conv_dollars_per_100k) ?? 0;
  const fha = asNum(signal?.fha_dollars_per_100k) ?? 0;
  const va = asNum(signal?.va_dollars_per_100k) ?? 0;

  const chartData = useMemo(() => [
    { label: "Anchor", value: 0 },
    { label: "CONV", value: conv },
    { label: "FHA", value: fha },
    { label: "VA", value: va },
  ], [conv, fha, va]);

  return (
    <section className="rounded-2xl border border-cyan-900/70 bg-slate-950/90 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-[0.22em] text-cyan-300">Today's Pricing Timeline</h2>
        <span className="text-xs text-slate-500">Phase 1 placeholder</span>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 18, bottom: 8, left: 0 }}>
            <defs>
              <linearGradient id="impactGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#12313d" vertical={false} />
            <XAxis dataKey="label" stroke="#8aa0ad" tickLine={false} axisLine={false} />
            <YAxis stroke="#8aa0ad" tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip contentStyle={{ background: "#06131d", border: "1px solid #14536b", color: "#e5f7ff" }} formatter={(v) => [`$${v}`, "$/100k"]} />
            <Area type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={3} fill="url(#impactGlow)" dot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-xs text-slate-500">Next phase: wire this to getIntradayHistory for true intraday LockIQ movement.</p>
    </section>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch(API_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load market data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <Shell>
      <TopNav data={data} loading={loading} />

      {error ? (
        <div className="mb-4 rounded-xl border border-red-500/60 bg-red-950/30 p-4 text-red-200">
          API error: {error}
        </div>
      ) : null}

      <div className="grid gap-4">
        <LockIQPanel signal={data?.lockiqSignal} />

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <MarketPulse data={data} />
          <SignalDrivers signal={data?.lockiqSignal} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <BPITable bpi={data?.bpi} />
          <PricingTimeline signal={data?.lockiqSignal} />
        </div>
      </div>
    </Shell>
  );
}
