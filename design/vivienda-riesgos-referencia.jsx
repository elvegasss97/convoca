/**
 * REFERENCIA DE DISEÑO — no es código de producción.
 *
 * Representa: rediseño aprobado de la sección "Riesgos y comprobación" del
 * Plan Vivienda 2036 (/pulso/soluciones/vivienda-plan-vivienda-2036).
 * Fecha de esta copia: 2026-08-05.
 *
 * Prototipo en React entregado por el usuario como referencia de diseño e
 * interacción ya aprobada. La implementación real vive en
 * src/lib/components/pulso/RiesgosComprobacion.svelte (+ subcomponentes)
 * usando Svelte + Tailwind v4, no este código.
 *
 * Los 15 riesgos y sus 4 campos, y los 69 indicadores en 7 categorías, ya
 * vivían estructurados en Supabase antes de esta iteración (topic_risks y
 * topic.success_indicators) y se verificaron idénticos a este artifact. La
 * categoría de cada riesgo (5 categorías) existía como mapa hardcodeado en
 * +page.svelte y se migró a topic_risks.category. Los 4 momentos de
 * evaluación y las 3 condiciones de ampliar/modificar/suspender existían
 * como texto narrativo en topic.evaluation_rules y se migraron a
 * topic_evaluation_moments / topic_measure_change_conditions — ver
 * supabase/migrations. Este archivo no se usa para leer datos.
 */
import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, AlertTriangle, TrendingUp, Search, RefreshCcw, Calendar, CalendarClock, CalendarCheck2, CalendarRange } from "lucide-react";

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
   DATOS REALES — sección 8 del export EXPORT_PLAN_VIVIENDA_CLAUDE.md
   ============================================================ */

const CATEGORIES = [
  { id: "ejecucion", name: "Ejecución y presupuesto", color: C.brand },
  { id: "territorio", name: "Territorio y planificación", color: C.accent },
  { id: "mercado", name: "Mercado y acceso", color: C.warning },
  { id: "integridad", name: "Integridad y datos", color: C.ink },
  { id: "juridico", name: "Continuidad jurídica y política", color: C.brand },
];

