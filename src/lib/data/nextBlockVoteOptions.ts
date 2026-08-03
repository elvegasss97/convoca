/**
 * Las cinco opciones fijas de "Tú eliges el próximo bloque". Contenido fijo
 * de esta fase, no gestionado desde el panel de administración — igual que
 * `sanidadListeningOptions.ts`. El orden aquí es también el orden en que se
 * muestran: las cinco con el mismo nivel visual, ninguna destacada.
 */
import type { NextBlockVoteOptionCode } from '$lib/types';

export interface NextBlockVoteOption {
	code: NextBlockVoteOptionCode;
	title: string;
	description: string;
}

export const NEXT_BLOCK_VOTE_OPTIONS: NextBlockVoteOption[] = [
	{
		code: 'empleo_salarios',
		title: 'Empleo y salarios',
		description:
			'Precariedad, salarios, desempleo, acceso al primer empleo y condiciones laborales.'
	},
	{
		code: 'educacion',
		title: 'Educación',
		description:
			'Calidad educativa, desigualdad, abandono escolar, formación profesional y universidad.'
	},
	{
		code: 'pensiones_cuidados',
		title: 'Pensiones y cuidados',
		description: 'Pensiones, dependencia, cuidados, envejecimiento y conciliación.'
	},
	{
		code: 'coste_vida',
		title: 'Coste de vida',
		description: 'Alimentación, energía, transporte y pérdida de poder adquisitivo.'
	},
	{
		code: 'inmigracion_integracion_convivencia',
		title: 'Inmigración, integración y convivencia',
		description:
			'Fronteras, inmigración irregular, acogida, integración, convivencia y presión sobre los servicios públicos.'
	}
];

export function nextBlockVoteOptionTitle(code: string): string {
	return NEXT_BLOCK_VOTE_OPTIONS.find((o) => o.code === code)?.title ?? code;
}
