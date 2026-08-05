/**
 * REFERENCIA DE DISEÑO — no es código de producción.
 *
 * Representa: rediseño aprobado de la sección "Coste" del Plan Vivienda 2036
 * (/pulso/soluciones/vivienda-plan-vivienda-2036), tal como se veía la página
 * en la rama feature/vivienda-coste-interactivo.
 * Fecha de esta copia: 2026-08-05.
 *
 * Prototipo en React/Recharts entregado por el usuario como referencia de
 * diseño e interacción ya aprobada. La implementación real vive en
 * src/lib/components/pulso/CosteEconomico.svelte (+ subcomponentes) usando
 * Svelte + Tailwind v4 + SVG a mano, no este código ni Recharts.
 *
 * Los datos (líneas presupuestarias, medidas, escenarios, distribución
 * temporal) son reales, extraídos de topic.budget_narrative — se conservan
 * aquí como referencia de qué debía representar cada campo al migrar el
 * esquema de Supabase (ver supabase/migrations/, tablas topic_budget_*).
 */

import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChevronDown, ChevronUp, Info } from "lucide-react";

/* ============================================================
   TOKENS reales del proyecto
   ============================================================ */
const C = {
  brand: { 50: "#eefaf7", 100: "#d2f1e9", 300: "#72cebb", 600: "#1a786a", 700: "#176056", 800: "#164d46" },
  accent: { 50: "#fdf6ee", 100: "#fbe8d2", 300: "#f0ac68", 600: "#ba531b", 700: "#953f19" },
  warning: { 50: "#fffbeb", 100: "#fef3c7", 300: "#fcd34d", 500: "#d99400", 700: "#8a5c02" },
  ink: { 50: "#f7f6f4", 100: "#ece9e4", 200: "#dad4ca", 500: "#8a7a63", 700: "#463c2c", 800: "#2c2519" },
};

const PIB_2025 = 1687152; // millones de euros, INE, Contabilidad Nacional Trimestral, 4T 2025

/* ============================================================
   DATOS REALES — Sección "Desglose económico completo" del
   export EXPORT_PLAN_VIVIENDA_CLAUDE.md
   ============================================================ */

const LINES = [
  { id: "l1", name: "Parque público permanente", min: 4500, max: 5500, color: C.brand[700],
    desc: "Construcción de vivienda pública, compra de viviendas y edificios, rehabilitación de inmuebles públicos, tanteo y retracto, promociones sobre suelo público, acuerdos con cooperativas y adaptación para mayores o personas con discapacidad.",
    note: "La principal partida del plan. Toda vivienda financiada aquí conserva permanentemente su protección." },
  { id: "l2", name: "Suelo, infraestructuras y aumento de oferta", min: 2000, max: 2300, color: C.brand[300],
    desc: "Preparación de suelo público, infraestructuras, conexión con transporte, refuerzo de oficinas de licencias, digitalización, construcción industrializada, formación de trabajadores.",
    note: "No debe usarse para urbanizar de forma indiscriminada ni construir sin demanda acreditada." },
  { id: "l3", name: "Rehabilitación, alquiler seguro y vivienda vacía", min: 1500, max: 1800, color: C.accent[600],
    desc: "Rehabilitación para alquiler asequible, garantías limitadas de cobro, cobertura de daños, intermediación pública, asistencia jurídica, incentivos para movilizar vivienda vacía, bolsas públicas de alquiler.",
    note: "Las garantías no se contabilizan como si todas fueran a ejecutarse: se separa gasto real, reserva y garantías concedidas." },
  { id: "l4", name: "Jóvenes y emergencias residenciales", min: 1000, max: 1200, color: C.accent[300],
    desc: "Acceso a vivienda asequible, garantías para fianza o entrada, programas de emancipación, mediación ante impagos, prevención de desahucios, alojamiento de emergencia, compensación a pequeños propietarios vulnerables.",
    note: "Las ayudas no pueden usarse para justificar cualquier precio solicitado en el mercado." },
  { id: "l5", name: "Información, personal, inspección y evaluación", min: 300, max: 400, color: C.warning[500],
    desc: "Mapa de necesidad residencial, registro del parque público, transparencia, estadísticas territoriales, personal técnico, inspección, evaluación independiente, detección de fraude.",
    note: "No es un gasto secundario: sin esto, las partidas principales pueden retrasarse o usarse mal." },
  { id: "l6", name: "Reserva, contingencias y reequilibrio territorial", min: 700, max: 800, color: C.ink[500],
    desc: "Sobrecostes justificados, emergencias extraordinarias, proyectos que avancen más rápido de lo previsto, territorios con necesidades sobrevenidas, innovaciones con buenos resultados.",
    note: "No se reparte automáticamente al final del ejercicio para evitar perder presupuesto: su uso debe justificarse y publicarse." },
];

