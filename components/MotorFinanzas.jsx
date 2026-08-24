"use client";
import React, { useState, useMemo } from "react";

/*  MOTOR DETERMINISTA DE FINANZAS PERSONALES · v1.4
    Multi-usuario · cronogramas mes a mes editables · ámbito Cía/Pers · horizonte de escenarios · proyección.
    Sin IA, sin red. Estilos inline → portable a Next.js/Vercel.
    Nota: los usuarios viven durante la sesión; guardar entre sesiones (base de datos) es el próximo paso. */

const P = {
  ink: "#16211C", paper: "#F4F5F1", panel: "#FFFFFF", teal: "#0B5D4E",
  healthy: "#2F8F6B", caution: "#B8791E", critical: "#A8412F",
  muted: "#6B7269", line: "#E3E5DE", faint: "#EFF1EC",
};
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const START = 8; // arranca en Sep
const SC = { malo: { c: P.critical, l: "Malo" }, prom: { c: P.caution, l: "Prom" }, bueno: { c: P.healthy, l: "Bueno" } };
const money = (n) => (n < 0 ? "−" : "") + "$" + Math.abs(Math.round(n)).toLocaleString("en-US");
const pct = (n) => Math.round(n * 100) + "%";
const mn = (m) => MESES[(START + m) % 12];
let _id = 0; const uid = () => ++_id;
const z12 = () => Array(12).fill(0);

const CSS = `
.app{min-height:100vh;width:100%;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1120px;margin:0 auto;padding:28px 20px}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.gmain{display:grid;grid-template-columns:minmax(0,360px) minmax(0,1fr);gap:20px;align-items:start}
.gcol{display:grid;gap:20px;min-width:0}
.cards3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.panel{background:#fff;border:1px solid ${P.line};border-radius:12px;padding:18px;min-width:0}
.eb{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:${P.teal};margin-bottom:6px}
.h2{font-size:15px;font-weight:600;color:${P.ink};margin:0 0 12px}
.row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 0;min-width:0}
input,select{outline:none;font-size:13px;border-radius:6px;border:1px solid ${P.line};background:${P.faint};color:${P.ink}}
.num{width:82px;text-align:right;padding:5px 8px;font-family:ui-monospace,Menlo,monospace}
.nam{flex:1;min-width:0;padding:4px 6px;background:transparent;border:none;border-bottom:1px dashed #B9C0B6;border-radius:0;font-size:13px}
.nam:focus{background:${P.faint};border-bottom:1px solid ${P.teal}}
input:focus,select:focus{box-shadow:0 0 0 2px rgba(11,93,78,.22)}
.btn{cursor:pointer;font-size:12px;border:1px dashed ${P.line};background:#fff;color:${P.teal};border-radius:6px;padding:5px 8px}
.x{cursor:pointer;border:none;background:transparent;color:${P.muted};font-size:15px;line-height:1;padding:0 2px}
.scroll{max-height:240px;overflow:auto;padding-right:4px;margin-right:-4px}
.hz{display:grid;grid-template-columns:repeat(12,1fr);gap:4px;align-items:end}
.hcell{cursor:pointer;text-align:center;user-select:none}
.amb{cursor:pointer;border:none;font-size:11px;padding:2px 7px}
.mtx{width:100%;border-collapse:collapse;font-size:12px}
.mtx td,.mtx th{padding:5px 6px;text-align:right}
.mtx th:first-child,.mtx td:first-child{text-align:left;color:${P.muted}}
.pill{cursor:pointer;font-size:13px;padding:5px 12px;border-radius:20px}
.sched{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:6px;padding:8px;background:${P.faint};border-radius:6px}
.si{width:100%;text-align:right;font-size:11px;padding:3px 4px;border:1px solid ${P.line};border-radius:4px;background:#fff;font-family:ui-monospace,Menlo,monospace}
@media(max-width:860px){.gmain{grid-template-columns:1fr}.cards3{grid-template-columns:1fr}.g2{grid-template-columns:1fr}}
`;

