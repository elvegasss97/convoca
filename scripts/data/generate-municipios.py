#!/usr/bin/env python3
"""
generate-municipios.py

Regenera el catálogo completo de municipios de España a partir del fichero
oficial del INE (Instituto Nacional de Estadística), para el selector
territorial de nivel "municipio" de CONVOCA (TerritoryPicker + Voz abierta).

FUENTE OFICIAL
    INEbase > Demografía y población > Padrón >
    "Relación de municipios y sus códigos por provincias"
    https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736177031&menu=ultiDatos&idp=1254734710990

    Fichero descargado para esta generación (vigente a 1 de enero de 2026,
    publicado por el INE el 4 de febrero de 2026):
    https://www.ine.es/daco/daco42/codmun/26codmun.xlsx

    El INE publica un fichero nuevo cada año (normalmente en enero/febrero)
    con el nombre `<AA>codmun.xlsx` (AA = últimas 2 cifras del año). Formato:
    un libro Excel con 52 hojas (una por provincia, nombradas "01".."52" =
    código INE de provincia), y en cada hoja 4 columnas desde la fila 4:
    CPRO (código provincia, 2 dígitos), CMUN (código municipio dentro de la
    provincia, 3 dígitos), DC (dígito de control, no se usa aquí) y NOMBRE.

CÓMO ACTUALIZAR EL CATÁLOGO (cuando el INE publique una edición nueva)
    1. Descarga el fichero nuevo desde la página oficial de arriba (busca el
       enlace "Municipios y códigos por provincias, comunidades autónomas y
       en España").
    2. Ejecuta: python3 scripts/data/generate-municipios.py ruta/al/fichero.xlsx
    3. Esto regenera:
         - static/data/municipios.json  (catálogo completo, cargado en el
           navegador solo cuando alguien elige ámbito "municipio")
         - src/lib/data/provinceCodes.ts (52 provincias: código INE de 2
           dígitos, nombre, y código+nombre de su comunidad/ciudad autónoma)
         - src/lib/data/communityCodes.ts (19 comunidades/ciudades
           autónomas: código INE oficial (CODAUTO) de 2 dígitos y nombre)
         - scripts/data/output/ine_municipalities_seed.sql (sentencias INSERT
           para supabase/migrations/0047_voz_abierta.sql — cópialas a mano
           reemplazando el bloque `-- BEGIN/END ine_municipalities seed`)
    4. Revisa el diff de los 4 ficheros antes de commitear: una actualización
       del INE puede fusionar/renombrar/dar de baja municipios (ver también
       "Modificaciones en los municipios" en la página del INE), lo que
       cambia códigos existentes — no solo añade filas nuevas.

NOMBRE UNIFICADO DE BALEARES
    El INE usa el mismo nombre oficial ("Illes Balears") tanto para la
    provincia como para la comunidad autónoma (tabla "Relación de provincias
    con sus códigos" / "Relación de comunidades y ciudades autónomas con sus
    códigos": https://www.ine.es/daco/daco42/codmun/cod_ccaa_provincia.htm).
    Aquí se sigue ese mismo criterio en los dos niveles. `src/lib/data/
    regions.ts` (usado también por el selector de comunidad autónoma propio
    de Sanidad, `SanidadListeningFlow.svelte`, validado contra un catálogo
    cerrado en `set_concern_listening_survey_response`, migración 0044 ya en
    producción) sigue diciendo "Islas Baleares" a propósito — no se toca
    aquí para no arriesgar esa función. `TerritoryPicker.svelte` unifica el
    nombre solo en sus propios usos (concerns/concern_proposals/Voz
    abierta, sin catálogo cerrado en BD) — ver `unifiedCommunityName()` en
    `src/lib/utils/territoryScope.ts`.

Requisitos: solo Python 3 estándar (zipfile + xml.etree), sin dependencias
de terceros — un .xlsx es un .zip con XML dentro, no hace falta openpyxl
para esta extracción tan simple (4 columnas, sin fórmulas ni estilos).

Este script NO se ejecuta como parte de `pnpm build`/`pnpm dev`/CI: es una
herramienta de regeneración manual y ocasional (el catálogo cambia una vez
al año). Los ficheros que genera SÍ se commitean al repositorio.
"""

import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

