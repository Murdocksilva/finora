"use client";
import React, { useState, useMemo } from "react";

/*  MOTOR DETERMINISTA DE FINANZAS PERSONALES · v1.3
    Nombres editables (con affordance) · ámbito Cía/Pers · balance tipo matriz · horizonte · proyección.
    Sin IA, sin red. Estilos inline → portable a Next.js/Vercel. */

const P = {
  ink: "#16211C", paper: "#F4F5F1", panel: "#FFFFFF", teal: "#0B5D4E",
  healthy: "#2F8F6B", caution: "#B8791E", critical: "#A8412F",
  muted: "#6B7269", line: "#E3E5DE", faint: "#EFF1EC",
};
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const SC = { malo: { c: P.critical, l: "Malo" }, prom: { c: P.caution, l: "Prom" }, bueno: { c: P.healthy, l: "Bueno" } };
const money = (n) => (n < 0 ? "−" : "") + "$" + Math.abs(Math.round(n)).toLocaleString("en-US");
const pct = (n) => Math.round(n * 100) + "%";
let _id = 0; const uid = () => ++_id;

const CSS = `
.app{min-height:100vh;width:100%;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1120px;margin:0 auto;padding:32px 20px}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.gmain{display:grid;grid-template-columns:minmax(0,360px) 1fr;gap:20px;align-items:start}
.gcol{display:grid;gap:20px}
.cards3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.panel{background:#fff;border:1px solid ${P.line};border-radius:12px;padding:20px}
.eb{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:${P.teal};margin-bottom:6px}
.h2{font-size:15px;font-weight:600;color:${P.ink};margin:0 0 12px}
.row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 0}
input,select{outline:none;font-size:13px;border-radius:6px;border:1px solid ${P.line};background:${P.faint};color:${P.ink}}
.num{width:84px;text-align:right;padding:5px 8px;font-family:ui-monospace,Menlo,monospace}
.nam{flex:1;min-width:0;padding:4px 6px;background:transparent;border:none;border-bottom:1px dashed #B9C0B6;border-radius:0;font-size:13px}
.nam:focus{background:${P.faint};border-bottom:1px solid ${P.teal}}
input:focus,select:focus{box-shadow:0 0 0 2px rgba(11,93,78,.22)}
.btn{cursor:pointer;font-size:12px;border:1px dashed ${P.line};background:#fff;color:${P.teal};border-radius:6px;padding:5px 8px}
.x{cursor:pointer;border:none;background:transparent;color:${P.muted};font-size:15px;line-height:1;padding:0 2px}
.scroll{max-height:210px;overflow:auto;padding-right:4px;margin-right:-4px}
.hz{display:grid;grid-template-columns:repeat(12,1fr);gap:4px;align-items:end}
.hcell{cursor:pointer;text-align:center;user-select:none}
.amb{cursor:pointer;border:none;font-size:11px;padding:2px 7px}
.mtx{width:100%;border-collapse:collapse;font-size:12px}
.mtx td,.mtx th{padding:5px 6px;text-align:right}
.mtx th:first-child,.mtx td:first-child{text-align:left;color:${P.muted}}
@media(max-width:860px){.gmain{grid-template-columns:1fr}.cards3{grid-template-columns:1fr}.g2{grid-template-columns:1fr}}
`;

