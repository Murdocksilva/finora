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
const SCC = { e1: P.critical, e2: P.caution, e3: P.blue, e4: P.healthy };
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
      out.push(prov[m].map((p) => ({ id: typeof p.id === "number" ? p.id : uid(), prov: p.prov || (lbl + " 1"), monto: +p.monto || 0 })));
    } else {
      const v = (tot && tot[m]) || 0;
      out.push(v > 0 ? [{ id: uid(), prov: lbl + " 1", monto: v }] : []);
    }
  }
  return out;
}
const pad = (a) => { const b = a.slice(0, H); while (b.length < H) b.push(0); return b; };

const CSS = `
.app{--paper:#F4F5F1;--panel:#FFFFFF;--ink:#16211C;--muted:#6B7269;--line:#E3E5DE;--faint:#EFF1EC;--teal:#0B5D4E;--healthy:#2F8F6B;--caution:#B8791E;--critical:#A8412F;--blue:#3E6FA8;--gold:#C9A24B;--softgreen:#8FC9B4;--dash:#B9C0B6;min-height:100vh;width:100%;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;-webkit-font-smoothing:antialiased;transition:background .2s ease,color .2s ease}
.app.dark{--paper:#12171A;--panel:#1B2227;--ink:#E7ECEA;--muted:#95A0A5;--line:#2E383D;--faint:#232B30;--teal:#3B9E88;--healthy:#47A87C;--caution:#C88F3C;--critical:#CE6450;--blue:#5B90CE;--gold:#C6A257;--softgreen:#5AA588;--dash:#3E4A50}
.wrap{max-width:1180px;margin:0 auto;padding:24px 20px}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.gmain{display:grid;grid-template-columns:minmax(0,370px) minmax(0,1fr);gap:20px;align-items:start}
.gcol{display:grid;gap:20px;min-width:0}
.cards4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.panel{background:var(--panel);border:1px solid ${P.line};border-radius:12px;padding:18px;min-width:0}
.eb{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:${P.teal};margin-bottom:6px}
.h2{font-size:15px;font-weight:600;color:${P.ink};margin:0 0 12px}
.row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 0;min-width:0}
input,select{outline:none;font-size:13px;border-radius:6px;border:1px solid ${P.line};background:${P.faint};color:${P.ink}}
.num{width:80px;text-align:right;padding:5px 8px;font-family:ui-monospace,Menlo,monospace}
.nam{flex:1;min-width:0;padding:4px 6px;background:transparent;border:none;border-bottom:1px dashed var(--dash);border-radius:0;font-size:13px}
.nam:focus{background:${P.faint};border-bottom:1px solid ${P.teal}}
.sel{font-size:11px;padding:3px 4px;max-width:120px}
input:focus,select:focus{box-shadow:0 0 0 2px rgba(11,93,78,.22)}
.btn{cursor:pointer;font-size:12px;border:1px dashed ${P.line};background:var(--panel);color:${P.teal};border-radius:6px;padding:5px 8px}
.x{cursor:pointer;border:none;background:transparent;color:${P.muted};font-size:15px;line-height:1;padding:0 2px}
.scroll{max-height:240px;overflow:auto;padding-right:4px;margin-right:-4px}
.pill{cursor:pointer;font-size:13px;padding:5px 12px;border-radius:20px}
.grid24{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin-top:6px;padding:8px;background:${P.faint};border-radius:6px}
.si{width:100%;text-align:right;font-size:11px;padding:3px 3px;border:1px solid ${P.line};border-radius:4px;background:var(--panel);font-family:ui-monospace,Menlo,monospace}
.tbl{width:100%;border-collapse:collapse;font-size:11.5px}
.tbl th,.tbl td{padding:4px 6px;text-align:right;white-space:nowrap}
.tbl th:first-child,.tbl td:first-child{text-align:left}
.tbl thead th{color:${P.muted};font-weight:600;border-bottom:1px solid ${P.line};position:sticky;top:0;background:var(--panel)}
@media(max-width:900px){.gmain{grid-template-columns:1fr}.cards4{grid-template-columns:1fr 1fr}.g2{grid-template-columns:1fr}}
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
  x.actuals = inp.actuals && typeof inp.actuals === "object" ? inp.actuals : {};
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
const Panel = ({ eb, title, children, right }) => (
  <section className="panel">
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
      <div>{eb && <div className="eb">{eb}</div>}{title && <h2 className="h2">{title}</h2>}</div>
      {right}
    </div>
    {children}
  </section>
);
const sev = (s) => (s === "critical" ? P.critical : s === "caution" ? P.caution : P.healthy);
const Amb = ({ v, onChange }) => (
  <span style={{ display: "inline-flex", border: `1px solid ${P.line}`, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
    {["compania", "personal"].map((a) => (
      <button key={a} onClick={() => onChange(a)} style={{ cursor: "pointer", border: "none", fontSize: 11, padding: "2px 6px", background: v === a ? P.teal : P.panel, color: v === a ? "#fff" : P.muted }}>{a === "compania" ? "Cía" : "Pers"}</button>
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
      <button className="btn" style={{ fontSize: 11, padding: "3px 7px" }} onClick={() => setOpen((o) => !o)}>{open ? "▾" : "▸"} mes a mes {extra}</button>
      {open && (
        <div className="grid24">
          {arr.map((v, m) => (
            <div key={m} style={{ textAlign: "center" }}>
              <div className="mono" style={{ fontSize: 8, color: P.muted }}>{mlabel(m)}</div>
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
function aggProv(items, listKey) {
  const byMonth = {};
  items.forEach((it) => {
    (it[listKey] || []).forEach((monthArr, m) => {
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
    if (!entries.length) return <div style={{ fontSize: 12, color: P.muted }}>Sin desglose por proveedor todavía.</div>;
    return (
      <div>
        {entries.map(([n, v], k) => (
          <div key={k} style={{ marginBottom: 7 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}><span>{n}</span><span className="mono" style={{ color: P.muted }}>{money(v)} · {pct(v / (agg.grand || 1))}</span></div>
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
      <div style={{ marginTop: 8, fontSize: 13 }}>Total a <b>{sel}</b>: <b className="mono" style={{ color }}>{money(tot)}</b></div>
    </div>
  );
}

function SchedProv({ item, arr, saldo, allNames, provAdd, provDel, provEdit }) {
  const k = provKeys[arr];
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const list = item[k.list] || [];
  const tot = item[k.tot] || [];
  const prog = tot.reduce((a, x) => a + (+x || 0), 0);
  const provNames = Array.from(new Set([...(allNames || []), ...list.flat().map((p) => p && p.prov)].filter(Boolean)));
  const monthProvs = list[sel] || [];
  const monthTot = monthProvs.reduce((a, p) => a + (+p.monto || 0), 0);
  return (
    <div style={{ marginTop: 4 }}>
      <button className="btn" style={{ fontSize: 11, padding: "3px 7px" }} onClick={() => setOpen((o) => !o)}>{open ? "▾" : "▸"} cronograma · <span className="mono" style={{ color: Math.abs(prog - saldo) > 1 ? P.caution : P.teal }}>{money(prog)}{saldo ? ` / ${money(saldo)}` : ""}</span></button>
      {open && (
        <div style={{ marginTop: 6, padding: 8, background: P.faint, borderRadius: 6 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 3, marginBottom: 8 }}>
            {tot.map((v, m) => (
              <button key={m} onClick={() => setSel(m)} style={{ cursor: "pointer", border: `1px solid ${m === sel ? P.teal : P.line}`, background: m === sel ? P.teal : P.panel, color: m === sel ? "#fff" : (v > 0 ? P.ink : P.muted), borderRadius: 4, padding: "3px 1px", fontSize: 8, lineHeight: 1.3 }}>
                {mlabel(m)}<br /><span className="mono">{v ? money(v) : "·"}</span>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{mlabel(sel)} · total <span className="mono" style={{ color: P.teal }}>{money(monthTot)}</span></div>
          <datalist id={`prov-${arr}-${item.id}`}>{provNames.map((n) => <option key={n} value={n} />)}</datalist>
          {monthProvs.map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
              <input list={`prov-${arr}-${item.id}`} value={p.prov} placeholder={k.lbl} onChange={(e) => provEdit(arr, item.id, sel, p.id, { prov: e.target.value })} style={{ flex: 1, minWidth: 0, fontSize: 12, padding: "3px 6px", border: `1px solid ${P.line}`, borderRadius: 4, background: P.panel }} />
              <span className="mono" style={{ fontSize: 12, color: P.muted }}>$<input className="si" style={{ width: 72 }} type="number" value={p.monto} onChange={(e) => provEdit(arr, item.id, sel, p.id, { monto: +e.target.value || 0 })} /></span>
              <button className="x" onClick={() => provDel(arr, item.id, sel, p.id)}>×</button>
            </div>
          ))}
          {monthProvs.length === 0 && <div style={{ fontSize: 11, color: P.muted, marginBottom: 4 }}>Sin desglose este mes.</div>}
          <button className="btn" style={{ fontSize: 11 }} onClick={() => provAdd(arr, item.id, sel)}>+ {k.lbl.toLowerCase()}</button>
        </div>
      )}
    </div>
  );
}
function GBars({ rows, color, lblA, lblB }) {
  const clean = rows.filter((r) => (r.a || 0) > 0 || (r.b || 0) > 0);
  if (!clean.length) return <div style={{ fontSize: 12, color: P.muted }}>Sin datos para mostrar todavía.</div>;
  const max = Math.max(1, ...clean.flatMap((r) => [r.a || 0, r.b || 0]));
  return (
    <div>
      <div style={{ display: "flex", gap: 16, fontSize: 11, color: P.muted, marginBottom: 8 }}>
        <span><span style={{ display: "inline-block", width: 9, height: 9, background: P.line, borderRadius: 2, marginRight: 4 }} />{lblA}</span>
        <span><span style={{ display: "inline-block", width: 9, height: 9, background: color, borderRadius: 2, marginRight: 4 }} />{lblB}</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 150, overflowX: "auto", paddingBottom: 46 }}>
        {clean.map((r, k) => (
          <div key={k} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 auto", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 104 }}>
              <div title={`${lblA}: ${money(r.a || 0)}`} style={{ width: 15, height: `${Math.max(2, ((r.a || 0) / max) * 100)}%`, background: P.line, borderRadius: "2px 2px 0 0" }} />
              <div title={`${lblB}: ${money(r.b || 0)}`} style={{ width: 15, height: `${Math.max(2, ((r.b || 0) / max) * 100)}%`, background: color, borderRadius: "2px 2px 0 0" }} />
            </div>
            <span style={{ position: "absolute", top: 108, left: "50%", transformOrigin: "left top", transform: "rotate(35deg)", fontSize: 9, color: P.muted, whiteSpace: "nowrap" }}>{r.n} · {pct((r.a || 0) > 0 ? (r.b || 0) / (r.a || 1) : 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
function RealDelta({ real, proj }) { const d = real - proj; if (Math.abs(d) < 1) return <span style={{ color: P.muted }}>=</span>; return <span style={{ color: d > 0 ? P.critical : P.healthy }}>{d > 0 ? "+" : "−"}{money(Math.abs(d))}</span>; }
function RealTabla({ rows, kind, rm, setActual, pend }) {
  return (
    <table className="tbl"><thead><tr><th>{kind === "g" ? "Partida" : kind === "d" ? "Deuda" : "Cobro"}</th><th>Proy.</th><th>Real</th><th>Δ</th>{pend && <th>Pend.</th>}</tr></thead>
      <tbody>{rows.map((r) => (
        <tr key={r.id} style={{ borderBottom: `1px solid ${P.faint}` }}>
          <td>{r.n}</td><td className="mono" style={{ color: P.muted }}>{money(r.proj)}</td>
          <td><input className="si" style={{ width: 82 }} type="number" value={r.real} onChange={(e) => setActual(rm, kind, r.id, e.target.value === "" ? 0 : +e.target.value)} /></td>
          <td className="mono"><RealDelta real={r.real} proj={r.proj} /></td>
          {pend && <td className="mono" style={{ color: pend(r.id) > 0 ? (kind === "d" ? P.critical : P.caution) : P.healthy }}>{money(pend(r.id))}</td>}
        </tr>))}
      </tbody></table>
  );
}
function CmpChart({ rows, la, lb, ca, cb }) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.a, r.b]));
  const sorted = [...rows].sort((x, y) => Math.max(y.a, y.b) - Math.max(x.a, x.b));
  const Bar = ({ v, c }) => (<div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ height: 13, width: `${(v / max) * 100}%`, minWidth: v > 0 ? 3 : 0, background: c, borderRadius: 2 }} /><span className="mono" style={{ fontSize: 10, color: P.muted }}>{money(v)}</span></div>);
  return (
    <div>
      <div style={{ display: "flex", gap: 16, fontSize: 11, color: P.muted, marginBottom: 8 }}>
        <span><span style={{ display: "inline-block", width: 9, height: 9, background: ca, borderRadius: 2, marginRight: 4 }} />{la}</span>
        <span><span style={{ display: "inline-block", width: 9, height: 9, background: cb, borderRadius: 2, marginRight: 4 }} />{lb}</span>
      </div>
      {sorted.length === 0 && <div style={{ fontSize: 12, color: P.muted }}>Sin datos.</div>}
      {sorted.map((r, k) => (
        <div key={k} style={{ marginBottom: 9 }}>
          <div style={{ fontSize: 12, marginBottom: 2 }}>{r.n}</div>
          <div style={{ display: "grid", gap: 2 }}><Bar v={r.a} c={ca} /><Bar v={r.b} c={cb} /></div>
        </div>
      ))}
    </div>
  );
}
function RealView({ i, rm, setRm, setActual, setActualIng }) {
  const A = (i.actuals && i.actuals[rm]) || {};
  const projIng = i.ingreso[i.horizonte[rm] ? i.horizonte[rm].sc : "e2"] || 0;
  const realIng = A.ingreso != null ? A.ingreso : projIng;
  const grows = i.gastosItems.map((it) => ({ id: it.id, n: it.n, proj: +it.m || 0, real: A.g && A.g[it.id] != null ? A.g[it.id] : (+it.m || 0) }));
  const drows = i.deudas.map((d) => ({ id: d.id, n: d.n, proj: d.pagos?.[rm] || 0, real: A.d && A.d[d.id] != null ? A.d[d.id] : (d.pagos?.[rm] || 0) }));
  const crows = i.porCobrar.map((c) => ({ id: c.id, n: c.n, proj: c.cobros?.[rm] || 0, real: A.c && A.c[c.id] != null ? A.c[c.id] : (c.cobros?.[rm] || 0) }));
  const sum = (rows, k) => rows.reduce((a, r) => a + r[k], 0);
  const projG = sum(grows, "proj"), realG = sum(grows, "real"), projD = sum(drows, "proj"), realD = sum(drows, "real"), projC = sum(crows, "proj"), realC = sum(crows, "real");
  const projRes = projIng + projC - projG - projD, realRes = realIng + realC - realG - realD;
  const pagadoReal = (id) => Object.values(i.actuals || {}).reduce((a, mm) => a + ((mm.d && mm.d[id]) || 0), 0);
  const cobradoReal = (id) => Object.values(i.actuals || {}).reduce((a, mm) => a + ((mm.c && mm.c[id]) || 0), 0);
  const pagadoHasta = (id) => { let s = 0; for (let m = 0; m <= rm; m++) { const mm = i.actuals && i.actuals[m]; if (mm && mm.d) s += (mm.d[id] || 0); } return s; };
  const cobradoHasta = (id) => { let s = 0; for (let m = 0; m <= rm; m++) { const mm = i.actuals && i.actuals[m]; if (mm && mm.c) s += (mm.c[id] || 0); } return s; };
  const metaRows = i.metas.map((g) => { let acum = 0; for (let k = 0; k <= rm; k++) acum += metaAporte(g, k); return { n: g.n, a: +g.monto || 0, b: acum }; });
  const rubros = [
    { n: "Ingreso", proj: projIng, real: realIng, pos: true },
    { n: "Gastos", proj: projG, real: realG, pos: false },
    { n: "Deuda", proj: projD, real: realD, pos: false },
    { n: "Cobros", proj: projC, real: realC, pos: true },
  ];
  return (
    <div className="gcol" style={{ maxWidth: 820, margin: "0 auto" }}>
      <Panel eb="Registro real · lo que pasó de verdad" title="Cargá el mes en curso" right={<MonthSel v={rm} onChange={setRm} />}>
        <p style={{ fontSize: 13, color: P.muted, marginTop: 0 }}>Estás cargando <b style={{ color: P.ink }}>{mlabel(rm)}</b>. Los campos vienen con lo proyectado; cambiá solo lo que fue distinto.</p>
        <div className="row"><span style={{ fontSize: 13, color: P.muted }}>Ingreso real</span><span className="mono" style={{ fontSize: 13, color: P.muted }}>proy {money(projIng)} → $<input className="num mono" type="number" value={realIng} onChange={(e) => setActualIng(rm, e.target.value === "" ? 0 : +e.target.value)} /></span></div>
      </Panel>

      <Panel eb="Resumen del mes" title={`Proyectado vs real · ${mlabel(rm)}`}>
        <table className="tbl">
          <thead><tr><th>Rubro</th><th>Proy.</th><th>Real</th><th>Δ</th><th style={{ width: 84 }}>Real/Proy</th></tr></thead>
          <tbody>
            {rubros.map((ru, k) => {
              const d = ru.real - ru.proj, good = ru.pos ? d >= 0 : d <= 0;
              const col = Math.abs(d) < 1 ? P.muted : (good ? P.healthy : P.critical), mx = Math.max(ru.proj, ru.real, 1);
              return (
                <tr key={k} style={{ borderBottom: `1px solid ${P.faint}` }}>
                  <td>{ru.n}</td>
                  <td className="mono" style={{ color: P.muted }}>{money(ru.proj)}</td>
                  <td className="mono">{money(ru.real)}</td>
                  <td className="mono" style={{ color: col }}>{d > 0 ? "+" : ""}{money(d)}</td>
                  <td><div style={{ display: "grid", gap: 2 }}><div style={{ height: 5, width: `${(ru.proj / mx) * 100}%`, background: P.line, borderRadius: 2 }} /><div style={{ height: 5, width: `${(ru.real / mx) * 100}%`, background: col === P.muted ? P.teal : col, borderRadius: 2 }} /></div></td>
                </tr>
              );
            })}
            <tr style={{ borderTop: `1px solid ${P.line}` }}>
              <td style={{ fontWeight: 600 }}>Resultado</td>
              <td className="mono" style={{ color: P.muted }}>{money(projRes)}</td>
              <td className="mono" style={{ fontWeight: 700, color: realRes < 0 ? P.critical : P.healthy }}>{money(realRes)}</td>
              <td className="mono" style={{ color: (realRes - projRes) < 0 ? P.critical : P.healthy }}>{(realRes - projRes) > 0 ? "+" : ""}{money(realRes - projRes)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
        <div style={{ fontSize: 10, color: P.muted, marginTop: 6 }}>Barra clara = proyectado · barra de color = real. Verde: vas mejor que lo previsto; rojo: peor.</div>
      </Panel>

      <Panel eb="Gastos" title="Detalle real por partida"><RealTabla rows={grows} kind="g" rm={rm} setActual={setActual} /></Panel>
      <Panel eb="Deuda" title="Detalle real por deuda"><RealTabla rows={drows} kind="d" rm={rm} setActual={setActual} pend={(id) => Math.max(0, (+(i.deudas.find((x) => x.id === id) || {}).saldo || 0) - pagadoReal(id))} /><div style={{ marginTop: 16 }}><GBars rows={i.deudas.map((d) => ({ n: d.n, a: +d.saldo || 0, b: pagadoHasta(d.id) }))} color={P.critical} lblA="Deuda total" lblB={`Pagado a ${mlabel(rm)}`} /></div></Panel>
      <Panel eb="Cuentas por cobrar" title="Detalle real por cobro"><RealTabla rows={crows} kind="c" rm={rm} setActual={setActual} pend={(id) => Math.max(0, (+(i.porCobrar.find((x) => x.id === id) || {}).monto || 0) - cobradoReal(id))} /><div style={{ marginTop: 16 }}><GBars rows={i.porCobrar.map((c) => ({ n: c.n, a: +c.monto || 0, b: cobradoHasta(c.id) }))} color={P.healthy} lblA="Total a cobrar" lblB={`Cobrado a ${mlabel(rm)}`} /></div></Panel>
      <Panel eb="Metas" title="Avance a la fecha">
        {metaRows.length === 0 ? <div style={{ fontSize: 13, color: P.muted }}>Sin metas.</div> : (
          <>
            <table className="tbl">
              <thead><tr><th>Meta</th><th>Total</th><th>Acumulado</th><th>Avance</th></tr></thead>
              <tbody>{metaRows.map((mr, k) => (
                <tr key={k} style={{ borderBottom: `1px solid ${P.faint}` }}><td>{mr.n}</td><td className="mono" style={{ color: P.muted }}>{money(mr.a)}</td><td className="mono" style={{ color: P.teal }}>{money(mr.b)}</td><td className="mono">{pct(mr.a > 0 ? mr.b / mr.a : 0)}</td></tr>
              ))}</tbody>
            </table>
            <div style={{ marginTop: 16 }}><GBars rows={metaRows} color={P.teal} lblA="Meta total" lblB={`Acumulado a ${mlabel(rm)}`} /></div>
          </>
        )}
      </Panel>
    </div>
  );
}

function Planner({ auth, initialData, onLogout, theme, toggleTheme }) {
  const [profiles, setProfiles] = useState(() => { const n = parseProfiles(initialData); return (n && n.length) ? n : [{ id: uid(), nombre: auth.username, inp: blankInp() }]; });
  const [saving, setSaving] = useState("");
  const [activeId, setActiveId] = useState(() => profiles[0].id);
  const active = profiles.find((p) => p.id === activeId) || profiles[0];
  const i = active.inp;
  const [pieMes, setPieMes] = useState(5), [ahoMes, setAhoMes] = useState(11), [deuMes, setDeuMes] = useState(11), [netoMes, setNetoMes] = useState(11);
  const [pieOff, setPieOff] = useState({});
  const [deuProv, setDeuProv] = useState("__all__"), [cobProv, setCobProv] = useState("__all__");
  const [view, setView] = useState("proj"), [rm, setRm] = useState(0);
  const setActual = (m, kind, id, val) => updInp((x) => { const acts = { ...(x.actuals || {}) }; const cur = { g: {}, d: {}, c: {}, ...(acts[m] || {}) }; cur[kind] = { ...(cur[kind] || {}), [id]: val }; acts[m] = cur; return { ...x, actuals: acts }; });
  const setActualIng = (m, val) => updInp((x) => { const acts = { ...(x.actuals || {}) }; const cur = { g: {}, d: {}, c: {}, ...(acts[m] || {}) }; cur.ingreso = val; acts[m] = cur; return { ...x, actuals: acts }; });
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
    for (let m = 0; m <= pieMes; m++) {
      i.gastosItems.forEach((x) => { acc[x.cat] = (acc[x.cat] || 0) + (+x.m || 0); });
      i.deudas.forEach((d) => { acc[d.cat || "DEUDAS"] = (acc[d.cat || "DEUDAS"] || 0) + (d.pagos?.[m] || 0); });
    }
    const arr = Object.entries(acc).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const tot = arr.reduce((a, [, v]) => a + v, 0) || 1;
    return { arr, tot, data: arr.map(([c, v], k) => ({ label: c, value: v, color: CATCOLORS[k % CATCOLORS.length] })) };
  }, [i, pieMes]);
  const ahoData = r.flujo.slice(0, ahoMes + 1);
  const ahoMax = Math.max(...ahoData.map((f) => f.ahorroAcum + f.sobranteAcum + f.reservaAcum), 1);
  const netoData = r.flujo.slice(0, netoMes + 1);
  const netoAbsMax = Math.max(...netoData.map((f) => Math.abs(f.patrimonioNeto)), 1);
  const fNeto = r.flujo[netoMes] || {};
  const activos = (fNeto.patrimonioAcum || 0) + (fNeto.reservaAcum || 0) + (fNeto.cobrosPend || 0);
  const pasivos = (fNeto.deudaTot || 0) + (fNeto.cardCarry || 0);
  const deuData = r.flujo.slice(0, deuMes + 1);
  const deuPagMax = Math.max(...deuData.map((f) => f.deuda), 1);
  const aggDeuda = useMemo(() => aggProv(i.deudas, "pagosProv"), [i.deudas]);
  const aggCobro = useMemo(() => aggProv(i.porCobrar, "cobrosProv"), [i.porCobrar]);
  const deuTotAtMes = r.flujo[deuMes]?.deudaTot || 0;
  const deuPagTot = r.flujo[deuMes]?.deudaPagAcum || 0;

  return (
    <div className={"app" + (theme === "dark" ? " dark" : "")} style={{ background: P.paper, color: P.ink }}>
      <style>{CSS}</style>
      <div className="wrap">
        {/* USER BAR */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span className="eb" style={{ margin: 0 }}>Usuario</span>
          {profiles.map((p) => (
            <button key={p.id} className="pill" onClick={() => setActiveId(p.id)} style={{ border: `1px solid ${p.id === activeId ? P.teal : P.line}`, background: p.id === activeId ? P.teal : P.panel, color: p.id === activeId ? "#fff" : P.muted }}>{p.nombre}</button>
          ))}
          <button className="btn" style={{ borderRadius: 20 }} onClick={newProfile}>+ Nuevo usuario</button>
          {profiles.length > 1 && <button className="btn" style={{ borderRadius: 20, color: P.critical, borderColor: P.critical }} onClick={delProfile}>Borrar</button>}
          <span style={{ width: 1, height: 18, background: P.line, margin: "0 2px" }} />
          <button className="btn" style={{ borderRadius: 20 }} onClick={exportar}>⬇ Exportar respaldo</button>
          <button className="btn" style={{ borderRadius: 20 }} onClick={() => fileRef.current && fileRef.current.click()}>⬆ Importar</button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={importar} style={{ display: "none" }} />
          <button className="pill" onClick={guardar} style={{ border: "none", background: P.teal, color: "#fff", fontWeight: 600 }}>{saving === "guardando" ? "Guardando…" : "Guardar"}</button>
          {saving === "guardado" && <span className="mono" style={{ fontSize: 11, color: P.healthy }}>guardado en la nube ✓</span>}
          {saving === "error" && <span className="mono" style={{ fontSize: 11, color: P.critical }}>error al guardar</span>}
          <button className="btn" style={{ borderRadius: 20 }} onClick={onLogout}>Salir</button>
          <button className="btn" title="Cambiar tema" style={{ borderRadius: 20, marginLeft: "auto" }} onClick={toggleTheme}>{theme === "dark" ? "☀︎ Claro" : "☾ Oscuro"}</button>
        </div>

        {/* NOMBRE GRANDE */}
        <header style={{ marginBottom: 20 }}>
          <div className="eb mono">Planificador financiero</div>
          <input value={active.nombre} onChange={(e) => renameProfile(e.target.value)} style={{ fontSize: 40, fontWeight: 800, color: P.ink, border: "none", background: "transparent", padding: 0, width: "100%" }} />
          <div style={{ marginTop: 4 }}><span style={{ fontSize: 12, color: P.muted }}>Proyección al: <input type="date" value={i.fechaProy || ""} onChange={(e) => set({ fechaProy: e.target.value })} style={{ fontSize: 12, padding: "3px 6px" }} /></span></div>
          <div style={{ display: "flex", gap: 10, marginTop: 14, borderBottom: `1px solid ${P.line}` }}>
            {[["proj", "Proyección"], ["real", "Registro real"]].map(([k, l]) => (
              <button key={k} onClick={() => setView(k)} style={{ cursor: "pointer", border: "none", background: "transparent", fontSize: 14, fontWeight: 600, padding: "8px 4px", color: view === k ? P.teal : P.muted, borderBottom: `2px solid ${view === k ? P.teal : "transparent"}`, marginBottom: -1 }}>{l}</button>
            ))}
          </div>
        </header>

        {view === "real" && <RealView i={i} rm={rm} setRm={setRm} setActual={setActual} setActualIng={setActualIng} />}
        {view === "proj" && (
        <div className="gmain">
          {/* ── INPUTS ── */}
          <div className="gcol">
            <Panel eb="Ingreso · 4 escenarios" title="Labor mensual (bruto)">
              {SCEN.map((k) => (
                <div className="row" key={k}>
                  <input className="nam" value={i.escNombres?.[k] ?? SCL[k]} onChange={(e) => setEscN(k, e.target.value)} style={{ color: SCC[k], fontWeight: 600, maxWidth: 160 }} />
                  <span className="mono" style={{ color: P.muted, fontSize: 13 }}>$<input className="num mono" type="number" value={i.ingreso[k]} onChange={(e) => setIng(k, +e.target.value || 0)} /></span>
                </div>
              ))}
              <div className="row"><span style={{ fontSize: 13, color: P.muted }}>Ahorro líquido hoy</span><input className="num mono" type="number" value={i.ahorroLiquido} onChange={(e) => set({ ahorroLiquido: +e.target.value || 0 })} /></div>
            </Panel>

            <Panel eb="Reserva y ahorro · % del ingreso" title="Definí el % mes a mes">
              <div className="row"><span style={{ fontSize: 13, color: P.muted }} title="17% impuestos + 2% imprevistos + 5% colchón">Reserva fiscal ⓘ</span></div>
              <Grid24 arr={i.reserva} pctMode onSet={(m, v) => setArr("reserva", m, v)} extra="(reserva %)" />
              <div className="row" style={{ marginTop: 6 }}><span style={{ fontSize: 13, color: P.muted }}>Ahorro</span></div>
              <Grid24 arr={i.ahorro} pctMode onSet={(m, v) => setArr("ahorro", m, v)} extra="(ahorro %)" />
            </Panel>

            <Panel eb="Gastos personales" title={`${money(r.gastos)}/mes`}>
              <div className="scroll">
                {i.gastosItems.map((it) => (
                  <div key={it.id} style={{ padding: "4px 0", borderBottom: `1px solid ${P.faint}` }}>
                    <div className="row" style={{ padding: "1px 0" }}>
                      <input className="nam" value={it.n} onChange={(e) => editItem("gastosItems", it.id, { n: e.target.value })} />
                      <span className="mono" style={{ color: P.muted, fontSize: 13 }}>$<input className="num mono" type="number" step="0.01" value={it.m} onChange={(e) => editItem("gastosItems", it.id, { m: +e.target.value || 0 })} /></span>
                      <button className="x" onClick={() => delItem("gastosItems", it.id)}>×</button>
                    </div>
                    <CatSel v={it.cat} cats={i.categorias} onChange={(c) => editItem("gastosItems", it.id, { cat: c })} />
                  </div>
                ))}
                {i.gastosItems.length === 0 && <div style={{ fontSize: 12, color: P.muted, padding: "6px 0" }}>Sin partidas todavía.</div>}
              </div>
              <button className="btn" style={{ marginTop: 8 }} onClick={() => addItem("gastosItems", { n: "Nueva partida", m: 0, cat: i.categorias[0] })}>+ Agregar partida</button>
              <label className="row" style={{ marginTop: 4, cursor: "pointer" }}><span style={{ fontSize: 12.5, color: P.muted }}>Gastos categorizados y con topes</span><input type="checkbox" checked={i.gastosControlados} onChange={(e) => set({ gastosControlados: e.target.checked })} /></label>
              <div className="row" style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${P.line}` }}>
                <input className="nam" placeholder="+ nueva categoría" value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCat()} />
                <button className="btn" onClick={addCat}>Agregar</button>
              </div>
            </Panel>

            <Panel eb="Balance" title="Tu panorama real">
              <table className="tbl">
                <thead><tr><th></th><th>Compañía</th><th>Personal</th><th>Total</th></tr></thead>
                <tbody>
                  <tr><td>Por pagar</td><td className="mono">{money(M.pagarCia)}</td><td className="mono">{money(M.pagarPers)}</td><td className="mono" style={{ fontWeight: 600 }}>{money(M.totalPagar)}</td></tr>
                  <tr><td>Por cobrar</td><td className="mono">{money(M.cobrarCia)}</td><td className="mono">{money(M.cobrarPers)}</td><td className="mono" style={{ fontWeight: 600 }}>{money(M.totalCobrar)}</td></tr>
                  <tr style={{ borderTop: `1px solid ${P.line}` }}><td style={{ color: P.ink }}>Deuda neta</td><td></td><td></td><td className="mono" style={{ color: P.critical, fontWeight: 600 }}>{money(M.deudaNeta)}</td></tr>
                </tbody>
              </table>
            </Panel>

            <Panel eb="Cuentas por pagar" title="Deudas">
              {i.deudas.map((d) => (
                <div key={d.id} style={{ padding: "8px 0", borderBottom: `1px solid ${P.faint}` }}>
                  <div className="row" style={{ padding: "2px 0" }}>
                    <input className="nam" value={d.n} onChange={(e) => editItem("deudas", d.id, { n: e.target.value })} />
                    <Amb v={d.ambito} onChange={(a) => editItem("deudas", d.id, { ambito: a })} />
                    <button className="x" onClick={() => delItem("deudas", d.id)}>×</button>
                  </div>
                  <div className="row" style={{ padding: "2px 0" }}>
                    <CatSel v={d.cat} cats={i.categorias} onChange={(c) => editItem("deudas", d.id, { cat: c })} />
                    <span style={{ fontSize: 12, color: P.muted }}>saldo <input className="num mono" type="number" value={d.saldo} onChange={(e) => editItem("deudas", d.id, { saldo: +e.target.value || 0 })} /></span>
                  </div>
                  <SchedProv item={d} arr="deudas" saldo={+d.saldo || 0} allNames={aggDeuda.names} provAdd={provAdd} provDel={provDel} provEdit={provEdit} />
                </div>
              ))}
              {i.deudas.length === 0 && <div style={{ fontSize: 12, color: P.muted, padding: "6px 0" }}>Sin deudas.</div>}
              <button className="btn" style={{ marginTop: 8 }} onClick={() => addItem("deudas", { n: "Nueva deuda", saldo: 0, tasa: 0, tipo: "personal", ambito: "personal", cat: "DEUDAS", pagos: z(), pagosProv: Array.from({ length: H }, () => []) })}>+ Agregar deuda</button>
            </Panel>

            <Panel eb="Cuentas por cobrar" title="Lo que te deben">
              {i.porCobrar.map((c) => (
                <div key={c.id} style={{ padding: "8px 0", borderBottom: `1px solid ${P.faint}` }}>
                  <div className="row" style={{ padding: "2px 0" }}>
                    <input className="nam" value={c.n} onChange={(e) => editItem("porCobrar", c.id, { n: e.target.value })} />
                    <Amb v={c.ambito} onChange={(a) => editItem("porCobrar", c.id, { ambito: a })} />
                    <button className="x" onClick={() => delItem("porCobrar", c.id)}>×</button>
                  </div>
                  <div className="row" style={{ padding: "2px 0" }}>
                    <span style={{ fontSize: 12, color: P.muted }}>monto <input className="num mono" type="number" value={c.monto} onChange={(e) => editItem("porCobrar", c.id, { monto: +e.target.value || 0 })} /></span>
                  </div>
                  <SchedProv item={c} arr="porCobrar" saldo={+c.monto || 0} allNames={aggCobro.names} provAdd={provAdd} provDel={provDel} provEdit={provEdit} />
                </div>
              ))}
              {i.porCobrar.length === 0 && <div style={{ fontSize: 12, color: P.muted, padding: "6px 0" }}>Sin cuentas por cobrar.</div>}
              <button className="btn" style={{ marginTop: 8 }} onClick={() => addItem("porCobrar", { n: "Nuevo cobro", monto: 0, ambito: "personal", cat: "INVERSIONES", cobros: z(), cobrosProv: Array.from({ length: H }, () => []) })}>+ Agregar cobro</button>
            </Panel>

            <Panel eb="Metas" title="Objetivos con fecha">
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
                      <span style={{ fontSize: 12, color: P.muted }}>monto $<input className="num mono" type="number" value={g.monto} onChange={(e) => editItem("metas", g.id, { monto: +e.target.value || 0 })} /></span>
                    </div>
                    <div className="row" style={{ padding: "2px 0" }}>
                      <span style={{ fontSize: 12, color: P.muted }}>desde <MonthSel v={ini} onChange={(v) => editItem("metas", g.id, { mesInicio: v })} /></span>
                      <span style={{ fontSize: 12, color: P.muted }}>hasta <MonthSel v={fin} onChange={(v) => editItem("metas", g.id, { mesObjetivo: v })} /></span>
                    </div>
                    <div style={{ display: "flex", gap: 6, margin: "5px 0" }}>
                      {[["auto", "Cuota automática"], ["manual", "Manual"]].map(([mv, ml]) => (
                        <button key={mv} onClick={() => editItem("metas", g.id, { modo: mv })} style={{ cursor: "pointer", fontSize: 11, padding: "3px 8px", borderRadius: 6, border: `1px solid ${modo === mv ? P.teal : P.line}`, background: modo === mv ? P.teal : P.panel, color: modo === mv ? "#fff" : P.muted }}>{ml}</button>
                      ))}
                    </div>
                    {modo === "manual" && fin >= ini && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4, padding: 8, background: P.faint, borderRadius: 6, marginBottom: 4 }}>
                        {Array.from({ length: fin - ini + 1 }, (_, j) => ini + j).map((k) => (
                          <label key={k} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, cursor: "pointer", color: P.muted }}>
                            <input type="checkbox" checked={!off[k]} onChange={() => editItem("metas", g.id, { mesesOff: { ...off, [k]: !off[k] } })} />{mlabel(k)}
                          </label>
                        ))}
                      </div>
                    )}
                    {g.monto > 0 && fin >= ini && <div className="mono" style={{ fontSize: 11, color: P.teal, textAlign: "right" }}>cuota {money(cuota)}/mes · {activos} mes{activos === 1 ? "" : "es"}</div>}
                  </div>
                );
              })}
              {i.metas.length === 0 && <div style={{ fontSize: 12, color: P.muted, padding: "6px 0" }}>Sin metas. Agregá auto, casa, viaje…</div>}
              <button className="btn" style={{ marginTop: 8 }} onClick={() => addItem("metas", { n: "Nueva meta", monto: 0, mesInicio: 0, mesObjetivo: 11, modo: "auto", mesesOff: {} })}>+ Agregar meta</button>
            </Panel>
          </div>

          {/* ── OUTPUT ── */}
          <div className="gcol">
            <Panel eb={`Etapa actual · ${r.etapa}`} title="Prueba de estrés: excedente por escenario">
              <div className="cards4" style={{ marginBottom: 12 }}>
                {r.escArr.map((e) => {
                  const c = e.allIn < 0 ? P.critical : SCC[e.s];
                  return (
                    <div key={e.s} style={{ background: P.faint, border: `1px solid ${P.line}`, borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: 11, color: SCC[e.s] }}>{i.escNombres?.[e.s] ?? SCL[e.s]}</div>
                      <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: c, marginTop: 2 }}>{money(e.allIn)}</div>
                      <div style={{ height: 5, borderRadius: 3, background: P.line, marginTop: 6 }}><div style={{ height: "100%", borderRadius: 3, width: `${(Math.abs(e.allIn) / maxAbs) * 100}%`, background: c }} /></div>
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: 13, color: P.muted, margin: 0 }}>Equilibrio en <b className="mono" style={{ color: P.ink }}>{r.trabajosEq.toFixed(1)}</b> trabajos/mes · deuda neta <b className="mono" style={{ color: P.ink }}>{money(M.deudaNeta)}</b>.</p>
            </Panel>

            {/* FLUJO MES A MES */}
            <Panel eb="Flujo mes a mes" title="Detalle de resultados en totales">
              <div style={{ overflow: "auto", maxHeight: 340 }}>
                <table className="tbl">
                  <thead><tr><th>Mes</th><th>Salario</th><th>Cobros</th><th>Gastos</th><th>Deuda</th><th>Déf. ant.</th><th>Metas</th><th>Reserva</th><th>Ahorro</th><th>Resultado</th></tr></thead>
                  <tbody>
                    {r.flujo.map((f) => {
                      const res = f.resultado;
                      const label = f.deficit < 0 ? "Déficit" : f.cubierto > 0 ? "Cubierto" : f.sobrante > 0 ? "Sobra" : "—";
                      return (
                        <tr key={f.m} style={{ borderBottom: `1px solid ${P.faint}` }}>
                          <td style={{ color: SCC[f.sc] }}>{mlabel(f.m)}</td>
                          <td className="mono" style={{ color: P.healthy }}>{money(f.salario)}</td>
                          <td className="mono" style={{ color: P.healthy }}>{f.cobros ? money(f.cobros) : "·"}</td>
                          <td className="mono" style={{ color: P.critical }}>−{money(f.gastos)}</td>
                          <td className="mono" style={{ color: P.critical }}>{f.deuda ? "−" + money(f.deuda) : "·"}</td>
                          <td className="mono" style={{ color: P.critical }}>{f.tarjeta ? "−" + money(f.tarjeta) : "·"}</td>
                          <td className="mono" style={{ color: P.critical }}>{f.metasMes ? "−" + money(f.metasMes) : "·"}</td>
                          <td className="mono" style={{ color: P.muted }}>{f.reserva ? money(f.reserva) : "·"}</td>
                          <td className="mono" style={{ color: P.teal }}>{f.ahorro ? money(f.ahorro) : "·"}</td>
                          <td className="mono" style={{ color: res < 0 ? P.critical : P.ink, fontWeight: 600 }}>{money(res)} <span style={{ fontSize: 9, color: P.muted }}>{label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>

            {/* PROYECCIÓN DEUDA (horizonte) */}
            <Panel eb="Horizonte · cliqueá cada mes para cambiar su escenario" title="Proyección: deuda restante mes a mes">
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${H},1fr)`, gap: 2, alignItems: "end" }}>
                {r.flujo.map((f, idx) => (
                  <div key={idx} onClick={() => cycle(idx)} title={`${mlabel(idx)}: ${i.escNombres?.[f.sc] ?? SCL[f.sc]} · deuda ${money(f.deudaTot)}`} style={{ cursor: "pointer", textAlign: "center" }}>
                    <div style={{ height: 64, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                      <div style={{ width: "72%", height: 3 + (f.deudaTot / maxDeuda) * 60, background: SCC[f.sc], opacity: 0.85, borderRadius: "2px 2px 0 0" }} />
                    </div>
                    <div style={{ width: 5, height: 5, borderRadius: 3, background: SCC[f.sc], margin: "3px auto 0" }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 12, fontSize: 12.5 }}>
                <span style={{ color: P.muted }}>Libre de deuda: <b className="mono" style={{ color: r.mile.libre ? P.healthy : P.caution }}>{r.mile.libre ? mlabel(r.mile.libre.m) : "> " + H + " m"}</b></span>
                <span style={{ color: P.muted }}>Colchón 1 mes: <b className="mono" style={{ color: r.mile.colchon1 ? P.healthy : P.caution }}>{r.mile.colchon1 ? mlabel(r.mile.colchon1.m) : "> " + H + " m"}</b></span>
                {r.mile.bajoCero && <span style={{ color: P.critical }}>Déficit en {mlabel(r.mile.bajoCero.m)}</span>}
              </div>
            </Panel>

            <div className="g2">
              {/* TORTA POR CATEGORÍA */}
              <Panel eb="Gasto por categoría" title="Acumulado a la fecha" right={<MonthSel v={pieMes} onChange={setPieMes} />}>
                {pieData.data.length === 0 ? <div style={{ fontSize: 13, color: P.muted }}>Sin datos.</div> : (() => {
                  const activeData = pieData.data.filter((d) => !pieOff[d.label]);
                  const activeTot = activeData.reduce((a, d) => a + d.value, 0) || 1;
                  return (
                    <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                      <Pie data={activeData} />
                      <div style={{ flex: 1, minWidth: 150 }}>
                        {pieData.data.slice(0, 12).map((d, k) => {
                          const off = !!pieOff[d.label];
                          return (
                            <div key={k} onClick={() => setPieOff((o) => ({ ...o, [d.label]: !o[d.label] }))} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12, marginBottom: 3, opacity: off ? 0.45 : 1 }}>
                              <span style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: off ? "line-through" : "none" }}><span style={{ width: 10, height: 10, borderRadius: 2, background: off ? P.muted : d.color }} />{d.label}</span>
                              <span className="mono" style={{ color: P.muted }}>{off ? "—" : pct(d.value / activeTot)}</span>
                            </div>
                          );
                        })}
                        <div style={{ fontSize: 10, color: P.muted, marginTop: 6 }}>Tocá una categoría para incluirla o quitarla del análisis.</div>
                      </div>
                    </div>
                  );
                })()}
              </Panel>

              {/* TODO LO POSITIVO ACUMULADO */}
              <Panel eb="Acumulado a la fecha" title="Todo lo positivo: ahorro + sobrante + reserva" right={<MonthSel v={ahoMes} onChange={setAhoMes} />}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 90 }}>
                  {ahoData.map((f, k) => (
                    <div key={k} title={`${mlabel(f.m)}: total ${money(f.ahorroAcum + f.sobranteAcum + f.reservaAcum)}`} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                      <div style={{ background: P.gold, height: `${Math.max(0, (f.reservaAcum / ahoMax) * 100)}%` }} title="reserva" />
                      <div style={{ background: P.softgreen, height: `${Math.max(0, (f.sobranteAcum / ahoMax) * 100)}%` }} title="sobrante" />
                      <div style={{ background: P.teal, height: `${Math.max(0, (f.ahorroAcum / ahoMax) * 100)}%` }} title="ahorro" />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, fontSize: 12, display: "grid", gap: 3 }}>
                  <div>Total a {mlabel(ahoMes)}: <b className="mono" style={{ color: P.ink }}>{money((r.flujo[ahoMes]?.ahorroAcum || 0) + (r.flujo[ahoMes]?.sobranteAcum || 0) + (r.flujo[ahoMes]?.reservaAcum || 0))}</b></div>
                  <div style={{ color: P.muted }}><span style={{ display: "inline-block", width: 8, height: 8, background: P.teal, borderRadius: 2, marginRight: 5 }} />Ahorro (definido) <b className="mono">{money(r.flujo[ahoMes]?.ahorroAcum || 0)}</b></div>
                  <div style={{ color: P.muted }}><span style={{ display: "inline-block", width: 8, height: 8, background: P.softgreen, borderRadius: 2, marginRight: 5 }} />Sobrante (libre / inversión) <b className="mono">{money(r.flujo[ahoMes]?.sobranteAcum || 0)}</b></div>
                  <div style={{ color: P.muted }}><span style={{ display: "inline-block", width: 8, height: 8, background: P.gold, borderRadius: 2, marginRight: 5 }} />Reserva fiscal (impuestos) <b className="mono">{money(r.flujo[ahoMes]?.reservaAcum || 0)}</b></div>
                </div>
              </Panel>
            </div>

            {/* DEUDA A LA FECHA */}
            <Panel eb="Proyección de deuda" title="Pagos y saldo restante a la fecha" right={<MonthSel v={deuMes} onChange={setDeuMes} />}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 70 }}>
                {deuData.map((f, k) => (
                  <div key={k} title={`${mlabel(f.m)}: pagó ${money(f.deuda)}`} style={{ flex: 1, background: P.teal, opacity: 0.8, height: `${Math.max(2, (f.deuda / deuPagMax) * 100)}%`, borderRadius: "2px 2px 0 0" }} />
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 12, fontSize: 13 }}>
                <span style={{ color: P.muted }}>Pagado en el período: <b className="mono" style={{ color: P.ink }}>{money(deuPagTot)}</b></span>
                <span style={{ color: P.muted }}>Deuda restante a {mlabel(deuMes)}: <b className="mono" style={{ color: deuTotAtMes > 0 ? P.critical : P.healthy }}>{money(deuTotAtMes)}</b></span>
              </div>
            </Panel>

            {/* DEUDA POR PROVEEDOR */}
            <Panel eb="Deuda por proveedor" title={deuProv === "__all__" ? "Cuánto le debés a cada uno" : "Pago mes a mes"} right={
              <select className="sel" style={{ maxWidth: 150 }} value={deuProv} onChange={(e) => setDeuProv(e.target.value)}>
                <option value="__all__">Deuda total</option>
                {aggDeuda.names.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>}>
              <ProvChart agg={aggDeuda} sel={deuProv} color={P.critical} />
            </Panel>

            {/* COBROS POR PAGADOR */}
            <Panel eb="Cobros por pagador" title={cobProv === "__all__" ? "Cuánto te debe cada uno" : "Cobro mes a mes"} right={
              <select className="sel" style={{ maxWidth: 150 }} value={cobProv} onChange={(e) => setCobProv(e.target.value)}>
                <option value="__all__">Cobro total</option>
                {aggCobro.names.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>}>
              <ProvChart agg={aggCobro} sel={cobProv} color={P.healthy} />
            </Panel>

            {/* PATRIMONIO NETO — foto para análisis */}
            <Panel eb="Patrimonio neto · foto para análisis" title="Activos − Pasivos a la fecha" right={<MonthSel v={netoMes} onChange={setNetoMes} />}>
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ minWidth: 150 }}>
                  <div style={{ fontSize: 11, color: P.muted }}>Patrimonio neto a {mlabel(netoMes)}</div>
                  <div className="mono" style={{ fontSize: 26, fontWeight: 700, color: (fNeto.patrimonioNeto || 0) < 0 ? P.critical : P.healthy }}>{money(fNeto.patrimonioNeto || 0)}</div>
                </div>
                <table className="tbl" style={{ flex: 1, minWidth: 240 }}>
                  <tbody>
                    <tr><td style={{ color: P.healthy, fontWeight: 600 }}>Activos</td><td className="mono" style={{ fontWeight: 600 }}>{money(activos)}</td></tr>
                    <tr><td style={{ paddingLeft: 14, color: P.muted }}>Ahorro + sobrante</td><td className="mono">{money(fNeto.patrimonioAcum || 0)}</td></tr>
                    <tr><td style={{ paddingLeft: 14, color: P.muted }}>Reserva fiscal</td><td className="mono">{money(fNeto.reservaAcum || 0)}</td></tr>
                    <tr><td style={{ paddingLeft: 14, color: P.muted }}>Por cobrar pendiente</td><td className="mono">{money(fNeto.cobrosPend || 0)}</td></tr>
                    <tr><td style={{ color: P.critical, fontWeight: 600 }}>Pasivos</td><td className="mono" style={{ fontWeight: 600 }}>−{money(pasivos)}</td></tr>
                    <tr><td style={{ paddingLeft: 14, color: P.muted }}>Deuda restante</td><td className="mono">−{money(fNeto.deudaTot || 0)}</td></tr>
                    <tr><td style={{ paddingLeft: 14, color: P.muted }}>Déficit / tarjeta pendiente</td><td className="mono">−{money(fNeto.cardCarry || 0)}</td></tr>
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: P.muted, marginBottom: 4 }}>Trayectoria del patrimonio neto</div>
                <div style={{ display: "flex", alignItems: "center", gap: 1, height: 76, position: "relative" }}>
                  <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, background: P.line }} />
                  {netoData.map((f, k) => {
                    const hp = (Math.abs(f.patrimonioNeto) / netoAbsMax) * 36; const pos = f.patrimonioNeto >= 0;
                    return (
                      <div key={k} title={`${mlabel(f.m)}: ${money(f.patrimonioNeto)}`} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column" }}>
                        <div style={{ height: 38, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>{pos && <div style={{ height: hp, background: P.healthy, borderRadius: "2px 2px 0 0" }} />}</div>
                        <div style={{ height: 38 }}>{!pos && <div style={{ height: hp, background: P.critical, borderRadius: "0 0 2px 2px" }} />}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Panel>

            {/* ESCALERA */}
            <Panel eb="Escalera de diagnóstico" title="Ordenar → Estabilizar → Crecer">
              <div style={{ position: "relative", paddingLeft: 24 }}>
                <div style={{ position: "absolute", left: 9, top: 8, bottom: 8, width: 1, background: P.line }} />
                {r.gates.map((g) => {
                  const here = !g.pass && g.id === r.gates.find((x) => !x.pass)?.id;
                  const dot = g.pass ? P.healthy : here ? P.critical : P.line;
                  return (
                    <div key={g.id} style={{ position: "relative", padding: "7px 0", display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ position: "absolute", left: -24, width: 20, display: "flex", justifyContent: "center" }}><span style={{ width: g.pass ? 10 : 12, height: g.pass ? 10 : 12, borderRadius: 8, background: g.pass ? dot : P.panel, border: `2px solid ${dot}` }} /></span>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <span style={{ fontSize: 13, color: g.pass ? P.ink : here ? P.critical : P.muted, fontWeight: here ? 600 : 400 }}><span className="mono" style={{ fontSize: 11, color: P.muted, marginRight: 8 }}>{g.id}</span>{g.l}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}><span className="mono" style={{ fontSize: 12, color: P.muted }}>{g.v}</span>{here && <span className="mono" style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: P.critical, color: "#fff" }}>ACÁ ESTÁS</span>}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <div className="g2">
              <Panel eb="Diagnóstico" title="Lo que enciende alarmas">
                {r.flags.length === 0 && <div style={{ fontSize: 13, color: r.anyIncome ? P.healthy : P.muted }}>{r.anyIncome ? "Sin alertas activas." : "Cargá ingresos para ver el diagnóstico."}</div>}
                {r.flags.map((f, k) => (<div key={k} style={{ display: "flex", gap: 10, fontSize: 13, marginBottom: 10 }}><span style={{ marginTop: 6, width: 7, height: 7, borderRadius: 4, background: sev(f.s), flexShrink: 0 }} /><span>{f.t}</span></div>))}
              </Panel>
              <Panel eb="Plan de acción" title="Qué atacar, en este orden">
                {r.prio.length === 0 && <div style={{ fontSize: 13, color: P.muted }}>Cargá datos para el plan.</div>}
                {r.prio.map((p, k) => (<div key={k} style={{ display: "flex", gap: 12, marginBottom: 10 }}><span className="mono" style={{ fontSize: 13, fontWeight: 600, color: P.teal, flexShrink: 0 }}>{k + 1}</span><span style={{ fontSize: 13 }}><b style={{ color: P.ink }}>{p.t}. </b><span style={{ color: P.muted }}>{p.d}</span></span></div>))}
              </Panel>
            </div>

            {/* SUGERENCIAS */}
            <Panel eb="Sugerencias y oportunidades" title="Dónde hay margen">
              {r.sug.length === 0 && <div style={{ fontSize: 13, color: P.muted }}>Cargá más datos para ver oportunidades.</div>}
              {r.sug.map((s, k) => (<div key={k} style={{ display: "flex", gap: 10, fontSize: 13, marginBottom: 10 }}><span style={{ marginTop: 6, width: 7, height: 7, borderRadius: 4, background: sev(s.s), flexShrink: 0 }} /><span>{s.t}</span></div>))}
            </Panel>

          </div>
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
        <button onClick={toggleTheme} title="Cambiar tema" style={{ position: "absolute", top: 14, right: 14, cursor: "pointer", border: `1px solid ${P.line}`, background: "transparent", color: P.muted, borderRadius: 8, padding: "4px 8px", fontSize: 13 }}>{theme === "dark" ? "☀︎" : "☾"}</button>
        <div className="eb mono">Planificador financiero</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "4px 0 16px" }}>Ingresá</h1>
        <div style={{ display: "grid", gap: 10 }}>
          <input placeholder="Usuario" value={u} onChange={(e) => setU(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} style={{ padding: "10px 12px", fontSize: 14 }} />
          <input placeholder="Clave" type="password" value={p} onChange={(e) => setP(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} style={{ padding: "10px 12px", fontSize: 14 }} />
          {err && <div style={{ fontSize: 13, color: P.critical }}>{err}</div>}
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
