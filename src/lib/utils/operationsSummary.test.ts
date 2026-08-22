import { describe, expect, it } from 'vitest';
import { buildAttentionItems, totalPendingModerationItems } from './operationsSummary';

const ZERO = {
	openVoicePending: 0,
	publicSpendingPending: 0,
	eventsReported: 0,
	channelsReported: 0,
	municipalPetitionsReported: 0,
	eventsPending: 0,
	documentsPending: 0,
	proposalsPending: 0,
	alternativesPending: 0
};

describe('buildAttentionItems', () => {
	it('vacío cuando todas las colas están a cero — estado positivo, no una lista vacía por omisión', () => {
		expect(buildAttentionItems(ZERO)).toEqual([]);
	});

	it('una entrada por cola no vacía, en el mismo orden que la navegación', () => {
		const items = buildAttentionItems({
			...ZERO,
			openVoicePending: 2,
			publicSpendingPending: 1,
			eventsPending: 1,
			documentsPending: 3
		});
		expect(items.map((i) => i.key)).toEqual([
			'vozAbierta',
			'gastoPublico',
			'pendientes',
			'documentacion'
		]);
	});

	it('singular/plural correcto en el texto', () => {
		const [one] = buildAttentionItems({ ...ZERO, eventsPending: 1 });
		expect(one.label).toBe('1 convocatoria pendiente de revisión');
		const [many] = buildAttentionItems({ ...ZERO, eventsPending: 3 });
		expect(many.label).toBe('3 convocatorias pendientes de revisión');
	});

	it('las tres colas reportadas comparten destino y tono crítico', () => {
		const items = buildAttentionItems({
			...ZERO,
			eventsReported: 1,
			channelsReported: 2,
			municipalPetitionsReported: 3
		});
		expect(items).toHaveLength(3);
		expect(items.every((i) => i.key === 'reportadas')).toBe(true);
		expect(items.every((i) => i.tone === 'critical')).toBe(true);
	});

	it('las colas reportadas usan tono crítico; el resto, warning', () => {
		const items = buildAttentionItems({
			...ZERO,
			eventsReported: 1,
			eventsPending: 1,
			documentsPending: 1,
			openVoicePending: 1,
			proposalsPending: 1,
			alternativesPending: 1
		});
		const reported = items.find((i) => i.key === 'reportadas');
		const others = items.filter((i) => i.key !== 'reportadas');
		expect(reported?.tone).toBe('critical');
		expect(others.every((i) => i.tone === 'warning')).toBe(true);
	});
});

describe('totalPendingModerationItems', () => {
	it('0 cuando todo está a cero', () => {
		expect(totalPendingModerationItems(ZERO)).toBe(0);
	});

	it('suma las colas de moderación, pero NO las reportadas (son una categoría distinta)', () => {
		const total = totalPendingModerationItems({
			...ZERO,
			eventsPending: 2,
			documentsPending: 1,
			openVoicePending: 3,
			publicSpendingPending: 2,
			proposalsPending: 1,
			alternativesPending: 1,
			eventsReported: 10,
			channelsReported: 10,
			municipalPetitionsReported: 10
		});
		expect(total).toBe(10);
	});
});