/* ─────────────── MOTOR ─────────────── */
function runEngine(inp) {
  const gastos = inp.gastosItems.reduce((a, i) => a + (+i.m || 0), 0);
  const vivienda = inp.gastosItems.filter((i) => i.viv).reduce((a, i) => a + (+i.m || 0), 0);
  const esc = ["malo", "prom", "bueno"].map((s) => {
    const labor = +inp.ingreso[s] || 0, apart = labor * inp.reserva, disp = labor - apart;
    return { s, labor, disp, preDeuda: disp - gastos, allIn: disp - gastos - inp.backTax };
  });
  const prom = esc[1], malo = esc[0];
  const tasaAhorro = prom.disp > 0 ? prom.preDeuda / prom.disp : 0;
  const puntoEq = (gastos + inp.backTax) / (1 - inp.reserva);
  const trabajosEq = inp.laborPorTrabajo > 0 ? puntoEq / inp.laborPorTrabajo : 0;
  const mesesFondo = gastos > 0 ? inp.ahorroLiquido / gastos : 0;

  // Balance por ámbito (matriz)
  const sum = (arr, key, amb) => arr.filter((x) => (amb ? x.ambito === amb : true)).reduce((a, x) => a + (+x[key] || 0), 0);
  const pagarCia = sum(inp.deudas, "saldo", "compania"), pagarPers = sum(inp.deudas, "saldo", "personal");
  const cobrarCia = sum(inp.porCobrar, "monto", "compania"), cobrarPers = sum(inp.porCobrar, "monto", "personal");
  const totalPagar = pagarCia + pagarPers, totalCobrar = cobrarCia + cobrarPers;
  const deudaNeta = totalPagar - totalCobrar;
  const matriz = { pagarCia, pagarPers, totalPagar, cobrarCia, cobrarPers, totalCobrar, deudaNeta };

  const toxicas = inp.deudas.filter((d) => +d.saldo > 0 && (d.tasa >= 0.4 || d.tipo === "rotativa" || d.tipo === "impuesto"));
  const cargaViv = prom.disp > 0 ? vivienda / prom.disp : 0;

  const gates = [
    { id: "G1", et: "Ordenar", l: "Excedente positivo en un mes promedio", pass: prom.allIn > 0, v: money(prom.allIn) },
    { id: "G2", et: "Ordenar", l: "Gasto bajo control: categorizado y con topes", pass: !!inp.gastosControlados, v: inp.gastosControlados ? "sí" : "no" },
    { id: "G3", et: "Estabilizar", l: "Colchón de arranque (≥ 1 mes de gastos)", pass: mesesFondo >= 1, v: mesesFondo.toFixed(1) + " m" },
    { id: "G4", et: "Estabilizar", l: "Sin deuda cara ni fiscal sin saldar", pass: toxicas.length === 0, v: toxicas.length ? money(toxicas.reduce((a, d) => a + d.saldo, 0)) : "OK" },
    { id: "G5", et: "Estabilizar", l: `Fondo de emergencia completo (≥ ${inp.objetivoFE} m)`, pass: mesesFondo >= inp.objetivoFE, v: mesesFondo.toFixed(1) + " m" },
    { id: "G6", et: "Crecer", l: `Tasa de ahorro ≥ ${pct(inp.objetivoAhorro)}`, pass: tasaAhorro >= inp.objetivoAhorro, v: pct(tasaAhorro) },
    { id: "G7", et: "Crecer", l: "Patrimonio en movimiento (metas / inversión)", pass: false, v: "—" },
  ];
  const primerFallo = gates.find((g) => !g.pass);
  const etapa = primerFallo ? primerFallo.et : "Crecer";

  const flags = [];
  if (malo.allIn < 0) flags.push({ s: "critical", t: `Un mes malo da ${money(malo.allIn)}: el sistema sangra y no hay red.` });
  if (mesesFondo < 1) flags.push({ s: "critical", t: "Colchón por debajo de 1 mes: cualquier imprevisto se paga con deuda nueva." });
  if (toxicas.length) flags.push({ s: "caution", t: `Deuda cara/fiscal viva: ${money(toxicas.reduce((a, d) => a + d.saldo, 0))} acumulando interés o penalidad.` });
  if (cargaViv > 0.35) flags.push({ s: "caution", t: `Vivienda = ${pct(cargaViv)} del ingreso disponible (umbral 35%).` });

  const prio = [];
  if (inp.porCobrarCorto > 0) prio.push({ t: "Cobrar las cuentas por cobrar", d: `Liquidez inmediata sin costo: ${money(inp.porCobrarCorto)} en el corto plazo.` });
  if (mesesFondo < 1) prio.push({ t: "Armar el colchón de arranque", d: `Faltan ${money(Math.max(0, gastos - inp.ahorroLiquido))} para 1 mes; empezar con un tramo antes de acelerar deudas 0%.` });
  if (toxicas.length) prio.push({ t: "Priorizar la deuda cara / fiscal", d: `${toxicas.map((d) => d.n).join(", ")} por encima de las deudas sin interés.` });
  if (malo.allIn < 0 || trabajosEq > 2) prio.push({ t: "Subir el piso de ingresos", d: `Equilibrio en ~${trabajosEq.toFixed(1)} trabajos/mes; apuntar a ${money(inp.ingreso.bueno)} de labor.` });

  // ── PROYECCIÓN ──
  const colchonFloor = 2000;
  let bal = inp.ahorroLiquido;
  const deudas = inp.deudas.map((d) => ({ ...d, saldo: +d.saldo || 0 }));
  const arRest = Math.max(0, totalCobrar - inp.porCobrarCorto);
  const proj = inp.horizonte.map((h, m) => {
    const income = +inp.ingreso[h.sc] || 0;
    const reservaAmt = income * inp.reserva;
    let taxPaid = 0;
    deudas.forEach((d) => { if (d.tipo === "impuesto" && d.saldo > 0) { const p = Math.min(d.cuota || 0, d.saldo); d.saldo -= p; taxPaid += p; } });
    const ar = m === 0 ? inp.porCobrarCorto : m === 1 ? arRest : 0;
    let cash = income - reservaAmt - gastos - taxPaid + ar;
    if (cash > 0 && bal < colchonFloor) { const put = Math.min(cash, colchonFloor - bal); bal += put; cash -= put; }
    if (cash > 0) {
      const otras = deudas.filter((d) => d.tipo !== "impuesto" && d.saldo > 0).sort((a, b) => (b.tasa - a.tasa) || (b.saldo - a.saldo));
      for (const d of otras) { if (cash <= 0) break; const p = Math.min(cash, d.saldo); d.saldo -= p; cash -= p; }
    }
    bal += cash;
    const deudaTot = deudas.reduce((a, d) => a + Math.max(0, d.saldo), 0);
    return { m, sc: h.sc, bal, deudaTot, colMeses: gastos > 0 ? bal / gastos : 0 };
  });
  const libre = proj.find((p) => p.deudaTot <= 0);
  const colchon1 = proj.find((p) => p.colMeses >= 1);
  const bajoCero = proj.find((p) => p.bal < 0);

  return { gastos, esc, prom, malo, tasaAhorro, trabajosEq, mesesFondo, matriz, toxicas, gates, etapa, flags, prio,
    proj, mile: { libre, colchon1, bajoCero } };
}