/* ─────────────── DATOS ─────────────── */
const blankInp = () => ({
  ingreso: { malo: 0, prom: 0, bueno: 0 }, laborPorTrabajo: 3200, reserva: 0.24,
  ahorroLiquido: 0, gastosControlados: false, objetivoFE: 6, objetivoAhorro: 0.2,
  gastosItems: [], deudas: [], porCobrar: [],
  horizonte: Array.from({ length: 12 }, () => ({ sc: "prom" })),
});
const gabrielInp = () => ({
  ingreso: { malo: 6000, prom: 8500, bueno: 12500 }, laborPorTrabajo: 3200, reserva: 0.24,
  ahorroLiquido: 0, gastosControlados: true, objetivoFE: 6, objetivoAhorro: 0.2,
  deudas: [
    { id: uid(), n: "Impuestos 22–25 (IRS)", saldo: 25000, tasa: 0, tipo: "impuesto", ambito: "compania", pagos: Array(12).fill(700) },
    { id: uid(), n: "Vendors / crew 86LAB", saldo: 24167.67, tasa: 0, tipo: "personal", ambito: "compania", pagos: [8000, 6000, 3000, 3000, 2000, 2167.67, 0, 0, 0, 0, 0, 0] },
    { id: uid(), n: "Deudas personales", saldo: 13900, tasa: 0, tipo: "personal", ambito: "personal", pagos: [3000, 3000, 2000, 2000, 2000, 1900, 0, 0, 0, 0, 0, 0] },
  ],
  porCobrar: [
    { id: uid(), n: "Clientes compañía", monto: 3000, ambito: "compania", cobros: [3000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { id: uid(), n: "Clientes personales", monto: 7600, ambito: "personal", cobros: [4300, 1500, 900, 900, 0, 0, 0, 0, 0, 0, 0, 0] },
  ],
  gastosItems: [
    { id: uid(), n: "Renta", m: 1450, viv: true }, { id: uid(), n: "Comida / vida diaria", m: 2000 },
    { id: uid(), n: "Auto", m: 340 }, { id: uid(), n: "Seguro auto", m: 279.04 },
    { id: uid(), n: "Teléfono", m: 165.8 }, { id: uid(), n: "Seguro de vida", m: 200 },
    { id: uid(), n: "Familia", m: 200 }, { id: uid(), n: "Internet", m: 25 }, { id: uid(), n: "Luz", m: 50 },
    { id: uid(), n: "Limpieza", m: 75 }, { id: uid(), n: "Suscripciones", m: 70 },
    { id: uid(), n: "Peajes SunPass", m: 200 }, { id: uid(), n: "Website", m: 29 }, { id: uid(), n: "Imprevistos", m: 200 },
  ],
  horizonte: Array.from({ length: 12 }, (_, i) => ({ sc: i === 0 ? "bueno" : i === 1 ? "bueno" : i === 2 ? "prom" : i === 3 ? "malo" : "prom" })),
});

/* ─────────────── MOTOR ─────────────── */
function runEngine(i) {
  const gastos = i.gastosItems.reduce((a, x) => a + (+x.m || 0), 0);
  const vivienda = i.gastosItems.filter((x) => x.viv).reduce((a, x) => a + (+x.m || 0), 0);
  const esc = ["malo", "prom", "bueno"].map((s) => {
    const labor = +i.ingreso[s] || 0, disp = labor - labor * i.reserva;
    return { s, labor, disp, allIn: disp - gastos - (i.deudas.find((d) => d.tipo === "impuesto")?.pagos?.[0] || 0) };
  });
  const prom = esc[1], malo = esc[0];
  const tasaAhorro = prom.disp > 0 ? (prom.disp - gastos) / prom.disp : 0;
  const backTax0 = i.deudas.find((d) => d.tipo === "impuesto")?.pagos?.[0] || 0;
  const puntoEq = (gastos + backTax0) / (1 - i.reserva);
  const trabajosEq = i.laborPorTrabajo > 0 ? puntoEq / i.laborPorTrabajo : 0;
  const mesesFondo = gastos > 0 ? i.ahorroLiquido / gastos : 0;

  const sum = (arr, k, a) => arr.filter((x) => (a ? x.ambito === a : true)).reduce((s, x) => s + (+x[k] || 0), 0);
  const M = {
    pagarCia: sum(i.deudas, "saldo", "compania"), pagarPers: sum(i.deudas, "saldo", "personal"),
    cobrarCia: sum(i.porCobrar, "monto", "compania"), cobrarPers: sum(i.porCobrar, "monto", "personal"),
  };
  M.totalPagar = M.pagarCia + M.pagarPers; M.totalCobrar = M.cobrarCia + M.cobrarPers;
  M.deudaNeta = M.totalPagar - M.totalCobrar;

  const toxicas = i.deudas.filter((d) => +d.saldo > 0 && (d.tasa >= 0.4 || d.tipo === "rotativa" || d.tipo === "impuesto"));
  const cargaViv = prom.disp > 0 ? vivienda / prom.disp : 0;

  const gates = [
    { id: "G1", et: "Ordenar", l: "Excedente positivo en un mes promedio", pass: prom.allIn > 0, v: money(prom.allIn) },
    { id: "G2", et: "Ordenar", l: "Gasto bajo control: categorizado y con topes", pass: !!i.gastosControlados, v: i.gastosControlados ? "sí" : "no" },
    { id: "G3", et: "Estabilizar", l: "Colchón de arranque (≥ 1 mes de gastos)", pass: mesesFondo >= 1, v: mesesFondo.toFixed(1) + " m" },
    { id: "G4", et: "Estabilizar", l: "Sin deuda cara ni fiscal sin saldar", pass: toxicas.length === 0, v: toxicas.length ? money(toxicas.reduce((a, d) => a + d.saldo, 0)) : "OK" },
    { id: "G5", et: "Estabilizar", l: `Fondo de emergencia completo (≥ ${i.objetivoFE} m)`, pass: mesesFondo >= i.objetivoFE, v: mesesFondo.toFixed(1) + " m" },
    { id: "G6", et: "Crecer", l: `Tasa de ahorro ≥ ${pct(i.objetivoAhorro)}`, pass: tasaAhorro >= i.objetivoAhorro, v: pct(tasaAhorro) },
    { id: "G7", et: "Crecer", l: "Patrimonio en movimiento (metas / inversión)", pass: false, v: "—" },
  ];
  const primerFallo = gates.find((g) => !g.pass);
  const etapa = primerFallo ? primerFallo.et : "Crecer";

  const flags = [];
  if (i.ingreso.malo || i.ingreso.prom || i.ingreso.bueno) {
    if (malo.allIn < 0) flags.push({ s: "critical", t: `Un mes malo da ${money(malo.allIn)}: el sistema sangra y no hay red.` });
    if (mesesFondo < 1) flags.push({ s: "critical", t: "Colchón por debajo de 1 mes: cualquier imprevisto se paga con deuda nueva." });
    if (toxicas.length) flags.push({ s: "caution", t: `Deuda cara/fiscal viva: ${money(toxicas.reduce((a, d) => a + d.saldo, 0))} acumulando interés o penalidad.` });
    if (cargaViv > 0.35) flags.push({ s: "caution", t: `Vivienda = ${pct(cargaViv)} del ingreso disponible (umbral 35%).` });
  }

  const cobrarCorto = i.porCobrar.reduce((a, c) => a + (c.cobros?.[0] || 0) + (c.cobros?.[1] || 0), 0);
  const prio = [];
  if (cobrarCorto > 0) prio.push({ t: "Cobrar las cuentas por cobrar", d: `Liquidez inmediata sin costo: ${money(cobrarCorto)} en los próximos 2 meses.` });
  if (i.ingreso.prom && mesesFondo < 1) prio.push({ t: "Armar el colchón de arranque", d: `Faltan ${money(Math.max(0, gastos - i.ahorroLiquido))} para 1 mes; empezar con un tramo antes de acelerar deudas 0%.` });
  if (toxicas.length) prio.push({ t: "Priorizar la deuda cara / fiscal", d: `${toxicas.map((d) => d.n).join(", ")} por encima de las deudas sin interés.` });
  if (i.ingreso.prom && (malo.allIn < 0 || trabajosEq > 2)) prio.push({ t: "Subir el piso de ingresos", d: `Equilibrio en ~${trabajosEq.toFixed(1)} trabajos/mes; apuntar a ${money(i.ingreso.bueno)} de labor.` });

  // ── PROYECCIÓN con cronogramas reales ──
  let bal = i.ahorroLiquido;
  const deudas = i.deudas.map((d) => ({ ...d, rem: +d.saldo || 0 }));
  const cobros = i.porCobrar.map((c) => ({ ...c, rem: +c.monto || 0 }));
  const proj = i.horizonte.map((h, m) => {
    const income = +i.ingreso[h.sc] || 0;
    const reservaAmt = income * i.reserva;
    let pagosMes = 0; deudas.forEach((d) => { const p = Math.min(d.pagos?.[m] || 0, d.rem); d.rem -= p; pagosMes += p; });
    let cobrosMes = 0; cobros.forEach((c) => { const g = Math.min(c.cobros?.[m] || 0, c.rem); c.rem -= g; cobrosMes += g; });
    const cash = income - reservaAmt - gastos - pagosMes + cobrosMes;
    bal += cash;
    const deudaTot = deudas.reduce((a, d) => a + Math.max(0, d.rem), 0);
    return { m, sc: h.sc, bal, deudaTot, pagosMes, cobrosMes, colMeses: gastos > 0 ? bal / gastos : 0 };
  });
  const anyIncome = i.ingreso.malo || i.ingreso.prom || i.ingreso.bueno;
  const libre = anyIncome ? proj.find((p) => p.deudaTot <= 0) : null;
  const colchon1 = anyIncome ? proj.find((p) => p.colMeses >= 1) : null;
  const bajoCero = anyIncome ? proj.find((p) => p.bal < 0) : null;

  return { gastos, esc, prom, malo, tasaAhorro, trabajosEq, mesesFondo, matriz: M, toxicas, gates, etapa, flags, prio, proj, mile: { libre, colchon1, bajoCero }, anyIncome };
}

/* ─────────────── UI ─────────────── */
const Panel = ({ eb, title, children }) => (
  <section className="panel">
    {eb && <div className="eb">{eb}</div>}
    {title && <h2 className="h2">{title}</h2>}
    {children}
  </section>
);
const sev = (s) => (s === "critical" ? P.critical : s === "caution" ? P.caution : P.healthy);
const Amb = ({ v, onChange }) => (
  <span style={{ display: "inline-flex", border: `1px solid ${P.line}`, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
    {["compania", "personal"].map((a) => (
      <button key={a} className="amb" onClick={() => onChange(a)} style={{ background: v === a ? P.teal : "#fff", color: v === a ? "#fff" : P.muted }}>{a === "compania" ? "Cía" : "Pers"}</button>
    ))}
  </span>
);
function Sched({ arr, saldo, onSet, onFill }) {
  const [open, setOpen] = useState(false);
  const prog = arr.reduce((a, x) => a + (+x || 0), 0);
  const off = Math.abs(prog - saldo) > 1;
  return (
    <div style={{ marginTop: 4 }}>
      <button className="btn" style={{ fontSize: 11, padding: "3px 7px" }} onClick={() => setOpen((o) => !o)}>
        {open ? "▾" : "▸"} cronograma · <span className="mono" style={{ color: off ? P.caution : P.teal }}>{money(prog)}{saldo ? ` / ${money(saldo)}` : ""}</span>
      </button>
      {open && (
        <>
          <div className="sched">
            {arr.map((v, m) => (
              <div key={m} style={{ textAlign: "center" }}>
                <div className="mono" style={{ fontSize: 9, color: P.muted }}>{mn(m)}</div>
                <input className="si" type="number" value={v} onChange={(e) => onSet(m, +e.target.value || 0)} />
              </div>
            ))}
          </div>
          {saldo > 0 && <button className="btn" style={{ fontSize: 11, marginTop: 6 }} onClick={onFill}>repartir parejo (6 meses)</button>}
        </>
      )}
    </div>
  );
}

export default function App() {
  const [profiles, setProfiles] = useState(() => [{ id: uid(), nombre: "Gabriel B.", inp: gabrielInp() }]);
  const [activeId, setActiveId] = useState(() => profiles[0].id);
  const active = profiles.find((p) => p.id === activeId) || profiles[0];
  const i = active.inp;

  const updInp = (fn) => setProfiles((ps) => ps.map((p) => (p.id === activeId ? { ...p, inp: fn(p.inp) } : p)));
  const set = (patch) => updInp((x) => ({ ...x, ...patch }));
  const setIng = (k, v) => updInp((x) => ({ ...x, ingreso: { ...x.ingreso, [k]: v } }));
  const editItem = (arr, id, patch) => updInp((x) => ({ ...x, [arr]: x[arr].map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
  const addItem = (arr, item) => updInp((x) => ({ ...x, [arr]: [...x[arr], { id: uid(), ...item }] }));
  const delItem = (arr, id) => updInp((x) => ({ ...x, [arr]: x[arr].filter((it) => it.id !== id) }));
  const cycle = (idx) => updInp((x) => { const h = [...x.horizonte]; const o = ["malo", "prom", "bueno"]; h[idx] = { sc: o[(o.indexOf(h[idx].sc) + 1) % 3] }; return { ...x, horizonte: h }; });
  const setSched = (arr, id, key, m, val) => updInp((x) => ({ ...x, [arr]: x[arr].map((it) => (it.id === id ? { ...it, [key]: it[key].map((y, k) => (k === m ? val : y)) } : it)) }));
  const fillSched = (arr, id, key, saldo) => updInp((x) => ({ ...x, [arr]: x[arr].map((it) => { if (it.id !== id) return it; const per = Math.round((saldo / 6) * 100) / 100; return { ...it, [key]: it[key].map((_, k) => (k < 6 ? per : 0)) }; }) }));

  const newProfile = () => { const id = uid(); setProfiles((ps) => [...ps, { id, nombre: "Nuevo usuario", inp: blankInp() }]); setActiveId(id); };
  const renameProfile = (nombre) => setProfiles((ps) => ps.map((p) => (p.id === activeId ? { ...p, nombre } : p)));
  const delProfile = () => setProfiles((ps) => { if (ps.length <= 1) return ps; const rest = ps.filter((p) => p.id !== activeId); setActiveId(rest[0].id); return rest; });

  const r = useMemo(() => runEngine(i), [i]);
  const M = r.matriz;
  const maxAbs = Math.max(...r.esc.map((e) => Math.abs(e.allIn)), 1);
  const maxDeuda = Math.max(...r.proj.map((p) => p.deudaTot), 1);

  return (
    <div className="app" style={{ background: P.paper, color: P.ink }}>
      <style>{CSS}</style>
      <div className="wrap">
        {/* USER BAR */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span className="eb" style={{ margin: 0 }}>Usuario</span>
          {profiles.map((p) => (
            <button key={p.id} className="pill" onClick={() => setActiveId(p.id)}
              style={{ border: `1px solid ${p.id === activeId ? P.teal : P.line}`, background: p.id === activeId ? P.teal : "#fff", color: p.id === activeId ? "#fff" : P.muted }}>
              {p.nombre}
            </button>
          ))}
          <button className="btn" style={{ borderRadius: 20 }} onClick={newProfile}>+ Nuevo usuario</button>
          {profiles.length > 1 && <button className="btn" style={{ borderRadius: 20, color: P.critical, borderColor: P.critical }} onClick={delProfile}>Borrar</button>}
          <input className="nam" style={{ maxWidth: 180, borderBottomStyle: "solid" }} value={active.nombre} onChange={(e) => renameProfile(e.target.value)} />
        </div>

        <header style={{ marginBottom: 24 }}>
          <div className="eb mono">Motor determinista · sin IA · corre en el dispositivo</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1, margin: 0 }}>No te dice cómo gastaste. Te dice qué hacer primero.</h1>
          <p style={{ marginTop: 6, fontSize: 14, color: P.muted }}>Editá cualquier nombre, monto, ámbito o cronograma; todo se recalcula al instante.</p>
        </header>

        <div className="gmain">
          {/* ── INPUTS ── */}
          <div className="gcol">
            <Panel eb="Ingreso · 3 escenarios" title="Labor mensual (bruto)">
              {["malo", "prom", "bueno"].map((k) => (
                <div className="row" key={k}>
                  <span style={{ fontSize: 13, color: SC[k].c }}>{SC[k].l}</span>
                  <span className="mono" style={{ color: P.muted, fontSize: 13 }}>$<input className="num mono" type="number" value={i.ingreso[k]} onChange={(e) => setIng(k, +e.target.value || 0)} /></span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${P.line}`, marginTop: 6, paddingTop: 6 }}>
                <div className="row"><span style={{ fontSize: 13, color: P.muted }} title="17% impuestos + 2% imprevistos + 5% colchón. Se aparta apenas cobra.">Reserva fiscal (%) ⓘ</span><input className="num mono" type="number" value={Math.round(i.reserva * 100)} onChange={(e) => set({ reserva: (+e.target.value || 0) / 100 })} /></div>
                <div className="row"><span style={{ fontSize: 13, color: P.muted }}>Ahorro líquido hoy</span><input className="num mono" type="number" value={i.ahorroLiquido} onChange={(e) => set({ ahorroLiquido: +e.target.value || 0 })} /></div>
              </div>
            </Panel>

            <Panel eb="Gastos personales" title={`${money(r.gastos)}/mes`}>
              <div className="scroll">
                {i.gastosItems.map((it) => (
                  <div className="row" key={it.id}>
                    <input className="nam" value={it.n} onChange={(e) => editItem("gastosItems", it.id, { n: e.target.value })} />
                    <span className="mono" style={{ color: P.muted, fontSize: 13 }}>$<input className="num mono" type="number" step="0.01" value={it.m} onChange={(e) => editItem("gastosItems", it.id, { m: +e.target.value || 0 })} /></span>
                    <button className="x" onClick={() => delItem("gastosItems", it.id)}>×</button>
                  </div>
                ))}
                {i.gastosItems.length === 0 && <div style={{ fontSize: 12, color: P.muted, padding: "6px 0" }}>Sin partidas todavía. Agregá la primera.</div>}
              </div>
              <button className="btn" style={{ marginTop: 8 }} onClick={() => addItem("gastosItems", { n: "Nueva partida", m: 0 })}>+ Agregar partida</button>
              <label className="row" style={{ marginTop: 4, cursor: "pointer" }}>
                <span style={{ fontSize: 12.5, color: P.muted }}>Gastos categorizados y con topes</span>
                <input type="checkbox" checked={i.gastosControlados} onChange={(e) => set({ gastosControlados: e.target.checked })} />
              </label>
            </Panel>

            <Panel eb="Balance" title="Tu panorama real">
              <table className="mtx">
                <thead><tr><th></th><th>Compañía</th><th>Personal</th><th>Total</th></tr></thead>
                <tbody>
                  <tr><td>Por pagar</td><td className="mono">{money(M.pagarCia)}</td><td className="mono">{money(M.pagarPers)}</td><td className="mono" style={{ fontWeight: 600 }}>{money(M.totalPagar)}</td></tr>
                  <tr><td>Por cobrar</td><td className="mono">{money(M.cobrarCia)}</td><td className="mono">{money(M.cobrarPers)}</td><td className="mono" style={{ fontWeight: 600 }}>{money(M.totalCobrar)}</td></tr>
                  <tr style={{ borderTop: `1px solid ${P.line}` }}><td style={{ color: P.ink }}>Deuda neta</td><td></td><td></td><td className="mono" style={{ color: P.critical, fontWeight: 600 }}>{money(M.deudaNeta)}</td></tr>
                </tbody>
              </table>
            </Panel>

            <Panel eb="Cuentas por pagar" title="Deudas · nombre, ámbito y cronograma">
              {i.deudas.map((d) => (
                <div key={d.id} style={{ padding: "8px 0", borderBottom: `1px solid ${P.faint}` }}>
                  <div className="row" style={{ padding: "2px 0" }}>
                    <input className="nam" value={d.n} onChange={(e) => editItem("deudas", d.id, { n: e.target.value })} />
                    <Amb v={d.ambito} onChange={(a) => editItem("deudas", d.id, { ambito: a })} />
                    <button className="x" onClick={() => delItem("deudas", d.id)}>×</button>
                  </div>
                  <div className="row" style={{ padding: "2px 0" }}>
                    <span style={{ fontSize: 12, color: P.muted }}>saldo <input className="num mono" type="number" value={d.saldo} onChange={(e) => editItem("deudas", d.id, { saldo: +e.target.value || 0 })} /></span>
                  </div>
                  <Sched arr={d.pagos} saldo={+d.saldo || 0} onSet={(m, v) => setSched("deudas", d.id, "pagos", m, v)} onFill={() => fillSched("deudas", d.id, "pagos", +d.saldo || 0)} />
                </div>
              ))}
              {i.deudas.length === 0 && <div style={{ fontSize: 12, color: P.muted, padding: "6px 0" }}>Sin deudas cargadas.</div>}
              <button className="btn" style={{ marginTop: 8 }} onClick={() => addItem("deudas", { n: "Nueva deuda", saldo: 0, tasa: 0, tipo: "personal", ambito: "personal", pagos: z12() })}>+ Agregar deuda</button>
            </Panel>

            <Panel eb="Cuentas por cobrar" title="Lo que te deben · con cronograma">
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
                  <Sched arr={c.cobros} saldo={+c.monto || 0} onSet={(m, v) => setSched("porCobrar", c.id, "cobros", m, v)} onFill={() => fillSched("porCobrar", c.id, "cobros", +c.monto || 0)} />
                </div>
              ))}
              {i.porCobrar.length === 0 && <div style={{ fontSize: 12, color: P.muted, padding: "6px 0" }}>Sin cuentas por cobrar.</div>}
              <button className="btn" style={{ marginTop: 8 }} onClick={() => addItem("porCobrar", { n: "Nuevo cobro", monto: 0, ambito: "personal", cobros: z12() })}>+ Agregar cobro</button>
            </Panel>
          </div>

          {/* ── OUTPUT ── */}
          <div className="gcol">
            <Panel eb={`Etapa actual · ${r.etapa}`} title="Prueba de estrés: excedente todo incluido">
              <div className="cards3" style={{ marginBottom: 14 }}>
                {r.esc.map((e) => {
                  const c = e.allIn < 0 ? P.critical : e.s === "prom" ? P.caution : P.healthy;
                  return (
                    <div key={e.s} style={{ background: P.faint, border: `1px solid ${P.line}`, borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 11, color: P.muted }}>{{ malo: "Mes malo", prom: "Mes promedio", bueno: "Mes bueno" }[e.s]}</div>
                      <div className="mono" style={{ fontSize: 22, fontWeight: 600, color: c, marginTop: 2 }}>{money(e.allIn)}</div>
                      <div style={{ height: 6, borderRadius: 3, background: P.line, marginTop: 8 }}><div style={{ height: "100%", borderRadius: 3, width: `${(Math.abs(e.allIn) / maxAbs) * 100}%`, background: c }} /></div>
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: 13, color: P.muted, margin: 0 }}>
                Se estresa contra el <b style={{ color: P.critical }}>mes malo</b>, no el promedio. Equilibrio en <b className="mono" style={{ color: P.ink }}>{r.trabajosEq.toFixed(1)}</b> trabajos/mes · deuda neta <b className="mono" style={{ color: P.ink }}>{money(M.deudaNeta)}</b>.
              </p>
            </Panel>

            <Panel eb="Horizonte · cliqueá cada mes para cambiar su escenario" title="Proyección: cómo baja la deuda mes a mes">
              <div className="hz">
                {r.proj.map((p, idx) => {
                  const c = SC[p.sc].c;
                  const h = 4 + (p.deudaTot / maxDeuda) * 74;
                  return (
                    <div className="hcell" key={idx} onClick={() => cycle(idx)} title={`${mn(idx)}: ${SC[p.sc].l} · deuda ${money(p.deudaTot)} · colchón ${money(p.bal)}`}>
                      <div style={{ height: 80, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                        <div style={{ width: "70%", height: h, borderRadius: "3px 3px 0 0", background: c, opacity: 0.85 }} />
                      </div>
                      <div className="mono" style={{ fontSize: 9, color: P.muted, marginTop: 3 }}>{mn(idx)}</div>
                      <div style={{ width: 6, height: 6, borderRadius: 3, background: c, margin: "3px auto 0" }} />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 14, fontSize: 12.5 }}>
                <span style={{ color: P.muted }}>Libre de deuda: <b className="mono" style={{ color: r.mile.libre ? P.healthy : P.caution }}>{r.mile.libre ? mn(r.mile.libre.m) : "> 12 meses"}</b></span>
                <span style={{ color: P.muted }}>Colchón 1 mes: <b className="mono" style={{ color: r.mile.colchon1 ? P.healthy : P.caution }}>{r.mile.colchon1 ? mn(r.mile.colchon1.m) : "> 12 meses"}</b></span>
                {r.mile.bajoCero && <span style={{ color: P.critical }}>Saldo negativo en {mn(r.mile.bajoCero.m)}</span>}
              </div>
            </Panel>

            <Panel eb="Escalera de diagnóstico" title="Ordenar → Estabilizar → Crecer">
              <div style={{ position: "relative", paddingLeft: 24 }}>
                <div style={{ position: "absolute", left: 9, top: 8, bottom: 8, width: 1, background: P.line }} />
                {r.gates.map((g) => {
                  const here = !g.pass && g.id === r.gates.find((x) => !x.pass)?.id;
                  const dot = g.pass ? P.healthy : here ? P.critical : P.line;
                  return (
                    <div key={g.id} style={{ position: "relative", padding: "8px 0", display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ position: "absolute", left: -24, width: 20, display: "flex", justifyContent: "center" }}>
                        <span style={{ width: g.pass ? 10 : 12, height: g.pass ? 10 : 12, borderRadius: 8, background: g.pass ? dot : "#fff", border: `2px solid ${dot}` }} />
                      </span>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <span style={{ fontSize: 13, color: g.pass ? P.ink : here ? P.critical : P.muted, fontWeight: here ? 600 : 400 }}>
                          <span className="mono" style={{ fontSize: 11, color: P.muted, marginRight: 8 }}>{g.id}</span>{g.l}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          <span className="mono" style={{ fontSize: 12, color: P.muted }}>{g.v}</span>
                          {here && <span className="mono" style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: P.critical, color: "#fff" }}>ACÁ ESTÁS</span>}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <div className="g2">
              <Panel eb="Diagnóstico" title="Lo que enciende alarmas">
                {r.flags.length === 0 && <div style={{ fontSize: 13, color: r.anyIncome ? P.healthy : P.muted }}>{r.anyIncome ? "Sin alertas activas." : "Cargá ingresos para ver el diagnóstico."}</div>}
                {r.flags.map((f, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 10, fontSize: 13, marginBottom: 10 }}>
                    <span style={{ marginTop: 6, width: 7, height: 7, borderRadius: 4, background: sev(f.s), flexShrink: 0 }} /><span>{f.t}</span>
                  </div>
                ))}
              </Panel>
              <Panel eb="Plan de acción" title="Qué atacar, en este orden">
                {r.prio.length === 0 && <div style={{ fontSize: 13, color: P.muted }}>Cargá datos para generar el plan.</div>}
                {r.prio.map((p, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: P.teal, flexShrink: 0 }}>{idx + 1}</span>
                    <span style={{ fontSize: 13 }}><b style={{ color: P.ink }}>{p.t}. </b><span style={{ color: P.muted }}>{p.d}</span></span>
                  </div>
                ))}
              </Panel>
            </div>
            <p className="mono" style={{ fontSize: 11, textAlign: "center", color: P.muted, marginTop: 4 }}>Cálculo local · sin servidor · sin IA · costo de cómputo $0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
