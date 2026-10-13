"use client";
import React, { useState, useMemo, useEffect } from "react";

/*  PLANIFICADOR FINANCIERO DETERMINISTA · v2.0
    Multi-usuario · 4 escenarios · categorías · cronogramas y % mes a mes · metas · sugerencias
    · flujo mensual · torta por categoría · proyección de ahorro y deuda.
    Sin IA, sin red. Estilos inline → portable a Next.js/Vercel.
    Nota: los datos viven durante la sesión; la persistencia (base de datos) es el próximo paso. */

const H = 24;
const START = 8; // Sep
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const mlabel = (m) => MESES[(START + m) % 12] + " " + (26 + Math.floor((START + m) / 12));
const P = {
  ink: "var(--ink)", paper: "var(--paper)", panel: "var(--panel)", teal: "var(--teal)",
  healthy: "var(--healthy)", caution: "var(--caution)", critical: "var(--critical)",
  muted: "var(--muted)", line: "var(--line)", faint: "var(--faint)",
  blue: "var(--blue)", gold: "var(--gold)", softgreen: "var(--softgreen)",
};
const SCC = { e1: "var(--s1)", e2: "var(--s2)", e3: "var(--s3)", e4: "var(--s4)" };
const SCL = { e1: "Esc 1", e2: "Esc 2", e3: "Esc 3", e4: "Esc 4" };
const SCEN = ["e1", "e2", "e3", "e4"];
const CATCOLORS = ["#1F6F78", "#3E6FA8", "#4E8A6B", "#6E8CA0", "#88A07A", "#5A6B8C", "#9A8A6B", "#7E9AA8", "#6B7E9C", "#8A7E9C", "#5E8A7A", "#A0846B"];
const money = (n) => (n < 0 ? "−" : "") + "$" + Math.abs(Math.round(n)).toLocaleString("en-US");
const pct = (n) => Math.round(n * 100) + "%";
let _id = 0; const uid = () => ++_id;
const bumpId = (n) => { if (n > _id) _id = n; };
const z = () => Array(H).fill(0);
const hoy = () => new Date().toISOString().slice(0, 10);
function metaAporte(g, m) {
  const ini = g.mesInicio || 0, fin = g.mesObjetivo;
  if (fin < ini || m < ini || m > fin) return 0;
  if (g.modo === "manual") {
    const off = g.mesesOff || {};
    if (off[m]) return 0;
    let cnt = 0; for (let k = ini; k <= fin; k++) if (!off[k]) cnt++;
    return cnt ? (+g.monto || 0) / cnt : 0;
  }
  return (+g.monto || 0) / (fin - ini + 1);
}
const provKeys = { deudas: { list: "pagosProv", tot: "pagos", lbl: "Proveedor" }, porCobrar: { list: "cobrosProv", tot: "cobros", lbl: "Pagador" } };
function recalcTot(it, k) { const list = it[k.list] || []; const tot = []; for (let m = 0; m < H; m++) tot.push((list[m] || []).reduce((a, p) => a + (+p.monto || 0), 0)); return { ...it, [k.tot]: tot }; }
function normProv(prov, tot, lbl) {
  const out = [];
  for (let m = 0; m < H; m++) {
    if (Array.isArray(prov) && Array.isArray(prov[m]) && prov[m].length) {
      out.push(prov[m].map((p) => ({ id: typeof p.id === "number" ? p.id : uid(), prov: (p.prov || "").trim() || (lbl + " 1"), monto: +p.monto || 0 })));
    } else {
      const v = (tot && tot[m]) || 0;
      out.push(v > 0 ? [{ id: uid(), prov: lbl + " 1", monto: v }] : []);
    }
  }
  return out;
}
const pad = (a) => { const b = a.slice(0, H); while (b.length < H) b.push(0); return b; };

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
.app{--paper:#F2F4F7;--panel:#FFFFFF;--ink:#0E1A2B;--muted:#556273;--line:#DCE2E9;--faint:#EEF2F6;--teal:#1D4B7A;--healthy:#17704D;--caution:#9A6206;--critical:#A63A2D;--blue:#3E6FA8;--gold:#B08A3E;--softgreen:#7FB8A0;--dash:#B5C0CC;--good-soft:#E1F2EA;--warn-soft:#FBF0DC;--bad-soft:#F8E5E2;--pri-soft:#E3ECF6;--s1:#B7C6D6;--s2:#7C9BBC;--s3:#1D4B7A;--s4:#0B2A4A;min-height:100vh;width:100%;font-family:'IBM Plex Sans','Helvetica Neue',Arial,sans-serif;font-size:14px;font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;transition:background .2s ease,color .2s ease}
.app.dark{--paper:#0E141B;--panel:#16202B;--ink:#E6ECF2;--muted:#9AA9B8;--line:#2A3646;--faint:#1C2733;--teal:#3F7CC0;--healthy:#4FB487;--caution:#D6A04A;--critical:#E07A66;--blue:#6BA0DE;--gold:#C9A55A;--softgreen:#5AA588;--dash:#3A4757;--good-soft:#16302A;--warn-soft:#33290F;--bad-soft:#3A1F1B;--pri-soft:#1B2E44;--s1:#2E4157;--s2:#4A6E94;--s3:#3F7CC0;--s4:#9CC3EC}
.wrap{max-width:1200px;margin:0 auto;padding:20px 20px 40px}
.mono{font-variant-numeric:tabular-nums}
.gcol{display:grid;gap:16px;min-width:0;align-content:start}
.split{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(0,1fr);gap:20px;align-items:start}
.split2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;align-items:start}
.cards4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px 20px;min-width:0}
.eb{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:600;margin-bottom:4px}
.h2{font-size:16px;font-weight:600;color:var(--ink);margin:0 0 12px}
.row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 0;min-width:0}
input,select{outline:none;font-family:inherit;font-size:14px;border-radius:9px;border:1px solid var(--line);background:var(--faint);color:var(--ink)}
.num{width:104px;height:40px;text-align:right;padding:0 10px;font-weight:600}
.nam{flex:1;min-width:0;padding:6px;background:transparent;border:none;border-bottom:1px dashed var(--dash);border-radius:0;font-size:14px}
.nam:focus{background:var(--faint);border-bottom:1px solid var(--teal)}
.sel{font-size:13px;height:36px;padding:0 8px;max-width:150px}
input:focus,select:focus{box-shadow:0 0 0 3px var(--pri-soft);border-color:var(--teal)}
.btn{cursor:pointer;font-family:inherit;font-size:13px;font-weight:500;border:1px solid var(--line);background:var(--panel);color:var(--teal);border-radius:10px;padding:8px 12px;min-height:36px}
.btn:hover{border-color:var(--teal)}
.primary{cursor:pointer;font-family:inherit;font-size:14px;font-weight:600;border:none;background:var(--teal);color:#fff;border-radius:10px;padding:0 18px;min-height:40px}
.x{cursor:pointer;border:none;background:transparent;color:var(--muted);font-size:18px;line-height:1;padding:4px 6px;min-width:32px;min-height:32px}
.scroll{max-height:340px;overflow:auto;padding-right:4px;margin-right:-4px}
.pill{cursor:pointer;font-family:inherit;font-size:13px;padding:6px 12px;border-radius:20px}
.grid24{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-top:8px;padding:10px;background:var(--faint);border-radius:10px}
.si{width:100%;height:36px;text-align:right;font-size:14px;font-weight:600;padding:0 8px;border:1px solid var(--line);border-radius:8px;background:var(--panel)}
.tbl{width:100%;border-collapse:collapse;font-size:13px}
.tbl th,.tbl td{padding:7px 8px;text-align:right;white-space:nowrap}
.tbl th:first-child,.tbl td:first-child{text-align:left;white-space:normal}
.tbl thead th{color:var(--muted);font-size:11px;letter-spacing:.06em;text-transform:uppercase;font-weight:600;border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--panel)}
.tblw{overflow-x:auto}
.top{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:14px}
.bigname{font-family:inherit;font-size:32px;font-weight:700;letter-spacing:-.02em;color:var(--ink);border:none;background:transparent;padding:0;width:100%;min-width:0}
.acts{display:flex;align-items:center;gap:8px;position:relative;flex-wrap:wrap}
.menu{position:absolute;right:0;top:calc(100% + 8px);z-index:40;width:290px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:8px;box-shadow:0 12px 32px rgba(14,26,43,.18);display:grid;gap:2px}
.mi{cursor:pointer;font-family:inherit;text-align:left;border:none;background:transparent;color:var(--ink);font-size:14px;border-radius:8px;padding:10px 12px;min-height:40px}
.mi:hover{background:var(--faint)}
.tabs{display:flex;gap:4px;margin:0 0 20px;border-bottom:1px solid var(--line)}
.tab{cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:8px;border:none;background:transparent;font-size:14px;font-weight:600;padding:10px 14px;color:var(--muted);border-bottom:2px solid transparent;margin-bottom:-1px}
.tab.on{color:var(--teal);border-bottom-color:var(--teal)}
.mbar{display:flex;align-items:center;gap:6px}
.iconbtn{cursor:pointer;font-family:inherit;width:36px;height:36px;border-radius:9px;border:1px solid var(--line);background:var(--panel);color:var(--ink);font-size:18px;line-height:1}
.foldh{width:100%;display:flex;align-items:center;gap:12px;padding:16px 20px;border:none;background:transparent;cursor:pointer;text-align:left;color:var(--ink);font-family:inherit}
.chip{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;padding:4px 9px;border-radius:12px}
.plist .nam{border-bottom:1px solid transparent}.plist .nam:hover{border-bottom-color:var(--line)}.plist .nam:focus{border-bottom-color:var(--teal)}
.plist .num{background:transparent;border-color:transparent}.plist .num:hover{border-color:var(--line)}.plist .num:focus{background:var(--panel);border-color:var(--teal)}
.plist .sel{background:transparent;border-color:transparent;color:var(--muted);height:30px;padding:0 4px;font-size:12px}.plist .sel:hover{border-color:var(--line)}
.sticky{position:sticky;top:8px;z-index:25;box-shadow:0 6px 18px rgba(14,26,43,.08)}
.kpis4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
@media(max-width:900px){.kpis4{grid-template-columns:repeat(2,minmax(0,1fr))}.split,.split2{grid-template-columns:1fr}.cards4{grid-template-columns:1fr 1fr}.g2{grid-template-columns:1fr}}
@media(max-width:700px){.wrap{padding:14px 12px 104px}.bigname{font-size:24px}.tabs{position:fixed;left:0;right:0;bottom:0;z-index:30;margin:0;background:var(--panel);border-top:1px solid var(--line);border-bottom:none;padding:4px 4px calc(10px + env(safe-area-inset-bottom,0px));display:grid;grid-template-columns:repeat(4,1fr)}.tab{flex-direction:column;gap:3px;font-size:11px;padding:6px 2px;min-height:54px;border-bottom:none;margin:0}.tab.on{border-bottom:none}.menu{width:min(300px,calc(100vw - 24px))}.panel{padding:16px}.top{align-items:flex-start}}
`;

/* ─────────────── DATOS ─────────────── */
const CATS0 = ["ALQUILER", "EXPENSAS", "SERVICIOS", "TRANSPORTE", "COMIDA", "OCIO", "FAMILIA", "SUSCRIPCIONES", "INVERSIONES", "DEUDAS"];
const blankInp = () => ({
  ingreso: { e1: 0, e2: 0, e3: 0, e4: 0 }, escNombres: { e1: "Esc 1", e2: "Esc 2", e3: "Esc 3", e4: "Esc 4" }, laborPorTrabajo: 3200,
  reserva: Array(H).fill(0.24), ahorro: Array(H).fill(0),
  ahorroLiquido: 0, gastosControlados: false, objetivoFE: 6, objetivoAhorro: 0.2,
  categorias: [...CATS0], gastosItems: [], deudas: [], porCobrar: [], metas: [], actuals: {}, fechaProy: hoy(),
  horizonte: Array.from({ length: H }, () => ({ sc: "e2" })),
});
const gabrielInp = () => ({
  ingreso: { e1: 6000, e2: 8500, e3: 10500, e4: 12500 }, escNombres: { e1: "Esc 1", e2: "Esc 2", e3: "Esc 3", e4: "Esc 4" }, laborPorTrabajo: 3200,
  reserva: Array(H).fill(0.24), ahorro: Array(H).fill(0),
  ahorroLiquido: 0, gastosControlados: true, objetivoFE: 6, objetivoAhorro: 0.2,
  categorias: [...CATS0],
  deudas: [
    { id: uid(), n: "Impuestos 22–25 (IRS)", saldo: 25000, tasa: 0, tipo: "impuesto", ambito: "compania", cat: "DEUDAS", pagos: Array(H).fill(700) },
    { id: uid(), n: "Vendors / crew 86LAB", saldo: 24167.67, tasa: 0, tipo: "personal", ambito: "compania", cat: "DEUDAS", pagos: pad([8000, 6000, 3000, 3000, 2000, 2167.67]) },
    { id: uid(), n: "Deudas personales", saldo: 13900, tasa: 0, tipo: "personal", ambito: "personal", cat: "DEUDAS", pagos: pad([3000, 3000, 2000, 2000, 2000, 1900]) },
  ],
  porCobrar: [
    { id: uid(), n: "Clientes compañía", monto: 3000, ambito: "compania", cat: "INVERSIONES", cobros: pad([3000]) },
    { id: uid(), n: "Clientes personales", monto: 7600, ambito: "personal", cat: "INVERSIONES", cobros: pad([4300, 1500, 900, 900]) },
  ],
  gastosItems: [
    { id: uid(), n: "Renta", m: 1450, viv: true, cat: "ALQUILER" }, { id: uid(), n: "Comida / vida diaria", m: 2000, cat: "COMIDA" },
    { id: uid(), n: "Auto", m: 340, cat: "TRANSPORTE" }, { id: uid(), n: "Seguro auto", m: 279.04, cat: "TRANSPORTE" },
    { id: uid(), n: "Teléfono", m: 165.8, cat: "SERVICIOS" }, { id: uid(), n: "Seguro de vida", m: 200, cat: "FAMILIA" },
    { id: uid(), n: "Familia", m: 200, cat: "FAMILIA" }, { id: uid(), n: "Internet", m: 25, cat: "SERVICIOS" },
    { id: uid(), n: "Luz", m: 50, cat: "SERVICIOS" }, { id: uid(), n: "Limpieza", m: 75, cat: "SERVICIOS" },
    { id: uid(), n: "Suscripciones", m: 70, cat: "SUSCRIPCIONES" }, { id: uid(), n: "Peajes SunPass", m: 200, cat: "TRANSPORTE" },
    { id: uid(), n: "Website", m: 29, cat: "SERVICIOS" }, { id: uid(), n: "Imprevistos", m: 200, cat: "OCIO" },
  ],
  metas: [], actuals: {}, fechaProy: hoy(),
  horizonte: Array.from({ length: H }, (_, i) => ({ sc: i === 0 ? "e4" : i === 1 ? "e4" : i === 2 ? "e2" : i === 3 ? "e1" : "e2" })),
});

/* ─────────────── PERSISTENCIA (respaldo + autoguardado) ─────────────── */
const LSKEY = "finora_profiles_v2";
function maxIdIn(o) { let mx = 0; const w = (x) => { if (Array.isArray(x)) x.forEach(w); else if (x && typeof x === "object") { if (typeof x.id === "number") mx = Math.max(mx, x.id); Object.values(x).forEach(w); } }; w(o); return mx; }
function padH(h) { const b = Array.from({ length: H }, () => ({ sc: "e2" })); for (let k = 0; k < Math.min(h.length, H); k++) if (h[k] && h[k].sc) b[k] = { sc: h[k].sc }; return b; }
function normInp(inp) {
  inp = inp || {}; const x = { ...blankInp(), ...inp };
  x.ingreso = { e1: 0, e2: 0, e3: 0, e4: 0, ...(inp.ingreso || {}) };
  x.escNombres = { e1: "Esc 1", e2: "Esc 2", e3: "Esc 3", e4: "Esc 4", ...(inp.escNombres || {}) };
  x.reserva = Array.isArray(inp.reserva) ? pad(inp.reserva.map(Number)) : Array(H).fill(typeof inp.reserva === "number" ? inp.reserva : 0.24);
  x.ahorro = Array.isArray(inp.ahorro) ? pad(inp.ahorro.map(Number)) : Array(H).fill(0);
  x.categorias = (inp.categorias && inp.categorias.length) ? inp.categorias : [...CATS0];
  x.gastosItems = (inp.gastosItems || []).map((g) => ({ id: typeof g.id === "number" ? g.id : uid(), n: "", m: 0, cat: CATS0[0], ...g }));
  x.deudas = (inp.deudas || []).map((d) => { const base = { id: typeof d.id === "number" ? d.id : uid(), n: "", saldo: 0, tasa: 0, tipo: "personal", ambito: "personal", cat: "DEUDAS", ...d, pagos: pad((d.pagos || []).map(Number)) }; const pp = normProv(base.pagosProv, base.pagos, "Proveedor"); return { ...base, pagosProv: pp, pagos: pad(pp.map((mo) => mo.reduce((a, p) => a + (+p.monto || 0), 0))) }; });
  x.porCobrar = (inp.porCobrar || []).map((c) => { const base = { id: typeof c.id === "number" ? c.id : uid(), n: "", monto: 0, ambito: "personal", cat: "INVERSIONES", ...c, cobros: pad((c.cobros || []).map(Number)) }; const cp = normProv(base.cobrosProv, base.cobros, "Pagador"); return { ...base, cobrosProv: cp, cobros: pad(cp.map((mo) => mo.reduce((a, p) => a + (+p.monto || 0), 0))) }; });
  x.metas = (inp.metas || []).map((g) => ({ id: typeof g.id === "number" ? g.id : uid(), n: "", monto: 0, mesInicio: 0, mesObjetivo: 11, modo: "auto", mesesOff: {}, ...g }));
  x.actuals = inp.actuals && typeof inp.actuals === "object" ? JSON.parse(JSON.stringify(inp.actuals)) : {};
  const migr = (items, listKey, oldK, newK, lbl) => Object.keys(x.actuals).forEach((m) => {
    const mm = x.actuals[m]; if (!mm || !mm[oldK]) return;
    Object.keys(mm[oldK]).forEach((id) => {
      if (mm[newK] && mm[newK][id]) return;
      const it = items.find((q) => String(q.id) === String(id)); if (!it) return;
      const monthList = (it[listKey] || [])[m] || [], allP = (it[listKey] || []).flat().filter(Boolean);
      const name = (monthList[0] && monthList[0].prov) || (allP[0] && allP[0].prov) || lbl + " 1";
      mm[newK] = { ...(mm[newK] || {}), [id]: { [name]: +mm[oldK][id] || 0 } };
    });
  });
  migr(x.deudas, "pagosProv", "d", "dp", "Proveedor"); migr(x.porCobrar, "cobrosProv", "c", "cp", "Pagador");
  x.fechaProy = inp.fechaProy || hoy();
  x.horizonte = (Array.isArray(inp.horizonte) && inp.horizonte.length) ? padH(inp.horizonte) : blankInp().horizonte;
  return x;
}
function parseProfiles(d) {
  if (!Array.isArray(d) || !d.length) return null;
  bumpId(maxIdIn(d));
  return d.map((p) => ({ id: typeof p.id === "number" ? p.id : uid(), nombre: p.nombre || "Usuario", inp: normInp(p.inp) }));
}
function loadSaved() { try { if (typeof window !== "undefined" && window.localStorage) { const s = window.localStorage.getItem(LSKEY); if (s) return parseProfiles(JSON.parse(s)); } } catch (e) {} return null; }

/* ─────────────── MOTOR ─────────────── */
function runEngine(i) {
  const gastos = i.gastosItems.reduce((a, x) => a + (+x.m || 0), 0);
  const vivienda = i.gastosItems.filter((x) => x.viv).reduce((a, x) => a + (+x.m || 0), 0);
  const rf0 = i.reserva[0] || 0;
  const deudaCuota0 = i.deudas.reduce((a, d) => a + (d.pagos?.[0] || 0), 0);

  const escArr = SCEN.map((s) => {
    const labor = +i.ingreso[s] || 0, disp = labor - labor * rf0;
    return { s, labor, disp, allIn: disp - gastos - deudaCuota0 };
  });
  const allIns = escArr.map((e) => e.allIn);
  const excProm = allIns.reduce((a, b) => a + b, 0) / escArr.length;
  const excMin = Math.min(...allIns);
  const anyIncome = SCEN.some((s) => i.ingreso[s]);
  const dispProm = escArr.reduce((a, e) => a + e.disp, 0) / escArr.length;
  const tasaAhorro = dispProm > 0 ? (dispProm - gastos) / dispProm : 0;
  const puntoEq = (gastos + deudaCuota0) / (1 - rf0);
  const trabajosEq = i.laborPorTrabajo > 0 ? puntoEq / i.laborPorTrabajo : 0;
  const mesesFondo = gastos > 0 ? i.ahorroLiquido / gastos : 0;

  // Matriz por ámbito
  const sum = (arr, k, a) => arr.filter((x) => (a ? x.ambito === a : true)).reduce((s, x) => s + (+x[k] || 0), 0);
  const M = { pagarCia: sum(i.deudas, "saldo", "compania"), pagarPers: sum(i.deudas, "saldo", "personal"), cobrarCia: sum(i.porCobrar, "monto", "compania"), cobrarPers: sum(i.porCobrar, "monto", "personal") };
  M.totalPagar = M.pagarCia + M.pagarPers; M.totalCobrar = M.cobrarCia + M.cobrarPers; M.deudaNeta = M.totalPagar - M.totalCobrar;

  const toxicas = i.deudas.filter((d) => +d.saldo > 0 && (d.tasa >= 0.4 || d.tipo === "rotativa" || d.tipo === "impuesto"));
  const cargaViv = dispProm > 0 ? vivienda / dispProm : 0;

  const gates = [
    { id: "G1", et: "Ordenar", l: "Excedente positivo en un mes típico", pass: excProm > 0, v: money(excProm) },
    { id: "G2", et: "Ordenar", l: "Gasto bajo control: categorizado y con topes", pass: !!i.gastosControlados, v: i.gastosControlados ? "sí" : "no" },
    { id: "G3", et: "Estabilizar", l: "Colchón de arranque (≥ 1 mes de gastos)", pass: mesesFondo >= 1, v: mesesFondo.toFixed(1) + " m" },
    { id: "G4", et: "Estabilizar", l: "Sin deuda cara ni fiscal sin saldar", pass: toxicas.length === 0, v: toxicas.length ? money(toxicas.reduce((a, d) => a + d.saldo, 0)) : "OK" },
    { id: "G5", et: "Estabilizar", l: `Fondo de emergencia completo (≥ ${i.objetivoFE} m)`, pass: mesesFondo >= i.objetivoFE, v: mesesFondo.toFixed(1) + " m" },
    { id: "G6", et: "Crecer", l: `Tasa de ahorro ≥ ${pct(i.objetivoAhorro)}`, pass: tasaAhorro >= i.objetivoAhorro, v: pct(tasaAhorro) },
    { id: "G7", et: "Crecer", l: "Patrimonio en movimiento (metas / inversión)", pass: i.metas.length > 0, v: i.metas.length ? i.metas.length + " metas" : "—" },
  ];
  const primerFallo = gates.find((g) => !g.pass);
  const etapa = primerFallo ? primerFallo.et : "Crecer";

  const flags = [];
  if (anyIncome) {
    if (excMin < 0) flags.push({ s: "critical", t: `Tu peor escenario da ${money(excMin)}: el sistema sangra sin red.` });
    if (mesesFondo < 1) flags.push({ s: "critical", t: "Colchón por debajo de 1 mes: un imprevisto se paga con deuda nueva." });
    if (toxicas.length) flags.push({ s: "caution", t: `Deuda cara/fiscal viva: ${money(toxicas.reduce((a, d) => a + d.saldo, 0))}.` });
    if (cargaViv > 0.35) flags.push({ s: "caution", t: `Vivienda = ${pct(cargaViv)} del ingreso disponible (umbral 35%).` });
  }

  // ── FLUJO mes a mes (motor unificado) ──
  const deudas = i.deudas.map((d) => ({ ...d, rem: +d.saldo || 0 }));
  const cobrosSt = i.porCobrar.map((c) => ({ ...c, rem: +c.monto || 0 }));
  let ahorroAcum = i.ahorroLiquido, pool = 0, deudaPagAcum = 0, reservaAcum = 0, metasAcum = 0, deficitAcum = 0, cardPrev = 0;
  const flujo = i.horizonte.map((h, m) => {
    const salario = +i.ingreso[h.sc] || 0;
    let cobros = 0; cobrosSt.forEach((c) => { const g = Math.min(c.cobros?.[m] || 0, c.rem); c.rem -= g; cobros += g; });
    let deuda = 0; deudas.forEach((d) => { const p = Math.min(d.pagos?.[m] || 0, d.rem); d.rem -= p; deuda += p; });
    const metasMes = i.metas.reduce((a, g) => a + metaAporte(g, m), 0);
    const tarjeta = cardPrev; // parte del déficit anterior que el sobrante no alcanzó a cubrir
    const base = salario + cobros - gastos - deuda - metasMes - tarjeta;
    const tgtR = salario * (i.reserva[m] || 0), tgtA = salario * (i.ahorro[m] || 0);
    let reserva = 0, ahorro = 0, sobrante = 0, deficit = 0, cubierto = 0;
    if (base >= 0) {
      reserva = Math.min(base, tgtR); let r1 = base - reserva;
      ahorro = Math.min(r1, tgtA); sobrante = r1 - ahorro;
      pool += sobrante; cardPrev = 0;
    } else {
      const falta = -base;
      cubierto = Math.min(pool, falta); pool -= cubierto; // el sobrante acumulado cubre el déficit
      const uncovered = falta - cubierto;
      deficit = -uncovered; cardPrev = uncovered; // solo lo no cubierto pasa a tarjeta
    }
    ahorroAcum += ahorro; reservaAcum += reserva; metasAcum += metasMes; deudaPagAcum += deuda; if (deficit < 0) deficitAcum += -deficit;
    const sobranteAcum = pool;
    const patrimonioAcum = ahorroAcum + pool;
    const deudaTot = deudas.reduce((a, d) => a + Math.max(0, d.rem), 0);
    const cobrosPend = cobrosSt.reduce((a, c) => a + Math.max(0, c.rem), 0);
    const cardCarry = cardPrev;
    const patrimonioNeto = patrimonioAcum + reservaAcum + cobrosPend - deudaTot - cardCarry;
    const resultado = base >= 0 ? sobrante : deficit;
    return { m, sc: h.sc, salario, cobros, gastos, deuda, metasMes, tarjeta, cubierto, reserva, ahorro, sobrante, deficit, resultado, deudaTot, cobrosPend, cardCarry, patrimonioNeto, ahorroAcum, sobranteAcum, patrimonioAcum, deudaPagAcum, reservaAcum, metasAcum, deficitAcum };
  });
  const libre = anyIncome ? flujo.find((f) => f.deudaTot <= 0) : null;
  const colchon1 = anyIncome ? flujo.find((f) => f.patrimonioAcum >= gastos) : null;
  const bajoCero = anyIncome ? flujo.find((f) => f.deficit < 0) : null;

  // Gastos por categoría (base mensual)
  const catMensual = {};
  i.gastosItems.forEach((x) => { catMensual[x.cat || "SIN CAT"] = (catMensual[x.cat || "SIN CAT"] || 0) + (+x.m || 0); });

  // ── SUGERENCIAS ──
  const sug = [];
  if (anyIncome) {
    const avgSobrante = flujo.reduce((a, f) => a + f.sobrante, 0) / H;
    const noAhorra = i.ahorro.every((a) => !a);
    if (avgSobrante > 50 && noAhorra) sug.push({ s: "healthy", t: `Te sobran ~${money(avgSobrante)}/mes y no estás ahorrando nada: definí un % de ahorro y capturalo.` });
    else if (avgSobrante > 50) sug.push({ s: "healthy", t: `Margen de ~${money(avgSobrante)}/mes libre: podés subir el % de ahorro o adelantar deuda.` });
    Object.entries(catMensual).forEach(([c, v]) => {
      const share = dispProm > 0 ? v / dispProm : 0;
      if (c === "OCIO" && share > 0.1) sug.push({ s: "caution", t: `Ocio es ${pct(share)} del ingreso disponible; hay margen para recortar.` });
      if (c === "SUSCRIPCIONES" && share > 0.05) sug.push({ s: "caution", t: `Suscripciones pesan ${pct(share)}; revisá cuáles usás de verdad.` });
    });
    if (excMin < 0) sug.push({ s: "critical", t: `En tu peor escenario perdés ${money(excMin)}: subí el piso de ingresos o recortá variables.` });
    if (libre) sug.push({ s: "healthy", t: `Quedás libre de deuda en ${mlabel(libre.m)}: desde ahí redirigí esas cuotas al ahorro o a metas.` });
  }

  return { gastos, escArr, excProm, excMin, tasaAhorro, trabajosEq, mesesFondo, matriz: M, toxicas, gates, etapa, flags, prio: buildPrio(i, flujo, toxicas, gastos, excMin, trabajosEq), flujo, mile: { libre, colchon1, bajoCero }, anyIncome, catMensual, sug };
}
function buildPrio(i, flujo, toxicas, gastos, excMin, trabajosEq) {
  const cortoCobro = i.porCobrar.reduce((a, c) => a + (c.cobros?.[0] || 0) + (c.cobros?.[1] || 0), 0);
  const prio = [];
  if (cortoCobro > 0) prio.push({ t: "Cobrar las cuentas por cobrar", d: `Liquidez inmediata: ${money(cortoCobro)} en los próximos 2 meses.` });
  if (i.ahorroLiquido < gastos && SCEN.some((s) => i.ingreso[s])) prio.push({ t: "Armar el colchón de arranque", d: `Faltan ${money(Math.max(0, gastos - i.ahorroLiquido))} para 1 mes.` });
  if (toxicas.length) prio.push({ t: "Priorizar la deuda cara / fiscal", d: `${toxicas.map((d) => d.n).join(", ")} por encima de las 0%.` });
  if (excMin < 0 || trabajosEq > 2) prio.push({ t: "Subir el piso de ingresos", d: `Equilibrio en ~${trabajosEq.toFixed(1)} trabajos/mes.` });
  return prio;
}

/* ─────────────── UI helpers ─────────────── */
function Panel({ eb, title, children, right, fold, open, summary }) {
  const [o, setO] = useState(fold ? !!open : true);
  if (!fold) return (
    <section className="panel">
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>{eb && <div className="eb">{eb}</div>}{title && <h2 className="h2">{title}</h2>}</div>
        {right}
      </div>
      {children}
    </section>
  );
  return (
    <section className="panel" style={{ padding: 0 }}>
      <button className="foldh" onClick={() => setO(!o)} aria-expanded={o}>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {eb && <span className="eb" style={{ margin: 0 }}>{eb}</span>}
          <span style={{ fontSize: 16, fontWeight: 600 }}>{title}</span>
          {summary && <span style={{ fontSize: 14, color: P.muted }}>{summary}</span>}
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: P.muted, transform: o ? "rotate(90deg)" : "none", transition: "transform .15s" }}><path d="M9 6l6 6-6 6" /></svg>
      </button>
      {o && <div style={{ padding: "0 20px 18px" }}>{right && <div style={{ marginBottom: 10 }}>{right}</div>}{children}</div>}
    </section>
  );
}
const sev = (s) => (s === "critical" ? P.critical : s === "caution" ? P.caution : P.healthy);
const Amb = ({ v, onChange }) => (
  <span style={{ display: "inline-flex", border: `1px solid ${P.line}`, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
    {["compania", "personal"].map((a) => (
      <button key={a} onClick={() => onChange(a)} style={{ cursor: "pointer", border: "none", fontSize: 12, padding: "2px 6px", background: v === a ? P.teal : P.panel, color: v === a ? "#fff" : P.muted }}>{a === "compania" ? "Cía" : "Pers"}</button>
    ))}
  </span>
);
const CatSel = ({ v, cats, onChange }) => (
  <select className="sel" value={v || ""} onChange={(e) => onChange(e.target.value)}>
    {cats.map((c) => <option key={c} value={c}>{c}</option>)}
  </select>
);
function Grid24({ arr, onSet, pctMode, extra }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 4 }}>
      <button className="btn" style={{ fontSize: 12, padding: "3px 7px" }} onClick={() => setOpen((o) => !o)}>{open ? "▾" : "▸"} mes a mes {extra}</button>
      {open && (
        <div className="grid24">
          {arr.map((v, m) => (
            <div key={m} style={{ textAlign: "center" }}>
              <div className="mono" style={{ fontSize: 9, color: P.muted }}>{mlabel(m)}</div>
              <input className="si" type="number" value={pctMode ? Math.round(v * 100) : v} onChange={(e) => onSet(m, pctMode ? (+e.target.value || 0) / 100 : (+e.target.value || 0))} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function polar(cx, cy, r, a) { const rad = (a * Math.PI) / 180; return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }; }
function Pie({ data, size = 150 }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  let ang = -90; const cx = size / 2, cy = size / 2, r = size / 2 - 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((d, k) => {
        const a0 = ang, a1 = ang + (d.value / total) * 360; ang = a1;
        if (d.value <= 0) return null;
        const large = a1 - a0 > 180 ? 1 : 0;
        const p0 = polar(cx, cy, r, a0), p1 = polar(cx, cy, r, a1);
        if (d.value / total >= 0.999) return <circle key={k} cx={cx} cy={cy} r={r} fill={d.color} />;
        return <path key={k} d={`M${cx},${cy} L${p0.x.toFixed(1)},${p0.y.toFixed(1)} A${r},${r} 0 ${large} 1 ${p1.x.toFixed(1)},${p1.y.toFixed(1)} Z`} fill={d.color} />;
      })}
    </svg>
  );
}
const MonthSel = ({ v, onChange }) => (
  <select className="sel" style={{ maxWidth: 110 }} value={v} onChange={(e) => onChange(+e.target.value)}>
    {Array.from({ length: H }, (_, m) => <option key={m} value={m}>{mlabel(m)}</option>)}
  </select>
);
function aggProv(items, listKey, from = 0, to = H - 1) {
  const byMonth = {};
  items.forEach((it) => {
    (it[listKey] || []).forEach((monthArr, m) => {
      if (m < from || m > to) return;
      (monthArr || []).forEach((p) => {
        const name = (p.prov || "").trim() || "—";
        if (!byMonth[name]) byMonth[name] = Array(H).fill(0);
        byMonth[name][m] += (+p.monto || 0);
      });
    });
  });
  const byTotal = {}; let grand = 0;
  Object.entries(byMonth).forEach(([n, arr]) => { const t = arr.reduce((a, x) => a + x, 0); byTotal[n] = t; grand += t; });
  return { byMonth, byTotal, grand, names: Object.keys(byTotal).sort((a, b) => byTotal[b] - byTotal[a]) };
}
function ProvChart({ agg, sel, color }) {
  if (sel === "__all__") {
    const entries = agg.names.map((n) => [n, agg.byTotal[n]]).filter(([, v]) => v > 0);
    const max = Math.max(1, ...entries.map(([, v]) => v));
    if (!entries.length) return <div style={{ fontSize: 13, color: P.muted }}>Sin desglose por proveedor todavía.</div>;
    return (
      <div>
        {entries.map(([n, v], k) => (
          <div key={k} style={{ marginBottom: 7 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 2 }}><span>{n}</span><span className="mono" style={{ color: P.muted }}>{money(v)} · {pct(v / (agg.grand || 1))}</span></div>
            <div style={{ height: 11, background: P.faint, borderRadius: 3 }}><div style={{ height: "100%", width: `${(v / max) * 100}%`, background: color, borderRadius: 3 }} /></div>
          </div>
        ))}
      </div>
    );
  }
  const arr = agg.byMonth[sel] || Array(H).fill(0);
  const max = Math.max(1, ...arr);
  const tot = arr.reduce((a, x) => a + x, 0);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 84 }}>
        {arr.map((v, m) => <div key={m} title={`${mlabel(m)}: ${money(v)}`} style={{ flex: 1, background: color, opacity: 0.85, height: `${Math.max(2, (v / max) * 100)}%`, borderRadius: "2px 2px 0 0" }} />)}
      </div>
      <div style={{ marginTop: 8, fontSize: 14 }}>Total a <b>{sel}</b>: <b className="mono" style={{ color }}>{money(tot)}</b></div>
    </div>
  );
}

function SchedProv({ item, arr, saldo, allNames, provAdd, provDel, provEdit }) {
  const k = provKeys[arr];
  const [sel, setSel] = useState(null);
  const [all, setAll] = useState(false);
  const list = item[k.list] || [];
  const tot = item[k.tot] || [];
  const prog = tot.reduce((a, x) => a + (+x || 0), 0);
  const provNames = Array.from(new Set([...(allNames || []), ...list.flat().map((p) => p && p.prov)].filter(Boolean)));
  const monthProvs = sel === null ? [] : list[sel] || [];
  const monthTot = monthProvs.reduce((a, p) => a + (+p.monto || 0), 0);
  const lastUsed = tot.reduce((a, v, m) => (v > 0 ? m : a), -1);
  const shown = all ? H : Math.min(H, Math.max(12, Math.ceil((lastUsed + 1) / 6) * 6));
  const off = Math.abs(prog - saldo) > 1;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: P.muted }}>Cronograma · tocá un mes para ver o editar el detalle</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: off ? P.caution : P.healthy }}>Programado {money(prog)}{saldo ? ` de ${money(saldo)}` : ""}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 6 }}>
        {tot.slice(0, shown).map((v, m) => {
          const on = m === sel;
          return (
            <button key={m} onClick={() => setSel(on ? null : m)} aria-pressed={on} style={{ cursor: "pointer", fontFamily: "inherit", border: `1px solid ${on ? P.teal : "transparent"}`, borderRadius: 8, padding: "6px 2px", display: "grid", gap: 1, justifyItems: "center", background: on ? P.teal : v > 0 ? "var(--pri-soft)" : P.faint, color: on ? "#fff" : P.ink }}>
              <span style={{ fontSize: 11, color: on ? "#fff" : P.muted }}>{mlabel(m)}</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{v ? kfmt(v) : "—"}</span>
            </button>
          );
        })}
      </div>
      {shown < H && <button className="btn" style={{ marginTop: 6, fontSize: 12, minHeight: 30, padding: "4px 10px" }} onClick={() => setAll(true)}>Ver los {H} meses</button>}
      {sel !== null && (
        <div style={{ marginTop: 8, padding: 12, background: P.faint, borderRadius: 10, display: "grid", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{mlabel(sel)} · total <span style={{ color: P.teal }}>{money(monthTot)}</span></span>
            <button className="x" aria-label="Cerrar detalle" onClick={() => setSel(null)}>×</button>
          </div>
          <datalist id={`prov-${arr}-${item.id}`}>{provNames.map((n) => <option key={n} value={n} />)}</datalist>
          {monthProvs.map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input list={`prov-${arr}-${item.id}`} value={p.prov} placeholder={k.lbl} aria-label={k.lbl} onChange={(e) => provEdit(arr, item.id, sel, p.id, { prov: e.target.value })} onBlur={(e) => { const t = e.target.value.trim(); if (t !== e.target.value) provEdit(arr, item.id, sel, p.id, { prov: t }); }} style={{ flex: 1, minWidth: 0, height: 38, padding: "0 10px", background: P.panel }} />
              <input className="si" style={{ width: 110 }} type="number" aria-label="Monto" value={p.monto} onChange={(e) => provEdit(arr, item.id, sel, p.id, { monto: +e.target.value || 0 })} />
              <button className="x" aria-label="Quitar" onClick={() => provDel(arr, item.id, sel, p.id)}>×</button>
            </div>
          ))}
          {monthProvs.length === 0 && <div style={{ fontSize: 13, color: P.muted }}>Nada programado este mes.</div>}
          <button className="btn" style={{ justifySelf: "start" }} onClick={() => provAdd(arr, item.id, sel)}>+ {k.lbl.toLowerCase()}</button>
        </div>
      )}
    </div>
  );
}
function GBars({ groups, color, lblA, lblB }) {
  const shown = groups.map((g) => ({ label: g.label, rows: g.rows.filter((r) => (r.a || 0) > 0 || (r.b || 0) > 0) })).filter((g) => g.rows.length);
  const all = shown.flatMap((g) => g.rows);
  if (!all.length) return <div style={{ fontSize: 13, color: P.muted }}>Sin datos para mostrar todavía.</div>;
  const max = Math.max(1, ...all.flatMap((r) => [r.a || 0, r.b || 0]));
  return (
    <div>
      <div style={{ display: "flex", gap: 16, fontSize: 12, color: P.muted, marginBottom: 8 }}>
        <span><span style={{ display: "inline-block", width: 9, height: 9, background: P.line, borderRadius: 2, marginRight: 4 }} />{lblA}</span>
        <span><span style={{ display: "inline-block", width: 9, height: 9, background: color, borderRadius: 2, marginRight: 4 }} />{lblB}</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", height: 154, overflowX: "auto", paddingBottom: 46 }}>
        {shown.map((g, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 && <div style={{ alignSelf: "stretch", borderLeft: `2px dashed ${P.line}`, margin: "0 14px 46px" }} />}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              {g.label && <div className="mono" style={{ fontSize: 10, color: P.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".1em" }}>{g.label}</div>}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 104 }}>
                {g.rows.map((r, k) => (
                  <div key={k} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 auto", position: "relative" }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 104 }}>
                      <div title={`${lblA}: ${money(r.a || 0)}`} style={{ width: 15, height: `${Math.max(2, ((r.a || 0) / max) * 100)}%`, background: P.line, borderRadius: "2px 2px 0 0" }} />
                      <div title={`${lblB}: ${money(r.b || 0)}`} style={{ width: 15, height: `${Math.max(2, ((r.b || 0) / max) * 100)}%`, background: color, borderRadius: "2px 2px 0 0" }} />
                    </div>
                    <span style={{ position: "absolute", top: 108, left: "50%", transformOrigin: "left top", transform: "rotate(35deg)", fontSize: 10, color: P.muted, whiteSpace: "nowrap" }}>{r.n} · {pct((r.a || 0) > 0 ? (r.b || 0) / (r.a || 1) : 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
// Arrastre: lo que se proyectó pagar/cobrar en meses anteriores y no se cumplió,
// se suma a lo que corresponde este mes. Solo cuenta meses ya registrados.
function carryProv(actuals, item, listKey, key, prov, uptoM) {
  let c = 0;
  for (let k = 0; k < uptoM; k++) {
    const mm = actuals && actuals[k];
    const grp = mm && mm[key] && mm[key][item.id];
    if (grp && grp[prov] !== undefined) {
      const pr = ((item[listKey] || [])[k] || []).filter((p) => p.prov === prov).reduce((a, p) => a + (+p.monto || 0), 0);
      c += pr - (+grp[prov] || 0);
    }
    // Si en ese mes se condonó el saldo, el arrastre se cierra ahí
    if (mm && mm.wv && mm.wv[key] && mm.wv[key][item.id] && mm.wv[key][item.id][prov]) c = 0;
  }
  return c;
}
function RealProvTabla({ items, kind, rm, actuals, setActualProv, setWaive, onlyPend }) {
  const key = kind === "d" ? "dp" : "cp";
  const listKey = kind === "d" ? "pagosProv" : "cobrosProv";
  const totKey = kind === "d" ? "pagos" : "cobros";
  const A = actuals && actuals[rm] ? actuals[rm] : {};
  const grp = A[key] || {};
  const isWaived = (m, kd, id, prov) => { const mm = actuals && actuals[m]; const kk = kd === "d" ? "dp" : "cp"; return !!(mm && mm.wv && mm.wv[kk] && mm.wv[kk][id] && mm.wv[kk][id][prov]); };
  return (
    <table className="tbl">
      <thead><tr><th>{kind === "d" ? "Deuda / proveedor" : "Cobro / pagador"}</th><th>Proy.</th><th></th><th>Real</th><th>Δ</th></tr></thead>
      <tbody>
        {items.map((it) => {
          const allNames = Array.from(new Set((it[listKey] || []).flat().map((p) => p && p.prov).filter(Boolean)));
          const monthList = (it[listKey] || [])[rm] || [];
          const itemGrp = grp[it.id] || {};
          // Solo mostrar quienes tienen movimiento este mes: programado, arrastre pendiente, o ya registrado
          const names = allNames.filter((n) => {
            const pr = monthList.filter((p) => p.prov === n).reduce((a, p) => a + (+p.monto || 0), 0);
            const vis = pr > 0 || itemGrp[n] !== undefined || Math.abs(carryProv(actuals, it, listKey, key, n, rm)) > 1;
            return vis && !(onlyPend && itemGrp[n] !== undefined);
          });
          if (!names.length) return null;
          const projFor = (name) => monthList.filter((p) => p.prov === name).reduce((a, p) => a + (+p.monto || 0), 0);
          const carryFor = (name) => carryProv(actuals, it, listKey, key, name, rm);
          const ajuFor = (name) => Math.max(0, projFor(name) + carryFor(name));
          const realFor = (name) => itemGrp[name] || 0;
          const regFor = (name) => itemGrp[name] !== undefined;
          const projTot = names.reduce((a, n) => a + ajuFor(n), 0);
          const carryTot = names.reduce((a, n) => a + carryFor(n), 0);
          const realTot = names.reduce((a, n) => a + (+realFor(n) || 0), 0);
          return (
            <React.Fragment key={it.id}>
              <tr style={{ borderTop: `1px solid ${P.line}` }}>
                <td style={{ fontWeight: 600 }}>{it.n}</td>
                <td className="mono" style={{ color: P.muted }}>{money(projTot)}{Math.abs(carryTot) > 1 && <span style={{ color: P.caution, fontSize: 11 }}> ({carryTot > 0 ? "+" : "−"}{money(Math.abs(carryTot))} arr.)</span>}</td>
                <td></td>
                <td className="mono" style={{ fontWeight: 600 }}>{money(realTot)}</td>
                <td className="mono"><RealDelta real={realTot} proj={projTot} /></td>
              </tr>
              {names.map((n) => {
                const base = projFor(n), car = carryFor(n), pr = ajuFor(n), re = +realFor(n) || 0, reg = regFor(n), match = reg && Math.abs(re - pr) < 1;
                const pend = reg ? pr - re : 0;
                return (
                  <tr key={n} style={{ borderBottom: `1px solid ${P.faint}`, background: reg ? (match ? "rgba(79,170,136,0.20)" : "rgba(79,170,136,0.09)") : "rgba(214,164,62,0.16)" }}>
                    <td style={{ paddingLeft: 16, color: P.muted }}>{reg ? (match ? "✓ " : "• ") : "○ "}{n}
                      {reg && pend > 1 && <button title="No se va a cobrar/pagar: cerrar este saldo y no arrastrarlo" onClick={() => setWaive(rm, kind, it.id, n, true)} style={{ marginLeft: 6, cursor: "pointer", border: `1px solid ${P.line}`, background: P.panel, color: P.caution, borderRadius: 4, fontSize: 10, padding: "0 5px" }}>cerrar saldo</button>}
                      {isWaived(rm, kind, it.id, n) && <span style={{ marginLeft: 6, fontSize: 10, color: P.healthy }}>saldo cerrado <button onClick={() => setWaive(rm, kind, it.id, n, false)} style={{ cursor: "pointer", border: "none", background: "transparent", color: P.muted, fontSize: 10, textDecoration: "underline" }}>deshacer</button></span>}
                    </td>
                    <td className="mono" style={{ color: P.muted }}>{money(pr)}
                      {Math.abs(car) > 1 && <div style={{ fontSize: 10, color: P.caution }}>{money(base)} prog. {car > 0 ? "+" : "−"} {money(Math.abs(car))} arr.</div>}
                    </td>
                    <td><button title="Usar lo proyectado" onClick={() => setActualProv(rm, kind, it.id, n, pr)} style={{ cursor: "pointer", border: `1px solid ${P.line}`, background: P.panel, color: P.muted, borderRadius: 4, fontSize: 12, padding: "1px 6px" }}>=</button></td>
                    <td><input className="si" style={{ width: 82 }} type="number" placeholder="—" value={reg ? realFor(n) : ""} onChange={(e) => setActualProv(rm, kind, it.id, n, e.target.value === "" ? null : +e.target.value)} /></td>
                    <td className="mono">{reg ? <RealDelta real={re} proj={pr} /> : <span style={{ color: P.caution, fontSize: 11 }}>pendiente</span>}</td>
                  </tr>
                );
              })}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
function RealDelta({ real, proj }) { const d = real - proj; if (Math.abs(d) < 1) return <span style={{ color: P.muted }}>=</span>; return <span style={{ color: d > 0 ? P.critical : P.healthy }}>{d > 0 ? "+" : "−"}{money(Math.abs(d))}</span>; }
function RealTabla({ rows, kind, rm, setActual, actuals, pend, onlyPend }) {
  const A = actuals && actuals[rm] ? actuals[rm] : {};
  const gk = A[kind] || {};
  return (
    <table className="tbl"><thead><tr><th>{kind === "g" ? "Partida" : kind === "d" ? "Deuda" : "Cobro"}</th><th>Proy.</th><th></th><th>Real</th><th>Δ</th>{pend && <th>Pend.</th>}</tr></thead>
      <tbody>{rows.filter((r) => !(onlyPend && gk[r.id] !== undefined)).map((r) => {
        const reg = gk[r.id] !== undefined, match = reg && Math.abs(r.real - r.proj) < 1;
        return (
          <tr key={r.id} style={{ borderBottom: `1px solid ${P.faint}`, background: reg ? (match ? "rgba(79,170,136,0.20)" : "rgba(79,170,136,0.09)") : "rgba(214,164,62,0.16)" }}>
            <td>{reg ? (match ? "✓ " : "• ") : "○ "}{r.n}</td><td className="mono" style={{ color: P.muted }}>{money(r.proj)}</td>
            <td><button title="Usar lo proyectado" onClick={() => setActual(rm, kind, r.id, r.proj)} style={{ cursor: "pointer", border: `1px solid ${P.line}`, background: P.panel, color: P.muted, borderRadius: 4, fontSize: 12, padding: "1px 6px" }}>=</button></td>
            <td><input className="si" style={{ width: 82 }} type="number" placeholder="—" value={reg ? r.real : ""} onChange={(e) => setActual(rm, kind, r.id, e.target.value === "" ? null : +e.target.value)} /></td>
            <td className="mono">{reg ? <RealDelta real={r.real} proj={r.proj} /> : <span style={{ color: P.caution, fontSize: 11 }}>pendiente</span>}</td>
            {pend && <td className="mono" style={{ color: pend(r.id) > 0 ? (kind === "d" ? P.critical : P.caution) : P.healthy }}>{money(pend(r.id))}</td>}
          </tr>);
      })}
      </tbody></table>
  );
}
function CmpChart({ rows, la, lb, ca, cb }) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.a, r.b]));
  const sorted = [...rows].sort((x, y) => Math.max(y.a, y.b) - Math.max(x.a, x.b));
  const Bar = ({ v, c }) => (<div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ height: 13, width: `${(v / max) * 100}%`, minWidth: v > 0 ? 3 : 0, background: c, borderRadius: 2 }} /><span className="mono" style={{ fontSize: 11, color: P.muted }}>{money(v)}</span></div>);
  return (
    <div>
      <div style={{ display: "flex", gap: 16, fontSize: 12, color: P.muted, marginBottom: 8 }}>
        <span><span style={{ display: "inline-block", width: 9, height: 9, background: ca, borderRadius: 2, marginRight: 4 }} />{la}</span>
        <span><span style={{ display: "inline-block", width: 9, height: 9, background: cb, borderRadius: 2, marginRight: 4 }} />{lb}</span>
      </div>
      {sorted.length === 0 && <div style={{ fontSize: 13, color: P.muted }}>Sin datos.</div>}
      {sorted.map((r, k) => (
        <div key={k} style={{ marginBottom: 9 }}>
          <div style={{ fontSize: 13, marginBottom: 2 }}>{r.n}</div>
          <div style={{ display: "grid", gap: 2 }}><Bar v={r.a} c={ca} /><Bar v={r.b} c={cb} /></div>
        </div>
      ))}
    </div>
  );
}
function LineChart({ months, serieA, serieB, lblA, lblB, colA, colB }) {
  const W = 620, Hh = 190, pad = { l: 56, r: 12, t: 12, b: 26 };
  const vals = [...serieA, ...serieB.filter((v) => v !== null)];
  if (!months.length || !vals.length) return <div style={{ fontSize: 13, color: P.muted }}>Sin datos todavía.</div>;
  const mx = Math.max(...vals), mn = Math.min(...vals, 0);
  const rng = (mx - mn) || 1;
  const x = (k) => pad.l + (months.length === 1 ? (W - pad.l - pad.r) / 2 : (k * (W - pad.l - pad.r)) / (months.length - 1));
  const y = (v) => pad.t + (1 - (v - mn) / rng) * (Hh - pad.t - pad.b);
  const path = (s) => s.map((v, k) => (v === null ? null : `${x(k)},${y(v)}`)).filter(Boolean).join(" ");
  const zeroY = y(0);
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", gap: 16, fontSize: 12, color: P.muted, marginBottom: 6 }}>
        <span><span style={{ display: "inline-block", width: 14, height: 3, background: colA, marginRight: 4, verticalAlign: "middle" }} />{lblA}</span>
        <span><span style={{ display: "inline-block", width: 14, height: 3, background: colB, marginRight: 4, verticalAlign: "middle" }} />{lblB}</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${Hh}`} style={{ minWidth: 420 }}>
        <line x1={pad.l} y1={zeroY} x2={W - pad.r} y2={zeroY} stroke={P.line} strokeWidth="1" strokeDasharray="3 3" />
        <text x={pad.l - 6} y={y(mx) + 4} textAnchor="end" fontSize="9" fill={P.muted}>{money(mx)}</text>
        <text x={pad.l - 6} y={y(mn) + 4} textAnchor="end" fontSize="9" fill={P.muted}>{money(mn)}</text>
        <polyline points={path(serieA)} fill="none" stroke={colA} strokeWidth="2" strokeDasharray="5 4" />
        <polyline points={path(serieB)} fill="none" stroke={colB} strokeWidth="2.5" />
        {serieA.map((v, k) => <circle key={"a" + k} cx={x(k)} cy={y(v)} r="2.5" fill={colA} />)}
        {serieB.map((v, k) => (v === null ? null : <circle key={"b" + k} cx={x(k)} cy={y(v)} r="3.5" fill={colB}><title>{`${months[k]}: real ${money(v)} · proy ${money(serieA[k])}`}</title></circle>))}
        {months.map((lb, k) => <text key={k} x={x(k)} y={Hh - 8} textAnchor="middle" fontSize="8" fill={P.muted}>{lb}</text>)}
      </svg>
    </div>
  );
}
function RealToggle({ v, set }) {
  return (
    <span style={{ display: "inline-flex", border: `1px solid ${P.line}`, borderRadius: 6, overflow: "hidden" }}>
      {[["gen", "General"], ["prov", "Por proveedor"]].map(([val, lbl]) => (
        <button key={val} onClick={() => set(val)} style={{ cursor: "pointer", border: "none", fontSize: 12, padding: "3px 8px", background: v === val ? P.teal : P.panel, color: v === val ? "#fff" : P.muted }}>{lbl}</button>
      ))}
    </span>
  );
}
const kfmt = (n) => { const a = Math.abs(n); const s = a >= 1e6 ? (a / 1e6).toFixed(1) + "M" : a >= 1e4 ? Math.round(a / 1e3) + "k" : a >= 1e3 ? (a / 1e3).toFixed(1).replace(/\.0$/, "") + "k" : String(Math.round(a)); return (n < 0 ? "−" : "") + "$" + s; };
// ── Lenguaje visual único de los gráficos: línea (plan punteado, real sólido), progreso horizontal, dona ──
function TChart({ labels, series, height = 230 }) {
  const W = 760, Hh = height, pl = 58, pr = 14, pt = 12, pb = 28;
  const vals = series.flatMap((s) => s.data.filter((v) => v !== null && v !== undefined && !isNaN(v)));
  if (!labels.length || !vals.length) return <div style={{ fontSize: 13, color: P.muted }}>Sin datos para este período.</div>;
  let mx = Math.max(...vals, 0), mn = Math.min(...vals, 0);
  if (mx === mn) mx += 1;
  const padv = (mx - mn) * 0.08; mx += padv; if (mn < 0) mn -= padv;
  const n = labels.length;
  const X = (k) => pl + (n === 1 ? (W - pl - pr) / 2 : (k * (W - pl - pr)) / (n - 1));
  const Y = (v) => pt + (1 - (v - mn) / (mx - mn)) * (Hh - pt - pb);
  const ticks = [0, 1, 2, 3, 4].map((t) => mn + ((mx - mn) * t) / 4);
  const step = Math.max(1, Math.ceil(n / 8));
  const segs = (data) => { const out = []; let cur = []; data.forEach((v, k) => { if (v === null || v === undefined) { if (cur.length) out.push(cur); cur = []; } else cur.push([X(k), Y(v)]); }); if (cur.length) out.push(cur); return out; };
  const base = Y(Math.max(mn, 0));
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12, color: P.muted, marginBottom: 6 }}>
        {series.map((s) => (
          <span key={s.name} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <svg width="20" height="8" aria-hidden="true"><line x1="0" y1="4" x2="20" y2="4" stroke={s.color} strokeWidth={s.width || 2.5} strokeDasharray={s.dashed ? "4 3" : undefined} /></svg>{s.name}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${Hh}`} width="100%" role="img" aria-label={series.map((s) => s.name).join(" vs ")} style={{ display: "block" }}>
        {ticks.map((t, k) => (
          <g key={k}>
            <line x1={pl} x2={W - pr} y1={Y(t)} y2={Y(t)} stroke="var(--line)" strokeWidth="1" strokeDasharray="2 4" />
            <text x={pl - 8} y={Y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{kfmt(t)}</text>
          </g>
        ))}
        {mn < 0 && mx > 0 && <line x1={pl} x2={W - pr} y1={Y(0)} y2={Y(0)} stroke="var(--muted)" strokeWidth="1" />}
        {series.filter((s) => s.area).map((s, k) => segs(s.data).map((sg, j) => (
          <path key={`a${k}-${j}`} d={`M${sg[0][0]},${base} ${sg.map((p) => `L${p[0]},${p[1]}`).join(" ")} L${sg[sg.length - 1][0]},${base} Z`} fill={s.color} opacity="0.10" />
        )))}
        {series.map((s, k) => segs(s.data).map((sg, j) => (
          <polyline key={`l${k}-${j}`} points={sg.map((p) => p.join(",")).join(" ")} fill="none" stroke={s.color} strokeWidth={s.width || 2.5} strokeDasharray={s.dashed ? "6 5" : undefined} strokeLinejoin="round" strokeLinecap="round" />
        )))}
        {series.filter((s) => s.dots).map((s, k) => s.data.map((v, j) => (v === null || v === undefined ? null : <circle key={`d${k}-${j}`} cx={X(j)} cy={Y(v)} r="4" fill={s.color} stroke="var(--panel)" strokeWidth="2" />)))}
        {series.map((s, k) => s.data.map((v, j) => (v === null || v === undefined ? null : <circle key={`h${k}-${j}`} cx={X(j)} cy={Y(v)} r="10" fill="transparent"><title>{`${labels[j]} · ${s.name}: ${money(v)}`}</title></circle>)))}
        {labels.map((l, k) => (k % step === 0 || k === n - 1 ? <text key={k} x={X(k)} y={Hh - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">{l}</text> : null))}
      </svg>
    </div>
  );
}
function ProgressList({ groups, color, lblA, lblB, share }) {
  const gs = groups.map((g) => ({ ...g, rows: g.rows.filter((r) => (r.a || 0) > 0 || (r.b || 0) > 0).sort((x, y) => (share ? y.b - x.b : y.a - x.a)) })).filter((g) => g.rows.length);
  if (!gs.length) return <div style={{ fontSize: 13, color: P.muted }}>Sin datos para este período.</div>;
  const maxB = Math.max(1, ...gs.flatMap((g) => g.rows.map((r) => r.b || 0)));
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {!share && <div style={{ fontSize: 12, color: P.muted }}>La barra muestra {lblB.toLowerCase()} sobre {lblA.toLowerCase()}.</div>}
      {gs.map((g, gi) => (
        <div key={gi} style={{ display: "grid", gap: 10 }}>
          {g.label && <div className="eb" style={{ margin: 0 }}>{g.label}</div>}
          {g.rows.map((r, k) => {
            const w = share ? ((r.b || 0) / maxB) * 100 : (r.a > 0 ? Math.min(100, ((r.b || 0) / r.a) * 100) : 0);
            return (
              <div key={k} style={{ display: "grid", gap: 5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 14 }}>
                  <span style={{ fontWeight: 500, minWidth: 0 }}>{r.n}</span>
                  <span style={{ color: P.muted, fontSize: 13, whiteSpace: "nowrap" }}>
                    {share ? <><b style={{ color: P.ink }}>{money(r.b)}</b> · {pct(r.a > 0 ? r.b / r.a : 0)}</> : <><b style={{ color: P.ink }}>{money(r.b)}</b> de {money(r.a)} · {pct(r.a > 0 ? (r.b || 0) / r.a : 0)}</>}
                  </span>
                </div>
                <div style={{ height: 10, borderRadius: 5, background: P.faint }}><div style={{ height: 10, borderRadius: 5, width: `${Math.max(w > 0 ? 1.5 : 0, w)}%`, background: color }} /></div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
function Donut({ data, size = 190, thick = 30, center, sub }) {
  const tot = data.reduce((a, d) => a + d.value, 0) || 1, r = (size - thick) / 2, C = 2 * Math.PI * r;
  let off = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Distribución por categoría" style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--faint)" strokeWidth={thick} />
      {data.map((d, k) => {
        const len = (d.value / tot) * C;
        const el = <circle key={k} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={thick} strokeDasharray={`${Math.max(0, len - 1.5)} ${C}`} strokeDashoffset={-off} transform={`rotate(-90 ${size / 2} ${size / 2})`}><title>{`${d.label}: ${money(d.value)} (${pct(d.value / tot)})`}</title></circle>;
        off += len; return el;
      })}
      <text x="50%" y="48%" textAnchor="middle" fontSize="18" fontWeight="700" fill="var(--ink)">{center}</text>
      <text x="50%" y="60%" textAnchor="middle" fontSize="11" fill="var(--muted)">{sub}</text>
    </svg>
  );
}

const TONE = { bad: ["var(--bad-soft)", "var(--critical)"], warn: ["var(--warn-soft)", "var(--caution)"], info: ["var(--pri-soft)", "var(--teal)"], good: ["var(--good-soft)", "var(--healthy)"] };
function RealView({ i, rm, setRm, setActual, setActualIng, setActualProv, setWaive, mode = "cargar", from = 0, to, goCargar }) {
  const [onlyPend, setOnlyPend] = useState(false);
  const [deuView, setDeuView] = useState("gen");
  const [cobView, setCobView] = useState("gen");
  const [personD, setPersonD] = useState("__all__"), [personC, setPersonC] = useState("__all__");
  const A = (i.actuals && i.actuals[rm]) || {};
  const nextM = Math.min(rm + 1, H - 1);
  const scOf = (m) => (i.horizonte[m] ? i.horizonte[m].sc : "e2");
  const escName = (m) => (i.escNombres && i.escNombres[scOf(m)]) || SCL[scOf(m)];
  const projIng = +i.ingreso[scOf(rm)] || 0;
  const ingReg = A.ingreso !== undefined && A.ingreso !== null;
  const realIng = ingReg ? +A.ingreso || 0 : projIng;
  const realDebt = (m, id) => { const mm = i.actuals && i.actuals[m]; const g = mm && mm.dp && mm.dp[id]; if (g) return Object.values(g).reduce((a, v) => a + (+v || 0), 0); return (mm && mm.d && mm.d[id]) || 0; };
  const realCob = (m, id) => { const mm = i.actuals && i.actuals[m]; const g = mm && mm.cp && mm.cp[id]; if (g) return Object.values(g).reduce((a, v) => a + (+v || 0), 0); return (mm && mm.c && mm.c[id]) || 0; };
  // Filas por proveedor con movimiento en el mes m: programado, arrastre pendiente o ya registrado
  const provRows = (items, listKey, key, m) => {
    const out = [], mm = (i.actuals && i.actuals[m]) || {};
    items.forEach((it) => {
      const grp = (mm[key] && mm[key][it.id]) || {};
      Array.from(new Set((it[listKey] || []).flat().map((p) => p && p.prov).filter(Boolean))).forEach((n) => {
        const base = ((it[listKey] || [])[m] || []).filter((p) => p.prov === n).reduce((a, p) => a + (+p.monto || 0), 0);
        const carry = carryProv(i.actuals, it, listKey, key, n, m);
        const aju = Math.max(0, base + carry), reg = grp[n] !== undefined;
        const waived = !!(mm.wv && mm.wv[key] && mm.wv[key][it.id] && mm.wv[key][it.id][n]);
        if (aju > 0 || reg || Math.abs(carry) > 1) out.push({ item: it, n, base, carry, aju, reg, waived, real: reg ? +grp[n] || 0 : null });
      });
    });
    return out;
  };
  const dRows = provRows(i.deudas, "pagosProv", "dp", rm);
  const cRows = provRows(i.porCobrar, "cobrosProv", "cp", rm);
  const gRows = i.gastosItems.map((g) => { const reg = !!(A.g && A.g[g.id] !== undefined); return { id: g.id, n: g.n, proj: +g.m || 0, reg, real: reg ? +A.g[g.id] || 0 : +g.m || 0 }; });
  const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);
  // Lo pendiente cuenta al valor del plan, en todos los rubros por igual
  const pG = sum(gRows, (r) => r.proj), eG = sum(gRows, (r) => r.real);
  const pD = sum(dRows, (r) => r.aju), eD = sum(dRows, (r) => (r.reg ? r.real : r.aju));
  const pC = sum(cRows, (r) => r.aju), eC = sum(cRows, (r) => (r.reg ? r.real : r.aju));
  const projRes = projIng + pC - pG - pD, estRes = realIng + eC - eG - eD;
  const total = 1 + gRows.length + dRows.length + cRows.length;
  const done = (ingReg ? 1 : 0) + gRows.filter((r) => r.reg).length + dRows.filter((r) => r.reg).length + cRows.filter((r) => r.reg).length;
  const pend = total - done, pctDone = Math.round((done / total) * 100);

  // Avisos en lenguaje claro, con nombre propio
  const ins = [];
  if (ingReg && realIng < projIng - 1) ins.push({ k: "bad", t: `Ingresaste ${money(projIng - realIng)} menos de lo esperado.` });
  if (ingReg && realIng > projIng + 1) ins.push({ k: "good", t: `Ingresaste ${money(realIng - projIng)} más de lo esperado.` });
  const shortD = dRows.filter((r) => r.reg && !r.waived && r.real < r.aju - 1).sort((a, b) => (b.aju - b.real) - (a.aju - a.real));
  shortD.slice(0, 3).forEach((r) => ins.push({ k: "bad", t: `No le pagaste ${money(r.aju - r.real)} a ${r.n} (${r.item.n}). Pasa a ${mlabel(nextM)} como pendiente.` }));
  if (shortD.length > 3) ins.push({ k: "bad", t: `Y ${shortD.length - 3} pagos más quedaron pendientes.` });
  dRows.filter((r) => r.reg && r.waived && r.real < r.aju - 1).forEach((r) => ins.push({ k: "info", t: `Cerraste el saldo con ${r.n} (${r.item.n}): los ${money(r.aju - r.real)} restantes no pasan a ${mlabel(nextM)}.` }));
  cRows.filter((r) => r.reg && r.waived && r.real < r.aju - 1).forEach((r) => ins.push({ k: "info", t: `Cerraste el saldo con ${r.n} (${r.item.n}): los ${money(r.aju - r.real)} que faltaban ya no se esperan.` }));
  dRows.filter((r) => r.reg && r.real > r.aju + 1).slice(0, 2).forEach((r) => ins.push({ k: "good", t: `Le pagaste ${money(r.real - r.aju)} de más a ${r.n}: se descuenta del mes que viene.` }));
  const shortC = cRows.filter((r) => r.reg && !r.waived && r.real < r.aju - 1).sort((a, b) => (b.aju - b.real) - (a.aju - a.real));
  shortC.slice(0, 3).forEach((r) => ins.push({ k: "warn", t: `${r.n} no te pagó ${money(r.aju - r.real)} (${r.item.n}). Lo esperás en ${mlabel(nextM)}.` }));
  cRows.filter((r) => r.reg && r.real > r.aju + 1).slice(0, 2).forEach((r) => ins.push({ k: "good", t: `${r.n} te pagó ${money(r.real - r.aju)} más de lo previsto.` }));
  gRows.filter((r) => r.reg && r.real > r.proj + 1).sort((a, b) => (b.real - b.proj) - (a.real - a.proj)).slice(0, 2).forEach((r) => ins.push({ k: "warn", t: `Gastaste ${money(r.real - r.proj)} más de lo previsto en ${r.n}.` }));
  const ahorroG = sum(gRows.filter((r) => r.reg && r.real < r.proj - 1), (r) => r.proj - r.real);
  if (ahorroG > 1) ins.push({ k: "good", t: `Gastaste ${money(ahorroG)} menos de lo previsto en otras partidas.` });
  if (estRes > projRes + 1 && shortD.length) ins.push({ k: "info", t: "Tu caja quedó arriba del plan, pero porque postergaste pagos: no es ahorro real." });
  if (!ins.length) ins.push(done ? { k: "good", t: "Todo lo que cargaste coincide con el plan." } : { k: "info", t: `Todavía no cargaste nada de ${mlabel(rm)}.` });

  const kpi = (label, r, p, pos) => { const d = r - p, flat = Math.abs(d) < 1, good = pos ? d >= 0 : d <= 0; return { label, r, p, d, flat, col: flat ? P.muted : good ? P.healthy : P.critical, bg: flat ? P.faint : good ? "var(--good-soft)" : "var(--bad-soft)" }; };
  const kpis = [kpi("Ingreso", realIng, projIng, true), kpi("Gastos", eG, pG, false), kpi("Deuda pagada", eD, pD, true), kpi("Cobros", eC, pC, true)];
  const nextD = rm < H - 1 ? provRows(i.deudas, "pagosProv", "dp", nextM).filter((r) => r.aju > 0).sort((a, b) => (b.carry > 1) - (a.carry > 1) || b.aju - a.aju) : [];
  const nextC = rm < H - 1 ? provRows(i.porCobrar, "cobrosProv", "cp", nextM).filter((r) => r.aju > 0).sort((a, b) => (b.carry > 1) - (a.carry > 1) || b.aju - a.aju) : [];
  const debtTot = sum(i.deudas, (d) => +d.saldo || 0);
  let debtPaid = 0; Object.keys(i.actuals || {}).forEach((m) => i.deudas.forEach((d) => { debtPaid += realDebt(m, d.id); }));

  // ── bloques reutilizables ──
  const monthBar = (
    <div className="mbar">
      <button className="iconbtn" aria-label="Mes anterior" onClick={() => setRm(Math.max(0, rm - 1))}>‹</button>
      <MonthSel v={rm} onChange={setRm} />
      <button className="iconbtn" aria-label="Mes siguiente" onClick={() => setRm(Math.min(H - 1, rm + 1))}>›</button>
    </div>
  );
  const bar = (w, col) => <div style={{ height: 8, borderRadius: 4, background: P.faint }}><div style={{ height: 8, borderRadius: 4, width: `${Math.min(100, Math.max(0, w))}%`, background: col }} /></div>;
  const progressCard = (
    <section style={{ background: P.teal, color: "#fff", borderRadius: 16, padding: 18, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Carga de {mlabel(rm)}</span>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{done} de {total}</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,.25)" }}><div style={{ height: 8, borderRadius: 4, width: `${pctDone}%`, background: "#fff" }} /></div>
      <span style={{ fontSize: 13, opacity: 0.9 }}>{pend === 0 ? "Listo: cargaste todo el mes." : `Te faltan ${pend} movimientos por registrar.`}</span>
      {goCargar && pend > 0 && <button onClick={goCargar} style={{ cursor: "pointer", fontFamily: "inherit", minHeight: 44, border: "none", borderRadius: 10, background: "#fff", color: "#1D4B7A", fontSize: 14, fontWeight: 600 }}>Continuar la carga</button>}
    </section>
  );
  const resultCard = (
    <section className="panel" style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, color: P.muted, fontWeight: 500 }}>Resultado de {mlabel(rm)}</span>
      <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-.02em", color: estRes < 0 ? P.critical : P.ink }}>{money(estRes)}</span>
      <span style={{ fontSize: 14, color: P.muted }}>Plan {money(projRes)} · <b style={{ color: estRes >= projRes ? P.healthy : P.critical }}>{Math.abs(estRes - projRes) < 1 ? "igual al plan" : `${estRes > projRes ? "▲" : "▼"} ${money(Math.abs(estRes - projRes))}`}</b></span>
      {pend > 0 && <span style={{ fontSize: 13, color: P.muted }}>Los {pend} pendientes se cuentan al valor del plan hasta que los cargues.</span>}
    </section>
  );
  const kpiGrid = (
    <div className="kpis">
      {kpis.map((k) => (
        <div key={k.label} className="panel" style={{ padding: 14, display: "grid", gap: 3 }}>
          <span style={{ fontSize: 13, color: P.muted, fontWeight: 500 }}>{k.label}</span>
          <span style={{ fontSize: 20, fontWeight: 700 }}>{money(k.r)}</span>
          <span style={{ fontSize: 13, color: P.muted }}>Plan {money(k.p)}</span>
          <span className="chip" style={{ justifySelf: "start", color: k.col, background: k.bg }}>{k.flat ? "Igual al plan" : `${k.d > 0 ? "▲" : "▼"} ${money(Math.abs(k.d))}`}</span>
        </div>
      ))}
    </div>
  );
  const insightsBlock = (
    <section style={{ display: "grid", gap: 8 }}>
      <h2 className="h2" style={{ margin: "0 0 2px" }}>Qué pasó en {mlabel(rm)}</h2>
      {ins.map((x, k) => (
        <div key={k} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: TONE[x.k][0], borderRadius: 12, padding: "12px 14px" }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, marginTop: 7, flexShrink: 0, background: TONE[x.k][1] }} />
          <span style={{ fontSize: 14, lineHeight: 1.45 }}>{x.t}</span>
        </div>
      ))}
    </section>
  );
  const nextList = (rows, verb) => rows.map((r, k) => (
    <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 0", borderTop: `1px solid ${P.faint}` }}>
      <span style={{ display: "grid", gap: 1, minWidth: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>{r.n} <span style={{ fontSize: 12, color: P.muted, fontWeight: 400 }}>· {r.item.n}</span></span>
        <span style={{ fontSize: 12, color: r.carry > 1 ? P.caution : P.muted }}>{r.carry > 1 ? `Incluye ${money(r.carry)} que no se ${verb} en ${mlabel(rm)}` : "Programado"}</span>
      </span>
      <span style={{ fontSize: 14, fontWeight: 600 }}>{money(r.aju)}</span>
    </div>
  ));
  const nextBlock = rm < H - 1 && (
    <section className="panel" style={{ display: "grid", gap: 4 }}>
      <h2 className="h2" style={{ margin: 0 }}>Lo que viene en {mlabel(nextM)}</h2>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 8 }}><span style={{ fontSize: 13, fontWeight: 600, color: P.muted }}>Pagos de deuda</span><b style={{ fontSize: 15 }}>{money(sum(nextD, (r) => r.aju))}</b></div>
      {nextD.length ? nextList(nextD.slice(0, 6), "pagó") : <span style={{ fontSize: 13, color: P.muted }}>Sin pagos programados.</span>}
      {nextD.length > 6 && <span style={{ fontSize: 12, color: P.muted }}>y {nextD.length - 6} más…</span>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 12 }}><span style={{ fontSize: 13, fontWeight: 600, color: P.muted }}>Cobros esperados</span><b style={{ fontSize: 15 }}>{money(sum(nextC, (r) => r.aju))}</b></div>
      {nextC.length ? nextList(nextC.slice(0, 6), "cobró") : <span style={{ fontSize: 13, color: P.muted }}>Sin cobros programados.</span>}
    </section>
  );
  const debtBlock = debtTot > 0 && (
    <section className="panel" style={{ display: "grid", gap: 8 }}>
      <h2 className="h2" style={{ margin: 0 }}>Tu deuda total</h2>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: P.muted }}><span>Pagado {money(debtPaid)}</span><span>de {money(debtTot)}</span></div>
      {bar((debtPaid / debtTot) * 100, P.teal)}
      <span style={{ fontSize: 13, color: P.muted }}>Te quedan <b style={{ color: P.ink }}>{money(Math.max(0, debtTot - debtPaid))}</b> según lo que registraste.</span>
    </section>
  );

  // ── INICIO ──
  if (mode === "home") return (
    <div className="gcol">
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <h2 className="h2" style={{ margin: 0, fontSize: 20 }}>Cómo venís en {mlabel(rm)}</h2>
        {monthBar}
      </div>
      <div className="split2">
        <div className="gcol">{progressCard}{resultCard}{kpiGrid}</div>
        <div className="gcol">{insightsBlock}{nextBlock}{debtBlock}</div>
      </div>
    </div>
  );

  // ── ANÁLISIS (parte real) ──
  if (mode === "ana") {
    const tTo = to == null ? rm : to;
    const idx = []; for (let m = from; m <= tTo; m++) idx.push(m);
    const labels = idx.map(mlabel);
    const gTot = sum(i.gastosItems, (g) => +g.m || 0);
    const hasReal = (m) => { const mm = i.actuals && i.actuals[m]; return !!(mm && (mm.ingreso != null || ["g", "d", "c", "dp", "cp"].some((k) => mm[k] && Object.keys(mm[k]).length))); };
    const projResMes = (m) => (+i.ingreso[scOf(m)] || 0) + sum(i.porCobrar, (c) => (c.cobros || [])[m] || 0) - gTot - sum(i.deudas, (d) => (d.pagos || [])[m] || 0);
    const realResMes = (m) => { const mm = (i.actuals && i.actuals[m]) || {}; const ing = mm.ingreso != null ? +mm.ingreso : (+i.ingreso[scOf(m)] || 0); const gas = sum(i.gastosItems, (g) => (mm.g && mm.g[g.id] !== undefined ? +mm.g[g.id] : +g.m || 0)); return ing + sum(i.porCobrar, (c) => realCob(m, c.id)) - gas - sum(i.deudas, (d) => realDebt(m, d.id)); };
    const cargados = idx.filter(hasReal);
    const lastReal = cargados.length ? cargados[cargados.length - 1] : null;
    const resReal = sum(cargados, realResMes), resPlan = sum(cargados, projResMes);
    const pagReal = sum(cargados, (m) => sum(i.deudas, (d) => realDebt(m, d.id))), pagPlan = sum(cargados, (m) => sum(i.deudas, (d) => (d.pagos || [])[m] || 0));
    const cobReal = sum(cargados, (m) => sum(i.porCobrar, (c) => realCob(m, c.id))), cobPlan = sum(cargados, (m) => sum(i.porCobrar, (c) => (c.cobros || [])[m] || 0));
    const stat = (label, re, pl, pos) => { const d = re - pl, flat = Math.abs(d) < 1, good = pos ? d >= 0 : d <= 0; return (
      <div key={label} className="panel" style={{ padding: 14, display: "grid", gap: 3 }}>
        <span style={{ fontSize: 13, color: P.muted, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 22, fontWeight: 700, color: re < 0 ? P.critical : P.ink }}>{money(re)}</span>
        <span style={{ fontSize: 13, color: P.muted }}>Plan {money(pl)}</span>
        <span className="chip" style={{ justifySelf: "start", color: flat ? P.muted : good ? P.healthy : P.critical, background: flat ? P.faint : good ? "var(--good-soft)" : "var(--bad-soft)" }}>{flat ? "Igual al plan" : `${d > 0 ? "▲" : "▼"} ${money(Math.abs(d))}`}</span>
      </div>); };
    const debtTot = sum(i.deudas, (d) => +d.saldo || 0);
    const planRem = (m) => sum(i.deudas, (d) => { let c = 0; for (let k = 0; k <= m; k++) c += (d.pagos || [])[k] || 0; return Math.max(0, (+d.saldo || 0) - c); });
    const realRem = (m) => { let p = 0; for (let k = 0; k <= m; k++) p += sum(i.deudas, (d) => realDebt(k, d.id)); return Math.max(0, debtTot - p); };
    let libre = null; for (let m = 0; m < H; m++) if (planRem(m) <= 0.5) { libre = m; break; }
    const paidHasta = (fn, id) => { let s = 0; for (let m = 0; m <= tTo; m++) s += fn(m, id); return s; };
    const provPaidHasta = (key, itemId, prov) => { let s = 0; for (let m = 0; m <= tTo; m++) { const mm = i.actuals && i.actuals[m]; const g = mm && mm[key] && mm[key][itemId]; if (g) s += +g[prov] || 0; } return s; };
    const genGroups = (items, saldoKey, fn) => ["compania", "personal"].map((amb) => ({ label: amb === "compania" ? "Compañía" : "Personal", rows: items.filter((x) => x.ambito === amb).map((x) => ({ n: x.n, a: +x[saldoKey] || 0, b: paidHasta(fn, x.id) })) }));
    const provGroups = (items, listKey, dpKey) => ["compania", "personal"].map((amb) => {
      const map = {};
      items.filter((x) => x.ambito === amb).forEach((x) => {
        (x[listKey] || []).forEach((ma) => (ma || []).forEach((p) => { const n = (p.prov || "").trim() || "—"; if (!map[n]) map[n] = { n, a: 0, b: 0 }; map[n].a += +p.monto || 0; }));
        new Set((x[listKey] || []).flat().map((p) => p && p.prov).filter(Boolean)).forEach((n) => { if (!map[n]) map[n] = { n, a: 0, b: 0 }; map[n].b += provPaidHasta(dpKey, x.id, n); });
      });
      return { label: amb === "compania" ? "Compañía" : "Personal", rows: Object.values(map) };
    });
    const perMonthReal = (key, items, name, m) => { const mm = i.actuals && i.actuals[m]; let s = 0; items.forEach((it) => { const g = mm && mm[key] && mm[key][it.id]; if (g && g[name] !== undefined) s += +g[name] || 0; }); return s; };
    const personBlock = (eb, title, agg, items, key, sel, setSel, color, allLbl) => {
      const names = agg.names.filter((n) => agg.byTotal[n] > 0);
      const one = sel !== "__all__" && agg.byMonth[sel];
      return (
        <Panel eb={eb} title={one ? `${sel}: plan vs real` : title} right={
          <select className="sel" aria-label="Elegir persona" value={one ? sel : "__all__"} onChange={(e) => setSel(e.target.value)}>
            <option value="__all__">{allLbl}</option>
            {names.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>}>
          {one
            ? <TChart height={200} labels={labels} series={[{ name: "Plan", data: idx.map((m) => agg.byMonth[sel][m] || 0), color: P.muted, dashed: true }, { name: "Real", data: idx.map((m) => (hasReal(m) ? perMonthReal(key, items, sel, m) : null)), color, dots: true }]} />
            : <ProgressList share groups={[{ label: "", rows: names.map((n) => ({ n, a: agg.grand, b: agg.byTotal[n] })) }]} color={color} />}
        </Panel>
      );
    };
    const metaRows = i.metas.map((g) => { let acum = 0; for (let k = 0; k <= tTo; k++) acum += metaAporte(g, k); return { n: g.n, a: +g.monto || 0, b: acum }; });
    return (
      <>
        {cargados.length === 0
          ? <div className="panel" style={{ fontSize: 14, color: P.muted }}>Todavía no hay meses cargados en este período. Los gráficos muestran el plan; cuando cargues un mes en <b style={{ color: P.ink }}>Cargar</b>, aparece la línea real encima.</div>
          : <div className="kpis4">
              {stat("Resultado acumulado", resReal, resPlan, true)}
              {stat("Deuda pagada", pagReal, pagPlan, true)}
              {stat("Cobrado", cobReal, cobPlan, true)}
              <div className="panel" style={{ padding: 14, display: "grid", gap: 3 }}>
                <span style={{ fontSize: 13, color: P.muted, fontWeight: 500 }}>Meses cargados</span>
                <span style={{ fontSize: 22, fontWeight: 700 }}>{cargados.length} de {idx.length}</span>
                <span style={{ fontSize: 13, color: P.muted }}>Las comparaciones usan solo los meses cargados.</span>
              </div>
            </div>}
        <Panel eb="Tendencia" title="Resultado de cada mes: plan vs real">
          <TChart labels={labels} series={[{ name: "Plan", data: idx.map(projResMes), color: P.muted, dashed: true }, { name: "Real", data: idx.map((m) => (hasReal(m) ? realResMes(m) : null)), color: P.teal, dots: true, area: true }]} />
        </Panel>
        <Panel eb="Deuda" title="Deuda restante: plan vs real">
          <TChart labels={labels} series={[{ name: "Plan", data: idx.map(planRem), color: P.muted, dashed: true }, { name: "Real", data: idx.map((m) => (lastReal !== null && m <= lastReal ? realRem(m) : null)), color: P.critical, dots: true }]} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 10, fontSize: 13, color: P.muted }}>
            <span>Libre de deuda según el plan: <b style={{ color: libre !== null ? P.healthy : P.caution }}>{libre !== null ? mlabel(libre) : `más de ${H} meses`}</b></span>
            <span>Pagado en el período: <b style={{ color: P.ink }}>{money(pagReal)}</b></span>
            {lastReal !== null && <span>Restante a {mlabel(lastReal)}: <b style={{ color: P.ink }}>{money(realRem(lastReal))}</b></span>}
          </div>
        </Panel>
        <div className="g2">
          <Panel eb="Deudas" title={`Cuánto llevás pagado a ${mlabel(tTo)}`} right={<RealToggle v={deuView} set={setDeuView} />}>
            <ProgressList groups={deuView === "gen" ? genGroups(i.deudas, "saldo", realDebt) : provGroups(i.deudas, "pagosProv", "dp")} color={P.critical} lblA="Lo que debés" lblB="Lo pagado" />
          </Panel>
          <Panel eb="Cuentas por cobrar" title={`Cuánto llevás cobrado a ${mlabel(tTo)}`} right={<RealToggle v={cobView} set={setCobView} />}>
            <ProgressList groups={cobView === "gen" ? genGroups(i.porCobrar, "monto", realCob) : provGroups(i.porCobrar, "cobrosProv", "cp")} color={P.healthy} lblA="Lo que te deben" lblB="Lo cobrado" />
          </Panel>
        </div>
        <div className="g2">
          {personBlock("Pagos por acreedor", "A quién le pagás en el período", aggProv(i.deudas, "pagosProv", from, tTo), i.deudas, "dp", personD, setPersonD, P.critical, "Todos los acreedores")}
          {personBlock("Cobros por pagador", "Quién te paga en el período", aggProv(i.porCobrar, "cobrosProv", from, tTo), i.porCobrar, "cp", personC, setPersonC, P.healthy, "Todos los pagadores")}
        </div>
        {metaRows.length > 0 && (
          <Panel eb="Metas" title={`Avance a ${mlabel(tTo)}`}>
            <ProgressList groups={[{ label: "", rows: metaRows }]} color={P.teal} lblA="La meta" lblB="Lo acumulado" />
          </Panel>
        )}
      </>
    );
  }

  // ── CARGAR ──
  const ingRowBg = ingReg ? (Math.abs(realIng - projIng) < 1 ? "rgba(79,170,136,0.20)" : "rgba(79,170,136,0.09)") : "rgba(214,164,62,0.16)";
  return (
    <div className="split">
      <div className="gcol">
        <section className="panel" style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <h2 className="h2" style={{ margin: 0, fontSize: 18 }}>Cargar {mlabel(rm)}</h2>
            {monthBar}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600 }}><span>{done} de {total} registrados</span><span style={{ color: P.muted }}>{pctDone}%</span></div>
          {bar(pctDone, P.healthy)}
          <div style={{ display: "flex", gap: 8 }}>
            {[[false, "Todos"], [true, "Solo pendientes"]].map(([v, l]) => (
              <button key={l} onClick={() => setOnlyPend(v)} style={{ flex: 1, cursor: "pointer", fontFamily: "inherit", minHeight: 40, borderRadius: 10, fontSize: 14, fontWeight: 600, border: `1px solid ${onlyPend === v ? P.teal : P.line}`, background: onlyPend === v ? "var(--pri-soft)" : P.panel, color: onlyPend === v ? P.teal : P.muted }}>{l}{v ? ` (${pend})` : ""}</button>
            ))}
          </div>
          <span style={{ fontSize: 13, color: P.muted }}>Tocá <b>=</b> si fue igual al plan, o escribí el monto real. Si fue cero, escribí 0 para que no quede pendiente.</span>
        </section>

        {!(onlyPend && ingReg) && (
          <Panel eb="Ingresos" title="Ingreso del mes">
            <div className="tblw"><table className="tbl"><thead><tr><th>Concepto</th><th>Plan</th><th></th><th>Real</th><th>Δ</th></tr></thead><tbody>
              <tr style={{ background: ingRowBg }}>
                <td>{ingReg ? "✓ " : "○ "}Ingreso<div style={{ fontSize: 12, color: P.muted }}>{escName(rm)}</div></td>
                <td className="mono" style={{ color: P.muted }}>{money(projIng)}</td>
                <td><button title="Usar lo proyectado" onClick={() => setActualIng(rm, projIng)} style={{ cursor: "pointer", border: `1px solid ${P.line}`, background: P.panel, color: P.muted, borderRadius: 6, fontSize: 13, padding: "4px 9px" }}>=</button></td>
                <td><input className="si" style={{ width: 104 }} type="number" placeholder="—" value={ingReg ? A.ingreso : ""} onChange={(e) => setActualIng(rm, e.target.value === "" ? null : +e.target.value)} /></td>
                <td className="mono">{ingReg ? <RealDelta real={realIng} proj={projIng} /> : <span style={{ color: P.caution, fontSize: 12 }}>pendiente</span>}</td>
              </tr>
            </tbody></table></div>
          </Panel>
        )}
        <Panel eb="Gastos" title="Gastos del mes"><div className="tblw"><RealTabla rows={gRows} kind="g" rm={rm} setActual={setActual} actuals={i.actuals} onlyPend={onlyPend} /></div></Panel>
        <Panel eb="Deudas" title="Pagos de deuda">
          <div className="tblw"><RealProvTabla items={i.deudas} kind="d" rm={rm} actuals={i.actuals} setActualProv={setActualProv} setWaive={setWaive} onlyPend={onlyPend} /></div>
          {dRows.length === 0 && <div style={{ fontSize: 13, color: P.muted }}>Sin pagos programados este mes.</div>}
          <div style={{ fontSize: 12, color: P.muted, marginTop: 8 }}>El plan incluye el <b style={{ color: P.caution }}>arrastre</b>: lo que quedó sin pagar en meses ya cargados. Si acordaste pagar menos, usá <b>cerrar saldo</b>.</div>
        </Panel>
        <Panel eb="Cuentas por cobrar" title="Cobros del mes">
          <div className="tblw"><RealProvTabla items={i.porCobrar} kind="c" rm={rm} actuals={i.actuals} setActualProv={setActualProv} setWaive={setWaive} onlyPend={onlyPend} /></div>
          {cRows.length === 0 && <div style={{ fontSize: 13, color: P.muted }}>Sin cobros programados este mes.</div>}
          <div style={{ fontSize: 12, color: P.muted, marginTop: 8 }}>Lo que no te pagaron en meses ya cargados se suma acá. Si se acordó cobrar menos, usá <b>cerrar saldo</b>.</div>
        </Panel>
        {pend === 0 && <div style={{ background: "var(--good-soft)", color: P.healthy, borderRadius: 14, padding: 16, fontSize: 15, fontWeight: 600, textAlign: "center" }}>{mlabel(rm)} está completo. No te olvides de Guardar.</div>}
      </div>
      <div className="gcol">{resultCard}{kpiGrid}{insightsBlock}</div>
    </div>
  );
}

const TABS = [
  { k: "home", l: "Inicio", d: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" },
  { k: "cargar", l: "Cargar", d: "M10 6h10M10 12h10M10 18h10M4 6l1.2 1.2L7.5 5M4 12l1.2 1.2L7.5 11M4 18l1.2 1.2L7.5 17" },
  { k: "plan", l: "Plan", d: "M4 7h16M4 12h16M4 17h16M14 5v4M8 10v4M16 15v4" },
  { k: "ana", l: "Análisis", d: "M5 20V11M11 20V5M17 20v-8M3 20h18" },
];
function Planner({ auth, initialData, onLogout, theme, toggleTheme }) {
  const [profiles, setProfiles] = useState(() => { const n = parseProfiles(initialData); return (n && n.length) ? n : [{ id: uid(), nombre: auth.username, inp: blankInp() }]; });
  const [saving, setSaving] = useState("");
  const [activeId, setActiveId] = useState(() => profiles[0].id);
  const active = profiles.find((p) => p.id === activeId) || profiles[0];
  const i = active.inp;
  const [anaFrom, setAnaFrom] = useState(0), [anaTo, setAnaTo] = useState(11), [menu, setMenu] = useState(false);
  const pieMes = anaTo, ahoMes = anaTo, deuMes = anaTo, netoMes = anaTo;
  const [pieOff, setPieOff] = useState({});
  const [deuProv, setDeuProv] = useState("__all__"), [cobProv, setCobProv] = useState("__all__");
  const [view, setView] = useState("home"), [rm, setRm] = useState(0);
  const setActual = (m, kind, id, val) => updInp((x) => { const acts = { ...(x.actuals || {}) }; const cur = { g: {}, d: {}, c: {}, ...(acts[m] || {}) }; const grp = { ...(cur[kind] || {}) }; if (val === null) delete grp[id]; else grp[id] = val; cur[kind] = grp; acts[m] = cur; return { ...x, actuals: acts }; });
  const setActualIng = (m, val) => updInp((x) => { const acts = { ...(x.actuals || {}) }; const cur = { g: {}, d: {}, c: {}, ...(acts[m] || {}) }; cur.ingreso = val; acts[m] = cur; return { ...x, actuals: acts }; });
  const setActualProv = (m, kind, itemId, prov, val) => updInp((x) => { const acts = { ...(x.actuals || {}) }; const cur = { g: {}, d: {}, c: {}, dp: {}, cp: {}, ...(acts[m] || {}) }; const key = kind === "d" ? "dp" : "cp"; const grp = { ...(cur[key] || {}) }; const it = { ...(grp[itemId] || {}) }; if (val === null) delete it[prov]; else it[prov] = val; grp[itemId] = it; cur[key] = grp; acts[m] = cur; return { ...x, actuals: acts }; });
  const setWaive = (m, kind, itemId, prov, on) => updInp((x) => { const acts = { ...(x.actuals || {}) }; const cur = { ...(acts[m] || {}) }; const wv = { ...(cur.wv || {}) }; const kk = kind === "d" ? "dp" : "cp"; const grp = { ...(wv[kk] || {}) }; const it = { ...(grp[itemId] || {}) }; if (on) it[prov] = true; else delete it[prov]; grp[itemId] = it; wv[kk] = grp; cur.wv = wv; acts[m] = cur; return { ...x, actuals: acts }; });
  const [newCat, setNewCat] = useState("");

  const updInp = (fn) => setProfiles((ps) => ps.map((p) => (p.id === activeId ? { ...p, inp: fn(p.inp) } : p)));
  const set = (patch) => updInp((x) => ({ ...x, ...patch }));
  const setIng = (k, v) => updInp((x) => ({ ...x, ingreso: { ...x.ingreso, [k]: v } }));
  const setEscN = (k, v) => updInp((x) => ({ ...x, escNombres: { ...(x.escNombres || {}), [k]: v } }));
  const setArr = (key, m, v) => updInp((x) => ({ ...x, [key]: x[key].map((y, k) => (k === m ? v : y)) }));
  const editItem = (arr, id, patch) => updInp((x) => ({ ...x, [arr]: x[arr].map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
  const addItem = (arr, item) => updInp((x) => ({ ...x, [arr]: [...x[arr], { id: uid(), ...item }] }));
  const delItem = (arr, id) => updInp((x) => ({ ...x, [arr]: x[arr].filter((it) => it.id !== id) }));
  const cycle = (idx) => updInp((x) => { const h = [...x.horizonte]; h[idx] = { sc: SCEN[(SCEN.indexOf(h[idx].sc) + 1) % 4] }; return { ...x, horizonte: h }; });
  const setSc = (idx, sc) => updInp((x) => { const h = [...x.horizonte]; h[idx] = { sc }; return { ...x, horizonte: h }; });
  const setSched = (arr, id, key, m, val) => updInp((x) => ({ ...x, [arr]: x[arr].map((it) => (it.id === id ? { ...it, [key]: it[key].map((y, k) => (k === m ? val : y)) } : it)) }));
  const provAdd = (arr, id, m) => updInp((x) => ({ ...x, [arr]: x[arr].map((it) => { if (it.id !== id) return it; const k = provKeys[arr]; const list = (it[k.list] || []).map((a) => (a ? a.slice() : [])); while (list.length < H) list.push([]); const cur = list[m] || []; list[m] = [...cur, { id: uid(), prov: "", monto: 0 }]; return recalcTot({ ...it, [k.list]: list }, k); }) }));
  const provDel = (arr, id, m, pid) => updInp((x) => ({ ...x, [arr]: x[arr].map((it) => { if (it.id !== id) return it; const k = provKeys[arr]; const list = (it[k.list] || []).map((a) => (a ? a.slice() : [])); while (list.length < H) list.push([]); list[m] = (list[m] || []).filter((p) => p.id !== pid); return recalcTot({ ...it, [k.list]: list }, k); }) }));
  const provEdit = (arr, id, m, pid, patch) => updInp((x) => ({ ...x, [arr]: x[arr].map((it) => { if (it.id !== id) return it; const k = provKeys[arr]; const list = (it[k.list] || []).map((a) => (a ? a.slice() : [])); while (list.length < H) list.push([]); list[m] = (list[m] || []).map((p) => (p.id === pid ? { ...p, ...patch } : p)); return recalcTot({ ...it, [k.list]: list }, k); }) }));
  const addCat = () => { const c = newCat.trim().toUpperCase(); if (c && !i.categorias.includes(c)) updInp((x) => ({ ...x, categorias: [...x.categorias, c] })); setNewCat(""); };

  const newProfile = () => { const id = uid(); setProfiles((ps) => [...ps, { id, nombre: "Nuevo usuario", inp: blankInp() }]); setActiveId(id); };
  const renameProfile = (nombre) => setProfiles((ps) => ps.map((p) => (p.id === activeId ? { ...p, nombre } : p)));
  const delProfile = () => setProfiles((ps) => { if (ps.length <= 1) return ps; const rest = ps.filter((p) => p.id !== activeId); setActiveId(rest[0].id); return rest; });

  // Autoguardado en el navegador (persiste entre recargas y deploys)
  useEffect(() => { try { if (typeof window !== "undefined" && window.localStorage) window.localStorage.setItem("finora_" + auth.username, JSON.stringify(profiles)); } catch (e) {} }, [profiles, auth.username]);
  const guardar = async () => {
    setSaving("guardando");
    try {
      const r = await fetch("/api/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: auth.username, password: auth.password, data: profiles }) });
      const j = await r.json();
      setSaving(j.ok ? "guardado" : "error");
    } catch (e) { setSaving("error"); }
    setTimeout(() => setSaving(""), 2500);
  };
  const fileRef = React.useRef(null);
  const exportar = () => { try { const blob = new Blob([JSON.stringify(profiles, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "finora-datos.json"; a.click(); URL.revokeObjectURL(url); } catch (e) {} };
  const importar = (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { try { const norm = parseProfiles(JSON.parse(rd.result)); if (norm) { setProfiles(norm); setActiveId(norm[0].id); } else alert("El archivo no tiene el formato esperado."); } catch (err) { alert("No se pudo leer el archivo."); } }; rd.readAsText(f); e.target.value = ""; };

  const r = useMemo(() => runEngine(i), [i]);
  const M = r.matriz;
  const maxAbs = Math.max(...r.escArr.map((e) => Math.abs(e.allIn)), 1);
  const maxDeuda = Math.max(...r.flujo.map((f) => f.deudaTot), 1);

  // Datos de gráficos
  const pieData = useMemo(() => {
    const acc = {};
    for (let m = anaFrom; m <= pieMes; m++) {
      i.gastosItems.forEach((x) => { acc[x.cat] = (acc[x.cat] || 0) + (+x.m || 0); });
      i.deudas.forEach((d) => { acc[d.cat || "DEUDAS"] = (acc[d.cat || "DEUDAS"] || 0) + (d.pagos?.[m] || 0); });
    }
    const arr = Object.entries(acc).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const tot = arr.reduce((a, [, v]) => a + v, 0) || 1;
    return { arr, tot, data: arr.map(([c, v], k) => ({ label: c, value: v, color: CATCOLORS[k % CATCOLORS.length] })) };
  }, [i, pieMes]);
  const ahoData = r.flujo.slice(anaFrom, ahoMes + 1);
  const ahoMax = Math.max(...ahoData.map((f) => f.ahorroAcum + f.sobranteAcum + f.reservaAcum), 1);
  const netoData = r.flujo.slice(anaFrom, netoMes + 1);
  const netoAbsMax = Math.max(...netoData.map((f) => Math.abs(f.patrimonioNeto)), 1);
  const fNeto = r.flujo[netoMes] || {};
  const activos = (fNeto.patrimonioAcum || 0) + (fNeto.reservaAcum || 0) + (fNeto.cobrosPend || 0);
  const pasivos = (fNeto.deudaTot || 0) + (fNeto.cardCarry || 0);
  const deuData = r.flujo.slice(anaFrom, deuMes + 1);
  const deuPagMax = Math.max(...deuData.map((f) => f.deuda), 1);
  const aggDeuda = useMemo(() => aggProv(i.deudas, "pagosProv"), [i.deudas]);
  const aggCobro = useMemo(() => aggProv(i.porCobrar, "cobrosProv"), [i.porCobrar]);
  const aggDeudaR = useMemo(() => aggProv(i.deudas, "pagosProv", anaFrom, anaTo), [i.deudas, anaFrom, anaTo]);
  const aggCobroR = useMemo(() => aggProv(i.porCobrar, "cobrosProv", anaFrom, anaTo), [i.porCobrar, anaFrom, anaTo]);
  const deuTotAtMes = r.flujo[deuMes]?.deudaTot || 0;
  const deuPagTot = r.flujo[deuMes]?.deudaPagAcum || 0;

  const rvProps = { i, rm, setRm, setActual, setActualIng, setActualProv, setWaive };
  return (
    <div className={"app" + (theme === "dark" ? " dark" : "")} style={{ background: P.paper, color: P.ink }} onFocus={(e) => { if (e.target.tagName === "INPUT" && e.target.type === "number") e.target.select(); }}>
      <style>{CSS}</style>
      <div className="wrap">
        <header className="top">
          <div style={{ flex: "1 1 320px", minWidth: 0 }}>
            <div className="eb">Planificador financiero</div>
            <input className="bigname" aria-label="Nombre del perfil" value={active.nombre} onChange={(e) => renameProfile(e.target.value)} />
            <div style={{ fontSize: 13, color: P.muted, marginTop: 4 }}>Proyección al <input type="date" value={i.fechaProy || ""} onChange={(e) => set({ fechaProy: e.target.value })} style={{ fontSize: 13, padding: "4px 8px", height: 32 }} /></div>
          </div>
          <div className="acts">
            {saving === "guardado" && <span className="chip" style={{ color: P.healthy, background: "var(--good-soft)" }}>✓ Guardado</span>}
            {saving === "error" && <span className="chip" style={{ color: P.critical, background: "var(--bad-soft)" }}>Error al guardar</span>}
            <button className="primary" onClick={guardar}>{saving === "guardando" ? "Guardando…" : "Guardar"}</button>
            <button className="btn" aria-haspopup="true" aria-expanded={menu} onClick={() => setMenu(!menu)}>Cuenta ▾</button>
            {menu && (
              <div className="menu">
                <div className="eb" style={{ padding: "6px 12px 2px" }}>Perfiles</div>
                {profiles.map((p) => (
                  <button key={p.id} className="mi" onClick={() => { setActiveId(p.id); setMenu(false); }} style={{ fontWeight: p.id === activeId ? 700 : 400, color: p.id === activeId ? P.teal : P.ink }}>{p.id === activeId ? "● " : ""}{p.nombre}</button>
                ))}
                <button className="mi" onClick={() => { newProfile(); setMenu(false); }} style={{ color: P.teal }}>+ Nuevo perfil</button>
                {profiles.length > 1 && <button className="mi" onClick={() => { if (window.confirm(`¿Borrar el perfil "${active.nombre}"? No se puede deshacer.`)) { delProfile(); setMenu(false); } }} style={{ color: P.critical }}>Borrar este perfil</button>}
                <div style={{ height: 1, background: P.line, margin: "6px 4px" }} />
                <button className="mi" onClick={() => { exportar(); setMenu(false); }}>Exportar respaldo</button>
                <button className="mi" onClick={() => { if (fileRef.current) fileRef.current.click(); setMenu(false); }}>Importar respaldo</button>
                <button className="mi" onClick={toggleTheme}>{theme === "dark" ? "Modo claro" : "Modo oscuro"}</button>
                <div style={{ height: 1, background: P.line, margin: "6px 4px" }} />
                <button className="mi" onClick={onLogout} style={{ color: P.critical }}>Cerrar sesión</button>
              </div>
            )}
            <input ref={fileRef} type="file" accept="application/json,.json" onChange={importar} style={{ display: "none" }} />
          </div>
        </header>
        <nav className="tabs" aria-label="Secciones">
          {TABS.map((t) => (
            <button key={t.k} className={"tab" + (view === t.k ? " on" : "")} onClick={() => { setView(t.k); setMenu(false); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={t.d} /></svg>
              {t.l}
            </button>
          ))}
        </nav>

        {view === "home" && <RealView mode="home" {...rvProps} goCargar={() => setView("cargar")} />}
        {view === "cargar" && <RealView mode="cargar" {...rvProps} />}
        {view === "plan" && (
          <div className="gcol plist" style={{ maxWidth: 880, width: "100%", margin: "0 auto" }}>
            <p style={{ margin: "0 0 2px", fontSize: 14, color: P.muted }}>Lo que esperás que pase. Se edita pocas veces; la carga de cada mes va en <b style={{ color: P.ink }}>Cargar</b>. Tocá cada bloque para abrirlo.</p>
            <Panel fold open eb="Ingresos" title="Ingresos y escenarios" summary={`${SCEN.length} escenarios · de ${money(Math.min(...SCEN.map((k) => +i.ingreso[k] || 0)))} a ${money(Math.max(...SCEN.map((k) => +i.ingreso[k] || 0)))} por mes`}>
              <div style={{ display: "grid" }}>
                {SCEN.map((k) => (
                  <div key={k} className="row" style={{ borderBottom: `1px solid ${P.faint}` }}>
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: SCC[k], flexShrink: 0 }} />
                    <input className="nam" aria-label="Nombre del escenario" value={i.escNombres?.[k] ?? SCL[k]} onChange={(e) => setEscN(k, e.target.value)} />
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: P.muted }}>$<input className="num" type="number" aria-label="Ingreso del escenario" value={i.ingreso[k]} onChange={(e) => setIng(k, +e.target.value || 0)} /></span>
                  </div>
                ))}
                <div className="row"><span style={{ fontSize: 14, color: P.muted }}>Ahorro líquido hoy</span><span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: P.muted }}>$<input className="num" type="number" aria-label="Ahorro líquido hoy" value={i.ahorroLiquido} onChange={(e) => set({ ahorroLiquido: +e.target.value || 0 })} /></span></div>
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, alignItems: "baseline", marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Qué escenario esperás cada mes</span>
                  <span style={{ fontSize: 12, color: P.muted }}>Tocá un mes para cambiarlo</span>
                </div>
                {[0, 12].map((st) => (
                  <div key={st} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: P.muted, marginBottom: 4 }}>{mlabel(st)} – {mlabel(Math.min(H - 1, st + 11))}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: 4 }}>
                      {i.horizonte.slice(st, st + 12).map((h, j) => {
                        const idx = st + j, nm = i.escNombres?.[h.sc] ?? SCL[h.sc];
                        return (
                          <button key={idx} onClick={() => cycle(idx)} title={`${mlabel(idx)}: ${nm}`} aria-label={`${mlabel(idx)}: ${nm}. Tocá para cambiar`} style={{ cursor: "pointer", fontFamily: "inherit", border: "none", background: "transparent", padding: 0, display: "grid", gap: 4, justifyItems: "center" }}>
                            <span style={{ width: "100%", height: 30, borderRadius: 6, background: SCC[h.sc] }} />
                            <span style={{ fontSize: 11, color: P.muted }}>{MESES[(START + idx) % 12]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, color: P.muted }}>
                  {SCEN.map((k) => <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: SCC[k] }} />{i.escNombres?.[k] ?? SCL[k]}</span>)}
                </div>
              </div>
            </Panel>

            <Panel fold eb="Reserva y ahorro" title="Reserva de impuestos y ahorro" summary={`Este mes: reserva ${pct(i.reserva[rm] || 0)} · ahorro ${pct(i.ahorro[rm] || 0)}`}>
              <div className="row"><span style={{ fontSize: 14, color: P.muted }} title="17% impuestos + 2% imprevistos + 5% colchón">Reserva fiscal ⓘ</span></div>
              <Grid24 arr={i.reserva} pctMode onSet={(m, v) => setArr("reserva", m, v)} extra="(reserva %)" />
              <div className="row" style={{ marginTop: 6 }}><span style={{ fontSize: 14, color: P.muted }}>Ahorro</span></div>
              <Grid24 arr={i.ahorro} pctMode onSet={(m, v) => setArr("ahorro", m, v)} extra="(ahorro %)" />
            </Panel>

            <Panel fold eb="Gastos" title="Gastos fijos" summary={`${money(r.gastos)} por mes · ${i.gastosItems.length} partidas`}>
              <div className="scroll">
                {i.gastosItems.map((it) => (
                  <div key={it.id} style={{ padding: "4px 0", borderBottom: `1px solid ${P.faint}` }}>
                    <div className="row" style={{ padding: "1px 0" }}>
                      <input className="nam" value={it.n} onChange={(e) => editItem("gastosItems", it.id, { n: e.target.value })} />
                      <span className="mono" style={{ color: P.muted, fontSize: 14 }}>$<input className="num mono" type="number" step="0.01" value={it.m} onChange={(e) => editItem("gastosItems", it.id, { m: +e.target.value || 0 })} /></span>
                      <button className="x" onClick={() => delItem("gastosItems", it.id)}>×</button>
                    </div>
                    <CatSel v={it.cat} cats={i.categorias} onChange={(c) => editItem("gastosItems", it.id, { cat: c })} />
                  </div>
                ))}
                {i.gastosItems.length === 0 && <div style={{ fontSize: 13, color: P.muted, padding: "6px 0" }}>Sin partidas todavía.</div>}
              </div>
              <button className="btn" style={{ marginTop: 8 }} onClick={() => addItem("gastosItems", { n: "Nueva partida", m: 0, cat: i.categorias[0] })}>+ Agregar partida</button>
              <label className="row" style={{ marginTop: 4, cursor: "pointer" }}><span style={{ fontSize: 13.5, color: P.muted }}>Gastos categorizados y con topes</span><input type="checkbox" checked={i.gastosControlados} onChange={(e) => set({ gastosControlados: e.target.checked })} /></label>
              <div className="row" style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${P.line}` }}>
                <input className="nam" placeholder="+ nueva categoría" value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCat()} />
                <button className="btn" onClick={addCat}>Agregar</button>
              </div>
            </Panel>

            <Panel fold eb="Balance" title="Compañía y personal" summary={`Por pagar ${money(M.totalPagar)} · por cobrar ${money(M.totalCobrar)}`}>
              <table className="tbl">
                <thead><tr><th></th><th>Compañía</th><th>Personal</th><th>Total</th></tr></thead>
                <tbody>
                  <tr><td>Por pagar</td><td className="mono">{money(M.pagarCia)}</td><td className="mono">{money(M.pagarPers)}</td><td className="mono" style={{ fontWeight: 600 }}>{money(M.totalPagar)}</td></tr>
                  <tr><td>Por cobrar</td><td className="mono">{money(M.cobrarCia)}</td><td className="mono">{money(M.cobrarPers)}</td><td className="mono" style={{ fontWeight: 600 }}>{money(M.totalCobrar)}</td></tr>
                  <tr style={{ borderTop: `1px solid ${P.line}` }}><td style={{ color: P.ink }}>Deuda neta</td><td></td><td></td><td className="mono" style={{ color: P.critical, fontWeight: 600 }}>{money(M.deudaNeta)}</td></tr>
                </tbody>
              </table>
            </Panel>

            <Panel fold eb="Deudas" title="Cuentas por pagar" summary={`${money(M.totalPagar)} · ${i.deudas.length} deudas · cronograma por acreedor`}>
              {i.deudas.map((d) => (
                <div key={d.id} style={{ padding: "8px 0", borderBottom: `1px solid ${P.faint}` }}>
                  <div className="row" style={{ padding: "2px 0" }}>
                    <input className="nam" value={d.n} onChange={(e) => editItem("deudas", d.id, { n: e.target.value })} />
                    <Amb v={d.ambito} onChange={(a) => editItem("deudas", d.id, { ambito: a })} />
                    <button className="x" onClick={() => delItem("deudas", d.id)}>×</button>
                  </div>
                  <div className="row" style={{ padding: "2px 0" }}>
                    <CatSel v={d.cat} cats={i.categorias} onChange={(c) => editItem("deudas", d.id, { cat: c })} />
                    <span style={{ fontSize: 13, color: P.muted }}>saldo <input className="num mono" type="number" value={d.saldo} onChange={(e) => editItem("deudas", d.id, { saldo: +e.target.value || 0 })} /></span>
                  </div>
                  <SchedProv item={d} arr="deudas" saldo={+d.saldo || 0} allNames={aggDeuda.names} provAdd={provAdd} provDel={provDel} provEdit={provEdit} />
                </div>
              ))}
              {i.deudas.length === 0 && <div style={{ fontSize: 13, color: P.muted, padding: "6px 0" }}>Sin deudas.</div>}
              <button className="btn" style={{ marginTop: 8 }} onClick={() => addItem("deudas", { n: "Nueva deuda", saldo: 0, tasa: 0, tipo: "personal", ambito: "personal", cat: "DEUDAS", pagos: z(), pagosProv: Array.from({ length: H }, () => []) })}>+ Agregar deuda</button>
            </Panel>

            <Panel fold eb="Cobros" title="Cuentas por cobrar" summary={`${money(M.totalCobrar)} · ${i.porCobrar.length} cuentas · cronograma por pagador`}>
              {i.porCobrar.map((c) => (
                <div key={c.id} style={{ padding: "8px 0", borderBottom: `1px solid ${P.faint}` }}>
                  <div className="row" style={{ padding: "2px 0" }}>
                    <input className="nam" value={c.n} onChange={(e) => editItem("porCobrar", c.id, { n: e.target.value })} />
                    <Amb v={c.ambito} onChange={(a) => editItem("porCobrar", c.id, { ambito: a })} />
                    <button className="x" onClick={() => delItem("porCobrar", c.id)}>×</button>
                  </div>
                  <div className="row" style={{ padding: "2px 0" }}>
                    <span style={{ fontSize: 13, color: P.muted }}>monto <input className="num mono" type="number" value={c.monto} onChange={(e) => editItem("porCobrar", c.id, { monto: +e.target.value || 0 })} /></span>
                  </div>
                  <SchedProv item={c} arr="porCobrar" saldo={+c.monto || 0} allNames={aggCobro.names} provAdd={provAdd} provDel={provDel} provEdit={provEdit} />
                </div>
              ))}
              {i.porCobrar.length === 0 && <div style={{ fontSize: 13, color: P.muted, padding: "6px 0" }}>Sin cuentas por cobrar.</div>}
              <button className="btn" style={{ marginTop: 8 }} onClick={() => addItem("porCobrar", { n: "Nuevo cobro", monto: 0, ambito: "personal", cat: "INVERSIONES", cobros: z(), cobrosProv: Array.from({ length: H }, () => []) })}>+ Agregar cobro</button>
            </Panel>

            <Panel fold eb="Metas" title="Metas con fecha" summary={i.metas.length ? `${i.metas.length} meta${i.metas.length === 1 ? "" : "s"} · ${money(i.metas.reduce((a, g) => a + (+g.monto || 0), 0))}` : "Sin metas todavía"}>
              {i.metas.map((g) => {
                const ini = g.mesInicio ?? 0, fin = g.mesObjetivo, off = g.mesesOff || {}, modo = g.modo || "auto";
                let cnt = 0; for (let k = ini; k <= fin; k++) if (!off[k]) cnt++;
                const activos = modo === "manual" ? cnt : Math.max(1, fin - ini + 1);
                const cuota = activos ? (+g.monto || 0) / activos : 0;
                return (
                  <div key={g.id} style={{ padding: "8px 0", borderBottom: `1px solid ${P.faint}` }}>
                    <div className="row" style={{ padding: "2px 0" }}>
                      <input className="nam" value={g.n} onChange={(e) => editItem("metas", g.id, { n: e.target.value })} />
                      <button className="x" onClick={() => delItem("metas", g.id)}>×</button>
                    </div>
                    <div className="row" style={{ padding: "2px 0" }}>
                      <span style={{ fontSize: 13, color: P.muted }}>monto $<input className="num mono" type="number" value={g.monto} onChange={(e) => editItem("metas", g.id, { monto: +e.target.value || 0 })} /></span>
                    </div>
                    <div className="row" style={{ padding: "2px 0" }}>
                      <span style={{ fontSize: 13, color: P.muted }}>desde <MonthSel v={ini} onChange={(v) => editItem("metas", g.id, { mesInicio: v })} /></span>
                      <span style={{ fontSize: 13, color: P.muted }}>hasta <MonthSel v={fin} onChange={(v) => editItem("metas", g.id, { mesObjetivo: v })} /></span>
                    </div>
                    <div style={{ display: "flex", gap: 6, margin: "5px 0" }}>
                      {[["auto", "Cuota automática"], ["manual", "Manual"]].map(([mv, ml]) => (
                        <button key={mv} onClick={() => editItem("metas", g.id, { modo: mv })} style={{ cursor: "pointer", fontSize: 12, padding: "3px 8px", borderRadius: 6, border: `1px solid ${modo === mv ? P.teal : P.line}`, background: modo === mv ? P.teal : P.panel, color: modo === mv ? "#fff" : P.muted }}>{ml}</button>
                      ))}
                    </div>
                    {modo === "manual" && fin >= ini && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4, padding: 8, background: P.faint, borderRadius: 6, marginBottom: 4 }}>
                        {Array.from({ length: fin - ini + 1 }, (_, j) => ini + j).map((k) => (
                          <label key={k} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, cursor: "pointer", color: P.muted }}>
                            <input type="checkbox" checked={!off[k]} onChange={() => editItem("metas", g.id, { mesesOff: { ...off, [k]: !off[k] } })} />{mlabel(k)}
                          </label>
                        ))}
                      </div>
                    )}
                    {g.monto > 0 && fin >= ini && <div className="mono" style={{ fontSize: 12, color: P.teal, textAlign: "right" }}>cuota {money(cuota)}/mes · {activos} mes{activos === 1 ? "" : "es"}</div>}
                  </div>
                );
              })}
              {i.metas.length === 0 && <div style={{ fontSize: 13, color: P.muted, padding: "6px 0" }}>Sin metas. Agregá auto, casa, viaje…</div>}
              <button className="btn" style={{ marginTop: 8 }} onClick={() => addItem("metas", { n: "Nueva meta", monto: 0, mesInicio: 0, mesObjetivo: 11, modo: "auto", mesesOff: {} })}>+ Agregar meta</button>
            </Panel>
          </div>
        )}
        {view === "ana" && (
          <div className="gcol">
            <section className="panel sticky" style={{ display: "grid", gap: 10, padding: "12px 16px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                  <span className="eb" style={{ margin: 0 }}>Período</span>
                  <b style={{ fontSize: 16 }}>{anaFrom === anaTo ? mlabel(anaFrom) : `${mlabel(anaFrom)} → ${mlabel(anaTo)}`}</b>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, fontSize: 14, color: P.muted }}>
                  Desde <MonthSel v={anaFrom} onChange={(v) => { setAnaFrom(v); if (v > anaTo) setAnaTo(v); }} />
                  hasta <MonthSel v={anaTo} onChange={(v) => { setAnaTo(v); if (v < anaFrom) setAnaFrom(v); }} />
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {[["Este mes", rm, rm], ["Próximos 3", rm, Math.min(H - 1, rm + 2)], ["Próximos 6", rm, Math.min(H - 1, rm + 5)], ["12 meses", 0, 11], ["Todo", 0, H - 1]].map(([l, f, t]) => (
                  <button key={l} className="btn" onClick={() => { setAnaFrom(f); setAnaTo(t); }} style={{ minHeight: 32, padding: "4px 12px", borderColor: anaFrom === f && anaTo === t ? P.teal : P.line, background: anaFrom === f && anaTo === t ? "var(--pri-soft)" : P.panel }}>{l}</button>
                ))}
              </div>
            </section>

            <RealView mode="ana" {...rvProps} from={anaFrom} to={anaTo} />

            <div className="g2">
              <Panel eb="Gastos y deudas" title="En qué se va la plata">
                {pieData.data.length === 0 ? <div style={{ fontSize: 14, color: P.muted }}>Sin datos.</div> : (() => {
                  const act = pieData.data.filter((d) => !pieOff[d.label]);
                  const actTot = act.reduce((a, d) => a + d.value, 0) || 1;
                  return (
                    <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
                      <Donut data={act} center={kfmt(actTot)} sub="en el período" />
                      <div style={{ flex: "1 1 200px", display: "grid", gap: 2 }}>
                        {pieData.data.map((d) => {
                          const off = !!pieOff[d.label];
                          return (
                            <button key={d.label} onClick={() => setPieOff((o) => ({ ...o, [d.label]: !o[d.label] }))} aria-pressed={!off} style={{ cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8, border: "none", background: "transparent", padding: "5px 2px", color: P.ink, opacity: off ? 0.45 : 1, textAlign: "left" }}>
                              <span style={{ width: 11, height: 11, borderRadius: 3, background: off ? P.line : d.color, flexShrink: 0 }} />
                              <span style={{ flex: 1, fontSize: 13, textDecoration: off ? "line-through" : "none", textTransform: "capitalize" }}>{d.label.toLowerCase()}</span>
                              <span style={{ fontSize: 13, color: P.muted }}>{off ? "—" : pct(d.value / actTot)}</span>
                            </button>
                          );
                        })}
                        <span style={{ fontSize: 12, color: P.muted, marginTop: 4 }}>Tocá una categoría para sacarla o volver a sumarla.</span>
                      </div>
                    </div>
                  );
                })()}
              </Panel>

              <Panel eb="Ahorro" title="Plata acumulada según el plan">
                {(() => {
                  const fl = r.flujo.filter((f) => f.m >= anaFrom && f.m <= anaTo);
                  const fT = r.flujo[anaTo] || {};
                  return (
                    <>
                      <TChart height={200} labels={fl.map((f) => mlabel(f.m))} series={[
                        { name: "Total", data: fl.map((f) => (f.ahorroAcum || 0) + (f.sobranteAcum || 0) + (f.reservaAcum || 0)), color: P.teal, dots: true, area: true },
                        { name: "Ahorro", data: fl.map((f) => f.ahorroAcum || 0), color: P.blue },
                        { name: "Reserva impuestos", data: fl.map((f) => f.reservaAcum || 0), color: P.gold, dashed: true },
                      ]} />
                      <div className="kpis" style={{ marginTop: 10 }}>
                        {[["Ahorro definido", fT.ahorroAcum], ["Sobrante libre", fT.sobranteAcum], ["Reserva impuestos", fT.reservaAcum], ["Total a " + mlabel(anaTo), (fT.ahorroAcum || 0) + (fT.sobranteAcum || 0) + (fT.reservaAcum || 0)]].map(([l, v]) => (
                          <div key={l} style={{ background: P.faint, borderRadius: 10, padding: "8px 10px" }}><div style={{ fontSize: 12, color: P.muted }}>{l}</div><b style={{ fontSize: 15 }}>{money(v || 0)}</b></div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </Panel>
            </div>

            <Panel eb="Patrimonio neto" title={`Lo que tenés menos lo que debés, a ${mlabel(anaTo)}`}>
              {(() => {
                const fl = r.flujo.filter((f) => f.m >= anaFrom && f.m <= anaTo);
                const fT = r.flujo[anaTo] || {};
                const act = (fT.patrimonioAcum || 0) + (fT.reservaAcum || 0) + (fT.cobrosPend || 0), pas = (fT.deudaTot || 0) + (fT.cardCarry || 0);
                return (
                  <div style={{ display: "grid", gap: 14 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-end" }}>
                      <div><div style={{ fontSize: 13, color: P.muted }}>Patrimonio neto (plan)</div><div style={{ fontSize: 30, fontWeight: 700, color: (fT.patrimonioNeto || 0) < 0 ? P.critical : P.healthy }}>{money(fT.patrimonioNeto || 0)}</div></div>
                      <div style={{ fontSize: 14, color: P.muted }}>Tenés <b style={{ color: P.ink }}>{money(act)}</b> y debés <b style={{ color: P.ink }}>{money(pas)}</b></div>
                    </div>
                    <TChart height={200} labels={fl.map((f) => mlabel(f.m))} series={[{ name: "Patrimonio neto", data: fl.map((f) => f.patrimonioNeto || 0), color: P.teal, dots: true, area: true }]} />
                    <div className="kpis4">
                      {[["Ahorro y sobrante", fT.patrimonioAcum], ["Reserva impuestos", fT.reservaAcum], ["Te deben", fT.cobrosPend], ["Debés", -(pas)]].map(([l, v]) => (
                        <div key={l} style={{ background: P.faint, borderRadius: 10, padding: "8px 10px" }}><div style={{ fontSize: 12, color: P.muted }}>{l}</div><b style={{ fontSize: 15, color: (v || 0) < 0 ? P.critical : P.ink }}>{money(v || 0)}</b></div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </Panel>

            <Panel fold eb="Detalle" title="Flujo mes a mes (plan)" summary="La contabilidad completa de cada mes del período">
              <div className="tblw">
                <table className="tbl">
                  <thead><tr><th>Mes</th><th>Ingreso</th><th>Cobros</th><th>Gastos</th><th>Deuda</th><th>Déficit anterior</th><th>Metas</th><th>Reserva</th><th>Ahorro</th><th>Resultado</th></tr></thead>
                  <tbody>
                    {r.flujo.filter((f) => f.m >= anaFrom && f.m <= anaTo).map((f) => {
                      const lbl = f.deficit < 0 ? "déficit" : f.cubierto > 0 ? "cubierto" : f.sobrante > 0 ? "sobra" : "";
                      const neg = (v) => (v ? "−" + money(v) : "·");
                      return (
                        <tr key={f.m} style={{ borderBottom: `1px solid ${P.faint}` }}>
                          <td><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: SCC[f.sc] }} />{mlabel(f.m)}</span></td>
                          <td>{money(f.salario)}</td>
                          <td>{f.cobros ? money(f.cobros) : "·"}</td>
                          <td style={{ color: P.muted }}>{neg(f.gastos)}</td>
                          <td style={{ color: P.muted }}>{neg(f.deuda)}</td>
                          <td style={{ color: f.tarjeta ? P.critical : P.muted }}>{neg(f.tarjeta)}</td>
                          <td style={{ color: P.muted }}>{neg(f.metasMes)}</td>
                          <td>{f.reserva ? money(f.reserva) : "·"}</td>
                          <td>{f.ahorro ? money(f.ahorro) : "·"}</td>
                          <td style={{ fontWeight: 700, color: f.resultado < 0 ? P.critical : P.ink }}>{money(f.resultado)} <span style={{ fontSize: 11, fontWeight: 400, color: P.muted }}>{lbl}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}

function Login({ onLogin, theme, toggleTheme }) {
  const [u, setU] = useState(""), [p, setP] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!u || !p) { setErr("Completá usuario y clave."); return; }
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: u, password: p }) });
      const j = await r.json();
      if (j.ok) onLogin({ username: j.username, password: p }, j.data);
      else setErr(j.error || "Usuario o clave incorrectos.");
    } catch (e) { setErr("No se pudo conectar. Probá de nuevo."); }
    setBusy(false);
  };
  return (
    <div className={"app" + (theme === "dark" ? " dark" : "")} style={{ background: P.paper, color: P.ink, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{CSS}</style>
      <div className="panel" style={{ width: "100%", maxWidth: 360, position: "relative" }}>
        <button onClick={toggleTheme} title="Cambiar tema" style={{ position: "absolute", top: 14, right: 14, cursor: "pointer", border: `1px solid ${P.line}`, background: "transparent", color: P.muted, borderRadius: 8, padding: "4px 8px", fontSize: 14 }}>{theme === "dark" ? "☀︎" : "☾"}</button>
        <div className="eb mono">Planificador financiero</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "4px 0 16px" }}>Ingresá</h1>
        <div style={{ display: "grid", gap: 10 }}>
          <input placeholder="Usuario" value={u} onChange={(e) => setU(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} style={{ padding: "10px 12px", fontSize: 14 }} />
          <input placeholder="Clave" type="password" value={p} onChange={(e) => setP(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} style={{ padding: "10px 12px", fontSize: 14 }} />
          {err && <div style={{ fontSize: 14, color: P.critical }}>{err}</div>}
          <button onClick={submit} disabled={busy} style={{ cursor: "pointer", border: "none", background: P.teal, color: "#fff", fontWeight: 600, padding: "10px 12px", borderRadius: 8, fontSize: 14 }}>{busy ? "Entrando…" : "Entrar"}</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem("finora_theme") || "light"; } catch (e) { return "light"; } });
  useEffect(() => { try { localStorage.setItem("finora_theme", theme); } catch (e) {} }, [theme]);
  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  if (!session) return <Login theme={theme} toggleTheme={toggleTheme} onLogin={(a, d) => setSession({ auth: a, data: d })} />;
  return <Planner auth={session.auth} initialData={session.data} theme={theme} toggleTheme={toggleTheme} onLogout={() => setSession(null)} />;
}
