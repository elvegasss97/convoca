/**
 * REFERENCIA DE DISEÑO — no es código de producción.
 *
 * Representa: rediseño aprobado de la sección "Calendario" del Plan Vivienda
 * 2036 (/pulso/soluciones/vivienda-plan-vivienda-2036).
 * Fecha de esta copia: 2026-08-05.
 *
 * Prototipo en React entregado por el usuario como referencia de diseño e
 * interacción ya aprobada. La implementación real vive en
 * src/lib/components/pulso/CalendarioVisual.svelte (+ subcomponentes) usando
 * Svelte + Tailwind v4, no este código.
 *
 * Los datos (fases, entregables de los 100 días, matriz medida×fase×estado)
 * son reales: fases y entregables ya vivían en topic_timeline_phases; la
 * matriz medida×fase×estado se validó con el usuario y se migró a la tabla
 * topic_measure_phase_status (ver supabase/migrations). Este archivo no se
 * usa para leer datos, solo como referencia visual congelada.
 */
import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, ArrowRight } from "lucide-react";

/* ============================================================
   TOKENS reales del proyecto
   ============================================================ */
const C = {
  brand: { 50: "#eefaf7", 100: "#d2f1e9", 300: "#72cebb", 600: "#1a786a", 700: "#176056", 800: "#164d46" },
  accent: { 50: "#fdf6ee", 100: "#fbe8d2", 300: "#f0ac68", 600: "#ba531b", 700: "#953f19" },
  warning: { 50: "#fffbeb", 100: "#fef3c7", 300: "#fcd34d", 500: "#d99400", 700: "#8a5c02" },
  ink: { 50: "#f7f6f4", 100: "#ece9e4", 200: "#dad4ca", 500: "#8a7a63", 700: "#463c2c", 800: "#2c2519" },
};

/* ============================================================
   DATOS REALES — secciones 4.4 y 7 del export
   ============================================================ */

const PHASES = [
  { id: "p1", label: "100 días", title: "Primeros 100 días", years: "2027", tag: "Arranque, no ejecución",
    desc: "Constituir el órgano de coordinación institucional y, a partir de ahí, iniciar, presentar y poner en marcha los primeros pilotos — no ejecutar transformaciones estructurales completas ni desplegar sistemas nacionales ya terminados." },
  { id: "p2", label: "2027–28", title: "Fase 1 — Crear la base", years: "2027–2028", tag: "Preparación",
    desc: "Elaborar el mapa de necesidad residencial, completar inventarios de suelo y vivienda pública, preparar proyectos, reforzar administraciones, lanzar programas piloto, iniciar compras y rehabilitaciones, establecer reglas de permanencia y transparencia." },
  { id: "p3", label: "2029–31", title: "Fase 2 — Ampliar", years: "2029–2031", tag: "Despliegue",
    desc: "Aumentar la construcción, incorporar promociones terminadas, extender el alquiler seguro, movilizar vivienda vacía, aplicar regulación territorial, evaluar los primeros resultados y modificar programas ineficaces." },
  { id: "p4", label: "2032–34", title: "Fase 3 — Consolidar", years: "2032–2034", tag: "Consolidación",
    desc: "Mantener un ritmo estable de incorporación de viviendas, mejorar el mantenimiento, corregir diferencias territoriales, ampliar los programas que funcionen, retirar ayudas que estén inflando precios, reforzar la prevención de emergencias." },
  { id: "p5", label: "2035–36", title: "Fase 4 — Evaluar y garantizar continuidad", years: "2035–2036", tag: "Evaluación",
    desc: "Medir el crecimiento real del parque público, comparar hogares creados y viviendas terminadas, auditar todo el periodo, publicar éxitos, fallos y costes, y determinar qué medidas deben continuar después de 2036." },
];

const ENTREGABLES_100D = [
  "Constituir el órgano de coordinación institucional (Conferencia o Comisión de Ejecución del Plan Vivienda 2036) y celebrar su primera sesión, con acuerdos publicados.",
  "Aprobar un modelo común inicial de datos para el parque público e iniciar el inventario.",
  "Iniciar el inventario de suelo y edificios públicos con criterios comunes.",
  "Someter a consulta una metodología inicial para el mapa de necesidad residencial.",
  "Presentar los anteproyectos de las reformas normativas de protección permanente.",
  "Abrir formalmente la negociación del marco financiero plurianual entre administraciones.",
  "Publicar las bases del programa de alquiler seguro y seleccionar los primeros territorios piloto.",
  "Aprobar un protocolo marco inicial para la emergencia residencial e iniciar su prueba en territorios piloto.",
  "Publicar una primera cartera de proyectos maduros, diferenciándolos de los todavía en preparación.",
  "Publicar una primera versión mínima del portal de transparencia.",
  "Definir los indicadores, las fuentes de información y una línea base provisional de evaluación.",
];