const RISKS = [
  { id: "r1", cat: "ejecucion", title: "Retrasos y falta de capacidad administrativa",
    consists: "El volumen de proyectos, licencias, contratos, rehabilitaciones y adjudicaciones podría superar la capacidad técnica de algunas administraciones.",
    signals: "Baja ejecución presupuestaria, licencias acumuladas, concursos desiertos, proyectos detenidos, aumento de los plazos.",
    mitigation: "Reforzar equipos técnicos, simplificar procedimientos sin eliminar controles, preparar proyectos antes de asignar fondos, asistencia a municipios pequeños.",
    decision: "Reprogramar las actuaciones, trasladar recursos a proyectos ejecutables, reforzar la administración responsable, evitar anunciar nuevas promociones hasta recuperar capacidad." },
  { id: "r2", cat: "ejecucion", title: "Sobrecostes",
    consists: "El precio del suelo, los materiales, la energía, la financiación o las modificaciones de obra podrían elevar el coste final y reducir el número de viviendas alcanzable.",
    signals: "Desviaciones repetidas respecto al presupuesto inicial, contratos modificados, obras paralizadas.",
    mitigation: "Actualizar estimaciones, incluir márgenes razonables, comparar costes entre proyectos, auditorías técnicas.",
    decision: "Revisar el diseño o alcance del proyecto, renegociar cuando sea posible, priorizar actuaciones con mayor impacto, suspender proyectos cuyo coste deje de ser justificable." },
  { id: "r3", cat: "ejecucion", title: "Falta de mantenimiento del parque público",
    consists: "Ampliar el parque sin reservar recursos para conservarlo puede provocar deterioro, viviendas inhabitables y un coste mayor a largo plazo.",
    signals: "Aumento de averías, humedad, problemas de accesibilidad, viviendas cerradas por mal estado.",
    mitigation: "Planes preventivos, presupuestos específicos, inspecciones periódicas, canales claros para comunicar incidencias.",
    decision: "Priorizar rehabilitación frente a nuevas incorporaciones hasta recuperar niveles adecuados de conservación y revisar el modelo de gestión." },
  { id: "r4", cat: "ejecucion", title: "Sostenibilidad presupuestaria",
    consists: "Mantener la inversión propuesta podría resultar difícil durante una crisis económica, una caída de ingresos públicos o un aumento de otras necesidades urgentes.",
    signals: "Déficit creciente del programa, pagos retrasados, fondos comprometidos sin financiación.",
    mitigation: "Presupuestos plurianuales, escenarios económicos alternativos, límites de coste, revisión bienal.",
    decision: "Priorizar mantenimiento, emergencias y proyectos ya iniciados; ralentizar o redimensionar nuevas actuaciones; evitar compromisos sin financiación." },
  { id: "r5", cat: "territorio", title: "Escasez de suelo preparado",
    consists: "Puede existir suelo clasificado como disponible que todavía carezca de urbanización, servicios, transporte, planeamiento aprobado o viabilidad técnica.",
    signals: "Proyectos anunciados que no comienzan, costes elevados de urbanización, falta de suministros, problemas de titularidad.",
    mitigation: "Diferenciar suelo identificado de suelo realmente preparado, completar estudios antes de anunciar viviendas.",
    decision: "No contabilizar ese suelo como capacidad inmediata, revisar el calendario y trasladar la actuación a otra ubicación o modalidad." },
  { id: "r6", cat: "territorio", title: "Construcción en territorios sin demanda suficiente",
    consists: "Un reparto basado principalmente en cuotas políticas podría producir vivienda donde no existe demanda estable mientras continúa la escasez en las zonas tensionadas.",
    signals: "Promociones con pocas solicitudes, viviendas nuevas vacías, pérdida de población.",
    mitigation: "Utilizar información territorial actualizada sobre hogares, empleo, precios y servicios antes de aprobar cada promoción.",
    decision: "Detener nuevas fases, analizar usos alternativos, trasladar futuras inversiones hacia territorios con necesidad acreditada." },
  { id: "r7", cat: "territorio", title: "Diferencias territoriales de ejecución",
    consists: "La capacidad administrativa, disponibilidad de suelo y situación del mercado varían entre comunidades y municipios, por lo que el plan podría avanzar de forma muy desigual.",
    signals: "Diferencias persistentes en ejecución, plazos o costes; concentración de fondos en pocos territorios; zonas vulnerables que quedan rezagadas.",
    mitigation: "Apoyo técnico, publicar resultados comparables, adaptar los instrumentos a cada territorio sin rebajar los objetivos comunes.",
    decision: "Activar planes de refuerzo, revisar el reparto futuro, condicionar nuevas asignaciones a proyectos y mejoras concretas de ejecución." },
  { id: "r8", cat: "territorio", title: "Concentración y segregación residencial",
    consists: "Construir grandes concentraciones de vivienda pública en zonas aisladas o con pocos servicios podría aumentar la segregación y limitar oportunidades.",
    signals: "Concentración territorial excesiva, falta de transporte o centros educativos, deterioro de la convivencia.",
    mitigation: "Distribuir la vivienda asequible, combinar diferentes regímenes y perfiles, integrar las promociones en barrios existentes.",
    decision: "Modificar futuras promociones, invertir en equipamientos y conectividad, evitar nuevas concentraciones en la misma zona." },
  { id: "r9", cat: "mercado", title: "Traslado de ayudas a los precios",
    consists: "Cuando la oferta es escasa, parte de una ayuda al alquiler o a la compra puede acabar reflejándose en precios más altos en lugar de mejorar realmente el acceso.",
    signals: "Subidas superiores en viviendas cubiertas por ayudas, aumento del precio inmediatamente después de su concesión.",
    mitigation: "Limitar precios, vincular ayudas a oferta asequible o nueva, aplicar criterios territoriales, evaluar frente a zonas comparables.",
    decision: "Modificar, focalizar o retirar la ayuda y trasladar los recursos hacia aumento de oferta, vivienda pública o rehabilitación." },
  { id: "r10", cat: "mercado", title: "Reducción o desplazamiento de la oferta de alquiler",
    consists: "Una regulación mal diseñada podría provocar que viviendas residenciales se vendan, permanezcan vacías o se trasladen al alquiler temporal o turístico.",
    signals: "Caída de anuncios residenciales, aumento de contratos temporales, crecimiento de viviendas turísticas.",
    mitigation: "Acompañar la regulación con intermediación, garantías, inspección, seguridad jurídica y evaluaciones territoriales frecuentes.",
    decision: "Revisar el diseño de la medida, corregir vacíos normativos, reforzar los incentivos para recuperar oferta residencial estable." },
  { id: "r11", cat: "integridad", title: "Fraude y manipulación de registros",
    consists: "Podrían producirse solicitudes duplicadas, empadronamientos ficticios, declaraciones falsas, favoritismo en adjudicaciones o manipulación de los datos de ejecución.",
    signals: "Patrones anómalos, cambios injustificados de puntuación, expedientes incompletos, adjudicaciones repetidas.",
    mitigation: "Trazabilidad, separación de funciones, controles cruzados proporcionados, auditorías, canales protegidos de denuncia.",
    decision: "Suspender los expedientes afectados, investigar, corregir adjudicaciones cuando legalmente proceda, publicar las medidas adoptadas sin exponer datos personales." },
  { id: "r12", cat: "integridad", title: "Falta de datos fiables",
    consists: "Algunos registros pueden estar desactualizados, utilizar definiciones distintas o confundir viviendas anunciadas, financiadas, terminadas y ocupadas.",
    signals: "Cifras incompatibles entre administraciones, ausencia de línea de base, cambios metodológicos no explicados.",
    mitigation: "Establecer definiciones comunes, indicar fuente y fecha, publicar metodología, conservar series anteriores.",
    decision: "No presentar conclusiones como definitivas, marcar el dato como incompleto, posponer decisiones irreversibles hasta disponer de evidencia suficiente." },
  { id: "r13", cat: "integridad", title: "Incumplimiento de la protección permanente",
    consists: "Las viviendas financiadas públicamente podrían terminar vendiéndose, descalificándose o destinándose a usos incompatibles con su finalidad social.",
    signals: "Solicitudes de descalificación, ventas no autorizadas, alquiler turístico, viviendas vacías sin justificación.",
    mitigation: "Inscribir la protección, controles de transmisión, registros interoperables, inspecciones, cláusulas de devolución de ayudas.",
    decision: "Recuperar la vivienda o los fondos cuando corresponda, aplicar sanciones proporcionadas, corregir el mecanismo que permitió el incumplimiento." },
  { id: "r14", cat: "juridico", title: "Conflictos competenciales o jurídicos",
    consists: "La distribución de competencias entre Estado, comunidades autónomas y ayuntamientos podría generar recursos, bloqueos o normas incompatibles.",
    signals: "Informes jurídicos desfavorables, litigios, normas anuladas, convenios sin firmar, actuaciones detenidas por dudas competenciales.",
    mitigation: "Revisión jurídica previa, convenios claros, identificar la administración responsable, adaptar las medidas a la normativa aplicable.",
    decision: "Suspender la parte afectada, modificar su instrumento jurídico, mantener las actuaciones que puedan continuar legalmente." },
  { id: "r15", cat: "juridico", title: "Dependencia de cambios políticos",
    consists: "Un plan de diez años puede perder financiación, continuidad o prioridad tras cambios de gobierno o desacuerdos entre administraciones.",
    signals: "Reducciones presupuestarias, convenios no renovados, eliminación de equipos, proyectos paralizados.",
    mitigation: "Financiación plurianual, acuerdos entre administraciones, objetivos verificables, transparencia.",
    decision: "Publicar el impacto del cambio, proteger los proyectos avanzados, revisar el calendario, adaptar el alcance a la financiación realmente disponible." },
];