/* ─────────────── UI helpers ─────────────── */
const Panel = ({ eb, title, children, style }) => (
  <section className="panel" style={style}>
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

export default function App() {
  const [inp, setInp] = useState({
    ingreso: { malo: 6000, prom: 8500, bueno: 12500 }, laborPorTrabajo: 3200, reserva: 0.24,
    backTax: 700, ahorroLiquido: 0, porCobrarCorto: 7300,
    gastosControlados: true, objetivoFE: 6, objetivoAhorro: 0.2,
    deudas: [
      { id: uid(), n: "Impuestos 22–25 (IRS)", saldo: 25000, cuota: 700, tasa: 0, tipo: "impuesto", ambito: "compania" },
      { id: uid(), n: "Vendors / crew 86LAB", saldo: 24167.67, cuota: 0, tasa: 0, tipo: "personal", ambito: "compania" },
      { id: uid(), n: "Deudas personales", saldo: 13900, cuota: 0, tasa: 0, tipo: "personal", ambito: "personal" },
    ],
    porCobrar: [
      { id: uid(), n: "Clientes compañía", monto: 3000, ambito: "compania" },
      { id: uid(), n: "Clientes personales", monto: 7600, ambito: "personal" },
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

  const set = (p) => setInp((s) => ({ ...s, ...p }));
  const setIng = (k, v) => setInp((s) => ({ ...s, ingreso: { ...s.ingreso, [k]: v } }));
  const editItem = (arr, id, patch) => setInp((s) => ({ ...s, [arr]: s[arr].map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
  const addItem = (arr, item) => setInp((s) => ({ ...s, [arr]: [...s[arr], { id: uid(), ...item }] }));
  const delItem = (arr, id) => setInp((s) => ({ ...s, [arr]: s[arr].filter((it) => it.id !== id) }));
  const cycle = (i) => setInp((s) => { const h = [...s.horizonte]; const o = ["malo", "prom", "bueno"]; h[i] = { sc: o[(o.indexOf(h[i].sc) + 1) % 3] }; return { ...s, horizonte: h }; });

  const r = useMemo(() => runEngine(inp), [inp]);
  const M = r.matriz;
  const maxAbs = Math.max(...r.esc.map((e) => Math.abs(e.allIn)), 1);
  const maxDeuda = Math.max(...r.proj.map((p) => p.deudaTot), 1);
  const startM = 8;

  return (
    <div className="app" style={{ background: P.paper, color: P.ink }}>
      <style>{CSS}</style>
      <div className="wrap">
        <header style={{ marginBottom: 28 }}>
          <div className="eb mono">Motor determinista · sin IA · corre en el dispositivo</div>
          <h1 style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.1, margin: 0 }}>No te dice cómo gastaste. Te dice qué hacer primero.</h1>
          <p style={{ marginTop: 8, fontSize: 14, color: P.muted, maxWidth: 640 }}>
            Caso: <b style={{ color: P.ink }}>Gabriel B.</b> — self-employed, Miami. Cada nombre, monto y escenario es editable; todo se recalcula al instante.
          </p>
        </header>

        <div className="gmain">
          {/* ── INPUTS ── */}
          <div className="gcol">
            <Panel eb="Ingreso · 3 escenarios" title="Labor mensual (bruto)">
              {["malo", "prom", "bueno"].map((k) => (
                <div className="row" key={k}>
                  <span style={{ fontSize: 13, color: SC[k].c }}>{SC[k].l}</span>
                  <span className="mono" style={{ color: P.muted, fontSize: 13 }}>$<input className="num mono" type="number" value={inp.ingreso[k]} onChange={(e) => setIng(k, +e.target.value || 0)} /></span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${P.line}`, marginTop: 6, paddingTop: 6 }}>
                <div className="row"><span style={{ fontSize: 13, color: P.muted }} title="17% impuestos + 2% imprevistos + 5% colchón. Se aparta apenas cobra.">Reserva fiscal (%) ⓘ</span><input className="num mono" type="number" value={Math.round(inp.reserva * 100)} onChange={(e) => set({ reserva: (+e.target.value || 0) / 100 })} /></div>
                <div className="row"><span style={{ fontSize: 13, color: P.muted }}>Ahorro líquido hoy</span><input className="num mono" type="number" value={inp.ahorroLiquido} onChange={(e) => set({ ahorroLiquido: +e.target.value || 0 })} /></div>
              </div>
            </Panel>

            <Panel eb="Gastos personales" title={`${money(r.gastos)}/mes`}>
              <div className="scroll">
                {inp.gastosItems.map((it) => (
                  <div className="row" key={it.id}>
                    <input className="nam" value={it.n} onChange={(e) => editItem("gastosItems", it.id, { n: e.target.value })} />
                    <span className="mono" style={{ color: P.muted, fontSize: 13 }}>$<input className="num mono" type="number" step="0.01" value={it.m} onChange={(e) => editItem("gastosItems", it.id, { m: +e.target.value || 0 })} /></span>
                    <button className="x" onClick={() => delItem("gastosItems", it.id)} title="Quitar">×</button>
                  </div>
                ))}
              </div>
              <button className="btn" style={{ marginTop: 8 }} onClick={() => addItem("gastosItems", { n: "Nueva partida", m: 0 })}>+ Agregar partida</button>
            </Panel>

            {/* MATRIZ */}
            <Panel eb="Balance" title="Tu panorama real">
              <table className="mtx">
                <thead><tr><th></th><th>Compañía</th><th>Personal</th><th>Total</th></tr></thead>
                <tbody>
                  <tr><td>Por pagar</td><td className="mono">{money(M.pagarCia)}</td><td className="mono">{money(M.pagarPers)}</td><td className="mono" style={{ color: P.ink, fontWeight: 600 }}>{money(M.totalPagar)}</td></tr>
                  <tr><td>Por cobrar</td><td className="mono">{money(M.cobrarCia)}</td><td className="mono">{money(M.cobrarPers)}</td><td className="mono" style={{ color: P.ink, fontWeight: 600 }}>{money(M.totalCobrar)}</td></tr>
                  <tr style={{ borderTop: `1px solid ${P.line}` }}><td style={{ color: P.ink }}>Deuda neta</td><td></td><td></td><td className="mono" style={{ color: P.critical, fontWeight: 600 }}>{money(M.deudaNeta)}</td></tr>
                </tbody>
              </table>
            </Panel>

            <Panel eb="Cuentas por pagar" title="Deudas · editá nombre, ámbito y cuota">
              {inp.deudas.map((d) => (
                <div key={d.id} style={{ padding: "6px 0", borderBottom: `1px solid ${P.faint}` }}>
                  <div className="row" style={{ padding: "2px 0" }}>
                    <input className="nam" value={d.n} onChange={(e) => editItem("deudas", d.id, { n: e.target.value })} />
                    <Amb v={d.ambito} onChange={(a) => editItem("deudas", d.id, { ambito: a })} />
                    <button className="x" onClick={() => delItem("deudas", d.id)}>×</button>
                  </div>
                  <div className="row" style={{ padding: "2px 0" }}>
                    <span style={{ fontSize: 12, color: P.muted }}>saldo <input className="num mono" type="number" value={d.saldo} onChange={(e) => editItem("deudas", d.id, { saldo: +e.target.value || 0 })} /></span>
                    <span style={{ fontSize: 12, color: P.muted }}>cuota $<input className="num mono" style={{ width: 58 }} type="number" value={d.cuota} onChange={(e) => editItem("deudas", d.id, { cuota: +e.target.value || 0 })} /></span>
                  </div>
                  {d.cuota > 0 && <div className="mono" style={{ fontSize: 11, color: P.teal, textAlign: "right" }}>≈ {Math.ceil(d.saldo / d.cuota)} cuotas</div>}
                </div>
              ))}
              <button className="btn" style={{ marginTop: 8 }} onClick={() => addItem("deudas", { n: "Nueva deuda", saldo: 0, cuota: 0, tasa: 0, tipo: "personal", ambito: "personal" })}>+ Agregar deuda</button>
            </Panel>

            <Panel eb="Cuentas por cobrar" title="Lo que te deben">
              {inp.porCobrar.map((c) => (
                <div className="row" key={c.id}>
                  <input className="nam" value={c.n} onChange={(e) => editItem("porCobrar", c.id, { n: e.target.value })} />
                  <Amb v={c.ambito} onChange={(a) => editItem("porCobrar", c.id, { ambito: a })} />
                  <span className="mono" style={{ color: P.muted, fontSize: 13 }}>$<input className="num mono" type="number" value={c.monto} onChange={(e) => editItem("porCobrar", c.id, { monto: +e.target.value || 0 })} /></span>
                  <button className="x" onClick={() => delItem("porCobrar", c.id)}>×</button>
                </div>
              ))}
              <button className="btn" style={{ marginTop: 8 }} onClick={() => addItem("porCobrar", { n: "Nuevo cobro", monto: 0, ambito: "personal" })}>+ Agregar cobro</button>
              <div className="row" style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${P.line}` }}>
                <span style={{ fontSize: 13, color: P.muted }} title="Cuánto de lo por cobrar entra en los próximos 1–2 meses">Cobrable corto plazo ⓘ</span>
                <span className="mono" style={{ color: P.muted, fontSize: 13 }}>$<input className="num mono" type="number" value={inp.porCobrarCorto} onChange={(e) => set({ porCobrarCorto: +e.target.value || 0 })} /></span>
              </div>
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
                {r.proj.map((p, i) => {
                  const c = SC[p.sc].c;
                  const h = 4 + (p.deudaTot / maxDeuda) * 74;
                  return (
                    <div className="hcell" key={i} onClick={() => cycle(i)} title={`${MESES[(startM + i) % 12]}: ${SC[p.sc].l} · deuda ${money(p.deudaTot)} · colchón ${money(p.bal)}`}>
                      <div style={{ height: 80, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                        <div style={{ width: "70%", height: h, borderRadius: "3px 3px 0 0", background: c, opacity: 0.85 }} />
                      </div>
                      <div className="mono" style={{ fontSize: 9, color: P.muted, marginTop: 3 }}>{MESES[(startM + i) % 12]}</div>
                      <div style={{ width: 6, height: 6, borderRadius: 3, background: c, margin: "3px auto 0" }} />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 14, fontSize: 12.5 }}>
                <span style={{ color: P.muted }}>Libre de deuda: <b className="mono" style={{ color: r.mile.libre ? P.healthy : P.caution }}>{r.mile.libre ? MESES[(startM + r.mile.libre.m) % 12] : "> 12 meses"}</b></span>
                <span style={{ color: P.muted }}>Colchón 1 mes: <b className="mono" style={{ color: r.mile.colchon1 ? P.healthy : P.caution }}>{r.mile.colchon1 ? MESES[(startM + r.mile.colchon1.m) % 12] : "> 12 meses"}</b></span>
                {r.mile.bajoCero && <span style={{ color: P.critical }}>Saldo negativo en {MESES[(startM + r.mile.bajoCero.m) % 12]}</span>}
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
                {r.flags.length === 0 && <div style={{ fontSize: 13, color: P.healthy }}>Sin alertas activas.</div>}
                {r.flags.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, fontSize: 13, marginBottom: 10 }}>
                    <span style={{ marginTop: 6, width: 7, height: 7, borderRadius: 4, background: sev(f.s), flexShrink: 0 }} /><span>{f.t}</span>
                  </div>
                ))}
              </Panel>
              <Panel eb="Plan de acción" title="Qué atacar, en este orden">
                {r.prio.map((p, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: P.teal, flexShrink: 0 }}>{i + 1}</span>
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
