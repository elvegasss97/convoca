"""Modelo presupuestario incremental del Plan Sanidad 2036 de CONVOCA.

El modelo no sustituye una memoria económica de la Administración. Construye un
escenario reproducible, en euros constantes de 2026, y separa:

* escenario base (financiación y capacidad ya existentes);
* gasto incremental atribuible a CONVOCA;
* gasto recurrente y temporal;
* stock al cierre de año y gasto/FTE medio cuando corresponde;
* escenarios bajo, central y alto.

Las hipótesis de política son explícitas y editables. Las cantidades oficiales y
sus fuentes se documentan en el libro de cálculo y en la memoria metodológica.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, Mapping


YEARS = list(range(2027, 2037))
POP_M = {
    2027: 50.1,
    2028: 50.6,
    2029: 51.0,
    2030: 51.4,
    2031: 51.8,
    2032: 52.1,
    2033: 52.4,
    2034: 52.7,
    2035: 52.9,
    2036: 53.1,
}


@dataclass(frozen=True)
class Scenario:
    name: str
    # M1
    mf_panel: int
    ap_support_modules_per_100k: float
    ap_diagnostics_eur_per_resident: float
    ap_overlap_deduction_m: float
    # M2
    m2_rest_unit_cost: float
    m2_reserve_share: float
    m2_coordination_m: float
    m2_travel_m: float
    # M3: incremental annual cohorts above the official/base offer
    fse_add_mf: int
    fse_add_psychiatry: int
    fse_add_child_psychiatry: int
    fse_add_pir: int
    fse_add_eir_family: int
    fse_add_eir_mental: int
    fse_add_eir_geriatric: int
    hard_posts: int
    hard_post_bonus: float
    homologation_m: float
    workforce_planning_m: float
    # M4: incremental community staffing per 100k
    sm_psychologists: float
    sm_psychiatrists: float
    sm_nurses: float
    sm_social_workers: float
    sm_special_team_multiplier: float
    sm_programmes_m: float
    sm_infra_share: float
    # M5
    home_modules_per_100k: float
    telemonitor_share: float
    telemonitor_eur: float
    care_plan_eur_per_ap_site: float
    carer_episodes: int
    carer_episode_eur: float
    palliative_upgrades: int
    # M6
    public_health_modules_per_100k: float
    prevention_eur_per_resident: float
    vaccine_outreach_eur_per_resident: float
    climate_school_eur_per_ap_site: float
    screening_evaluation_m: float
    public_health_overlap_m: float
    # M7
    dental_target_children: float
    dental_target_65plus: float
    dental_target_pregnancy: float
    dental_target_priority: float
    dental_unit_cost: float
    mobile_units: int
    transport_episodes: int
    territorial_network_m: float
    cohesion_fund_m: float
    optical_evaluation_m: float
    # M8
    digital_capex_ap_site: float
    digital_capex_hospital: float
    digital_platform_m: float
    digital_opex_share: float
    nondigital_admin_fte: int
    digital_governance_m: float


SCENARIOS: Dict[str, Scenario] = {
    "Bajo": Scenario(
        "Bajo", 1300, 0.75, 3.0, 60.0,
        3500.0, 0.10, 36.0, 5.0,
        100, 20, 10, 50, 100, 50, 25, 5000, 8000.0, 12.0, 5.0,
        1.0, 0.5, 1.0, 0.5, 0.5, 50.0, 0.10,
        0.75, 0.005, 200.0, 3000.0, 50000, 400.0, 80,
        0.75, 3.0, 1.0, 3000.0, 25.0, 15.0,
        0.50, 0.20, 0.50, 0.40, 55.0, 60, 50000, 54.0, 100.0, 3.0,
        10000.0, 250000.0, 60.0, 0.15, 180, 15.0,
    ),
    "Central": Scenario(
        "Central", 1250, 1.0, 5.0, 75.0,
        6699.0, 0.25, 54.0, 10.0,
        250, 50, 25, 100, 250, 100, 50, 10000, 10000.0, 18.0, 10.0,
        2.0, 0.75, 1.5, 0.75, 1.0, 75.0, 0.15,
        1.0, 0.010, 300.0, 5000.0, 100000, 500.0, 132,
        1.0, 5.0, 2.0, 5000.0, 50.0, 25.0,
        0.70, 0.35, 0.70, 0.60, 60.0, 100, 100000, 90.0, 150.0, 5.0,
        20000.0, 500000.0, 100.0, 0.20, 360, 25.0,
    ),
    "Alto": Scenario(
        "Alto", 1200, 1.25, 8.0, 90.0,
        8758.7, 0.40, 72.0, 20.0,
        400, 80, 40, 150, 400, 150, 75, 15000, 12000.0, 30.0, 15.0,
        3.0, 1.0, 2.0, 1.0, 1.5, 120.0, 0.20,
        1.5, 0.020, 450.0, 8000.0, 150000, 750.0, 200,
        1.5, 8.0, 3.5, 8000.0, 100.0, 35.0,
        0.90, 0.50, 0.90, 0.80, 70.0, 150, 180000, 144.0, 250.0, 10.0,
        35000.0, 800000.0, 180.0, 0.25, 600, 40.0,
    ),
}


# Retribuciones anuales brutas 2026 de la tabla del SAS, multiplicadas por una
# carga empresarial del 31 %. No incluyen guardias salvo que se indique.
EMPLOYER_FACTOR = 1.31
PAY = {
    "family_doctor": 53_750.98 * EMPLOYER_FACTOR,
    "psychiatrist": 63_888.48 * EMPLOYER_FACTOR,
    "psychologist": 53_888.33 * EMPLOYER_FACTOR,
    "nurse_ap": 35_861.27 * EMPLOYER_FACTOR,
    "nurse_mental": 40_928.37 * EMPLOYER_FACTOR,
    "physiotherapist": 35_861.27 * EMPLOYER_FACTOR,
    "social_worker": 35_262.89 * EMPLOYER_FACTOR,
    "administrator": 27_443.80 * EMPLOYER_FACTOR,
    "public_health": 52_514.12 * EMPLOYER_FACTOR,
    "home_doctor": 63_997.99 * EMPLOYER_FACTOR,
}


RAMP = {
    "M1": {2027: .20, 2028: .45, 2029: .75, 2030: 1.0},
    "M2": {2027: .10, 2028: .30, 2029: .60, 2030: 1.0},
    "M4": {2027: .10, 2028: .25, 2029: .45, 2030: .65, 2031: .85, 2032: 1.0},
    "M5": {2027: .10, 2028: .25, 2029: .45, 2030: .65, 2031: .85, 2032: 1.0},
    "M6": {2027: .20, 2028: .40, 2029: .60, 2030: .80, 2031: 1.0},
    "M7": {2027: .15, 2028: .30, 2029: .50, 2030: .70, 2031: .85, 2032: 1.0},
}


def ramp(measure: str, year: int) -> float:
    points = RAMP[measure]
    eligible = [y for y in points if y <= year]
    return points[max(eligible)] if eligible else 0.0


def m1(s: Scenario, year: int) -> Dict[str, float]:
    adult_assigned = 31_241 * 1_349
    new_mf_full = max(0.0, adult_assigned / s.mf_panel - 31_241)
    new_nurse_full = max(0.0, 31_241 + 6_719 + new_mf_full - 36_424)
    modules_full = POP_M[year] * s.ap_support_modules_per_100k * 10
    admin_full = new_mf_full * .5
    maturity = ramp("M1", year)
    pop_factor = POP_M[year] / POP_M[2032]
    workforce = maturity * pop_factor * (
        new_mf_full * PAY["family_doctor"]
        + new_nurse_full * PAY["nurse_ap"]
        + admin_full * PAY["administrator"]
        + modules_full * (
            PAY["physiotherapist"]
            + .5 * PAY["public_health"]
            + .5 * PAY["social_worker"]
        )
    ) / 1e6
    diagnostics = maturity * POP_M[year] * s.ap_diagnostics_eur_per_resident
    full_incremental_fte = new_mf_full + new_nurse_full + admin_full + 2 * modules_full
    capex_total = full_incremental_fte * 30_000 / 1e6
    capex = capex_total / 4 if year <= 2030 else 0.0
    maintenance = capex_total * .10 if year >= 2031 else 0.0
    overlap = min(s.ap_overlap_deduction_m * maturity, workforce + diagnostics + capex + maintenance)
    return {
        "personal": workforce,
        "diagnóstico y actividad": diagnostics,
        "espacios y equipos": capex,
        "mantenimiento": maintenance,
        "descuento programas existentes": -overlap,
    }


def m2_backlog_cost(s: Scenario) -> float:
    # Pacientes aproximados: porcentajes nacionales redondeados aplicados a
    # denominadores oficiales del SISLE, diciembre de 2025.
    unit_costs = {
        "Bajo": {
            "cataract": 1_027.98,
            "hip": 5_639.54,
            "knee": 7_044.53,
            "valvular": 27_527.354515,
            "bypass": 23_704.399830,
        },
        "Central": {
            "cataract": 1_027.98,
            "hip": 8_720.029406,
            "knee": 7_988.955789,
            "valvular": 29_563.9,
            "bypass": 25_431.6,
        },
        "Alto": {
            "cataract": 1_027.98,
            "hip": 8_720.029406,
            "knee": 7_988.955789,
            "valvular": 42_493.996721,
            "bypass": 29_013.544531,
        },
    }[s.name]
    cataract = 124_195 * .026 * unit_costs["cataract"]
    hip = 15_256 * .137 * unit_costs["hip"]
    knee = 29_312 * .159 * unit_costs["knee"]
    valvular_unit = unit_costs["valvular"]
    bypass_unit = unit_costs["bypass"]
    valvular = 1_676 * .069 * valvular_unit
    bypass = 253 * .016 * bypass_unit
    guaranteed = cataract + hip + knee + valvular + bypass
    # El resto es una cantidad derivada y aproximada por el redondeo de los
    # porcentajes de los cinco procesos garantizados.
    guaranteed_patients = (
        124_195 * .026 + 15_256 * .137 + 29_312 * .159 + 1_676 * .069 + 253 * .016
    )
    rest_patients = 184_715 - guaranteed_patients
    return (guaranteed + rest_patients * s.m2_rest_unit_cost) / 1e6


def m2(s: Scenario, year: int) -> Dict[str, float]:
    clearance = {2027: .25, 2028: .30, 2029: .30, 2030: .15}.get(year, 0.0)
    backlog = m2_backlog_cost(s)
    structural = backlog * s.m2_reserve_share * ramp("M2", year)
    return {
        "absorción backlog 2025": backlog * clearance,
        "reserva estructural": structural,
        "coordinación y transparencia": s.m2_coordination_m * ramp("M2", year),
        "alternativa pública y desplazamientos": s.m2_travel_m * ramp("M2", year),
    }


FSE_DURATION = {
    "mf": 4,
    "psychiatry": 5,
    "child_psychiatry": 5,
    "pir": 4,
    "eir_family": 2,
    "eir_mental": 2,
    "eir_geriatric": 2,
}


def cohort_additions(s: Scenario) -> Dict[str, int]:
    return {
        "mf": s.fse_add_mf,
        "psychiatry": s.fse_add_psychiatry,
        "child_psychiatry": s.fse_add_child_psychiatry,
        "pir": s.fse_add_pir,
        "eir_family": s.fse_add_eir_family,
        "eir_mental": s.fse_add_eir_mental,
        "eir_geriatric": s.fse_add_eir_geriatric,
    }


def cohort_size(s: Scenario, specialty: str, start_year: int) -> float:
    if start_year < 2028:
        return 0.0
    factor = .5 if start_year == 2028 else 1.0
    return cohort_additions(s)[specialty] * factor


def active_extra_residents(s: Scenario, specialty: str, year: int) -> float:
    duration = FSE_DURATION[specialty]
    return sum(
        cohort_size(s, specialty, start)
        for start in YEARS
        if start <= year < start + duration
    )


def cumulative_extra_graduates(s: Scenario, specialty: str, year: int) -> float:
    duration = FSE_DURATION[specialty]
    return sum(
        cohort_size(s, specialty, start)
        for start in YEARS
        if start + duration <= year
    )


def m3(s: Scenario, year: int) -> Dict[str, float]:
    medical = sum(active_extra_residents(s, x, year) for x in ("mf", "psychiatry", "child_psychiatry", "pir"))
    nursing = sum(active_extra_residents(s, x, year) for x in ("eir_family", "eir_mental", "eir_geriatric"))
    training = (medical * 56_000 + nursing * 41_000) / 1e6
    maturity = min(1.0, max(0.0, (year - 2026) / 4))
    return {
        "plazas FSE adicionales activas": training,
        "incentivos difícil cobertura": s.hard_posts * s.hard_post_bonus / 1e6 * maturity,
        "homologación y evaluación": s.homologation_m * maturity,
        "planificación, REPS y transparencia": s.workforce_planning_m * maturity,
    }


def m4(s: Scenario, year: int) -> Dict[str, float]:
    maturity = ramp("M4", year)
    units_100k = POP_M[year] * 10
    core = units_100k * (
        s.sm_psychologists * PAY["psychologist"]
        + s.sm_psychiatrists * PAY["psychiatrist"]
        + s.sm_nurses * PAY["nurse_mental"]
        + s.sm_social_workers * PAY["social_worker"]
    ) / 1e6
    special_teams = POP_M[year] * 4 * s.sm_special_team_multiplier
    special_cost = special_teams * (
        PAY["psychologist"] + .5 * PAY["psychiatrist"]
        + PAY["nurse_mental"] + .5 * PAY["social_worker"]
    ) / 1e6
    staff = maturity * (core + special_cost)
    gross = staff + staff * s.sm_infra_share + s.sm_programmes_m * maturity
    overlap = min(39.0 * maturity, gross)
    return {
        "red comunitaria multidisciplinar": staff,
        "espacios, grupos y equipamiento": staff * s.sm_infra_share,
        "crisis, infancia, adicciones y continuidad": s.sm_programmes_m * maturity,
        "descuento Plan Salud Mental vigente": -overlap,
    }


def m5(s: Scenario, year: int) -> Dict[str, float]:
    maturity = ramp("M5", year)
    modules = POP_M[year] * 10 * s.home_modules_per_100k
    home_staff = modules * (
        .5 * PAY["home_doctor"] + 1.5 * PAY["nurse_ap"]
        + .5 * PAY["physiotherapist"] + .5 * PAY["social_worker"]
        + .5 * PAY["administrator"]
    ) / 1e6
    telemonitor = POP_M[year] * 1e6 * s.telemonitor_share * s.telemonitor_eur / 1e6
    care_plan = 13_026 * s.care_plan_eur_per_ap_site / 1e6
    respite = s.carer_episodes * s.carer_episode_eur / 1e6
    palliative = s.palliative_upgrades * .5 * (PAY["psychologist"] + PAY["social_worker"]) / 1e6
    return {
        "equipos de atención en casa": home_staff * maturity,
        "telemonitorización con alternativa": telemonitor * maturity,
        "plan único y coordinación": care_plan * maturity,
        "apoyo y respiro a cuidadores": respite * maturity,
        "completar equipos paliativos": palliative * maturity,
    }


def m6(s: Scenario, year: int) -> Dict[str, float]:
    maturity = ramp("M6", year)
    modules = POP_M[year] * 10 * s.public_health_modules_per_100k
    staff = modules * (PAY["public_health"] + PAY["nurse_ap"] + PAY["administrator"]) / 1e6
    prevention = POP_M[year] * s.prevention_eur_per_resident
    vaccines = POP_M[year] * s.vaccine_outreach_eur_per_resident
    climate_school = 13_026 * s.climate_school_eur_per_ap_site / 1e6
    gross = maturity * (staff + prevention + vaccines + climate_school + s.screening_evaluation_m)
    return {
        "equipos territoriales de salud pública": staff * maturity,
        "programas comunitarios de prevención": prevention * maturity,
        "vacunación y captación activa": vaccines * maturity,
        "escuela, comunidad y clima": climate_school * maturity,
        "evaluación y cribados basados en evidencia": s.screening_evaluation_m * maturity,
        "descuento programas solapados": -min(s.public_health_overlap_m * maturity, gross),
    }


def m7(s: Scenario, year: int) -> Dict[str, float]:
    maturity = ramp("M7", year)
    pop = POP_M[year] * 1e6
    children = pop * .135
    older = pop * .22
    pregnancies = 350_000
    priority = 1_000_000
    current = {"children": .304, "older": .03, "pregnancy": .25, "priority": .20}
    beneficiaries = (
        children * max(0, s.dental_target_children - current["children"])
        + older * max(0, s.dental_target_65plus - current["older"])
        + pregnancies * max(0, s.dental_target_pregnancy - current["pregnancy"])
        + priority * max(0, s.dental_target_priority - current["priority"])
    )
    dental = beneficiaries * s.dental_unit_cost / 1e6
    mobile_opex = s.mobile_units * 300_000 / 1e6
    mobile_capex = s.mobile_units * 250_000 / 1e6 / 4 if year <= 2030 else 0.0
    transport = s.transport_episodes * 250 / 1e6
    return {
        "cobertura bucodental adicional": dental * maturity,
        "unidades móviles - operación": mobile_opex * maturity,
        "unidades móviles - inversión": mobile_capex,
        "transporte sanitario y ayudas": transport * maturity,
        "redes territoriales compartidas": s.territorial_network_m * maturity,
        "fondo de cohesión ajustado": s.cohesion_fund_m * maturity,
        "evaluación de ampliación óptica": s.optical_evaluation_m * maturity,
    }


def m8(s: Scenario, year: int) -> Dict[str, float]:
    capex_total = (
        13_026 * s.digital_capex_ap_site
        + 468 * s.digital_capex_hospital
        + s.digital_platform_m * 1e6
    ) / 1e6
    capex = capex_total / 4 if year <= 2030 else 0.0
    opex = capex_total * s.digital_opex_share if year >= 2030 else 0.0
    admin = s.nondigital_admin_fte * PAY["administrator"] / 1e6
    maturity = min(1.0, max(0.0, (year - 2026) / 4))
    return {
        "interoperabilidad y acceso - inversión": capex,
        "operación, seguridad y mantenimiento": opex,
        "canal no digital": admin * maturity,
        "registro IA, auditorías y cuadro público": s.digital_governance_m * maturity,
    }


MEASURE_FUNCS = {"M1": m1, "M2": m2, "M3": m3, "M4": m4, "M5": m5, "M6": m6, "M7": m7, "M8": m8}


def model(s: Scenario) -> Dict[int, Dict[str, float]]:
    output: Dict[int, Dict[str, float]] = {}
    for year in YEARS:
        output[year] = {
            measure: sum(func(s, year).values())
            for measure, func in MEASURE_FUNCS.items()
        }
    return output


def controls() -> Iterable[str]:
    for scenario in SCENARIOS.values():
        result = model(scenario)
        for year, measures in result.items():
            for measure, value in measures.items():
                if value < -1e-9:
                    yield f"{scenario.name} {year} {measure}: coste negativo {value}"
        for specialty in FSE_DURATION:
            for year in YEARS:
                if cumulative_extra_graduates(scenario, specialty, year) < 0:
                    yield f"{scenario.name} {specialty} {year}: graduados negativos"


def summary_table() -> str:
    lines = ["Escenario,2032_MEUR,Acumulado_2027_2036_MEUR"]
    for name, scenario in SCENARIOS.items():
        result = model(scenario)
        annual_2032 = sum(result[2032].values())
        cumulative = sum(sum(v.values()) for v in result.values())
        lines.append(f"{name},{annual_2032:.1f},{cumulative:.1f}")
    return "\n".join(lines)


if __name__ == "__main__":
    errors = list(controls())
    if errors:
        raise SystemExit("\n".join(errors))
    print(summary_table())
    central = model(SCENARIOS["Central"])
    print("\nCentral 2032 por medida (M€):")
    for measure, value in central[2032].items():
        print(f"{measure}: {value:.1f}")
