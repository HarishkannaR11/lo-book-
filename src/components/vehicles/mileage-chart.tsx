"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";

/**
 * One closed trip, straight from the vehicle_trip_mileage view. Nothing is computed here but
 * geometry. Every label arrives already formatted by the server: Node and the phone's browser
 * ship different Unicode data, and some languages' month names differ between them, which
 * would break hydration if the browser re-formatted them.
 */
export type MileagePoint = {
  id: string;
  from: string;
  to: string;
  kmpl: number;
  usual: number | null;
  drop: boolean;
  dateLabel: string;
  kmplLabel: string;
  usualLabel: string | null;
  vsUsualLabel: string | null;
};

const W = 340;
const H = 220;
const M = { l: 34, r: 18, t: 22, b: 28 };
// The shaded band is the usual ±5% (normal trip-to-trip wobble); a trip 10% or more below usual
// is a drop, so it always lands visibly outside the band.
// Brand blue for the trip line, the reserved "critical" red for drops (always with a triangle
// shape and a legend label, never colour alone), warm grays for the usual band and the grid.
// Validated: blue↔red ΔE 29 under protanopia (dataviz validate_palette.js).
const C = { trip: "#1d4ed8", drop: "#b91c1c", usual: "#78716c", grid: "#e7e5e4", surface: "#ffffff", muted: "#57534e", ink: "#1c1917" };

