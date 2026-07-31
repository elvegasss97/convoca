import type { GeoPoint } from '$lib/types';

export interface City {
	name: string;
	province: string;
	point: GeoPoint;
}

export const mockCities: City[] = [
	{ name: 'Madrid', province: 'Madrid', point: { lat: 40.4168, lng: -3.7038 } },
	{ name: 'Barcelona', province: 'Barcelona', point: { lat: 41.3874, lng: 2.1686 } },
	{ name: 'Valencia', province: 'Valencia', point: { lat: 39.4699, lng: -0.3763 } },
	{ name: 'Sevilla', province: 'Sevilla', point: { lat: 37.3891, lng: -5.9845 } },
	{ name: 'Bilbao', province: 'Bizkaia', point: { lat: 43.263, lng: -2.935 } },
	{ name: 'Zaragoza', province: 'Zaragoza', point: { lat: 41.6488, lng: -0.8891 } },
	{ name: 'Málaga', province: 'Málaga', point: { lat: 36.7213, lng: -4.4214 } },
	{ name: 'Vigo', province: 'Pontevedra', point: { lat: 42.2406, lng: -8.7207 } },
	{ name: 'Alicante', province: 'Alicante', point: { lat: 38.3452, lng: -0.481 } },
	{ name: 'Granada', province: 'Granada', point: { lat: 37.1773, lng: -3.5986 } },
	{ name: 'Murcia', province: 'Murcia', point: { lat: 37.9922, lng: -1.1307 } },
	{ name: 'Valladolid', province: 'Valladolid', point: { lat: 41.6523, lng: -4.7245 } }
];
