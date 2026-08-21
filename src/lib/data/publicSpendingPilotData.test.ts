import { describe, expect, it } from 'vitest';
import {
	publicSpendingPilot,
	publicSpendingShare,
	publicSpendingWallItems
} from './publicSpendingPilotData';

describe('public spending pilot data', () => {
	it('reconciles every wall block with the official planned total', () => {
		const total = publicSpendingWallItems.reduce((sum, item) => sum + item.amount, 0);
		expect(total).toBe(publicSpendingPilot.plannedTotal);
	});

	it('keeps the reinforced-vulnerability calculation explicit', () => {
		const reinforced = publicSpendingWallItems.find(
			(item) => item.id === 'acogida-vulnerable-reforzada'
		);
		expect(reinforced).toBeDefined();
		expect(reinforced?.amount).toBe(55 * 365 * 150);
		expect(publicSpendingShare(reinforced?.amount ?? 0)).toBeCloseTo(0.4491, 3);
	});

	it('uses rectangles that cover the complete wall without inflating the small block', () => {
		const area = publicSpendingWallItems.reduce(
			(sum, item) => sum + (item.rect.width * item.rect.height) / 100,
			0
		);
		expect(area).toBeCloseTo(100, 2);
	});
});
