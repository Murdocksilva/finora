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
  ink: "#16211C", paper: "#F4F5F1", panel: "#FFFFFF", teal: "#0B5D4E",
  healthy: "#2F8F6B", caution: "#B8791E", critical: "#A8412F",
  muted: "#6B7269", line: "#E3E5DE", faint: "#EFF1EC",
};
const SCC = { e1: P.critical, e2: P.caution, e3: "#4E8A6B", e4: P.healthy };
const SCL = { e1: "Esc 1", e2: "Esc 2", e3: "Esc 3", e4: "Esc 4" };
const SCEN = ["e1", "e2", "e3", "e4"];
const CATCOLORS = ["#0B5D4E", "#B8791E", "#A8412F", "#4E8A6B", "#4A6FA5", "#9C5D8A", "#2F8F6B", "#8A6D3B", "#C98A3A", "#6B7269", "#7A4E9C", "#3A7CA5"];
const money = (n) => (n < 0 ? "−" : "") + "$" + Math.abs(Math.round(n)).toLocaleString("en-US");
const pct = (n) => Math.round(n * 100) + "%";
let _id = 0; const uid = () => ++_id;
const bumpId = (n) => { if (n > _id) _id = n; };
const z = () => Array(H).fill(0);
const pad = (a) => { const b = a.slice(0, H); while (b.length < H) b.push(0); return b; };

const CSS = `
.app{min-height:100vh;width:100%;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1180px;margin:0 auto;padding:24px 20px}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.gmain{display:grid;grid-template-columns:minmax(0,370px) minmax(0,1fr);gap:20px;align-items:start}
.gcol{display:grid;gap:20px;min-width:0}
.cards4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.panel{background:#fff;border:1px solid ${P.line};border-radius:12px;padding:18px;min-width:0}
.eb{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:${P.teal};margin-bottom:6px}
.h2{font-size:15px;font-weight:600;color:${P.ink};margin:0 0 12px}
.row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 0;min-width:0}
input,select{outline:none;font-size:13px;border-radius:6px;border:1px solid ${P.line};background:${P.faint};color:${P.ink}}
.num{width:80px;text-align:right;padding:5px 8px;font-family:ui-monospace,Menlo,monospace}
.nam{flex:1;min-width:0;padding:4px 6px;background:transparent;border:none;border-bottom:1px dashed #B9C0B6;border-radius:0;font-size:13px}
.nam:focus{background:${P.faint};border-bottom:1px solid ${P.teal}}
.sel{font-size:11px;padding:3px 4px;max-width:120px}
input:focus,select:focus{box-shadow:0 0 0 2px rgba(11,93,78,.22)}
.btn{cursor:pointer;font-size:12px;border:1px dashed ${P.line};background:#fff;color:${P.teal};border-radius:6px;padding:5px 8px}
.x{cursor:pointer;border:none;background:transparent;color:${P.muted};font-size:15px;line-height:1;padding:0 2px}
.scroll{max-height:240px;overflow:auto;padding-right:4px;margin-right:-4px}
.pill{cursor:pointer;font-size:13px;padding:5px 12px;border-radius:20px}
.grid24{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin-top:6px;padding:8px;background:${P.faint};border-radius:6px}
.si{width:100%;text-align:right;font-size:11px;padding:3px 3px;border:1px solid ${P.line};border-radius:4px;background:#fff;font-family:ui-monospace,Menlo,monospace}
.tbl{width:100%;border-collapse:collapse;font-size:11.5px}
.tbl th,.tbl td{padding:4px 6px;text-align:right;white-space:nowrap}
.tbl th:first-child,.tbl td:first-child{text-align:left}
.tbl thead th{color:${P.muted};font-weight:600;border-bottom:1px solid ${P.line};position:sticky;top:0;background:#fff}
@media(max-width:900px){.gmain{grid-template-columns:1fr}.cards4{grid-template-columns:1fr 1fr}.g2{grid-template-columns:1fr}}
`;