# Correspondencia oficial código de provincia -> código+nombre de
# comunidad/ciudad autónoma, fuente: INEbase "Relación de comunidades y
# ciudades autónomas con sus códigos" / "Relación de provincias con sus
# códigos" (https://www.ine.es/daco/daco42/codmun/cod_ccaa_provincia.htm).
# Estable: España no ha creado ni suprimido provincias ni comunidades
# autónomas desde 1995 (Ceuta y Melilla como ciudades autónomas). El nombre
# de provincia aquí es el mismo que ya usa `src/lib/data/regions.ts`
# (nombre de uso habitual, no el nombre administrativo invertido del INE
# tipo "Rioja, La"); el nombre de comunidad también, EXCEPTO Baleares (ver
# "NOMBRE UNIFICADO DE BALEARES" en la cabecera de este fichero).
# (código INE provincia, nombre provincia, código INE comunidad/CODAUTO, nombre comunidad/ciudad autónoma)
PROVINCES = [
	("01", "Álava", "16", "País Vasco"),
	("02", "Albacete", "08", "Castilla-La Mancha"),
	("03", "Alicante", "10", "Comunidad Valenciana"),
	("04", "Almería", "01", "Andalucía"),
	("05", "Ávila", "07", "Castilla y León"),
	("06", "Badajoz", "11", "Extremadura"),
	("07", "Illes Balears", "04", "Illes Balears"),
	("08", "Barcelona", "09", "Cataluña"),
	("09", "Burgos", "07", "Castilla y León"),
	("10", "Cáceres", "11", "Extremadura"),
	("11", "Cádiz", "01", "Andalucía"),
	("12", "Castellón", "10", "Comunidad Valenciana"),
	("13", "Ciudad Real", "08", "Castilla-La Mancha"),
	("14", "Córdoba", "01", "Andalucía"),
	("15", "A Coruña", "12", "Galicia"),
	("16", "Cuenca", "08", "Castilla-La Mancha"),
	("17", "Girona", "09", "Cataluña"),
	("18", "Granada", "01", "Andalucía"),
	("19", "Guadalajara", "08", "Castilla-La Mancha"),
	("20", "Gipuzkoa", "16", "País Vasco"),
	("21", "Huelva", "01", "Andalucía"),
	("22", "Huesca", "02", "Aragón"),
	("23", "Jaén", "01", "Andalucía"),
	("24", "León", "07", "Castilla y León"),
	("25", "Lleida", "09", "Cataluña"),
	("26", "La Rioja", "17", "La Rioja"),
	("27", "Lugo", "12", "Galicia"),
	("28", "Madrid", "13", "Comunidad de Madrid"),
	("29", "Málaga", "01", "Andalucía"),
	("30", "Murcia", "14", "Región de Murcia"),
	("31", "Navarra", "15", "Comunidad Foral de Navarra"),
	("32", "Ourense", "12", "Galicia"),
	("33", "Asturias", "03", "Principado de Asturias"),
	("34", "Palencia", "07", "Castilla y León"),
	("35", "Las Palmas", "05", "Canarias"),
	("36", "Pontevedra", "12", "Galicia"),
	("37", "Salamanca", "07", "Castilla y León"),
	("38", "Santa Cruz de Tenerife", "05", "Canarias"),
	("39", "Cantabria", "06", "Cantabria"),
	("40", "Segovia", "07", "Castilla y León"),
	("41", "Sevilla", "01", "Andalucía"),
	("42", "Soria", "07", "Castilla y León"),
	("43", "Tarragona", "09", "Cataluña"),
	("44", "Teruel", "02", "Aragón"),
	("45", "Toledo", "08", "Castilla-La Mancha"),
	("46", "Valencia", "10", "Comunidad Valenciana"),
	("47", "Valladolid", "07", "Castilla y León"),
	("48", "Bizkaia", "16", "País Vasco"),
	("49", "Zamora", "07", "Castilla y León"),
	("50", "Zaragoza", "02", "Aragón"),
	("51", "Ceuta", "18", "Ciudad de Ceuta"),
	("52", "Melilla", "19", "Ciudad de Melilla"),
]


def load_shared_strings(z: zipfile.ZipFile) -> list[str]:
	root = ET.fromstring(z.read("xl/sharedStrings.xml"))
	strings = []
	for si in root.findall("m:si", NS):
		texts = si.findall(".//m:t", NS)
		strings.append("".join(t.text or "" for t in texts))
	return strings


