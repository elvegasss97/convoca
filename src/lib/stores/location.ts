import { writable } from 'svelte/store';
import { mockCities, type City } from '$lib/mock/cities';

/**
 * Ubicación elegida manualmente por la persona usuaria. Nunca se usa
 * geolocalización real ni seguimiento en segundo plano: es una selección
 * explícita de ciudad, coherente con "no incluir ubicación en tiempo real".
 */
export const selectedCity = writable<City>(mockCities[0]);