const INDICATOR_CATEGORIES = [
  { id: "A", name: "Parque público", items: ["Número total de viviendas públicas", "Viviendas incorporadas cada año", "Viviendas rehabilitadas", "Viviendas ocupadas", "Viviendas temporalmente vacías", "% del parque residencial que es público", "Distribución territorial", "Estado de conservación", "Coste de mantenimiento", "Tiempo medio de adjudicación"] },
  { id: "B", name: "Oferta de vivienda", items: ["Viviendas iniciadas", "Viviendas terminadas", "Viviendas entregadas", "Viviendas efectivamente ocupadas", "Creación neta de hogares", "Diferencia entre hogares y viviendas terminadas", "Suelo preparado", "Tiempo de concesión de licencias", "Coste de construcción", "% de vivienda asequible en nuevos desarrollos"] },
  { id: "C", name: "Alquiler", items: ["Oferta de alquiler residencial", "Renta mediana", "Renta por metro cuadrado", "Duración de contratos", "Esfuerzo económico", "Viviendas en bolsas públicas", "Diferencia entre renta del programa y mercado local", "Impagos", "Conflictos resueltos mediante mediación", "Alquileres temporales y turísticos"] },
  { id: "D", name: "Acceso y emancipación", items: ["Edad de emancipación", "Jóvenes beneficiarios", "Tiempo de espera", "Hogares con proporción elevada de ingresos en vivienda", "Personas sin hogar", "Solicitudes de vivienda pública", "Hogares atendidos por emergencia", "Permanencia en la vivienda tras recibir ayuda"] },
  { id: "E", name: "Prevención de desahucios", items: ["Casos detectados antes de la demanda", "Tiempo de primera respuesta", "Acuerdos de mediación", "Desahucios evitados", "Alternativas residenciales ofrecidas", "Deuda al iniciar la intervención", "Reincidencia", "Pequeños propietarios compensados", "Coste por caso"] },
  { id: "F", name: "Ejecución económica", items: ["Presupuesto inicial", "Presupuesto definitivo", "Obligaciones reconocidas", "Pagos efectuados", "Fondos no ejecutados", "Coste por vivienda iniciada", "Coste por vivienda terminada", "Coste por vivienda incorporada y ocupada", "Garantías concedidas", "Garantías ejecutadas", "Préstamos recuperables", "Inversión privada movilizada (mostrada por separado)"] },
  { id: "G", name: "Calidad y territorio", items: ["Acceso a transporte", "Acceso a centros educativos", "Acceso a centros sanitarios", "Eficiencia energética", "Accesibilidad", "Mezcla de vivienda pública y privada", "Concentración territorial", "Satisfacción de residentes", "Incidencias constructivas", "Estado de conservación"] },
];

