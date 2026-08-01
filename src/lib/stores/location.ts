import { writable } from 'svelte/store';
import { mockCities, type City } from '$lib/data/cities';

/**
 * Ubicación usada para centrar el mapa y el listado. Siempre por elección
 * explícita de la persona usuaria: una ciudad de la lista, un resultado de
 * la búsqueda manual (ciudad/código postal) o el botón "Usar mi ubicación"
 * (geolocalización del navegador, pedida solo al pulsar ese botón, nunca al
 * cargar la página — ver `LocationPicker.svelte`). El punto resultante vive
 * únicamente en memoria (este store no persiste en localStorage) y solo se
 * usa para centrar el mapa: nunca se envía al backend ni se guarda entre
 * sesiones.
 */
export const selectedCity = writable<City>(mockCities[0]);
