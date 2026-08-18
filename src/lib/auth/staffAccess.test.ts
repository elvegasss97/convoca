import { describe, expect, it } from 'vitest';
import { isStaffRole, nextMfaStep } from './staffAccess';

describe('isStaffRole', () => {
	it('moderator y admin cuentan como staff', () => {
		expect(isStaffRole('moderator')).toBe(true);
		expect(isStaffRole('admin')).toBe(true);
	});

	it('organizer y cualquier otro valor no cuentan como staff', () => {
		expect(isStaffRole('organizer')).toBe(false);
		expect(isStaffRole('')).toBe(false);
		expect(isStaffRole('admin ')).toBe(false);
	});
});

describe('nextMfaStep', () => {
	it('proceed cuando la sesión ya está en aal2', () => {
		expect(nextMfaStep('aal2', 'aal2')).toBe('proceed');
		// currentLevel manda incluso si nextLevel viniera raro (defensivo).
		expect(nextMfaStep('aal2', 'aal1')).toBe('proceed');
	});

	it('verify cuando hay un factor verificado pero la sesión sigue en aal1', () => {
		expect(nextMfaStep('aal1', 'aal2')).toBe('verify');
	});

	it('enroll cuando no hay ningún factor verificado', () => {
		expect(nextMfaStep('aal1', 'aal1')).toBe('enroll');
	});

	it('enroll también si currentLevel/nextLevel llegan null (defensivo)', () => {
		expect(nextMfaStep(null, null)).toBe('enroll');
		expect(nextMfaStep(null, 'aal1')).toBe('enroll');
	});
});