const EVAL_MOMENTS = [
  { id: "anual", icon: Calendar, title: "Evaluación anual", freq: "Cada año", color: C.brand,
    desc: "Se publica: grado de ejecución, resultados, retrasos, sobrecostes, diferencias territoriales, medidas modificadas, proyectos cancelados y el motivo de las decisiones." },
  { id: "bienal", icon: CalendarRange, title: "Revisión bienal", freq: "Cada dos años", color: C.accent,
    desc: "Se revisa: presupuesto, distribución, capacidad de ejecución, evolución del mercado, efecto de las ayudas sobre precios, necesidad de mantener zonas tensionadas y sostenibilidad fiscal." },
  { id: "intermedia", icon: CalendarClock, title: "Evaluación intermedia", freq: "2031", color: C.warning,
    desc: "Evaluación completa que puede recomendar ampliar, modificar, reducir, sustituir o suspender una medida." },
  { id: "final", icon: CalendarCheck2, title: "Evaluación final", freq: "2036", color: C.ink,
    desc: "Compara los resultados con la línea de base de 2026: objetivos incumplidos, costes superiores a lo previsto, efectos no deseados, diferencias territoriales y aprendizajes para el siguiente periodo." },
];

const CONDITIONS = [
  { id: "ampliar", title: "Cuándo se amplía una medida", color: C.brand, icon: TrendingUp,
    items: ["Cumple sus objetivos", "Mantiene un coste razonable", "No genera efectos adversos graves", "Existe capacidad para ejecutarla"] },
  { id: "modificar", title: "Cuándo se modifica una medida", color: C.warning, icon: RefreshCcw,
    items: ["La ayuda se traslada a los precios", "Reduce significativamente la oferta residencial", "Genera discriminación", "No llega a los hogares previstos", "Tiene costes desproporcionados", "Existen grandes diferencias territoriales", "Aumenta el fraude"] },
  { id: "suspender", title: "Cuándo se suspende una medida", color: C.accent, icon: AlertTriangle,
    items: ["No existe evidencia de mejora", "Sus efectos adversos superan los beneficios", "No puede ejecutarse con garantías", "Incumple la normativa", "Duplica otro programa sin aportar valor"] },
];

const eur = (n) => n.toLocaleString("es-ES");