const MEASURES = [
  { id: "m1", n: 1, name: "Crear un parque público que nunca pueda venderse", eje: "Construir más vivienda", color: C.brand[700],
    phases: { p1: "Preparación", p2: "Piloto", p3: "Despliegue", p4: "Despliegue", p5: "Consolidación" } },
  { id: "m2", n: 2, name: "Construir mucho más donde realmente hace falta", eje: "Construir más vivienda", color: C.brand[300],
    phases: { p1: "Preparación", p2: "Preparación", p3: "Despliegue", p4: "Despliegue", p5: "Consolidación" } },
  { id: "m3", n: 3, name: "Un alquiler seguro para las dos partes", eje: "Mejorar el alquiler", color: C.accent[600],
    phases: { p1: "Piloto", p2: "Piloto", p3: "Despliegue", p4: "Consolidación" } },
  { id: "m4", n: 4, name: "Contener precios mientras llega nueva oferta", eje: "Mejorar el alquiler", color: C.accent[300],
    phases: { p2: "Despliegue", p3: "Evaluación", p4: "Evaluación", p5: "Consolidación" } },
  { id: "m5", n: 5, name: "Movilizar vivienda vacía", eje: "Aprovechar lo que ya existe", color: C.warning[700],
    phases: { p2: "Piloto", p3: "Consolidación" } },
  { id: "m6", n: 6, name: "Regular pisos turísticos barrio por barrio", eje: "Aprovechar lo que ya existe", color: C.warning[300],
    phases: { p2: "Despliegue", p3: "Despliegue", p4: "Evaluación", p5: "Evaluación" } },
  { id: "m7", n: 7, name: "Ayudar a los jóvenes sin inflar precios", eje: "Proteger el acceso", color: C.ink[800],
    phases: { p2: "Piloto", p3: "Despliegue", p4: "Consolidación" } },
  { id: "m8", n: 8, name: "Evitar que una emergencia termine en desahucio", eje: "Proteger el acceso", color: C.ink[500],
    phases: { p1: "Piloto", p2: "Despliegue", p3: "Despliegue", p4: "Consolidación", p5: "Evaluación" } },
];

const STATUS = {
  "Preparación": { bg: C.ink[100], fg: C.ink[700], dot: C.ink[500] },
  "Piloto": { bg: C.accent[100], fg: C.accent[700], dot: C.accent[600] },
  "Despliegue": { bg: C.brand[100], fg: C.brand[700], dot: C.brand[600] },
  "Consolidación": { bg: C.brand[700], fg: "#fff", dot: C.brand[800] },
  "Evaluación": { bg: C.warning[100], fg: C.warning[700], dot: C.warning[500] },
};
const STATUS_ORDER = ["Preparación", "Piloto", "Despliegue", "Consolidación", "Evaluación"];

/* ============================================================
   HELPERS
   ============================================================ */
function phaseStatusCounts(phaseId) {
  const counts = {};
  STATUS_ORDER.forEach((s) => (counts[s] = 0));
  MEASURES.forEach((m) => {
    const st = m.phases[phaseId];
    if (st) counts[st] += 1;
  });
  return STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => ({ status: s, count: counts[s] }));
}