function niceTicks(lo: number, hi: number): number[] {
  const raw = (hi - lo) / 4;
  const step = [0.1, 0.2, 0.25, 0.5, 1, 2, 5].find((s) => s >= raw) ?? 10;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

export function MileageChart({ reg, points }: { reg: string; points: MileagePoint[] }) {
  const t = useTranslations();
  const [active, setActive] = useState<number | null>(null);
  const titleId = useId();

  if (points.length < 2) return <p className="card px-4 py-5 text-muted">{t("mileage.empty")}</p>;

  const tick = (v: number) => String(v); // clean ticks (3.5, 4) read the same in every language
  const values = points.flatMap((p) => (p.usual === null ? [p.kmpl] : [p.kmpl, p.usual * 0.95, p.usual * 1.05]));
  // Scale to the vehicle's own level, never tighter than −15% … +10% of it: normal wobble then
  // looks small on every vehicle, and a 10% drop always looks like a 10% drop.
  const sorted = points.map((p) => p.kmpl).sort((a, b) => a - b);
  const ref = points.at(-1)?.usual ?? sorted[Math.floor(sorted.length / 2)] ?? 1;
  const min = Math.min(...values, ref * 0.85);
  const max = Math.max(...values, ref * 1.1);
  const pad = (max - min) * 0.05;
  const ticks = niceTicks(Math.max(0, min - pad), max + pad);
  const lo = Math.min(Math.max(0, min - pad), ticks[0] ?? 0);
  const hi = Math.max(max + pad, ticks.at(-1) ?? max);
  const pw = W - M.l - M.r;
  const ph = H - M.t - M.b;
  const x = (i: number) => M.l + (i * pw) / (points.length - 1);
  const y = (v: number) => M.t + ph * (1 - (v - lo) / (hi - lo));

  const usual = points.map((p, i) => ({ u: p.usual, i })).filter((d): d is { u: number; i: number } => d.u !== null);
  const band =
    usual.length > 1
      ? [...usual.map(({ u, i }) => `${x(i)},${y(u * 1.05)}`), ...[...usual].reverse().map(({ u, i }) => `${x(i)},${y(u * 0.95)}`)].join(" ")
      : null;
  const last = points.length - 1;
  const lastPoint = points[last];
  const activePoint = active === null ? null : points[active];
  const label = (p: MileagePoint) =>
    `${p.dateLabel}, ${t("trips.route", { from: p.from, to: p.to })}: ${t("result.kmpl", { value: p.kmplLabel })}`;

  return (
    <figure className="space-y-3">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <li className="flex items-center gap-1.5">
          <svg aria-hidden width="22" height="12" viewBox="0 0 22 12">
            <line x1="1" y1="6" x2="21" y2="6" stroke={C.trip} strokeWidth="2" strokeLinecap="round" />
            <circle cx="11" cy="6" r="4" fill={C.trip} stroke={C.surface} strokeWidth="2" />
          </svg>
          {t("mileage.legendTrip")}
        </li>
        <li className="flex items-center gap-1.5">
          <svg aria-hidden width="22" height="12" viewBox="0 0 22 12">
            <rect x="0" y="1" width="22" height="10" rx="2" fill={C.usual} fillOpacity="0.12" />
            <line x1="1" y1="6" x2="21" y2="6" stroke={C.usual} strokeWidth="2" strokeLinecap="round" />
          </svg>
          {t("mileage.legendUsual")}
        </li>
        <li className="flex items-center gap-1.5">
          <svg aria-hidden width="16" height="14" viewBox="0 0 16 14">
            <path d="M1 2 L15 2 L8 13 Z" fill={C.drop} />
          </svg>
          {t("mileage.legendDrop")}
        </li>
      </ul>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-labelledby={titleId}>
          <title id={titleId}>{t("mileage.chartLabel", { reg })}</title>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke={C.grid} strokeWidth="1" />
              <text x={M.l - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill={C.muted}>
                {tick(v)}
              </text>
            </g>
          ))}
          {/* Unit label anchored to the left edge: in some scripts it is wider than the tick gutter. */}
          <text x={1} y={10} textAnchor="start" fontSize="10" fill={C.muted}>
            {t("mileage.colKmpl")}
          </text>

          {band ? <polygon points={band} fill={C.usual} fillOpacity="0.12" /> : null}
          {usual.length > 1 ? (
            <polyline
              points={usual.map(({ u, i }) => `${x(i)},${y(u)}`).join(" ")}
              fill="none"
              stroke={C.usual}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}
          <polyline
            points={points.map((p, i) => `${x(i)},${y(p.kmpl)}`).join(" ")}
            fill="none"
            stroke={C.trip}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {points.map((p, i) => {
            const cx = x(i);
            const cy = y(p.kmpl);
            return (
              <g key={p.id} data-drop={p.drop ? "true" : "false"} data-kmpl={p.kmpl}>
                {active === i ? <circle cx={cx} cy={cy} r="10" fill="none" stroke={p.drop ? C.drop : C.trip} strokeWidth="2" /> : null}
                {p.drop ? (
                  <path d={`M${cx - 7} ${cy - 5} L${cx + 7} ${cy - 5} L${cx} ${cy + 7} Z`} fill={C.drop} stroke={C.surface} strokeWidth="2" strokeLinejoin="round" />
                ) : (
                  <circle cx={cx} cy={cy} r="5" fill={C.trip} stroke={C.surface} strokeWidth="2" />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r="14"
                  fill="transparent"
                  tabIndex={0}
                  aria-label={label(p)}
                  className="cursor-pointer outline-none"
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  onClick={() => setActive(i)}
                />
              </g>
            );
          })}

          {lastPoint ? (
            <text
              x={x(last)}
              y={lastPoint.drop ? y(lastPoint.kmpl) + 22 : y(lastPoint.kmpl) - 12}
              textAnchor="end"
              fontSize="12"
              fontWeight="600"
              fill={C.ink}
            >
              {lastPoint.kmplLabel}
            </text>
          ) : null}
          {[0, last].map((i) => {
            const p = points[i];
            return p ? (
              <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : "end"} fontSize="11" fill={C.muted}>
                {p.dateLabel}
              </text>
            ) : null;
          })}
        </svg>

        {activePoint && active !== null ? (
          <div
            role="status"
            className="pointer-events-none absolute z-10 w-max max-w-[14rem] -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-md"
            style={{
              left: `${Math.min(80, Math.max(20, (x(active) / W) * 100))}%`,
              top: `${(y(activePoint.kmpl) / H) * 100 - 6}%`,
            }}
          >
            <p className="text-base font-bold tabular-nums">{t("result.kmpl", { value: activePoint.kmplLabel })}</p>
            <p className="text-muted">
              {activePoint.dateLabel}
              {t("common.sep")}
              {t("trips.route", { from: activePoint.from, to: activePoint.to })}
            </p>
            <p className="text-muted">
              {activePoint.usualLabel !== null ? t("mileage.tooltipUsual", { usual: activePoint.usualLabel }) : t("mileage.noUsual")}
            </p>
            {activePoint.drop ? (
              <p className="flex items-center gap-1 font-semibold text-danger">
                <svg aria-hidden width="12" height="10" viewBox="0 0 16 14">
                  <path d="M1 2 L15 2 L8 13 Z" fill={C.drop} />
                </svg>
                {t("mileage.legendDrop")}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <details className="rounded-xl border border-line">
        <summary className="flex min-h-12 cursor-pointer items-center px-4 font-semibold text-brand">{t("mileage.table")}</summary>
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="px-4 py-2 font-semibold">{t("mileage.colTrip")}</th>
              <th className="px-2 py-2 text-right font-semibold">{t("mileage.colKmpl")}</th>
              <th className="px-2 py-2 text-right font-semibold">{t("mileage.colUsual")}</th>
              <th className="px-4 py-2 text-right font-semibold">{t("mileage.colVs")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {[...points].reverse().map((p) => (
              <tr key={p.id} className={p.drop ? "text-danger" : ""}>
                <td className="px-4 py-2">
                  <span className="block">{p.dateLabel}</span>
                  <span className="block text-muted">{t("trips.route", { from: p.from, to: p.to })}</span>
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{p.kmplLabel}</td>
                <td className="px-2 py-2 text-right tabular-nums">{p.usualLabel ?? t("common.dash")}</td>
                <td className="px-4 py-2 text-right font-semibold tabular-nums">
                  {p.vsUsualLabel !== null ? t("mileage.pct", { pct: p.vsUsualLabel }) : t("common.dash")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
