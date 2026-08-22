export type PublicSpendingStage = 'planificado' | 'regulado' | 'concedido' | 'adjudicado';
export type PublicSpendingTraceState = 'verified' | 'current' | 'pending';
export type PublicSpendingSourceKind = 'primary' | 'publication_analyzed';
export type PublicSpendingDetailVariant = 'standard' | 'asylum_wall';

export interface PublicSpendingRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface PublicSpendingInvestigationSource {
	id: string;
	kind: PublicSpendingSourceKind;
	organization: string;
	title: string;
	date: string;
	url: string;
	status: 'Fuente primaria' | 'Publicación analizada';
	whatItProves?: string;
	claimSummary?: string;
	editorialUse?: string;
}

export interface PublicSpendingBreakdownItem {
	id: string;
	label: string;
	amount: number;
	detail: string;
	place?: string;
	shortLabel?: string;
	rate?: number;
	unit?: string;
	capacity?: string;
	description?: string;
	fill?: string;
	textColor?: string;
	rect?: PublicSpendingRect;
	compact?: boolean;
}

export interface PublicSpendingWallItem extends PublicSpendingBreakdownItem {
	shortLabel: string;
	rate: number;
	unit: string;
	capacity: string;
	description: string;
	fill: string;
	textColor: string;
	rect: PublicSpendingRect;
}

export interface PublicSpendingTraceStep {
	label: string;
	detail: string;
	state: PublicSpendingTraceState;
}

export interface PublicSpendingExplainerFigure {
	id: string;
	value: string;
	question: string;
	explanation: string;
}

export interface PublicSpendingInvestigation {
	slug: string;
	title: string;
	shortTitle: string;
	eyebrow: string;
	stage: PublicSpendingStage;
	amount: number;
	amountApproximate: boolean;
	amountQualifier: string;
	period: string;
	publishedOn: string;
	publishedAt: string;
	reviewedOn: string;
	reviewedAt: string;
	category: string;
	territory: string;
	manager: string;
	recipient: string;
	summary: string;
	citizenIntro: string;
	fundingOrigin: string;
	fundingDestination: string;
	citizenTakeaway: string;
	explainerFigures: PublicSpendingExplainerFigure[];
	whyItMatters: string;
	evidenceNote: string;
	featuredMetric: string;
	featuredLabel: string;
	breakdownTitle: string;
	breakdownNote: string;
	breakdownCoverage: 'complete' | 'selected';
	breakdown: PublicSpendingBreakdownItem[];
	known: string[];
	unknown: string[];
	trace: PublicSpendingTraceStep[];
	sources: PublicSpendingInvestigationSource[];
	accent: string;
	detailVariant: PublicSpendingDetailVariant;
	verificationStatus?: string;
	detailDescription?: string;
	disclaimer?: string;
	sortOrder: number;
	updatedAt: string;
}

export interface PublicSpendingClaimSource extends PublicSpendingInvestigationSource {
	kind: 'publication_analyzed';
	status: 'Publicación analizada';
	claimSummary: string;
	editorialUse: string;
}

export interface PublicSpendingPrimarySource extends PublicSpendingInvestigationSource {
	kind: 'primary';
	status: 'Fuente primaria';
	whatItProves: string;
}

export interface PublicSpendingAsylumInvestigation extends PublicSpendingInvestigation {
	detailVariant: 'asylum_wall';
	verificationStatus: string;
	detailDescription: string;
	disclaimer: string;
	breakdown: PublicSpendingWallItem[];
}

export const publicSpendingStageLabels: Record<PublicSpendingStage, string> = {
	planificado: 'Planificado',
	regulado: 'Regulado',
	concedido: 'Concedido',
	adjudicado: 'Adjudicado'
};

export function publicSpendingBreakdownTotal(investigation: PublicSpendingInvestigation): number {
	return investigation.breakdown.reduce((sum, item) => sum + item.amount, 0);
}

export function publicSpendingMaxAmount(investigations: PublicSpendingInvestigation[]): number {
	return Math.max(0, ...investigations.map((investigation) => investigation.amount));
}

export function publicSpendingPrimarySourceCount(
	investigations: PublicSpendingInvestigation[]
): number {
	return investigations.reduce(
		(total, investigation) =>
			total + investigation.sources.filter((source) => source.kind === 'primary').length,
		0
	);
}

export function publicSpendingShare(amount: number, total: number): number {
	return total > 0 ? (amount / total) * 100 : 0;
}

export function isPublicSpendingClaimSource(
	source: PublicSpendingInvestigationSource
): source is PublicSpendingClaimSource {
	return (
		source.kind === 'publication_analyzed' &&
		Boolean(source.claimSummary) &&
		Boolean(source.editorialUse)
	);
}

export function isPublicSpendingPrimarySource(
	source: PublicSpendingInvestigationSource
): source is PublicSpendingPrimarySource {
	return source.kind === 'primary' && Boolean(source.whatItProves);
}

export function isPublicSpendingWallItem(
	item: PublicSpendingBreakdownItem
): item is PublicSpendingWallItem {
	return (
		Boolean(item.shortLabel) &&
		typeof item.rate === 'number' &&
		Boolean(item.unit) &&
		Boolean(item.capacity) &&
		Boolean(item.description) &&
		Boolean(item.fill) &&
		Boolean(item.textColor) &&
		Boolean(item.rect)
	);
}

export function isPublicSpendingAsylumInvestigation(
	investigation: PublicSpendingInvestigation
): investigation is PublicSpendingAsylumInvestigation {
	return (
		investigation.detailVariant === 'asylum_wall' &&
		Boolean(investigation.verificationStatus) &&
		Boolean(investigation.detailDescription) &&
		Boolean(investigation.disclaimer) &&
		investigation.breakdown.length > 0 &&
		investigation.breakdown.every(isPublicSpendingWallItem) &&
		investigation.sources.some(isPublicSpendingClaimSource)
	);
}
