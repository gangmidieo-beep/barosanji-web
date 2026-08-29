"use client";

import { useState } from "react";
import type { DashboardData, SeriesPoint } from "@/lib/dashboard-data";

function dnum(n: number) {
  return Math.round(n).toLocaleString();
}

function dshort(n: number): string {
  if (n >= 100000000) {
    const v = (n / 100000000).toFixed(1).replace(/\.0$/, "");
    return `${v}억`;
  }
  if (n >= 10000) return `${Math.round(n / 10000).toLocaleString()}만`;
  return n.toLocaleString();
}

type Tip = { x: number; y: number; label: string; value: string } | null;

function BigBarChart({ chart }: { chart: DashboardData["chart"] }) {
  const [tip, setTip] = useState<Tip>(null);
  const series = chart.series;
  const maxV = Math.max(1, ...series.map((s) => s.value));
  const W = 760;
  const H = 230;
  const padL = 56;
  const padR = 12;
  const padT = 14;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const band = plotW / series.length;
  const barW = Math.min(24, band - 8);
  const step = Math.pow(10, Math.max(0, String(Math.floor(maxV / 4)).length - 1));
  const tick = Math.max(step, Math.ceil(maxV / 4 / step) * step);
  const yMax = Math.max(tick * 4, maxV);

  return (
    <div className="panel">
      <h2>{chart.title}</h2>
      {chart.caption && <p className="cap">{chart.caption}</p>}
      <div style={{ overflowX: "auto", position: "relative" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", minWidth: 520, height: "auto", display: "block" }}
          role="img"
          aria-label={chart.title}
        >
          {[0, 1, 2, 3, 4].map((g) => {
            const v = (yMax / 4) * g;
            const y = padT + plotH - (plotH * g) / 4;
            return (
              <g key={g}>
                <line
                  x1={padL}
                  y1={y}
                  x2={W - padR}
                  y2={y}
                  stroke={g === 0 ? "#c3c2b7" : "#e1e0d9"}
                  strokeWidth={1}
                />
                <text x={padL - 8} y={y + 4} textAnchor="end" fontSize={11} fill="#898781">
                  {dshort(v)}
                </text>
              </g>
            );
          })}

          {series.map((s, i) => {
            const x = padL + band * i + (band - barW) / 2;
            const bh = yMax > 0 ? (plotH * s.value) / yMax : 0;
            const y = padT + plotH - bh;
            const r = Math.min(4, Math.max(0, bh));
            const isMax = s.value === maxV && s.value > 0;
            return (
              <g
                key={s.key}
                className="chart-hit"
                onMouseMove={(e) =>
                  setTip({
                    x: e.clientX,
                    y: e.clientY,
                    label: s.key,
                    value: `${dnum(s.value)}${chart.unit ?? ""}`,
                  })
                }
                onMouseLeave={() => setTip(null)}
              >
                <rect className="hit" x={padL + band * i} y={padT} width={band} height={plotH} fill="transparent" />
                {bh > 0 && (
                  <path
                    d={`M${x} ${padT + plotH} L${x} ${y + r} Q${x} ${y} ${x + r} ${y} L${x + barW - r} ${y} Q${x + barW} ${y} ${x + barW} ${y + r} L${x + barW} ${padT + plotH} Z`}
                    fill="#2f9e44"
                  />
                )}
                {isMax && (
                  <text x={x + barW / 2} y={y - 7} textAnchor="middle" fontSize={11} fontWeight={600} fill="#0b0b0b">
                    {dshort(s.value)}
                  </text>
                )}
              </g>
            );
          })}

          {series.map((s, i) => {
            if ((i) % 2 !== 0 && i !== series.length - 1) return null;
            return (
              <text
                key={s.key}
                x={padL + band * i + band / 2}
                y={H - 8}
                textAnchor="middle"
                fontSize={11}
                fill="#898781"
              >
                {s.key}
              </text>
            );
          })}
        </svg>
        {tip && (
          <div
            className="bar-tip on"
            style={{ position: "fixed", left: Math.min(window.innerWidth - 150, tip.x + 12), top: tip.y - 40 }}
          >
            <b>{tip.label}</b> · {tip.value}
          </div>
        )}
      </div>
      <div style={{ fontSize: 11.5, color: "#898781", marginTop: 8 }}>
        기간 합계 <b style={{ color: "#0b0b0b" }}>{dnum(chart.footerTotal)}{chart.unit}</b> · 하루 평균{" "}
        {dnum(chart.footerAvg)}
        {chart.unit}
      </div>
    </div>
  );
}

function MiniChart({ series, title, left, right }: { series: SeriesPoint[]; title: string; left?: string; right?: string }) {
  const mMax = Math.max(1, ...series.map((s) => s.value));
  const VW = 320;
  const VH = 96;
  const vpadB = 16;
  const vband = VW / series.length;
  const vbarW = Math.min(14, vband - 4);

  return (
    <>
      <div className="side-title">{title}</div>
      <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label={title}>
        <line x1={0} y1={VH - vpadB} x2={VW} y2={VH - vpadB} stroke="#c3c2b7" strokeWidth={1} />
        {series.map((s, i) => {
          const vh = ((VH - vpadB - 6) * s.value) / mMax;
          if (vh <= 0) return null;
          const vx = vband * i + (vband - vbarW) / 2;
          const vy = VH - vpadB - vh;
          const vr = Math.min(3, Math.max(0, vh));
          return (
            <path
              key={s.key}
              d={`M${vx} ${VH - vpadB} L${vx} ${vy + vr} Q${vx} ${vy} ${vx + vr} ${vy} L${vx + vbarW - vr} ${vy} Q${vx + vbarW} ${vy} ${vx + vbarW} ${vy + vr} L${vx + vbarW} ${VH - vpadB} Z`}
              fill="#2f9e44"
              opacity={0.85}
            />
          );
        })}
        <text x={0} y={VH - 3} fontSize={10} fill="#898781">
          {left}
        </text>
        <text x={VW} y={VH - 3} fontSize={10} fill="#898781" textAnchor="end">
          {right}
        </text>
      </svg>
    </>
  );
}

const statusClass: Record<string, string> = {
  결제완료: "st-ok",
  배송완료: "st-ok",
  배송중: "st-wait",
  배송준비: "st-wait",
  결제대기: "st-wait",
  취소: "st-no",
  실패: "st-no",
};

export default function DashBoard({ data }: { data: DashboardData }) {
  const { hero, tiles, todo, chart, sources, miniChart, orders, users } = data;

  return (
    <div className="dash">
      <h1 className="dash-title">{data.title}</h1>

      {/* hero */}
      <div className="hero">
        <div>
          <div className="lbl">
            {hero.label} {hero.labelSub && <span style={{ fontSize: 11.5 }}>{hero.labelSub}</span>}
          </div>
          <div className="fig">
            {dnum(hero.value)}
            {hero.unit && <small>{hero.unit}</small>}
          </div>
          <div className="sub">
            {hero.sub}
            {hero.delta && (
              <>
                {" "}
                · <span className={hero.delta.dir}>{hero.delta.txt}</span>
              </>
            )}
          </div>
        </div>
        {hero.right && (
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div className="lbl">{hero.right.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600 }}>
              {dnum(hero.right.value)}
              {hero.right.unit}
            </div>
            <div className="sub">{hero.right.sub}</div>
          </div>
        )}
      </div>

      {/* tiles */}
      <div className="tiles">
        {tiles.map((t) => (
          <div className="tile" key={t.label}>
            <div className="lbl">{t.label}</div>
            <div className="val">
              {t.text ?? dnum(t.value ?? 0)}
              {t.unit && <small>{t.unit}</small>}
            </div>
            <div className="dl">
              {t.delta && (
                <>
                  {t.deltaLabel} <span className={t.delta.dir}>{t.delta.txt}</span>
                  {t.note ? " · " : ""}
                </>
              )}
              {t.note}
            </div>
          </div>
        ))}
      </div>

      {/* todo */}
      <div className="todo">
        {todo.map((t) =>
          t.href ? (
            <a href={t.href} key={t.label}>
              <div className="t">{t.label}</div>
              <div className={`n ${t.warn ? "warn" : ""}`}>{t.n}</div>
            </a>
          ) : (
            <div className="cell" key={t.label}>
              <div className="t">{t.label}</div>
              <div className={`n ${t.warn ? "warn" : ""}`}>{t.n}</div>
            </div>
          )
        )}
      </div>

      {/* big chart */}
      <BigBarChart chart={chart} />

      {/* sources + mini chart */}
      <div className="panel">
        <h2>
          {sources.title} <span style={{ fontSize: 13, fontWeight: 500, color: "var(--muted)" }}>{sources.titleSub}</span>
        </h2>
        {sources.caption && <p className="cap">{sources.caption}</p>}
        <div className="inflow">
          <div>
            {sources.rows.map((r) => {
              const tot = sources.rows.reduce((s, x) => s + x.c, 0);
              const pct = tot ? Math.round((r.c / tot) * 100) : 0;
              return (
                <div className="src-row" key={r.name}>
                  <span className="src-name">{r.name}</span>
                  <span className="src-track">
                    <span className="src-fill" style={{ width: `${Math.max(2, pct)}%` }} />
                  </span>
                  <span className="src-val">
                    {dnum(r.c)}
                    <em>{sources.unit}</em> <b>{pct}%</b>
                  </span>
                </div>
              );
            })}
          </div>
          <div>
            <MiniChart series={miniChart.series} title={miniChart.title} left={miniChart.left} right={miniChart.right} />
          </div>
        </div>
      </div>

      {/* panels */}
      <div className="cols">
        <div className="panel">
          <h2>최근 주문</h2>
          <table className="mini">
            <tbody>
              <tr>
                <th>주문번호 / 주문자</th>
                <th>상태</th>
                <th>결제금액</th>
              </tr>
              {orders.map((o) => (
                <tr key={o.orderNo}>
                  <td>
                    <b>{o.orderNo}</b>
                    <br />
                    <span style={{ color: "#898781", fontSize: 11.5 }}>
                      {o.buyer} · {o.dateLabel}
                    </span>
                  </td>
                  <td>
                    <span className={`st ${statusClass[o.status] ?? "st-wait"}`}>{o.status}</span>
                  </td>
                  <td>{dnum(o.amount)}원</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ color: "#898781", fontSize: 13, textAlign: "center", padding: "16px 0" }}>
                    아직 들어온 주문이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h2>
            최근 가입 회원{" "}
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--muted)" }}>전체 {users.length}명</span>
          </h2>
          <p className="cap">최근 7일 {users.length}명 가입</p>
          {users.length === 0 && (
            <p style={{ color: "#898781", fontSize: 13, padding: "12px 0" }}>아직 가입한 회원이 없습니다.</p>
          )}
          {users.map((u) => (
            <div className="row" key={u.email}>
              <div className="av">{u.initial}</div>
              <div className="g">
                <b>{u.name}</b>
                <span>{u.email}</span>
              </div>
              <div className="amt">{u.dateLabel}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
