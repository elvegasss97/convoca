import { describe, expect, it } from 'vitest';
import {
	isPublicSpendingAsylumInvestigation,
	isPublicSpendingClaimSource,
	publicSpendingBreakdownTotal,
	publicSpendingPrimarySourceCount,
	publicSpendingShare,
	type PublicSpendingInvestigation
} from './publicSpending';

const asylumInvestigation: PublicSpendingInvestigation = {
	slug: 'acogida-proteccion-internacional-2026-2027',
	title: 'Sistema de acogida de protección internacional',
	shortTitle: 'Acogida',
	eyebrow: 'Caso verificado',
	stage: 'planificado',
	amount: 200,
	amountApproximate: false,
	amountQualifier: 'planificado',
	period: '2026–2027',
	publishedOn: '2026-06-19',
	publishedAt: '19 de junio de 2026',
	reviewedOn: '2026-08-22',
	reviewedAt: '22 de agosto de 2026',
	category: 'Política social',
	territory: 'España',
	manager: 'Administración',
	recipient: 'Entidades concertadas',
	summary: 'Resumen',
	citizenIntro: 'Explicación sencilla del expediente.',
	fundingOrigin: 'Presupuesto público documentado.',
	fundingDestination: 'Entidades que prestan el servicio.',
	citizenTakeaway: 'La cifra principal es una planificación, no un pago.',
	explainerFigures: [
		{
			id: 'total',
			value: '200 €',
			question: '¿Cuál es el total?',
			explanation: 'La suma de las partidas.'
		}
	],
	whyItMatters: 'Importancia',
	evidenceNote: 'Nota',
	featuredMetric: '55 plazas',
	featuredLabel: 'tarifa reforzada',
	breakdownTitle: 'Desglose',
	breakdownNote: 'Reconciliado',
	breakdownCoverage: 'complete',
	breakdown: [
		{
			id: 'item-uno',
			label: 'Uno',
			shortLabel: 'Uno',
			amount: 150,
			detail: 'Detalle',
			rate: 50,
			unit: 'plaza y día',
			capacity: 'Tres plazas',
			description: 'Descripción',
			fill: '#176056',
			textColor: '#ffffff',
			rect: { x: 0, y: 0, width: 75, height: 100 }
		},
		{
			id: 'item-dos',
			label: 'Dos',
			shortLabel: 'Dos',
			amount: 50,
			detail: 'Detalle',
			rate: 25,
			unit: 'plaza y día',
			capacity: 'Dos plazas',
			description: 'Descripción',
			fill: '#279583',
			textColor: '#ffffff',
			rect: { x: 75, y: 0, width: 25, height: 100 }
		}
	],
	known: ['Dato conocido'],
	unknown: ['Dato pendiente'],
	trace: [{ label: 'Planificación', detail: 'Publicada', state: 'verified' }],
	sources: [
		{
			id: 'boe',
			kind: 'primary',
			organization: 'BOE',
			title: 'Resolución',
			date: '19 de junio de 2026',
			url: 'https://www.boe.es/',
			status: 'Fuente primaria',
			whatItProves: 'Planificación oficial'
		},
		{
			id: 'uhn-plus',
			kind: 'publication_analyzed',
			organization: 'UHN Plus',
			title: 'Artículo analizado',
			date: '19 de junio de 2026',
			url: 'https://www.uhnplus.com/noticia/',
			status: 'Publicación analizada',
			claimSummary: 'Afirmación sometida a contraste',
			editorialUse: 'No se usa como prueba oficial'
		}
	],
	accent: '#176056',
	detailVariant: 'asylum_wall',
	verificationStatus: 'Planificación verificada',
	detailDescription: 'Descripción editorial',
	disclaimer: 'No equivale a gasto pagado.',
	sortOrder: 1,
	updatedAt: '2026-08-22T00:00:00.000Z'
};

describe('public spending domain', () => {
	it('reconcilia el desglose y calcula proporciones con el total recibido', () => {
		expect(publicSpendingBreakdownTotal(asylumInvestigation)).toBe(200);
		expect(publicSpendingShare(50, asylumInvestigation.amount)).toBe(25);
	});

	it('cuenta solo fuentes primarias, no la publicación analizada', () => {
		expect(publicSpendingPrimarySourceCount([asylumInvestigation])).toBe(1);
		expect(asylumInvestigation.sources.filter(isPublicSpendingClaimSource)).toHaveLength(1);
	});

	it('valida que el detalle especial contiene muro y contraste editorial completos', () => {
		expect(isPublicSpendingAsylumInvestigation(asylumInvestigation)).toBe(true);
	});
});