/* ─────────────── DATOS ─────────────── */
const CATS0 = ["ALQUILER", "EXPENSAS", "SERVICIOS", "TRANSPORTE", "COMIDA", "OCIO", "FAMILIA", "SUSCRIPCIONES", "INVERSIONES", "DEUDAS"];
const blankInp = () => ({
  ingreso: { e1: 0, e2: 0, e3: 0, e4: 0 }, laborPorTrabajo: 3200,
  reserva: Array(H).fill(0.24), ahorro: Array(H).fill(0),
  ahorroLiquido: 0, gastosControlados: false, objetivoFE: 6, objetivoAhorro: 0.2,
  categorias: [...CATS0], gastosItems: [], deudas: [], porCobrar: [], metas: [],
  horizonte: Array.from({ length: H }, () => ({ sc: "e2" })),
});
const gabrielInp = () => ({
  ingreso: { e1: 6000, e2: 8500, e3: 10500, e4: 12500 }, laborPorTrabajo: 3200,
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
  metas: [],
  horizonte: Array.from({ length: H }, (_, i) => ({ sc: i === 0 ? "e4" : i === 1 ? "e4" : i === 2 ? "e2" : i === 3 ? "e1" : "e2" })),
});

/* ─────────────── PERSISTENCIA (respaldo + autoguardado) ─────────────── */
const LSKEY = "finora_profiles_v2";
function maxIdIn(o) { let mx = 0; const w = (x) => { if (Array.isArray(x)) x.forEach(w); else if (x && typeof x === "object") { if (typeof x.id === "number") mx = Math.max(mx, x.id); Object.values(x).forEach(w); } }; w(o); return mx; }
function padH(h) { const b = Array.from({ length: H }, () => ({ sc: "e2" })); for (let k = 0; k < Math.min(h.length, H); k++) if (h[k] && h[k].sc) b[k] = { sc: h[k].sc }; return b; }
function normInp(inp) {
  inp = inp || {}; const x = { ...blankInp(), ...inp };
  x.ingreso = { e1: 0, e2: 0, e3: 0, e4: 0, ...(inp.ingreso || {}) };
  x.reserva = Array.isArray(inp.reserva) ? pad(inp.reserva.map(Number)) : Array(H).fill(typeof inp.reserva === "number" ? inp.reserva : 0.24);
  x.ahorro = Array.isArray(inp.ahorro) ? pad(inp.ahorro.map(Number)) : Array(H).fill(0);
  x.categorias = (inp.categorias && inp.categorias.length) ? inp.categorias : [...CATS0];
  x.gastosItems = (inp.gastosItems || []).map((g) => ({ id: typeof g.id === "number" ? g.id : uid(), n: "", m: 0, cat: CATS0[0], ...g }));
  x.deudas = (inp.deudas || []).map((d) => ({ id: typeof d.id === "number" ? d.id : uid(), n: "", saldo: 0, tasa: 0, tipo: "personal", ambito: "personal", cat: "DEUDAS", ...d, pagos: pad((d.pagos || []).map(Number)) }));
  x.porCobrar = (inp.porCobrar || []).map((c) => ({ id: typeof c.id === "number" ? c.id : uid(), n: "", monto: 0, ambito: "personal", cat: "INVERSIONES", ...c, cobros: pad((c.cobros || []).map(Number)) }));
  x.metas = (inp.metas || []).map((g) => ({ id: typeof g.id === "number" ? g.id : uid(), n: "", monto: 0, mesObjetivo: 11, ...g }));
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
  let ahorroAcum = i.ahorroLiquido, sobranteAcum = 0, deudaPagAcum = 0, reservaAcum = 0, metasAcum = 0, deficitAcum = 0, deficitPrev = 0;
  const flujo = i.horizonte.map((h, m) => {
    const salario = +i.ingreso[h.sc] || 0;
    let cobros = 0; cobrosSt.forEach((c) => { const g = Math.min(c.cobros?.[m] || 0, c.rem); c.rem -= g; cobros += g; });
    let deuda = 0; deudas.forEach((d) => { const p = Math.min(d.pagos?.[m] || 0, d.rem); d.rem -= p; deuda += p; });
    const metasMes = i.metas.reduce((a, g) => a + (m <= g.mesObjetivo && g.mesObjetivo >= 0 ? (+g.monto || 0) / (g.mesObjetivo + 1) : 0), 0);
    const tarjeta = deficitPrev; // déficit del mes anterior, se paga como tarjeta este mes
    const base = salario + cobros - gastos - deuda - metasMes - tarjeta;
    const tgtR = salario * (i.reserva[m] || 0), tgtA = salario * (i.ahorro[m] || 0);
    let reserva = 0, ahorro = 0, sobrante = 0, deficit = 0;
    if (base >= 0) {
      reserva = Math.min(base, tgtR); let r1 = base - reserva;
      ahorro = Math.min(r1, tgtA); sobrante = r1 - ahorro;
    } else deficit = base;
    deficitPrev = deficit < 0 ? -deficit : 0; // se arrastra al mes siguiente
    ahorroAcum += ahorro; sobranteAcum += sobrante; reservaAcum += reserva; metasAcum += metasMes; deudaPagAcum += deuda; if (deficit < 0) deficitAcum += -deficit;
    const patrimonioAcum = ahorroAcum + sobranteAcum;
    const deudaTot = deudas.reduce((a, d) => a + Math.max(0, d.rem), 0);
    const cobrosPend = cobrosSt.reduce((a, c) => a + Math.max(0, c.rem), 0);
    const cardCarry = deficitPrev;
    const patrimonioNeto = patrimonioAcum + reservaAcum + cobrosPend - deudaTot - cardCarry;
    return { m, sc: h.sc, salario, cobros, gastos, deuda, metasMes, tarjeta, reserva, ahorro, sobrante, deficit, deudaTot, cobrosPend, cardCarry, patrimonioNeto, ahorroAcum, sobranteAcum, patrimonioAcum, deudaPagAcum, reservaAcum, metasAcum, deficitAcum };
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
      <button key={a} onClick={() => onChange(a)} style={{ cursor: "pointer", border: "none", fontSize: 11, padding: "2px 6px", background: v === a ? P.teal : "#fff", color: v === a ? "#fff" : P.muted }}>{a === "compania" ? "Cía" : "Pers"}</button>
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

export default function App() {
  const [profiles, setProfiles] = useState(() => loadSaved() || [{ id: uid(), nombre: "Gabriel", inp: gabrielInp() }]);
  const [activeId, setActiveId] = useState(() => profiles[0].id);
  const active = profiles.find((p) => p.id === activeId) || profiles[0];
  const i = active.inp;
  const [pieMes, setPieMes] = useState(5), [ahoMes, setAhoMes] = useState(11), [deuMes, setDeuMes] = useState(11), [netoMes, setNetoMes] = useState(11);
  const [newCat, setNewCat] = useState("");

  const updInp = (fn) => setProfiles((ps) => ps.map((p) => (p.id === activeId ? { ...p, inp: fn(p.inp) } : p)));
  const set = (patch) => updInp((x) => ({ ...x, ...patch }));
  const setIng = (k, v) => updInp((x) => ({ ...x, ingreso: { ...x.ingreso, [k]: v } }));
  const setArr = (key, m, v) => updInp((x) => ({ ...x, [key]: x[key].map((y, k) => (k === m ? v : y)) }));
  const editItem = (arr, id, patch) => updInp((x) => ({ ...x, [arr]: x[arr].map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
  const addItem = (arr, item) => updInp((x) => ({ ...x, [arr]: [...x[arr], { id: uid(), ...item }] }));
  const delItem = (arr, id) => updInp((x) => ({ ...x, [arr]: x[arr].filter((it) => it.id !== id) }));
  const cycle = (idx) => updInp((x) => { const h = [...x.horizonte]; h[idx] = { sc: SCEN[(SCEN.indexOf(h[idx].sc) + 1) % 4] }; return { ...x, horizonte: h }; });
  const setSched = (arr, id, key, m, val) => updInp((x) => ({ ...x, [arr]: x[arr].map((it) => (it.id === id ? { ...it, [key]: it[key].map((y, k) => (k === m ? val : y)) } : it)) }));
  const addCat = () => { const c = newCat.trim().toUpperCase(); if (c && !i.categorias.includes(c)) updInp((x) => ({ ...x, categorias: [...x.categorias, c] })); setNewCat(""); };

  const newProfile = () => { const id = uid(); setProfiles((ps) => [...ps, { id, nombre: "Nuevo usuario", inp: blankInp() }]); setActiveId(id); };
  const renameProfile = (nombre) => setProfiles((ps) => ps.map((p) => (p.id === activeId ? { ...p, nombre } : p)));
  const delProfile = () => setProfiles((ps) => { if (ps.length <= 1) return ps; const rest = ps.filter((p) => p.id !== activeId); setActiveId(rest[0].id); return rest; });

  // Autoguardado en el navegador (persiste entre recargas y deploys)
  useEffect(() => { try { if (typeof window !== "undefined" && window.localStorage) window.localStorage.setItem(LSKEY, JSON.stringify(profiles)); } catch (e) {} }, [profiles]);
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
  const deuTotAtMes = r.flujo[deuMes]?.deudaTot || 0;
  const deuPagTot = r.flujo[deuMes]?.deudaPagAcum || 0;

  return (
    <div className="app" style={{ background: P.paper, color: P.ink }}>
      <style>{CSS}</style>
      <div className="wrap">
        {/* USER BAR */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span className="eb" style={{ margin: 0 }}>Usuario</span>
          {profiles.map((p) => (
            <button key={p.id} className="pill" onClick={() => setActiveId(p.id)} style={{ border: `1px solid ${p.id === activeId ? P.teal : P.line}`, background: p.id === activeId ? P.teal : "#fff", color: p.id === activeId ? "#fff" : P.muted }}>{p.nombre}</button>
          ))}
          <button className="btn" style={{ borderRadius: 20 }} onClick={newProfile}>+ Nuevo usuario</button>
          {profiles.length > 1 && <button className="btn" style={{ borderRadius: 20, color: P.critical, borderColor: P.critical }} onClick={delProfile}>Borrar</button>}
          <span style={{ width: 1, height: 18, background: P.line, margin: "0 2px" }} />
          <button className="btn" style={{ borderRadius: 20 }} onClick={exportar}>⬇ Exportar respaldo</button>
          <button className="btn" style={{ borderRadius: 20 }} onClick={() => fileRef.current && fileRef.current.click()}>⬆ Importar</button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={importar} style={{ display: "none" }} />
          <span className="mono" style={{ fontSize: 10, color: P.healthy }}>guardado automático ✓</span>
        </div>

        {/* NOMBRE GRANDE */}
        <header style={{ marginBottom: 22 }}>
          <div className="eb mono">Planificador financiero · sin IA · corre en el dispositivo</div>
          <input value={active.nombre} onChange={(e) => renameProfile(e.target.value)}
            style={{ fontSize: 40, fontWeight: 800, color: P.ink, border: "none", background: "transparent", padding: 0, width: "100%" }} />
        </header>

        <div className="gmain">
          {/* ── INPUTS ── */}
          <div className="gcol">
            <Panel eb="Ingreso · 4 escenarios" title="Labor mensual (bruto)">
              {SCEN.map((k) => (
                <div className="row" key={k}>
                  <span style={{ fontSize: 13, color: SCC[k] }}>{SCL[k]}</span>
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
                  <Grid24 arr={d.pagos} onSet={(m, v) => setSched("deudas", d.id, "pagos", m, v)} extra={`· programado ${money(d.pagos.reduce((a, x) => a + x, 0))} / ${money(+d.saldo || 0)}`} />
                </div>
              ))}
              {i.deudas.length === 0 && <div style={{ fontSize: 12, color: P.muted, padding: "6px 0" }}>Sin deudas.</div>}
              <button className="btn" style={{ marginTop: 8 }} onClick={() => addItem("deudas", { n: "Nueva deuda", saldo: 0, tasa: 0, tipo: "personal", ambito: "personal", cat: "DEUDAS", pagos: z() })}>+ Agregar deuda</button>
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
                  <Grid24 arr={c.cobros} onSet={(m, v) => setSched("porCobrar", c.id, "cobros", m, v)} extra={`· programado ${money(c.cobros.reduce((a, x) => a + x, 0))} / ${money(+c.monto || 0)}`} />
                </div>
              ))}
              {i.porCobrar.length === 0 && <div style={{ fontSize: 12, color: P.muted, padding: "6px 0" }}>Sin cuentas por cobrar.</div>}
              <button className="btn" style={{ marginTop: 8 }} onClick={() => addItem("porCobrar", { n: "Nuevo cobro", monto: 0, ambito: "personal", cat: "INVERSIONES", cobros: z() })}>+ Agregar cobro</button>
            </Panel>

            <Panel eb="Metas" title="Objetivos con fecha">
              {i.metas.map((g) => (
                <div key={g.id} style={{ padding: "6px 0", borderBottom: `1px solid ${P.faint}` }}>
                  <div className="row" style={{ padding: "2px 0" }}>
                    <input className="nam" value={g.n} onChange={(e) => editItem("metas", g.id, { n: e.target.value })} />
                    <button className="x" onClick={() => delItem("metas", g.id)}>×</button>
                  </div>
                  <div className="row" style={{ padding: "2px 0" }}>
                    <span style={{ fontSize: 12, color: P.muted }}>monto $<input className="num mono" type="number" value={g.monto} onChange={(e) => editItem("metas", g.id, { monto: +e.target.value || 0 })} /></span>
                    <span style={{ fontSize: 12, color: P.muted }}>para <MonthSel v={g.mesObjetivo} onChange={(v) => editItem("metas", g.id, { mesObjetivo: v })} /></span>
                  </div>
                  {g.monto > 0 && g.mesObjetivo >= 0 && <div className="mono" style={{ fontSize: 11, color: P.teal, textAlign: "right" }}>cuota {money((+g.monto) / (g.mesObjetivo + 1))}/mes</div>}
                </div>
              ))}
              {i.metas.length === 0 && <div style={{ fontSize: 12, color: P.muted, padding: "6px 0" }}>Sin metas. Agregá auto, casa, viaje…</div>}
              <button className="btn" style={{ marginTop: 8 }} onClick={() => addItem("metas", { n: "Nueva meta", monto: 0, mesObjetivo: 11 })}>+ Agregar meta</button>
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
                      <div style={{ fontSize: 11, color: SCC[e.s] }}>{SCL[e.s]}</div>
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
                      const res = f.deficit < 0 ? f.deficit : f.sobrante;
                      const label = f.deficit < 0 ? "Déficit" : f.sobrante > 0 ? "Sobra" : "—";
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
                  <div key={idx} onClick={() => cycle(idx)} title={`${mlabel(idx)}: ${SCL[f.sc]} · deuda ${money(f.deudaTot)}`} style={{ cursor: "pointer", textAlign: "center" }}>
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
                {pieData.arr.length === 0 ? <div style={{ fontSize: 13, color: P.muted }}>Sin datos.</div> : (
                  <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                    <Pie data={pieData.data} />
                    <div style={{ flex: 1, minWidth: 130 }}>
                      {pieData.data.slice(0, 8).map((d, k) => (
                        <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12, marginBottom: 3 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: d.color }} />{d.label}</span>
                          <span className="mono" style={{ color: P.muted }}>{pct(d.value / pieData.tot)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Panel>

              {/* TODO LO POSITIVO ACUMULADO */}
              <Panel eb="Acumulado a la fecha" title="Todo lo positivo: ahorro + sobrante + reserva" right={<MonthSel v={ahoMes} onChange={setAhoMes} />}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 90 }}>
                  {ahoData.map((f, k) => (
                    <div key={k} title={`${mlabel(f.m)}: total ${money(f.ahorroAcum + f.sobranteAcum + f.reservaAcum)}`} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                      <div style={{ background: "#C9A24B", height: `${Math.max(0, (f.reservaAcum / ahoMax) * 100)}%` }} title="reserva" />
                      <div style={{ background: "#8FC9B4", height: `${Math.max(0, (f.sobranteAcum / ahoMax) * 100)}%` }} title="sobrante" />
                      <div style={{ background: P.teal, height: `${Math.max(0, (f.ahorroAcum / ahoMax) * 100)}%` }} title="ahorro" />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, fontSize: 12, display: "grid", gap: 3 }}>
                  <div>Total a {mlabel(ahoMes)}: <b className="mono" style={{ color: P.ink }}>{money((r.flujo[ahoMes]?.ahorroAcum || 0) + (r.flujo[ahoMes]?.sobranteAcum || 0) + (r.flujo[ahoMes]?.reservaAcum || 0))}</b></div>
                  <div style={{ color: P.muted }}><span style={{ display: "inline-block", width: 8, height: 8, background: P.teal, borderRadius: 2, marginRight: 5 }} />Ahorro (definido) <b className="mono">{money(r.flujo[ahoMes]?.ahorroAcum || 0)}</b></div>
                  <div style={{ color: P.muted }}><span style={{ display: "inline-block", width: 8, height: 8, background: "#8FC9B4", borderRadius: 2, marginRight: 5 }} />Sobrante (libre / inversión) <b className="mono">{money(r.flujo[ahoMes]?.sobranteAcum || 0)}</b></div>
                  <div style={{ color: P.muted }}><span style={{ display: "inline-block", width: 8, height: 8, background: "#C9A24B", borderRadius: 2, marginRight: 5 }} />Reserva fiscal (impuestos) <b className="mono">{money(r.flujo[ahoMes]?.reservaAcum || 0)}</b></div>
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
                      <span style={{ position: "absolute", left: -24, width: 20, display: "flex", justifyContent: "center" }}><span style={{ width: g.pass ? 10 : 12, height: g.pass ? 10 : 12, borderRadius: 8, background: g.pass ? dot : "#fff", border: `2px solid ${dot}` }} /></span>
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

            <p className="mono" style={{ fontSize: 11, textAlign: "center", color: P.muted, marginTop: 4 }}>Cálculo local · sin servidor · sin IA · costo de cómputo $0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