def parse_sheet(z: zipfile.ZipFile, sheet_index: int, strings: list[str]) -> list[tuple[str, str, str]]:
	"""Devuelve [(ine_code, name, province_code), ...] para una hoja (una provincia)."""
	content = z.read(f"xl/worksheets/sheet{sheet_index}.xml").decode("utf-8")
	root = ET.fromstring(content)
	rows = root.findall(".//m:sheetData/m:row", NS)
	out = []
	for row in rows:
		r = int(row.get("r"))
		if r < 4:
			continue  # filas 1-3 = título, provincia, cabecera
		cells = {c.get("r")[0]: c for c in row.findall("m:c", NS)}
		values = {}
		for col, cell in cells.items():
			v = cell.find("m:v", NS)
			if v is None or v.text is None:
				continue
			if cell.get("t") == "s":
				values[col] = strings[int(v.text)]
			else:
				values[col] = v.text
		cpro = values.get("A", "").strip()
		cmun = values.get("B", "").strip()
		nombre = values.get("D", "").strip()
		if not cpro or not cmun or not nombre:
			continue
		ine_code = f"{cpro.zfill(2)}{cmun.zfill(3)}"
		out.append((ine_code, nombre, cpro.zfill(2)))
	return out


def sql_escape(s: str) -> str:
	return s.replace("'", "''")