export default function RiesgosYComprobacion() {
  const [activeCat, setActiveCat] = useState(null);
  const [openRisk, setOpenRisk] = useState(null);
  const [activeIndCat, setActiveIndCat] = useState("A");
  const [query, setQuery] = useState("");

  const filteredRisks = useMemo(() => {
    let list = RISKS;
    if (activeCat) list = list.filter((r) => r.cat === activeCat);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((r) => r.title.toLowerCase().includes(q) || r.consists.toLowerCase().includes(q));
    }
    return list;
  }, [activeCat, query]);

  const catCount = (id) => RISKS.filter((r) => r.cat === id).length;
  const maxIndCount = Math.max(...INDICATOR_CATEGORIES.map((c) => c.items.length));
  const currentIndCat = INDICATOR_CATEGORIES.find((c) => c.id === activeIndCat);

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#ffffff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* ---------- HEADER ---------- */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: C.brand[50], color: C.brand[700] }}>Vivienda · Plan Vivienda 2036</span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full border" style={{ borderColor: C.ink[200], color: C.ink[500] }}>Versión 0.1 · borrador</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-2" style={{ color: C.ink[800] }}>Riesgos y comprobación</h1>
        <p className="text-base max-w-2xl mb-8" style={{ color: C.ink[500] }}>
          Un plan de diez años necesita reconocer qué puede salir mal, cómo se detecta a tiempo y qué se hace cuando ocurre — antes de que ocurra.
        </p>

        {/* ---------- HERO STATS ---------- */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          {[
            { n: "15", l: "riesgos identificados" },
            { n: "5", l: "categorías de riesgo" },
            { n: "69", l: "indicadores de seguimiento" },
            { n: "4", l: "momentos de evaluación" },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl p-4 text-center" style={{ backgroundColor: C.brand[50] }}>
              <div className="text-3xl font-bold" style={{ color: C.brand[700] }}>{s.n}</div>
              <div className="text-xs mt-1" style={{ color: C.ink[500] }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* ---------- MAPA DE RIESGOS ---------- */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold mb-1" style={{ color: C.ink[800] }}>Mapa de riesgos</h2>
          <p className="text-sm mb-6" style={{ color: C.ink[500] }}>Cada riesgo documenta en qué consiste, qué señales lo anticipan, cómo se reduce y qué se decide si llega a ocurrir.</p>

          {/* selector de categorías, tamaño proporcional al nº de riesgos */}
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => setActiveCat(null)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all"
              style={{ backgroundColor: !activeCat ? C.ink[800] : "#fff", color: !activeCat ? "#fff" : C.ink[700], borderColor: !activeCat ? C.ink[800] : C.ink[200] }}
            >
              Todos (15)
            </button>
            {CATEGORIES.map((cat) => {
              const n = catCount(cat.id);
              const active = activeCat === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(active ? null : cat.id)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all"
                  style={{
                    backgroundColor: active ? (cat.color[700] || cat.color[600]) : (cat.color[50] || cat.color[100]),
                    color: active ? "#fff" : (cat.color[700] || cat.color[600]),
                    borderColor: active ? (cat.color[700] || cat.color[600]) : "transparent",
                  }}
                >
                  {cat.name}
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]" style={{ backgroundColor: active ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.08)" }}>{n}</span>
                </button>
              );
            })}
          </div>

          <div className="relative mb-5">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.ink[500] }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar un riesgo…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm border outline-none"
              style={{ borderColor: C.ink[200], color: C.ink[800] }}
            />
          </div>

          <div className="space-y-2.5">
            {filteredRisks.map((r) => {
              const cat = CATEGORIES.find((c) => c.id === r.cat);
              const isOpen = openRisk === r.id;
              return (
                <div key={r.id} className="rounded-2xl border overflow-hidden" style={{ borderColor: isOpen ? (cat.color[300] || cat.color[100]) : C.ink[100] }}>
                  <button onClick={() => setOpenRisk(isOpen ? null : r.id)} className="w-full text-left p-4 flex items-start gap-3 hover:bg-black/[0.015]">
                    <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: cat.color[700] || cat.color[600] }} />
                    <div className="flex-1">
                      <div className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: cat.color[700] || cat.color[600] }}>{cat.name}</div>
                      <div className="font-semibold text-sm" style={{ color: C.ink[800] }}>{r.title}</div>
                    </div>
                    {isOpen ? <ChevronUp size={17} style={{ color: C.ink[500] }} /> : <ChevronDown size={17} style={{ color: C.ink[500] }} />}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pl-8 space-y-3">
                      <Field label="En qué consiste" text={r.consists} />
                      <Field label="Señales de alerta" text={r.signals} />
                      <Field label="Cómo se reduce" text={r.mitigation} accent={cat.color} />
                      <Field label="Decisión si ocurre" text={r.decision} accent={cat.color} strong />
                    </div>
                  )}
                </div>
              );
            })}
            {filteredRisks.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: C.ink[500] }}>Ningún riesgo coincide con la búsqueda.</p>
            )}
          </div>
        </section>

        {/* ---------- INDICADORES ---------- */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold mb-1" style={{ color: C.ink[800] }}>Indicadores para medir resultados</h2>
          <p className="text-sm mb-6" style={{ color: C.ink[500] }}>69 indicadores en 7 categorías. Ninguno mide "anuncios" — todos distinguen entre vivienda iniciada, terminada, entregada y ocupada.</p>

          <div className="grid sm:grid-cols-[220px_1fr] gap-6">
            <div className="flex sm:flex-col gap-1.5 overflow-x-auto sm:overflow-visible pb-1">
              {INDICATOR_CATEGORIES.map((c) => {
                const active = activeIndCat === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveIndCat(c.id)}
                    className="flex-shrink-0 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all"
                    style={{ backgroundColor: active ? C.brand[700] : C.ink[50] }}
                  >
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ backgroundColor: active ? "rgba(255,255,255,0.2)" : "#fff", color: active ? "#fff" : C.brand[700] }}>{c.id}</span>
                    <span className="text-xs font-semibold whitespace-nowrap sm:whitespace-normal" style={{ color: active ? "#fff" : C.ink[700] }}>{c.name}</span>
                    <span className="ml-auto text-[10px] font-medium hidden sm:inline" style={{ color: active ? "rgba(255,255,255,0.7)" : C.ink[500] }}>{c.items.length}</span>
                  </button>
                );
              })}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: C.ink[50] }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${(currentIndCat.items.length / maxIndCount) * 100}%`, backgroundColor: C.brand[300] }} />
                </div>
                <span className="text-xs font-semibold whitespace-nowrap" style={{ color: C.ink[500] }}>{currentIndCat.items.length} indicadores</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentIndCat.items.map((item, i) => (
                  <span key={i} className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ backgroundColor: C.brand[50], color: C.brand[700] }}>{item}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------- CUÁNDO SE REVISA ---------- */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold mb-1" style={{ color: C.ink[800] }}>Cuándo se revisa</h2>
          <p className="text-sm mb-6" style={{ color: C.ink[500] }}>Cuatro ritmos de control, del más frecuente al que cierra el plan.</p>
          <div className="grid sm:grid-cols-4 gap-3">
            {EVAL_MOMENTS.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.id} className="rounded-2xl p-4 border" style={{ borderColor: C.ink[100] }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: m.color[50] || m.color[100] }}>
                    <Icon size={17} style={{ color: m.color[700] || m.color[600] }} />
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: m.color[700] || m.color[600] }}>{m.freq}</div>
                  <div className="font-bold text-sm mb-2" style={{ color: C.ink[800] }}>{m.title}</div>
                  <p className="text-xs" style={{ color: C.ink[500] }}>{m.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---------- QUÉ PUEDE PASAR CON UNA MEDIDA ---------- */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-1" style={{ color: C.ink[800] }}>Qué puede pasar con una medida</h2>
          <p className="text-sm mb-6" style={{ color: C.ink[500] }}>Ninguna medida es indefinida: cada evaluación puede ampliarla, modificarla o suspenderla.</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {CONDITIONS.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.id} className="rounded-2xl p-5" style={{ backgroundColor: c.color[50] || c.color[100] }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: "#fff" }}>
                    <Icon size={17} style={{ color: c.color[700] || c.color[600] }} />
                  </div>
                  <div className="font-bold text-sm mb-3" style={{ color: c.color[700] || c.color[600] }}>{c.title}</div>
                  <ul className="space-y-1.5">
                    {c.items.map((it, i) => (
                      <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: C.ink[700] }}>
                        <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: c.color[700] || c.color[600] }} />
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
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

function Field({ label, text, accent, strong }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: accent ? (accent[700] || accent[600]) : C.ink[500] }}>{label}</div>
      <p className="text-xs" style={{ color: strong ? C.ink[800] : C.ink[700], fontWeight: strong ? 500 : 400 }}>{text}</p>
    </div>
  );
}