const MEASURES = [
  { id: "m1", n: 1, name: "Crear un parque público que nunca pueda venderse", min: 4850, max: 5900, eje: "Construir más vivienda", color: C.brand[700] },
  { id: "m2", n: 2, name: "Construir mucho más donde realmente hace falta", min: 2150, max: 2450, eje: "Construir más vivienda", color: C.brand[300] },
  { id: "m3", n: 3, name: "Un alquiler seguro para las dos partes", min: 900, max: 1100, eje: "Mejorar el alquiler", color: C.accent[600] },
  { id: "m4", n: 4, name: "Contener precios mientras llega nueva oferta", min: 200, max: 250, eje: "Mejorar el alquiler", color: C.accent[300] },
  { id: "m5", n: 5, name: "Movilizar vivienda vacía", min: 700, max: 850, eje: "Aprovechar lo que ya existe", color: C.warning[700] },
  { id: "m6", n: 6, name: "Regular pisos turísticos barrio por barrio", min: 150, max: 200, eje: "Aprovechar lo que ya existe", color: C.warning[300] },
  { id: "m7", n: 7, name: "Ayudar a los jóvenes sin inflar precios", min: 650, max: 750, eje: "Proteger el acceso", color: C.ink[800] },
  { id: "m8", n: 8, name: "Evitar que una emergencia termine en desahucio", min: 400, max: 500, eje: "Proteger el acceso", color: C.ink[500] },
];

// Distribución temporal (secc. 7). Los años intermedios de cada tramo se
// reparten a partes iguales solo para poder dibujar la barra: la fuente
// da una media por periodo, no una cifra anual exacta año a año.
const TIMELINE = [
  { year: "2027", min: 6000, max: 8000, note: "Crear estructuras, iniciar adquisiciones, preparar suelo, lanzar rehabilitaciones." },
  { year: "2028", min: 8000, max: 10000, note: "Ampliar programas, iniciar nuevas promociones, extender la intermediación." },
  { year: "2029", min: 11000, max: 13000, tramo: true },
  { year: "2030", min: 11000, max: 13000, tramo: true },
  { year: "2031", min: 11000, max: 13000, tramo: true },
  { year: "2032", min: 11000, max: 13000, tramo: true },
  { year: "2033", min: 11000, max: 13000, tramo: true },
  { year: "2034", min: 11000, max: 13000, tramo: true, note: "2029–2034: fase de máxima construcción y consolidación del alquiler seguro (media del periodo)." },
  { year: "2035", min: 10000, max: 12000, tramo2: true },
  { year: "2036", min: 10000, max: 12000, tramo2: true, note: "2035–2036: finalizar promociones, evaluar resultados, preparar continuidad (media del periodo)." },
];

const SCENARIOS = {
  min: { label: "Mínimo", total: 10000, factor: 10000 / 11000, desc: "Prioriza parque público, suelo preparado, rehabilitación, alquiler seguro y emergencias residenciales." },
  central: { label: "Central", total: 11000, factor: 1, desc: "Permite ampliar simultáneamente todas las líneas y mantener una reserva suficiente." },
  max: { label: "Máximo", total: 12000, factor: 12000 / 11000, desc: "Solo debería alcanzarse cuando exista capacidad real para ejecutar los proyectos con calidad y control." },
};

const DOUBLE_COUNT_RULES = [
  "Una transferencia del Estado a una comunidad autónoma se cuenta una sola vez en el gasto consolidado.",
  "El valor completo de una garantía no se muestra como gasto ya ejecutado.",
  "Los préstamos recuperables se separan de las subvenciones.",
  "El valor del suelo público cedido se muestra aparte del gasto presupuestario.",
  "Los incentivos fiscales se cuantifican como menor recaudación estimada, no como gasto directo.",
  "La inversión privada movilizada no se presenta como gasto público.",
  "Viviendas anunciadas, iniciadas, terminadas, entregadas y ocupadas son categorías distintas — no se suman entre sí.",
];

const eur = (n) => Math.round(n).toLocaleString("es-ES");

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl px-3 py-2 shadow-lg border text-xs" style={{ backgroundColor: "#fff", borderColor: C.ink[100] }}>
      <div className="font-semibold mb-0.5" style={{ color: C.ink[800] }}>{d.fullName || d.name}</div>
      <div style={{ color: C.ink[500] }}>{eur(d.min)}–{eur(d.max)} M€/año</div>
    </div>
  );
}

function TimelineTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl px-3 py-2 shadow-lg border text-xs max-w-[220px]" style={{ backgroundColor: "#fff", borderColor: C.ink[100] }}>
      <div className="font-semibold mb-0.5" style={{ color: C.ink[800] }}>{label}</div>
      <div className="mb-1" style={{ color: C.brand[700] }}>{eur(d.min)}–{eur(d.max)} M€</div>
      {d.note && <div style={{ color: C.ink[500] }}>{d.note}</div>}
    </div>
  );
}

export default function DesgloseEconomico() {
  const [view, setView] = useState("lineas"); // 'lineas' | 'medidas'
  const [scenario, setScenario] = useState("central");
  const [openInfo, setOpenInfo] = useState(false);
  const [hoverId, setHoverId] = useState(null);

  const f = SCENARIOS[scenario].factor;
  const items = view === "lineas" ? LINES : MEASURES;

  const pieData = useMemo(
    () => items.map((it) => ({
      name: view === "lineas" ? it.name : `${it.n}. ${it.name}`,
      fullName: it.name,
      value: ((it.min + it.max) / 2) * f,
      min: it.min * f,
      max: it.max * f,
      color: it.color,
      id: it.id,
    })),
    [items, f, view]
  );

  const scenarioTotal = SCENARIOS[scenario].total;
  const pibPct = ((scenarioTotal / PIB_2025) * 100).toFixed(2);

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#ffffff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* ---------- HEADER ---------- */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: C.brand[50], color: C.brand[700] }}>Vivienda · Plan Vivienda 2036</span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full border" style={{ borderColor: C.ink[200], color: C.ink[500] }}>Versión 0.1 · borrador</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-2" style={{ color: C.ink[800] }}>Desglose económico completo</h1>
        <p className="text-base max-w-2xl mb-8" style={{ color: C.ink[500] }}>
          Estimación orientativa del borrador de Convoca. No es un presupuesto público aprobado — es el esfuerzo consolidado de Estado, comunidades autónomas, ayuntamientos y entidades públicas de suelo y vivienda.
        </p>

        {/* ---------- SELECTOR DE ESCENARIO ---------- */}
        <div className="rounded-3xl p-6 sm:p-8 mb-8" style={{ background: `linear-gradient(135deg, ${C.brand[700]} 0%, ${C.brand[800]} 100%)` }}>
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.brand[100] }}>Inversión media anual</div>
              <div className="text-5xl font-bold text-white tabular-nums">{eur(scenarioTotal)} <span className="text-2xl font-medium">M€</span></div>
              <div className="text-sm mt-1" style={{ color: C.brand[100] }}>≈ {pibPct} % del PIB español de 2025</div>
            </div>
            <div className="flex rounded-full p-1" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
              {Object.entries(SCENARIOS).map(([key, s]) => (
                <button
                  key={key}
                  onClick={() => setScenario(key)}
                  className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: scenario === key ? "#fff" : "transparent",
                    color: scenario === key ? C.brand[700] : "#fff",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-sm" style={{ color: C.brand[100] }}>{SCENARIOS[scenario].desc}</p>
          <div className="flex flex-wrap gap-6 mt-6 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}>
            <div>
              <div className="text-xs font-medium" style={{ color: C.brand[100] }}>Inversión total 2027–2036</div>
              <div className="text-xl font-bold text-white">{eur(scenarioTotal * 10)} M€</div>
            </div>
            <div>
              <div className="text-xs font-medium" style={{ color: C.brand[100] }}>Objetivo de referencia</div>
              <div className="text-xl font-bold text-white">Parque público al 5 % en 2036</div>
            </div>
          </div>
        </div>
        <p className="text-xs mb-10 flex items-start gap-1.5" style={{ color: C.ink[500] }}>
          <Info size={13} className="flex-shrink-0 mt-0.5" />
          Los importes por línea y por medida se escalan de forma proporcional según el escenario elegido, a partir del reparto central. El reparto exacto que tendría cada escenario mínimo o máximo no está detallado en la fuente — es una visualización ilustrativa, no una previsión oficial.
        </p>

        {/* ---------- GRÁFICO PRINCIPAL: DONUT + LISTA ---------- */}
        <section className="mb-14">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <h2 className="text-2xl font-bold" style={{ color: C.ink[800] }}>¿En qué se invierte?</h2>
            <div className="flex rounded-full p-1 border" style={{ borderColor: C.ink[100] }}>
              {[["lineas", "Por línea presupuestaria"], ["medidas", "Por medida"]].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{ backgroundColor: view === key ? C.ink[800] : "transparent", color: view === key ? "#fff" : C.ink[500] }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="h-[300px] sm:h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="58%"
                    outerRadius="90%"
                    paddingAngle={2}
                    onMouseEnter={(_, i) => setHoverId(pieData[i].id)}
                    onMouseLeave={() => setHoverId(null)}
                  >
                    {pieData.map((d) => (
                      <Cell key={d.id} fill={d.color} opacity={hoverId && hoverId !== d.id ? 0.35 : 1} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              {pieData.map((d) => (
                <div
                  key={d.id}
                  onMouseEnter={() => setHoverId(d.id)}
                  onMouseLeave={() => setHoverId(null)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all"
                  style={{ backgroundColor: hoverId === d.id ? C.ink[50] : "transparent" }}
                >
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="flex-1 text-sm font-medium" style={{ color: C.ink[800] }}>{d.name}</span>
                  <span className="text-sm font-semibold tabular-nums whitespace-nowrap" style={{ color: C.ink[700] }}>
                    {eur(d.min)}–{eur(d.max)} M€
                  </span>
                </div>
              ))}
            </div>
          </div>

          {view === "lineas" && (
            <div className="mt-8 space-y-2">
              {LINES.map((l) => (
                <LineDetail key={l.id} line={l} active={hoverId === l.id} />
              ))}
            </div>
          )}
        </section>

        {/* ---------- LÍNEA TEMPORAL ---------- */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold mb-1" style={{ color: C.ink[800] }}>Distribución temporal</h2>
          <p className="text-sm mb-6" style={{ color: C.ink[500] }}>Implantación progresiva 2027–2036. Total decenal: 100.000–120.000 M€.</p>

          <div className="h-[280px] mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={TIMELINE} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.ink[100]} vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: C.ink[500] }} axisLine={{ stroke: C.ink[100] }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: C.ink[500] }} axisLine={false} tickLine={false} width={50} />
                <Tooltip content={<TimelineTooltip />} cursor={{ fill: C.ink[50] }} />
                <Bar dataKey="max" radius={[6, 6, 0, 0]}>
                  {TIMELINE.map((d, i) => (
                    <Cell key={i} fill={d.tramo || d.tramo2 ? C.brand[300] : C.brand[700]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs flex items-start gap-1.5" style={{ color: C.ink[500] }}>
            <Info size={13} className="flex-shrink-0 mt-0.5" />
            Se muestra el límite superior de cada tramo. 2029–2034 y 2035–2036 son medias por periodo repartidas a partes iguales para poder dibujarlas año a año — la fuente no da una cifra distinta para cada uno de esos años.
          </p>
        </section>

        {/* ---------- QUÉ NO SE CONTABILIZA DOS VECES ---------- */}
        <section className="mb-14">
          <button onClick={() => setOpenInfo((v) => !v)} className="w-full flex items-center justify-between rounded-2xl border p-4 sm:p-5" style={{ borderColor: C.ink[100] }}>
            <div className="text-left">
              <h2 className="text-lg font-bold" style={{ color: C.ink[800] }}>Qué no debe contabilizarse dos veces</h2>
              <p className="text-xs mt-0.5" style={{ color: C.ink[500] }}>Reglas del borrador para evitar cifras infladas o engañosas</p>
            </div>
            {openInfo ? <ChevronUp size={20} style={{ color: C.ink[500] }} /> : <ChevronDown size={20} style={{ color: C.ink[500] }} />}
          </button>
          {openInfo && (
            <ul className="mt-3 space-y-2 pl-1">
              {DOUBLE_COUNT_RULES.map((r, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: C.ink[700] }}>
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: C.brand[600] }} />
                  {r}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="text-center text-xs pt-6 border-t" style={{ color: C.ink[500], borderColor: C.ink[100] }}>
          Prototipo de diseño e interacción — laboratorio de producto CONVOCA. Datos reales del Plan Vivienda 2036 v0.1. No listo para copiarse directamente a producción.
        </div>
      </div>
    </div>
  );
}

function LineDetail({ line, active }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border overflow-hidden transition-all" style={{ borderColor: active ? line.color : C.ink[100] }}>
      <button onClick={() => setOpen((v) => !v)} className="w-full text-left p-4 flex items-center gap-3 hover:bg-black/[0.015]">
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: line.color }} />
        <span className="flex-1 text-sm font-semibold" style={{ color: C.ink[800] }}>{line.name}</span>
        {open ? <ChevronUp size={16} style={{ color: C.ink[500] }} /> : <ChevronDown size={16} style={{ color: C.ink[500] }} />}
      </button>
      {open && (
        <div className="px-4 pb-4 pl-[calc(1rem+1.125rem)] space-y-2">
          <p className="text-xs" style={{ color: C.ink[700] }}>{line.desc}</p>
          <p className="text-xs italic" style={{ color: C.ink[500] }}>{line.note}</p>
        </div>
      )}
    </div>
  );
}
