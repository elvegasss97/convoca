/**
 * Preferencia "mi municipio" para el radar municipal: solo un filtro
 * guardado en el dispositivo (localStorage), sin cuenta ni backend — mismo
 * patrón que el device-token de asistencia en attendanceService.ts. No hay
 * ningún aviso push ni email asociado; es puramente "recuerda qué municipio
 * me interesa para priorizarlo la próxima vez que entro".
 */
import { browser } from '$app/environment';

const MY_MUNICIPALITY_KEY = 'convoca:mi-municipio:v1';

export interface MyMunicipality {
	ineCode: string;
	name: string;
}

export function getMyMunicipality(): MyMunicipality | null {
	if (!browser) return null;
	try {
		const raw = localStorage.getItem(MY_MUNICIPALITY_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (typeof parsed?.ineCode === 'string' && typeof parsed?.name === 'string') {
			return { ineCode: parsed.ineCode, name: parsed.name };
		}
		return null;
	} catch {
		return null;
	}
}

export function setMyMunicipality(municipality: MyMunicipality): void {
	if (!browser) return;
	try {
		localStorage.setItem(MY_MUNICIPALITY_KEY, JSON.stringify(municipality));
	} catch {
		// localStorage no disponible: la preferencia solo vive en memoria para esta sesión.
	}
}

export function clearMyMunicipality(): void {
	if (!browser) return;
	try {
		localStorage.removeItem(MY_MUNICIPALITY_KEY);
	} catch {
		// no-op: sin localStorage no había nada persistente que borrar.
	}
}