def main():
	if len(sys.argv) < 2:
		print("Uso: python3 scripts/data/generate-municipios.py ruta/al/NNcodmun.xlsx", file=sys.stderr)
		sys.exit(1)

	xlsx_path = Path(sys.argv[1])
	repo_root = Path(__file__).resolve().parents[2]

	z = zipfile.ZipFile(xlsx_path)
	strings = load_shared_strings(z)

	all_municipalities: list[tuple[str, str, str]] = []
	for i in range(1, 53):
		all_municipalities.extend(parse_sheet(z, i, strings))

	if len(all_municipalities) < 8000:
		print(f"AVISO: solo se han extraído {len(all_municipalities)} municipios (se esperaban >8000). Revisa el fichero de origen.", file=sys.stderr)

	seen_codes = set()
	for code, _, _ in all_municipalities:
		if code in seen_codes:
			raise SystemExit(f"Código INE duplicado: {code} — el fichero de origen no tiene la forma esperada.")
		seen_codes.add(code)

	all_municipalities.sort(key=lambda m: m[0])

	# --- static/data/municipios.json ---------------------------------------
	# Tuplas [ineCode, nombre, códigoProvincia] en vez de objetos: mismo
	# contenido, sin repetir claves miles de veces (payload más compacto para
	# la carga diferida). El nombre de provincia/comunidad NO va aquí: se
	# resuelve en el cliente a partir de los 2 primeros dígitos de ineCode
	# contra `provinceCodes.ts` (52 filas, ya en el bundle).
	out_json = repo_root / "static" / "data" / "municipios.json"
	out_json.parent.mkdir(parents=True, exist_ok=True)
	out_json.write_text(
		json.dumps([[c, n, p] for c, n, p in all_municipalities], ensure_ascii=False, separators=(",", ":")),
		encoding="utf-8"
	)
	print(f"Escrito {out_json} ({len(all_municipalities)} municipios, {out_json.stat().st_size} bytes)")

	# --- src/lib/data/provinceCodes.ts --------------------------------------
	out_ts = repo_root / "src" / "lib" / "data" / "provinceCodes.ts"
	ts_lines = [
		"/**",
		" * Código INE de provincia (2 dígitos) -> nombre de provincia y",
		" * código+nombre de su comunidad/ciudad autónoma. Generado por",
		" * `scripts/data/generate-municipios.py` a partir de la tabla oficial del",
		" * INE (ver cabecera de ese script para la fuente exacta y cómo",
		" * regenerarlo). Mismos nombres que `regions.ts`, EXCEPTO Baleares",
		" * (unificado a \"Illes Balears\" en los dos niveles — ver \"NOMBRE",
		" * UNIFICADO DE BALEARES\" en la cabecera del script). No editar a mano.",
		" */",
		"export interface ProvinceCode {",
		"\tcode: string;",
		"\tname: string;",
		"\tcommunityCode: string;",
		"\tcommunity: string;",
		"}",
		"",
		"export const provinceCodes: ProvinceCode[] = [",
	]
	for code, name, comm_code, community in PROVINCES:
		ts_lines.append(
			f"\t{{ code: '{code}', name: {json.dumps(name, ensure_ascii=False)}, communityCode: '{comm_code}', community: {json.dumps(community, ensure_ascii=False)} }},"
		)
	ts_lines.append("];")
	ts_lines.append("")
	ts_lines.append("export const provinceByCode: Record<string, ProvinceCode> = Object.fromEntries(")
	ts_lines.append("\tprovinceCodes.map((p) => [p.code, p])")
	ts_lines.append(");")
	ts_lines.append("")
	out_ts.write_text("\n".join(ts_lines), encoding="utf-8")
	print(f"Escrito {out_ts} ({len(PROVINCES)} provincias)")

	# --- src/lib/data/communityCodes.ts -------------------------------------
	# Deduplicado de PROVINCES por código de comunidad (CODAUTO oficial del
	# INE): 19 filas exactas (17 comunidades + Ceuta + Melilla).
	communities: dict[str, tuple[str, str, list[str]]] = {}
	for prov_code, _prov_name, comm_code, comm_name in PROVINCES:
		if comm_code not in communities:
			communities[comm_code] = (comm_code, comm_name, [])
		communities[comm_code][2].append(prov_code)

	out_comm_ts = repo_root / "src" / "lib" / "data" / "communityCodes.ts"
	comm_lines = [
		"/**",
		" * Código INE oficial de comunidad/ciudad autónoma (CODAUTO, 2 dígitos)",
		" * -> nombre y provincias que la forman. Generado por",
		" * `scripts/data/generate-municipios.py` — deduplicado de",
		" * `provinceCodes.ts` por `communityCode`, 19 filas exactas (17",
		" * comunidades autónomas + Ceuta + Melilla). No editar a mano.",
		" */",
		"export interface CommunityCode {",
		"\tcode: string;",
		"\tname: string;",
		"\tprovinceCodes: string[];",
		"}",
		"",
		"export const communityCodes: CommunityCode[] = [",
	]
	for comm_code, comm_name, prov_codes in sorted(communities.values(), key=lambda c: c[0]):
		prov_codes_literal = ", ".join(f"'{p}'" for p in prov_codes)
		comm_lines.append(
			f"\t{{ code: '{comm_code}', name: {json.dumps(comm_name, ensure_ascii=False)}, provinceCodes: [{prov_codes_literal}] }},"
		)
	comm_lines.append("];")
	comm_lines.append("")
	comm_lines.append("export const communityByCode: Record<string, CommunityCode> = Object.fromEntries(")
	comm_lines.append("\tcommunityCodes.map((c) => [c.code, c])")
	comm_lines.append(");")
	comm_lines.append("")
	out_comm_ts.write_text("\n".join(comm_lines), encoding="utf-8")
	print(f"Escrito {out_comm_ts} ({len(communities)} comunidades/ciudades autónomas)")

	# --- seed SQL para ine_municipalities -----------------------------------
	out_sql = repo_root / "scripts" / "data" / "output"
	out_sql.mkdir(parents=True, exist_ok=True)
	sql_path = out_sql / "ine_municipalities_seed.sql"
	CHUNK = 500
	with sql_path.open("w", encoding="utf-8") as f:
		f.write("-- Generado por scripts/data/generate-municipios.py — no editar a mano.\n")
		f.write(f"-- {len(all_municipalities)} municipios, fuente: {xlsx_path.name} (INE).\n")
		for i in range(0, len(all_municipalities), CHUNK):
			chunk = all_municipalities[i:i + CHUNK]
			f.write("insert into public.ine_municipalities (ine_code, name, province_code) values\n")
			rows_sql = ",\n".join(
				f"\t('{code}', '{sql_escape(name)}', '{prov}')" for code, name, prov in chunk
			)
			f.write(rows_sql)
			f.write(";\n\n")
	print(f"Escrito {sql_path} ({len(all_municipalities)} filas, {CHUNK} por sentencia INSERT)")


if __name__ == "__main__":
	main()