export default function CalendarioVisual() {
  const [activePhase, setActivePhase] = useState("p1");
  const [ganttHover, setGanttHover] = useState(null); // {measureId, phaseId}
  const [openDeliverables, setOpenDeliverables] = useState(false);
  const [expandedMeasure, setExpandedMeasure] = useState(null);

  const phase = PHASES.find((p) => p.id === activePhase);
  const activeMeasures = useMemo(
    () => MEASURES.filter((m) => m.phases[activePhase]).map((m) => ({ ...m, status: m.phases[activePhase] })),
    [activePhase]
  );
  const counts = useMemo(() => phaseStatusCounts(activePhase), [activePhase]);

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#ffffff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* ---------- HEADER ---------- */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: C.brand[50], color: C.brand[700] }}>Vivienda · Plan Vivienda 2036</span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full border" style={{ borderColor: C.ink[200], color: C.ink[500] }}>Versión 0.1 · borrador</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-2" style={{ color: C.ink[800] }}>Calendario del plan</h1>
        <p className="text-base max-w-2xl mb-10" style={{ color: C.ink[500] }}>
          Diez años, cinco etapas. Cada medida avanza por su propio recorrido — de la preparación al piloto, el despliegue, la consolidación o la evaluación — sin forzar que todas pasen por el mismo camino.
        </p>

        {/* ---------- CRONOLOGÍA (stepper horizontal) ---------- */}
        <section className="mb-4">
          <div className="relative">
            {/* línea conectora */}
            <div className="absolute top-5 left-0 right-0 h-0.5" style={{ backgroundColor: C.ink[100] }} />
            <div className="relative grid grid-cols-5 gap-1 sm:gap-2">
              {PHASES.map((p, i) => {
                const active = activePhase === p.id;
                return (
                  <button key={p.id} onClick={() => setActivePhase(p.id)} className="flex flex-col items-center group">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold z-10 transition-all duration-200 border-4"
                      style={{
                        backgroundColor: active ? C.brand[700] : "#fff",
                        borderColor: active ? C.brand[700] : C.ink[200],
                        color: active ? "#fff" : C.ink[500],
                        transform: active ? "scale(1.15)" : "scale(1)",
                      }}
                    >
                      {i + 1}
                    </div>
                    <div className="mt-2 text-center">
                      <div className="text-xs font-bold whitespace-nowrap" style={{ color: active ? C.brand[700] : C.ink[700] }}>{p.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------- PANEL DE FASE ACTIVA ---------- */}
        <section className="mb-14">
          <div className="rounded-3xl p-6 sm:p-8" style={{ background: `linear-gradient(135deg, ${C.brand[50]} 0%, #ffffff 70%)`, border: `1px solid ${C.ink[100]}` }}>
            <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: C.brand[700] }}>{phase.years} · {phase.tag}</div>
                <h2 className="text-2xl font-bold" style={{ color: C.ink[800] }}>{phase.title}</h2>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {counts.map((c) => (
                  <span key={c.status} className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: STATUS[c.status].bg, color: STATUS[c.status].fg }}>
                    {c.count} en {c.status.toLowerCase()}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-sm mb-6" style={{ color: C.ink[700] }}>{phase.desc}</p>

            <div className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: C.ink[500] }}>Medidas activas en esta etapa</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {activeMeasures.map((m) => (
                <div key={m.id} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-white border" style={{ borderColor: C.ink[100] }}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: `${m.color}1a`, color: m.color }}>{m.n}</span>
                  <span className="flex-1 text-sm font-medium" style={{ color: C.ink[800] }}>{m.name}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS[m.status].bg, color: STATUS[m.status].fg }}>{m.status}</span>
                </div>
              ))}
              {activeMeasures.length === 0 && (
                <p className="text-sm italic" style={{ color: C.ink[500] }}>Sin actuaciones específicas documentadas en esta etapa.</p>
              )}
            </div>

            {activePhase === "p1" && (
              <div className="mt-6 pt-5" style={{ borderTop: `1px solid ${C.ink[100]}` }}>
                <button onClick={() => setOpenDeliverables((v) => !v)} className="text-sm font-semibold flex items-center gap-1.5" style={{ color: C.brand[700] }}>
                  {openDeliverables ? "Ocultar" : "Ver"} los 11 entregables de los primeros 100 días {openDeliverables ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
                {openDeliverables && (
                  <ol className="mt-3 space-y-2">
                    {ENTREGABLES_100D.map((e, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: C.ink[700] }}>
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ backgroundColor: C.brand[100], color: C.brand[700] }}>{i + 1}</span>
                        {e}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ---------- GANTT ---------- */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold mb-1" style={{ color: C.ink[800] }}>Las 8 medidas, de un vistazo</h2>
          <p className="text-sm mb-6" style={{ color: C.ink[500] }}>Cada medida sigue su propio recorrido: no todas pasan por los cinco estados ni empiezan en la misma etapa.</p>

          {/* leyenda */}
          <div className="flex flex-wrap gap-2 mb-5">
            {STATUS_ORDER.map((s) => (
              <span key={s} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: C.ink[700] }}>
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STATUS[s].dot }} />
                {s}
              </span>
            ))}
          </div>

          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="min-w-[640px]">
              {/* cabecera */}
              <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: "200px repeat(5, 1fr)" }}>
                <div />
                {PHASES.map((p) => (
                  <div key={p.id} className="text-center text-xs font-bold pb-2" style={{ color: activePhase === p.id ? C.brand[700] : C.ink[500] }}>
                    {p.label}
                  </div>
                ))}
              </div>

              {/* filas */}
              <div className="space-y-1.5">
                {MEASURES.map((m) => {
                  const isOpen = expandedMeasure === m.id;
                  return (
                    <div key={m.id}>
                      <div
                        className="grid gap-1 items-center cursor-pointer rounded-lg"
                        style={{ gridTemplateColumns: "200px repeat(5, 1fr)" }}
                        onClick={() => setExpandedMeasure(isOpen ? null : m.id)}
                      >
                        <div className="flex items-center gap-2 pr-2 py-1.5">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: `${m.color}1a`, color: m.color }}>{m.n}</span>
                          <span
                            className="text-xs font-semibold leading-tight"
                            style={{ color: C.ink[800], display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                          >
                            {m.name}
                          </span>
                        </div>
                        {PHASES.map((p) => {
                          const st = m.phases[p.id];
                          const hovered = ganttHover?.measureId === m.id || ganttHover?.phaseId === p.id;
                          return (
                            <div
                              key={p.id}
                              onMouseEnter={() => setGanttHover({ measureId: m.id, phaseId: p.id })}
                              onMouseLeave={() => setGanttHover(null)}
                              className="h-8 rounded-md flex items-center justify-center transition-all duration-150"
                              style={{
                                backgroundColor: st ? STATUS[st].bg : C.ink[50],
                                opacity: !st ? 0.4 : ganttHover && !hovered ? 0.45 : 1,
                                border: activePhase === p.id ? `1.5px solid ${C.brand[300]}` : "1.5px solid transparent",
                              }}
                              title={st ? `${m.name} — ${p.label}: ${st}` : undefined}
                            >
                              {st && <span className="text-[10px] font-bold hidden sm:inline" style={{ color: STATUS[st].fg }}>{st.slice(0, 4)}</span>}
                            </div>
                          );
                        })}
                      </div>
                      {isOpen && (
                        <div className="ml-7 mt-1 mb-2 rounded-xl px-3 py-2.5 text-xs flex items-center gap-2 flex-wrap" style={{ backgroundColor: C.ink[50], color: C.ink[700] }}>
                          <span className="font-semibold" style={{ color: C.ink[800] }}>{m.eje}</span>
                          <ArrowRight size={12} />
                          {PHASES.filter((p) => m.phases[p.id]).map((p, i, arr) => (
                            <span key={p.id} className="flex items-center gap-1">
                              <span className="px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: STATUS[m.phases[p.id]].bg, color: STATUS[m.phases[p.id]].fg }}>
                                {p.label}: {m.phases[p.id]}
                              </span>
                              {i < arr.length - 1 && <ArrowRight size={11} style={{ color: C.ink[500] }} />}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ---------- DISTRIBUCIÓN DE ESTADOS POR ETAPA ---------- */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-1" style={{ color: C.ink[800] }}>Cuántas medidas hay en cada estado</h2>
          <p className="text-sm mb-6" style={{ color: C.ink[500] }}>Preparación → Piloto → Despliegue → Consolidación → Evaluación. No todas las medidas pasan por todos los estados.</p>
          <div className="grid grid-cols-5 gap-2 sm:gap-4">
            {PHASES.map((p) => {
              const c = phaseStatusCounts(p.id);
              const total = c.reduce((s, x) => s + x.count, 0);
              return (
                <button key={p.id} onClick={() => setActivePhase(p.id)} className="text-center group">
                  <div className="text-xs font-bold mb-2" style={{ color: activePhase === p.id ? C.brand[700] : C.ink[700] }}>{p.label}</div>
                  <div className="h-28 rounded-xl overflow-hidden flex flex-col-reverse border" style={{ borderColor: C.ink[100] }}>
                    {c.map((x) => (
                      <div key={x.status} title={`${x.status}: ${x.count}`} style={{ height: `${(x.count / total) * 100}%`, backgroundColor: STATUS[x.status].dot }} />
                    ))}
                  </div>
                  <div className="text-xs mt-1.5" style={{ color: C.ink[500] }}>{total} medida{total !== 1 ? "s" : ""}</div>
                </button>
              );
            })}
          </div>
        </section>

        <div className="text-center text-xs pt-6 border-t" style={{ color: C.ink[500], borderColor: C.ink[100] }}>
          Prototipo de diseño e interacción — laboratorio de producto CONVOCA. Datos reales del Plan Vivienda 2036 v0.1. No listo para copiarse directamente a producción.
        </div>
      </div>
    </div>
  );
}
