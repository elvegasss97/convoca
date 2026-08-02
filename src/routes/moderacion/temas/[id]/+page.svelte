<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		ArrowLeft,
		Save,
		Plus,
		Trash2,
		Pencil,
		ArrowUp,
		ArrowDown,
		Eye,
		EyeOff,
		Check,
		X as XIcon,
		AlertCircle,
		ExternalLink,
		History
	} from '@lucide/svelte';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import type { PageData } from './$types';
	import type {
		Concern,
		ConcernCategory,
		ParticipationRound,
		ParticipationRoundStatus,
		Topic,
		TopicMeasure,
		TopicMeasureAlternative,
		TopicMeasureAxis,
		TopicRisk,
		TopicStatus,
		TopicTimelinePhase
	} from '$lib/types';
	import Seo from '$lib/components/Seo.svelte';
	import NoteDialog from '$lib/components/NoteDialog.svelte';
	import { concernCategoryLabels, topicStatusLabels } from '$lib/labels';
	import {
		createTopic,
		updateTopic,
		type TopicInput,
		createTopicSource,
		deleteTopicSource,
		createTopicDataPoint,
		deleteTopicDataPoint,
		linkTopicConcern,
		unlinkTopicConcern,
		createTopicMeasureAxis,
		updateTopicMeasureAxis,
		deleteTopicMeasureAxis,
		type TopicMeasureAxisInput,
		createTopicMeasure,
		updateTopicMeasure,
		reorderTopicMeasure,
		deleteTopicMeasure,
		type TopicMeasureInput,
		linkMeasureSource,
		unlinkMeasureSource,
		createTopicTimelinePhase,
		updateTopicTimelinePhase,
		deleteTopicTimelinePhase,
		type TopicTimelinePhaseInput,
		createTopicRisk,
		updateTopicRisk,
		deleteTopicRisk,
		type TopicRiskInput,
		publishTopicVersion,
		reviewMeasureAlternative,
		type PendingAlternativeGroup,
		moderateDevelopedProposal,
		type ProposalModerationInput
	} from '$lib/services/topicsService';
	import { createParticipationRound, setRoundStatus } from '$lib/services/participationService';

	let { data }: { data: PageData } = $props();

	let currentTopic = $state<Topic | null>(data.topic);
	const isNew = $derived(currentTopic === null);

	/** "Título\nOtro título" (textarea) <-> ["Título", "Otro título"] (lista real). */
	function linesToList(text: string): string[] {
		return text
			.split('\n')
			.map((l) => l.trim())
			.filter(Boolean);
	}
	function listToLines(list: string[]): string {
		return list.join('\n');
	}

	// --- Cabecera + el problema ---------------------------------------------
	let title = $state(currentTopic?.title ?? '');
	let summary = $state(currentTopic?.summary ?? '');
	let category = $state<ConcernCategory | ''>(currentTopic?.category ?? '');
	let coverImageUrl = $state(currentTopic?.coverImageUrl ?? '');
	let status = $state<TopicStatus>(currentTopic?.status ?? 'draft');
	let version = $state(currentTopic?.version ?? '1');
	let documentTitle = $state(currentTopic?.documentTitle ?? '');
	let investmentRange = $state(currentTopic?.investmentRange ?? '');
	let investmentGdpPercent = $state(currentTopic?.investmentGdpPercent ?? '');
	let referenceGoal = $state(currentTopic?.referenceGoal ?? '');
	let problemIntro = $state(currentTopic?.problemIntro ?? '');
	let budgetNarrative = $state(currentTopic?.budgetNarrative ?? '');
	let evaluationRules = $state(currentTopic?.evaluationRules ?? '');
	let risksOverviewText = $state(listToLines(currentTopic?.risksOverview ?? []));
	let successIndicatorsText = $state(listToLines(currentTopic?.successIndicators ?? []));

	let savingBasics = $state(false);
	let basicsError = $state<string | null>(null);
	let basicsSaved = $state(false);

	async function saveBasics() {
		if (title.trim().length < 5) {
			basicsError = 'El título debe tener al menos 5 caracteres.';
			return;
		}
		savingBasics = true;
		basicsError = null;
		basicsSaved = false;
		try {
			const input: TopicInput = {
				title,
				summary,
				category: category || undefined,
				coverImageUrl: coverImageUrl || undefined,
				status,
				documentTitle: documentTitle || undefined,
				problemIntro,
				budgetNarrative: budgetNarrative || undefined,
				evaluationRules: evaluationRules || undefined,
				investmentRange: investmentRange || undefined,
				investmentGdpPercent: investmentGdpPercent || undefined,
				referenceGoal: referenceGoal || undefined,
				risksOverview: linesToList(risksOverviewText),
				successIndicators: linesToList(successIndicatorsText),
				version
			};
			if (!currentTopic) {
				const created = await createTopic(input, data.session.user.id);
				currentTopic = created;
				basicsSaved = true;
				await goto(`/moderacion/temas/${created.id}`, { replaceState: true });
			} else {
				currentTopic = await updateTopic(currentTopic.id, input, currentTopic.status);
				basicsSaved = true;
				setTimeout(() => (basicsSaved = false), 2000);
			}
		} catch (err) {
			basicsError = err instanceof Error ? err.message : 'No se ha podido guardar el tema.';
		} finally {
			savingBasics = false;
		}
	}

	// --- Fuentes --------------------------------------------------------------
	let sources = $state(data.sources);
	let newSourceLabel = $state('');
	let newSourceUrl = $state('');
	let newSourceNote = $state('');

	async function addSource() {
		if (!currentTopic || newSourceLabel.trim().length === 0) return;
		const created = await createTopicSource(currentTopic.id, {
			label: newSourceLabel,
			url: newSourceUrl || undefined,
			note: newSourceNote || undefined,
			sortOrder: sources.length
		});
		sources = [...sources, created];
		newSourceLabel = '';
		newSourceUrl = '';
		newSourceNote = '';
	}

	async function removeSource(id: string) {
		await deleteTopicSource(id);
		sources = sources.filter((s) => s.id !== id);
	}

	// --- Datos destacados -------------------------------------------------
	let dataPoints = $state(data.dataPoints);
	let newDataLabel = $state('');
	let newDataValue = $state('');
	let newDataExplanation = $state('');
	let newDataTimeScope = $state('');
	let newDataSourceId = $state('');

	async function addDataPoint() {
		if (!currentTopic || newDataLabel.trim().length === 0 || newDataValue.trim().length === 0)
			return;
		const created = await createTopicDataPoint(currentTopic.id, {
			label: newDataLabel,
			value: newDataValue,
			explanation: newDataExplanation || undefined,
			timeScope: newDataTimeScope || undefined,
			sourceId: newDataSourceId || undefined,
			sortOrder: dataPoints.length
		});
		dataPoints = [...dataPoints, created];
		newDataLabel = '';
		newDataValue = '';
		newDataExplanation = '';
		newDataTimeScope = '';
		newDataSourceId = '';
	}

	async function removeDataPoint(id: string) {
		await deleteTopicDataPoint(id);
		dataPoints = dataPoints.filter((d) => d.id !== id);
	}

	// --- Preguntas de Pulso vinculadas -------------------------------------
	let linkedConcerns = $state<Concern[]>(data.linkedConcerns);
	let selectedConcernToLink = $state('');
	const linkableConcerns = $derived(
		data.allConcerns.filter((c) => !linkedConcerns.some((lc) => lc.id === c.id))
	);

	async function addConcernLink() {
		if (!currentTopic || !selectedConcernToLink) return;
		await linkTopicConcern(currentTopic.id, selectedConcernToLink);
		const concern = data.allConcerns.find((c) => c.id === selectedConcernToLink);
		if (concern) linkedConcerns = [...linkedConcerns, concern];
		selectedConcernToLink = '';
	}

	async function removeConcernLink(concernId: string) {
		if (!currentTopic) return;
		await unlinkTopicConcern(currentTopic.id, concernId);
		linkedConcerns = linkedConcerns.filter((c) => c.id !== concernId);
	}

	// --- Ejes (agrupación visual de medidas) --------------------------------
	let axes = $state<TopicMeasureAxis[]>(data.axes);
	let editingAxisId = $state<string | null>(null); // 'new' | axis id | null
	let axisTitleForm = $state('');

	function startNewAxis() {
		editingAxisId = 'new';
		axisTitleForm = '';
	}
	function startEditAxis(axis: TopicMeasureAxis) {
		editingAxisId = axis.id;
		axisTitleForm = axis.title;
	}
	async function saveAxis() {
		if (!currentTopic || axisTitleForm.trim().length < 3) return;
		const input: TopicMeasureAxisInput = { title: axisTitleForm };
		if (editingAxisId === 'new') {
			const created = await createTopicMeasureAxis(currentTopic.id, {
				...input,
				sortOrder: axes.length
			});
			axes = [...axes, created];
		} else if (editingAxisId) {
			const updated = await updateTopicMeasureAxis(editingAxisId, input);
			axes = axes.map((a) => (a.id === updated.id ? updated : a));
		}
		editingAxisId = null;
	}
	async function moveAxis(index: number, direction: 'up' | 'down') {
		const otherIndex = direction === 'up' ? index - 1 : index + 1;
		if (otherIndex < 0 || otherIndex >= axes.length) return;
		const target = axes[index];
		const other = axes[otherIndex];
		await Promise.all([
			updateTopicMeasureAxis(target.id, { title: target.title, sortOrder: other.sortOrder }),
			updateTopicMeasureAxis(other.id, { title: other.title, sortOrder: target.sortOrder })
		]);
		const next = [...axes];
		next[index] = { ...other, sortOrder: target.sortOrder };
		next[otherIndex] = { ...target, sortOrder: other.sortOrder };
		axes = next.sort((a, b) => a.sortOrder - b.sortOrder);
	}
	async function removeAxis(id: string) {
		await deleteTopicMeasureAxis(id);
		axes = axes.filter((a) => a.id !== id);
		measures = measures.map((m) => (m.axisId === id ? { ...m, axisId: undefined } : m));
	}

	// --- Medidas ("Soluciones") --------------------------------------------
	let measures = $state<TopicMeasure[]>(data.measures);
	let measureSourceIds = $state<Map<string, string[]>>(data.measureSourceIds);
	let editingMeasureId = $state<string | null>(null); // 'new' | measure id | null
	const emptyMeasureForm: TopicMeasureInput = {
		axisId: undefined,
		title: '',
		summary: '',
		problemAddressed: '',
		explanation: '',
		howItWorks: '',
		responsibleScope: '',
		estimatedCost: '',
		timeframe: '',
		argumentsFor: '',
		risks: '',
		indicators: [],
		isPublished: true
	};
	let measureForm = $state<TopicMeasureInput>({ ...emptyMeasureForm });
	let measureIndicatorsText = $state('');
	let measureFormSourceIds = $state<Set<string>>(new Set());

	function startNewMeasure() {
		editingMeasureId = 'new';
		measureForm = { ...emptyMeasureForm };
		measureIndicatorsText = '';
		measureFormSourceIds = new Set();
	}

	function startEditMeasure(measure: TopicMeasure) {
		editingMeasureId = measure.id;
		measureForm = {
			axisId: measure.axisId,
			title: measure.title,
			summary: measure.summary ?? '',
			problemAddressed: measure.problemAddressed ?? '',
			explanation: measure.explanation,
			howItWorks: measure.howItWorks ?? '',
			responsibleScope: measure.responsibleScope ?? '',
			estimatedCost: measure.estimatedCost ?? '',
			timeframe: measure.timeframe ?? '',
			argumentsFor: measure.argumentsFor ?? '',
			risks: measure.risks ?? '',
			indicators: [...measure.indicators],
			isPublished: measure.isPublished
		};
		measureIndicatorsText = listToLines(measure.indicators);
		measureFormSourceIds = new Set(measureSourceIds.get(measure.id) ?? []);
	}

	function cancelMeasureEdit() {
		editingMeasureId = null;
	}

	async function syncMeasureSources(measureId: string) {
		const before = new Set(measureSourceIds.get(measureId) ?? []);
		const after = measureFormSourceIds;
		const toAdd = [...after].filter((id) => !before.has(id));
		const toRemove = [...before].filter((id) => !after.has(id));
		await Promise.all([
			...toAdd.map((id) => linkMeasureSource(measureId, id)),
			...toRemove.map((id) => unlinkMeasureSource(measureId, id))
		]);
		const next = new SvelteMap(measureSourceIds);
		next.set(measureId, [...after]);
		measureSourceIds = next;
	}

	async function saveMeasure() {
		if (!currentTopic || measureForm.title.trim().length < 3) return;
		const input: TopicMeasureInput = {
			...measureForm,
			indicators: linesToList(measureIndicatorsText)
		};
		if (editingMeasureId === 'new') {
			const created = await createTopicMeasure(currentTopic.id, input, measures.length);
			measures = [...measures, created];
			await syncMeasureSources(created.id);
		} else if (editingMeasureId) {
			const updated = await updateTopicMeasure(editingMeasureId, input);
			measures = measures.map((m) => (m.id === updated.id ? updated : m));
			await syncMeasureSources(updated.id);
		}
		editingMeasureId = null;
	}

	async function togglePublished(measure: TopicMeasure) {
		const updated = await updateTopicMeasure(measure.id, {
			axisId: measure.axisId,
			title: measure.title,
			summary: measure.summary,
			problemAddressed: measure.problemAddressed,
			explanation: measure.explanation,
			howItWorks: measure.howItWorks,
			responsibleScope: measure.responsibleScope,
			estimatedCost: measure.estimatedCost,
			timeframe: measure.timeframe,
			argumentsFor: measure.argumentsFor,
			risks: measure.risks,
			indicators: measure.indicators,
			isPublished: !measure.isPublished
		});
		measures = measures.map((m) => (m.id === updated.id ? updated : m));
	}

	async function moveMeasure(index: number, direction: 'up' | 'down') {
		const otherIndex = direction === 'up' ? index - 1 : index + 1;
		if (otherIndex < 0 || otherIndex >= measures.length) return;
		const target = measures[index];
		const other = measures[otherIndex];
		await Promise.all([
			reorderTopicMeasure(target.id, other.sortOrder),
			reorderTopicMeasure(other.id, target.sortOrder)
		]);
		const next = [...measures];
		next[index] = { ...other, sortOrder: target.sortOrder };
		next[otherIndex] = { ...target, sortOrder: other.sortOrder };
		measures = next.sort((a, b) => a.sortOrder - b.sortOrder);
	}

	async function removeMeasure(id: string) {
		await deleteTopicMeasure(id);
		measures = measures.filter((m) => m.id !== id);
	}

	function axisTitle(axisId?: string): string {
		return axes.find((a) => a.id === axisId)?.title ?? 'Sin eje';
	}

	// --- Calendario (fases) --------------------------------------------------
	let timelinePhases = $state<TopicTimelinePhase[]>(data.timelinePhases);
	let editingPhaseId = $state<string | null>(null); // 'new' | phase id | null
	let phaseForm = $state<TopicTimelinePhaseInput>({ title: '', description: '' });
	let phaseItemsText = $state('');

	function startNewPhase() {
		editingPhaseId = 'new';
		phaseForm = { title: '', description: '' };
		phaseItemsText = '';
	}
	function startEditPhase(phase: TopicTimelinePhase) {
		editingPhaseId = phase.id;
		phaseForm = { title: phase.title, description: phase.description };
		phaseItemsText = listToLines(phase.items);
	}
	async function savePhase() {
		if (!currentTopic || phaseForm.title.trim().length < 3) return;
		const input: TopicTimelinePhaseInput = { ...phaseForm, items: linesToList(phaseItemsText) };
		if (editingPhaseId === 'new') {
			const created = await createTopicTimelinePhase(currentTopic.id, {
				...input,
				sortOrder: timelinePhases.length
			});
			timelinePhases = [...timelinePhases, created];
		} else if (editingPhaseId) {
			const updated = await updateTopicTimelinePhase(editingPhaseId, input);
			timelinePhases = timelinePhases.map((p) => (p.id === updated.id ? updated : p));
		}
		editingPhaseId = null;
	}
	async function movePhase(index: number, direction: 'up' | 'down') {
		const otherIndex = direction === 'up' ? index - 1 : index + 1;
		if (otherIndex < 0 || otherIndex >= timelinePhases.length) return;
		const target = timelinePhases[index];
		const other = timelinePhases[otherIndex];
		await Promise.all([
			updateTopicTimelinePhase(target.id, {
				title: target.title,
				description: target.description,
				items: target.items,
				sortOrder: other.sortOrder
			}),
			updateTopicTimelinePhase(other.id, {
				title: other.title,
				description: other.description,
				items: other.items,
				sortOrder: target.sortOrder
			})
		]);
		const next = [...timelinePhases];
		next[index] = { ...other, sortOrder: target.sortOrder };
		next[otherIndex] = { ...target, sortOrder: other.sortOrder };
		timelinePhases = next.sort((a, b) => a.sortOrder - b.sortOrder);
	}
	async function removePhase(id: string) {
		await deleteTopicTimelinePhase(id);
		timelinePhases = timelinePhases.filter((p) => p.id !== id);
	}

	// --- Riesgos generales del tema ("qué podría salir mal") ----------------
	let risks = $state<TopicRisk[]>(data.risks);
	let editingRiskId = $state<string | null>(null); // 'new' | risk id | null
	let riskForm = $state<TopicRiskInput>({ title: '' });

	function startNewRisk() {
		editingRiskId = 'new';
		riskForm = { title: '' };
	}
	function startEditRisk(risk: TopicRisk) {
		editingRiskId = risk.id;
		riskForm = {
			title: risk.title,
			description: risk.description ?? '',
			signals: risk.signals ?? '',
			mitigation: risk.mitigation ?? '',
			decisionTrigger: risk.decisionTrigger ?? ''
		};
	}
	async function saveRisk() {
		if (!currentTopic || riskForm.title.trim().length < 3) return;
		if (editingRiskId === 'new') {
			const created = await createTopicRisk(currentTopic.id, {
				...riskForm,
				sortOrder: risks.length
			});
			risks = [...risks, created];
		} else if (editingRiskId) {
			const updated = await updateTopicRisk(editingRiskId, riskForm);
			risks = risks.map((r) => (r.id === updated.id ? updated : r));
		}
		editingRiskId = null;
	}
	async function removeRisk(id: string) {
		await deleteTopicRisk(id);
		risks = risks.filter((r) => r.id !== id);
	}

	// --- Historial de versiones ----------------------------------------------
	let versions = $state(data.versions);
	let newVersionNote = $state('');
	let publishingVersion = $state(false);

	async function publishVersion() {
		if (!currentTopic) return;
		publishingVersion = true;
		try {
			const created = await publishTopicVersion(
				currentTopic.id,
				version,
				data.session.user.id,
				newVersionNote || undefined
			);
			versions = [created, ...versions];
			newVersionNote = '';
		} finally {
			publishingVersion = false;
		}
	}

	// --- Alternativas ciudadanas pendientes (de este tema) ------------------
	let pendingAlternatives = $state<PendingAlternativeGroup[]>(data.pendingAlternatives);
	let rejectTarget = $state<PendingAlternativeGroup | null>(null);
	let rejectOpen = $state(false);

	async function approveAlternative(group: PendingAlternativeGroup) {
		await reviewMeasureAlternative(group.alternative.id, 'approved', data.session.user.id);
		pendingAlternatives = pendingAlternatives.filter(
			(g) => g.alternative.id !== group.alternative.id
		);
	}

	function openReject(group: PendingAlternativeGroup) {
		rejectTarget = group;
		rejectOpen = true;
	}

	async function confirmReject(note: string) {
		if (!rejectTarget) return;
		await reviewMeasureAlternative(
			rejectTarget.alternative.id,
			'rejected',
			data.session.user.id,
			note || undefined
		);
		pendingAlternatives = pendingAlternatives.filter(
			(g) => g.alternative.id !== rejectTarget!.alternative.id
		);
	}

	// --- Rondas de participación ----------------------------------------------
	let rounds = $state<ParticipationRound[]>(data.rounds);
	const latestRound = $derived(rounds[0]);
	let creatingRound = $state(false);

	async function createRound() {
		if (!currentTopic) return;
		creatingRound = true;
		try {
			const created = await createParticipationRound(
				currentTopic.id,
				{ versionLabel: version },
				data.session.user.id
			);
			rounds = [created, ...rounds];
		} finally {
			creatingRound = false;
		}
	}

	async function changeRoundStatus(round: ParticipationRound, status: ParticipationRoundStatus) {
		const updated = await setRoundStatus(round.id, status);
		rounds = rounds.map((r) => (r.id === updated.id ? updated : r));
	}

	// --- Moderación de propuestas desarrolladas ------------------------------
	let pendingProposals = $state<TopicMeasureAlternative[]>(data.pendingProposals);
	let editingProposalId = $state<string | null>(null);
	let proposalModeration = $state<ProposalModerationInput>({ status: 'publicada' });

	function measureTitleFor(measureId?: string): string {
		return measures.find((m) => m.id === measureId)?.title ?? 'Medida eliminada';
	}

	function startModerateProposal(proposal: TopicMeasureAlternative) {
		editingProposalId = proposal.id;
		proposalModeration = {
			status: proposal.status,
			reviewerNote: proposal.reviewerNote ?? '',
			editorialResponse: proposal.editorialResponse ?? '',
			linkedVersionLabel: proposal.linkedVersionLabel ?? ''
		};
	}

	async function saveProposalModeration(proposalId: string) {
		const updated = await moderateDevelopedProposal(
			proposalId,
			data.session.user.id,
			proposalModeration
		);
		if (
			['enviada', 'pendiente_revision', 'necesita_cambios', 'en_estudio'].includes(updated.status)
		) {
			pendingProposals = pendingProposals.map((p) => (p.id === updated.id ? updated : p));
		} else {
			pendingProposals = pendingProposals.filter((p) => p.id !== updated.id);
		}
		editingProposalId = null;
	}
</script>

<Seo
	title={isNew ? 'Nuevo tema' : `Editar: ${currentTopic?.title}`}
	description="Edición interna de un tema de Pulso ciudadano."
	noindex
/>

<div class="mx-auto max-w-3xl px-4 pt-4 pb-16 sm:px-6">
	<div class="flex items-center justify-between gap-2">
		<a
			href="/moderacion"
			class="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800"
		>
			<ArrowLeft class="size-4" /> Volver a moderación
		</a>
		{#if currentTopic}
			<a
				href={`/pulso/soluciones/${currentTopic.slug}`}
				target="_blank"
				rel="noopener noreferrer"
				class="mb-4 flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
			>
				<ExternalLink class="size-4" /> Vista previa
			</a>
		{/if}
	</div>

	<h1 class="font-display text-2xl font-semibold text-ink-900">
		{isNew ? 'Nuevo tema' : 'Editar tema'}
	</h1>
	<p class="mt-1 text-sm text-ink-500">
		Recuerda: ningún contenido político se redacta aquí automáticamente. Usa placeholders como
		"Contenido pendiente" hasta tener el texto definitivo.
	</p>

	<!-- Cabecera + el problema -->
	<section class="mt-5 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
		<h2 class="font-display text-base font-semibold text-ink-900">Cabecera y problema</h2>
		<div class="mt-3 space-y-3">
			{#if basicsError}
				<div
					class="flex items-start gap-2 rounded-xl border border-critical-300 bg-critical-50 p-3 text-sm text-critical-700"
					role="alert"
				>
					<AlertCircle class="mt-0.5 size-4 shrink-0" />
					{basicsError}
				</div>
			{/if}
			<div>
				<label for="topic-title" class="mb-1 block text-sm font-medium text-ink-700">Título</label>
				<input
					id="topic-title"
					bind:value={title}
					class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
				/>
			</div>
			<div>
				<label for="topic-document-title" class="mb-1 block text-sm font-medium text-ink-700"
					>Nombre del documento/plan (opcional)</label
				>
				<input
					id="topic-document-title"
					bind:value={documentTitle}
					placeholder="P. ej. Plan Vivienda 2036"
					class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
				/>
			</div>
			<div>
				<label for="topic-summary" class="mb-1 block text-sm font-medium text-ink-700"
					>Resumen breve</label
				>
				<textarea
					id="topic-summary"
					bind:value={summary}
					rows="2"
					class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
				></textarea>
			</div>
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label for="topic-category" class="mb-1 block text-sm font-medium text-ink-700"
						>Categoría</label
					>
					<select
						id="topic-category"
						bind:value={category}
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					>
						<option value="">Categoría pendiente</option>
						{#each Object.entries(concernCategoryLabels) as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="topic-status" class="mb-1 block text-sm font-medium text-ink-700"
						>Estado</label
					>
					<select
						id="topic-status"
						bind:value={status}
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					>
						{#each Object.entries(topicStatusLabels) as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</select>
				</div>
			</div>
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label for="topic-version" class="mb-1 block text-sm font-medium text-ink-700"
						>Versión</label
					>
					<input
						id="topic-version"
						bind:value={version}
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					/>
				</div>
				<div>
					<label for="topic-cover" class="mb-1 block text-sm font-medium text-ink-700"
						>Imagen (URL, opcional)</label
					>
					<input
						id="topic-cover"
						bind:value={coverImageUrl}
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					/>
				</div>
			</div>
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<div>
					<label for="topic-investment" class="mb-1 block text-sm font-medium text-ink-700"
						>Inversión estimada</label
					>
					<input
						id="topic-investment"
						bind:value={investmentRange}
						placeholder="P. ej. 10.000-12.000 M€/año"
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					/>
				</div>
				<div>
					<label for="topic-gdp" class="mb-1 block text-sm font-medium text-ink-700"
						>Esfuerzo (% PIB)</label
					>
					<input
						id="topic-gdp"
						bind:value={investmentGdpPercent}
						placeholder="P. ej. 0,6 % del PIB"
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					/>
				</div>
				<div>
					<label for="topic-goal" class="mb-1 block text-sm font-medium text-ink-700"
						>Objetivo de referencia</label
					>
					<input
						id="topic-goal"
						bind:value={referenceGoal}
						placeholder="P. ej. parque público 5% en 2036"
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					/>
				</div>
			</div>
			<div>
				<label for="topic-problem" class="mb-1 block text-sm font-medium text-ink-700"
					>Introducción a "el problema"</label
				>
				<textarea
					id="topic-problem"
					bind:value={problemIntro}
					rows="4"
					placeholder="Contenido pendiente."
					class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
				></textarea>
			</div>
			<div>
				<label for="topic-budget-narrative" class="mb-1 block text-sm font-medium text-ink-700"
					>Desglose económico completo (opcional, texto largo)</label
				>
				<textarea
					id="topic-budget-narrative"
					bind:value={budgetNarrative}
					rows="4"
					placeholder="Líneas presupuestarias, escenarios, distribución temporal…"
					class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
				></textarea>
			</div>
			<div>
				<label for="topic-evaluation-rules" class="mb-1 block text-sm font-medium text-ink-700"
					>Reglas de comprobación (opcional, texto largo)</label
				>
				<textarea
					id="topic-evaluation-rules"
					bind:value={evaluationRules}
					rows="4"
					placeholder="Evaluación anual/bienal/intermedia/final, condiciones para ampliar/modificar/suspender…"
					class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
				></textarea>
			</div>
			<div>
				<label for="topic-risks" class="mb-1 block text-sm font-medium text-ink-700"
					>Qué podría salir mal — lista breve heredada (una por línea, en desuso: usa la sección
					"Riesgos generales del tema" más abajo)</label
				>
				<textarea
					id="topic-risks"
					bind:value={risksOverviewText}
					rows="3"
					class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
				></textarea>
			</div>
			<div>
				<label for="topic-indicators" class="mb-1 block text-sm font-medium text-ink-700"
					>Cómo sabríamos si funciona (una por línea)</label
				>
				<textarea
					id="topic-indicators"
					bind:value={successIndicatorsText}
					rows="3"
					class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
				></textarea>
			</div>
			<button
				type="button"
				onclick={saveBasics}
				disabled={savingBasics}
				class="flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
			>
				<Save class="size-4" />
				{savingBasics
					? 'Guardando…'
					: basicsSaved
						? 'Guardado'
						: isNew
							? 'Crear tema'
							: 'Guardar cambios'}
			</button>
		</div>
	</section>

	{#if currentTopic}
		<!-- Fuentes -->
		<section class="mt-4 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
			<h2 class="font-display text-base font-semibold text-ink-900">Fuentes verificables</h2>
			<ul class="mt-2 flex flex-col gap-1.5">
				{#each sources as source (source.id)}
					<li
						class="flex items-center justify-between gap-2 rounded-xl border border-ink-100 p-2.5 text-sm"
					>
						<span class="truncate">{source.label}{source.url ? ` — ${source.url}` : ''}</span>
						<button
							type="button"
							onclick={() => removeSource(source.id)}
							class="hover:text-critical-600 shrink-0 rounded-full p-1 text-ink-400 hover:bg-critical-50"
							aria-label={`Quitar fuente ${source.label}`}
						>
							<Trash2 class="size-3.5" />
						</button>
					</li>
				{:else}
					<li class="text-sm text-ink-400">Fuente pendiente.</li>
				{/each}
			</ul>
			<div class="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
				<input
					bind:value={newSourceLabel}
					placeholder="Etiqueta"
					class="rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
				/>
				<input
					bind:value={newSourceUrl}
					placeholder="URL (opcional)"
					class="rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
				/>
				<input
					bind:value={newSourceNote}
					placeholder="Nota (opcional)"
					class="rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
				/>
			</div>
			<button
				type="button"
				onclick={addSource}
				class="mt-2 flex items-center gap-1.5 rounded-full border border-ink-200 px-3.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
			>
				<Plus class="size-3.5" /> Añadir fuente
			</button>
		</section>

		<!-- Datos destacados -->
		<section class="mt-4 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
			<h2 class="font-display text-base font-semibold text-ink-900">Datos destacados</h2>
			<ul class="mt-2 flex flex-col gap-1.5">
				{#each dataPoints as point (point.id)}
					<li
						class="flex items-center justify-between gap-2 rounded-xl border border-ink-100 p-2.5 text-sm"
					>
						<div class="min-w-0">
							<span class="block truncate"><strong>{point.label}:</strong> {point.value}</span>
							{#if point.explanation}<span class="block truncate text-xs text-ink-500"
									>{point.explanation}</span
								>{/if}
						</div>
						<button
							type="button"
							onclick={() => removeDataPoint(point.id)}
							class="hover:text-critical-600 shrink-0 rounded-full p-1 text-ink-400 hover:bg-critical-50"
							aria-label={`Quitar dato ${point.label}`}
						>
							<Trash2 class="size-3.5" />
						</button>
					</li>
				{:else}
					<li class="text-sm text-ink-400">Contenido pendiente.</li>
				{/each}
			</ul>
			<div class="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
				<input
					bind:value={newDataLabel}
					placeholder="Etiqueta (p. ej. Precio medio)"
					class="rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
				/>
				<input
					bind:value={newDataValue}
					placeholder="Cifra"
					class="rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
				/>
			</div>
			<div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
				<input
					bind:value={newDataExplanation}
					placeholder="Explicación (opcional)"
					class="rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
				/>
				<input
					bind:value={newDataTimeScope}
					placeholder="Ámbito temporal (opcional)"
					class="rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
				/>
				<select
					bind:value={newDataSourceId}
					class="rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
				>
					<option value="">Sin fuente vinculada</option>
					{#each sources as source (source.id)}
						<option value={source.id}>{source.label}</option>
					{/each}
				</select>
			</div>
			<button
				type="button"
				onclick={addDataPoint}
				class="mt-2 flex items-center gap-1.5 rounded-full border border-ink-200 px-3.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
			>
				<Plus class="size-3.5" /> Añadir dato
			</button>
		</section>

		<!-- Preguntas de Pulso vinculadas -->
		<section class="mt-4 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
			<h2 class="font-display text-base font-semibold text-ink-900">
				Preguntas de Pulso vinculadas
			</h2>
			<ul class="mt-2 flex flex-col gap-1.5">
				{#each linkedConcerns as concern (concern.id)}
					<li
						class="flex items-center justify-between gap-2 rounded-xl border border-ink-100 p-2.5 text-sm"
					>
						<span class="truncate">{concern.question}</span>
						<button
							type="button"
							onclick={() => removeConcernLink(concern.id)}
							class="hover:text-critical-600 shrink-0 rounded-full p-1 text-ink-400 hover:bg-critical-50"
							aria-label={`Desvincular ${concern.question}`}
						>
							<Trash2 class="size-3.5" />
						</button>
					</li>
				{:else}
					<li class="text-sm text-ink-400">Sin preguntas vinculadas todavía.</li>
				{/each}
			</ul>
			{#if linkableConcerns.length > 0}
				<div class="mt-2.5 flex gap-2">
					<select
						bind:value={selectedConcernToLink}
						class="flex-1 rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					>
						<option value="">Selecciona una pregunta de Pulso…</option>
						{#each linkableConcerns as concern (concern.id)}
							<option value={concern.id}>{concern.question}</option>
						{/each}
					</select>
					<button
						type="button"
						disabled={!selectedConcernToLink}
						onclick={addConcernLink}
						class="shrink-0 rounded-xl bg-brand-700 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
					>
						Vincular
					</button>
				</div>
			{/if}
		</section>

		<!-- Ejes -->
		<section class="mt-4 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
			<h2 class="font-display text-base font-semibold text-ink-900">
				Ejes (agrupación visual de medidas)
			</h2>
			<p class="mt-1 text-xs text-ink-500">
				Los ejes solo organizan la presentación de las medidas: no son propuestas nuevas.
			</p>
			<ul class="mt-2 flex flex-col gap-1.5">
				{#each axes as axis, index (axis.id)}
					<li
						class="flex items-center justify-between gap-2 rounded-xl border border-ink-100 p-2.5 text-sm"
					>
						<span class="truncate font-medium text-ink-800">{axis.title}</span>
						<div class="flex shrink-0 items-center gap-1">
							<button
								type="button"
								onclick={() => moveAxis(index, 'up')}
								disabled={index === 0}
								class="rounded-full p-1 text-ink-400 hover:bg-ink-100 disabled:opacity-30"
								aria-label="Subir eje"
							>
								<ArrowUp class="size-3.5" />
							</button>
							<button
								type="button"
								onclick={() => moveAxis(index, 'down')}
								disabled={index === axes.length - 1}
								class="rounded-full p-1 text-ink-400 hover:bg-ink-100 disabled:opacity-30"
								aria-label="Bajar eje"
							>
								<ArrowDown class="size-3.5" />
							</button>
							<button
								type="button"
								onclick={() => startEditAxis(axis)}
								class="rounded-full p-1 text-ink-400 hover:bg-ink-100"
								aria-label="Editar eje"
							>
								<Pencil class="size-3.5" />
							</button>
							<button
								type="button"
								onclick={() => removeAxis(axis.id)}
								class="hover:text-critical-600 rounded-full p-1 text-ink-400 hover:bg-critical-50"
								aria-label="Eliminar eje"
							>
								<Trash2 class="size-3.5" />
							</button>
						</div>
					</li>
				{:else}
					<li class="text-sm text-ink-400">Todavía no hay ejes.</li>
				{/each}
			</ul>
			{#if editingAxisId}
				<div class="mt-3 flex gap-2 rounded-xl border border-brand-200 bg-brand-50 p-3">
					<input
						bind:value={axisTitleForm}
						placeholder="Título del eje"
						class="flex-1 rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					/>
					<button
						type="button"
						onclick={saveAxis}
						class="shrink-0 rounded-full bg-brand-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
					>
						Guardar
					</button>
					<button
						type="button"
						onclick={() => (editingAxisId = null)}
						class="shrink-0 rounded-full border border-ink-200 px-3.5 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-50"
					>
						Cancelar
					</button>
				</div>
			{:else}
				<button
					type="button"
					onclick={startNewAxis}
					class="mt-2.5 flex items-center gap-1.5 rounded-full border border-ink-200 px-3.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
				>
					<Plus class="size-3.5" /> Añadir eje
				</button>
			{/if}
		</section>

		<!-- Medidas ("Soluciones") -->
		<section class="mt-4 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
			<h2 class="font-display text-base font-semibold text-ink-900">Soluciones (medidas)</h2>
			<ul class="mt-2 flex flex-col gap-2">
				{#each measures as measure, index (measure.id)}
					<li class="rounded-xl border border-ink-100 p-3">
						<div class="flex items-center justify-between gap-2">
							<span class="truncate text-sm font-medium text-ink-900">
								{index + 1}. {measure.title}
								{#if !measure.isPublished}<span class="text-ink-400">(oculta)</span>{/if}
							</span>
							<div class="flex shrink-0 items-center gap-1">
								<button
									type="button"
									onclick={() => moveMeasure(index, 'up')}
									disabled={index === 0}
									class="rounded-full p-1 text-ink-400 hover:bg-ink-100 disabled:opacity-30"
									aria-label="Subir"
								>
									<ArrowUp class="size-3.5" />
								</button>
								<button
									type="button"
									onclick={() => moveMeasure(index, 'down')}
									disabled={index === measures.length - 1}
									class="rounded-full p-1 text-ink-400 hover:bg-ink-100 disabled:opacity-30"
									aria-label="Bajar"
								>
									<ArrowDown class="size-3.5" />
								</button>
								<button
									type="button"
									onclick={() => togglePublished(measure)}
									class="rounded-full p-1 text-ink-400 hover:bg-ink-100"
									aria-label={measure.isPublished ? 'Ocultar' : 'Mostrar'}
								>
									{#if measure.isPublished}<Eye class="size-3.5" />{:else}<EyeOff
											class="size-3.5"
										/>{/if}
								</button>
								<button
									type="button"
									onclick={() => startEditMeasure(measure)}
									class="rounded-full p-1 text-ink-400 hover:bg-ink-100"
									aria-label="Editar"
								>
									<Pencil class="size-3.5" />
								</button>
								<button
									type="button"
									onclick={() => removeMeasure(measure.id)}
									class="hover:text-critical-600 rounded-full p-1 text-ink-400 hover:bg-critical-50"
									aria-label="Eliminar"
								>
									<Trash2 class="size-3.5" />
								</button>
							</div>
						</div>
						<p class="mt-1 text-xs text-ink-400">Eje: {axisTitle(measure.axisId)}</p>
					</li>
				{:else}
					<li class="text-sm text-ink-400">Todavía no hay medidas.</li>
				{/each}
			</ul>

			{#if editingMeasureId}
				<div class="mt-3 space-y-2.5 rounded-xl border border-brand-200 bg-brand-50 p-3">
					<div>
						<label for="measure-axis" class="mb-1 block text-xs font-medium text-ink-700">Eje</label
						>
						<select
							id="measure-axis"
							bind:value={measureForm.axisId}
							class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
						>
							<option value={undefined}>Sin eje</option>
							{#each axes as axis (axis.id)}
								<option value={axis.id}>{axis.title}</option>
							{/each}
						</select>
					</div>
					<input
						bind:value={measureForm.title}
						placeholder="Título exacto de la medida"
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					/>
					<textarea
						bind:value={measureForm.summary}
						rows="2"
						placeholder="Resumen breve (tarjeta colapsada)"
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					></textarea>
					<textarea
						bind:value={measureForm.problemAddressed}
						rows="2"
						placeholder="Problema concreto que resuelve"
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					></textarea>
					<textarea
						bind:value={measureForm.explanation}
						rows="3"
						placeholder="Explicación completa (contenido pendiente)"
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					></textarea>
					<textarea
						bind:value={measureForm.howItWorks}
						rows="2"
						placeholder="Cómo funciona (opcional)"
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					></textarea>
					<div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
						<input
							bind:value={measureForm.responsibleScope}
							placeholder="Administración responsable"
							class="rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
						/>
						<input
							bind:value={measureForm.estimatedCost}
							placeholder="Coste estimado (opcional)"
							class="rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
						/>
						<input
							bind:value={measureForm.timeframe}
							placeholder="Plazo (opcional)"
							class="rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
						/>
					</div>
					<textarea
						bind:value={measureForm.argumentsFor}
						rows="2"
						placeholder="Ventajas"
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					></textarea>
					<textarea
						bind:value={measureForm.risks}
						rows="2"
						placeholder="Riesgos o dificultades"
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					></textarea>
					<textarea
						bind:value={measureIndicatorsText}
						rows="2"
						placeholder="Indicadores para medirla (uno por línea)"
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					></textarea>
					{#if sources.length > 0}
						<div>
							<p class="mb-1 text-xs font-medium text-ink-700">Fuentes de esta medida</p>
							<div class="flex flex-col gap-1">
								{#each sources as source (source.id)}
									<label class="flex items-center gap-2 text-xs text-ink-700">
										<input
											type="checkbox"
											checked={measureFormSourceIds.has(source.id)}
											onchange={(e) => {
												const next = new SvelteSet(measureFormSourceIds);
												if (e.currentTarget.checked) next.add(source.id);
												else next.delete(source.id);
												measureFormSourceIds = next;
											}}
											class="rounded border-ink-300 text-brand-700 focus:ring-brand-500"
										/>
										{source.label}
									</label>
								{/each}
							</div>
						</div>
					{/if}
					<label class="flex items-center gap-2 text-sm text-ink-700">
						<input
							type="checkbox"
							bind:checked={measureForm.isPublished}
							class="rounded border-ink-300 text-brand-700 focus:ring-brand-500"
						/>
						Visible públicamente
					</label>
					<div class="flex gap-2">
						<button
							type="button"
							onclick={saveMeasure}
							class="flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-800"
						>
							<Check class="size-3.5" /> Guardar medida
						</button>
						<button
							type="button"
							onclick={cancelMeasureEdit}
							class="flex items-center gap-1.5 rounded-full border border-ink-200 px-4 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-50"
						>
							<XIcon class="size-3.5" /> Cancelar
						</button>
					</div>
				</div>
			{:else}
				<button
					type="button"
					onclick={startNewMeasure}
					class="mt-2.5 flex items-center gap-1.5 rounded-full border border-ink-200 px-3.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
				>
					<Plus class="size-3.5" /> Añadir medida
				</button>
			{/if}
		</section>

		<!-- Calendario -->
		<section class="mt-4 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
			<h2 class="font-display text-base font-semibold text-ink-900">Calendario</h2>
			<p class="mt-1 text-xs text-ink-500">
				P. ej. "Primeros 100 días" / "Implantación progresiva" / "Objetivo 2036". Sin reparto
				presupuestario inventado.
			</p>
			<ul class="mt-2 flex flex-col gap-2">
				{#each timelinePhases as phase, index (phase.id)}
					<li class="rounded-xl border border-ink-100 p-3">
						<div class="flex items-center justify-between gap-2">
							<span class="truncate text-sm font-medium text-ink-900">{phase.title}</span>
							<div class="flex shrink-0 items-center gap-1">
								<button
									type="button"
									onclick={() => movePhase(index, 'up')}
									disabled={index === 0}
									class="rounded-full p-1 text-ink-400 hover:bg-ink-100 disabled:opacity-30"
									aria-label="Subir fase"
								>
									<ArrowUp class="size-3.5" />
								</button>
								<button
									type="button"
									onclick={() => movePhase(index, 'down')}
									disabled={index === timelinePhases.length - 1}
									class="rounded-full p-1 text-ink-400 hover:bg-ink-100 disabled:opacity-30"
									aria-label="Bajar fase"
								>
									<ArrowDown class="size-3.5" />
								</button>
								<button
									type="button"
									onclick={() => startEditPhase(phase)}
									class="rounded-full p-1 text-ink-400 hover:bg-ink-100"
									aria-label="Editar fase"
								>
									<Pencil class="size-3.5" />
								</button>
								<button
									type="button"
									onclick={() => removePhase(phase.id)}
									class="hover:text-critical-600 rounded-full p-1 text-ink-400 hover:bg-critical-50"
									aria-label="Eliminar fase"
								>
									<Trash2 class="size-3.5" />
								</button>
							</div>
						</div>
						{#if phase.description}
							<p class="mt-1 text-xs text-ink-600">{phase.description}</p>
						{/if}
						{#if phase.items.length > 0}
							<p class="mt-1 text-xs text-ink-400">{phase.items.length} actuaciones separadas</p>
						{/if}
					</li>
				{:else}
					<li class="text-sm text-ink-400">Todavía no hay fases.</li>
				{/each}
			</ul>
			{#if editingPhaseId}
				<div class="mt-3 space-y-2 rounded-xl border border-brand-200 bg-brand-50 p-3">
					<input
						bind:value={phaseForm.title}
						placeholder="Título de la fase"
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					/>
					<textarea
						bind:value={phaseForm.description}
						rows="2"
						placeholder="Descripción breve (opcional)"
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					></textarea>
					<textarea
						bind:value={phaseItemsText}
						rows="3"
						placeholder="Actuaciones separadas de esta fase (una por línea, opcional)"
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					></textarea>
					<div class="flex gap-2">
						<button
							type="button"
							onclick={savePhase}
							class="rounded-full bg-brand-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
						>
							Guardar
						</button>
						<button
							type="button"
							onclick={() => (editingPhaseId = null)}
							class="rounded-full border border-ink-200 px-3.5 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-50"
						>
							Cancelar
						</button>
					</div>
				</div>
			{:else}
				<button
					type="button"
					onclick={startNewPhase}
					class="mt-2.5 flex items-center gap-1.5 rounded-full border border-ink-200 px-3.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
				>
					<Plus class="size-3.5" /> Añadir fase
				</button>
			{/if}
		</section>

		<!-- Riesgos generales del tema -->
		<section class="mt-4 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
			<h2 class="font-display text-base font-semibold text-ink-900">
				Riesgos generales del tema ("qué podría salir mal")
			</h2>
			<p class="mt-1 text-xs text-ink-500">
				Cada riesgo puede tener 4 partes: en qué consiste, señales de alerta, cómo reducirlo, y qué
				decisión tomar si ocurre. Deja en blanco lo que todavía no tengas — se mostrará como
				"Contenido pendiente" en la página pública, nunca se inventa.
			</p>
			<ul class="mt-2 flex flex-col gap-2">
				{#each risks as risk (risk.id)}
					<li class="rounded-xl border border-ink-100 p-3">
						<div class="flex items-center justify-between gap-2">
							<span class="truncate text-sm font-medium text-ink-900">{risk.title}</span>
							<div class="flex shrink-0 items-center gap-1">
								<button
									type="button"
									onclick={() => startEditRisk(risk)}
									class="rounded-full p-1 text-ink-400 hover:bg-ink-100"
									aria-label="Editar riesgo"
								>
									<Pencil class="size-3.5" />
								</button>
								<button
									type="button"
									onclick={() => removeRisk(risk.id)}
									class="hover:text-critical-600 rounded-full p-1 text-ink-400 hover:bg-critical-50"
									aria-label="Eliminar riesgo"
								>
									<Trash2 class="size-3.5" />
								</button>
							</div>
						</div>
					</li>
				{:else}
					<li class="text-sm text-ink-400">Todavía no hay riesgos generales.</li>
				{/each}
			</ul>
			{#if editingRiskId}
				<div class="mt-3 space-y-2 rounded-xl border border-brand-200 bg-brand-50 p-3">
					<input
						bind:value={riskForm.title}
						placeholder="Título del riesgo"
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					/>
					<textarea
						bind:value={riskForm.description}
						rows="2"
						placeholder="En qué consiste (opcional)"
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					></textarea>
					<textarea
						bind:value={riskForm.signals}
						rows="2"
						placeholder="Qué señales permitirían detectarlo (opcional)"
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					></textarea>
					<textarea
						bind:value={riskForm.mitigation}
						rows="2"
						placeholder="Cómo reducirlo (opcional)"
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					></textarea>
					<textarea
						bind:value={riskForm.decisionTrigger}
						rows="2"
						placeholder="Qué decisión debería tomarse si ocurre (opcional)"
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					></textarea>
					<div class="flex gap-2">
						<button
							type="button"
							onclick={saveRisk}
							class="rounded-full bg-brand-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
						>
							Guardar
						</button>
						<button
							type="button"
							onclick={() => (editingRiskId = null)}
							class="rounded-full border border-ink-200 px-3.5 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-50"
						>
							Cancelar
						</button>
					</div>
				</div>
			{:else}
				<button
					type="button"
					onclick={startNewRisk}
					class="mt-2.5 flex items-center gap-1.5 rounded-full border border-ink-200 px-3.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
				>
					<Plus class="size-3.5" /> Añadir riesgo
				</button>
			{/if}
		</section>

		<!-- Historial de versiones -->
		<section class="mt-4 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
			<h2 class="flex items-center gap-1.5 font-display text-base font-semibold text-ink-900">
				<History class="size-4 text-brand-700" /> Historial de versiones
			</h2>
			<ul class="mt-2 flex flex-col gap-1.5">
				{#each versions as v (v.id)}
					<li class="text-sm text-ink-700">
						<span class="font-semibold text-ink-900">Versión {v.versionLabel}</span>
						{#if v.note}<span class="text-ink-500"> · {v.note}</span>{/if}
					</li>
				{:else}
					<li class="text-sm text-ink-400">Todavía no se ha publicado ninguna versión con nota.</li>
				{/each}
			</ul>
			<div class="mt-2.5 flex flex-col gap-2 sm:flex-row">
				<input
					bind:value={newVersionNote}
					placeholder="Nota de esta versión (opcional)"
					class="flex-1 rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
				/>
				<button
					type="button"
					onclick={publishVersion}
					disabled={publishingVersion}
					class="shrink-0 rounded-full bg-brand-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
				>
					{publishingVersion ? 'Registrando…' : `Registrar versión ${version} en el historial`}
				</button>
			</div>
			<p class="mt-1.5 text-xs text-warning-700">
				Esto NO hace público el tema: solo añade una nota al historial con el número de versión
				indicado arriba en "Cabecera y problema". Para publicarlo, cambia "Estado" a "Abierto a
				participación" o "Revisado" en la sección de cabecera y pulsa "Guardar cambios".
			</p>
		</section>

		<!-- Ronda de participación -->
		<section class="mt-4 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
			<h2 class="font-display text-base font-semibold text-ink-900">Ronda de participación</h2>
			<p class="mt-1 text-xs text-ink-500">
				Crear una ronda no la abre al público. Solo al ponerla en estado "Abierta" empieza a admitir
				respuestas — hazlo únicamente cuando hayas revisado el resultado.
			</p>
			<ul class="mt-2 flex flex-col gap-2">
				{#each rounds as round (round.id)}
					<li class="rounded-xl border border-ink-100 p-3">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<span class="text-sm font-medium text-ink-900">
								Versión {round.versionLabel} —
								<span
									class={round.status === 'open'
										? 'text-brand-700'
										: round.status === 'closed'
											? 'text-ink-400'
											: 'text-warning-700'}>{round.status}</span
								>
							</span>
							<div class="flex flex-wrap gap-1.5">
								{#if round.status !== 'open'}
									<button
										type="button"
										onclick={() => changeRoundStatus(round, 'open')}
										class="rounded-full bg-brand-700 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-800"
									>
										Abrir
									</button>
								{/if}
								{#if round.status === 'open'}
									<button
										type="button"
										onclick={() => changeRoundStatus(round, 'paused')}
										class="rounded-full border border-ink-200 px-3 py-1 text-xs font-medium text-ink-600 hover:bg-ink-50"
									>
										Pausar
									</button>
								{/if}
								{#if round.status === 'paused'}
									<button
										type="button"
										onclick={() => changeRoundStatus(round, 'open')}
										class="rounded-full bg-brand-700 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-800"
									>
										Reabrir
									</button>
								{/if}
								{#if round.status !== 'closed'}
									<button
										type="button"
										onclick={() => changeRoundStatus(round, 'closed')}
										class="text-critical-600 rounded-full border border-critical-300 px-3 py-1 text-xs font-semibold hover:bg-critical-50"
									>
										Cerrar
									</button>
								{/if}
							</div>
						</div>
					</li>
				{:else}
					<li class="text-sm text-ink-400">Todavía no hay ninguna ronda de participación.</li>
				{/each}
			</ul>
			{#if !latestRound || latestRound.status === 'closed'}
				<button
					type="button"
					onclick={createRound}
					disabled={creatingRound}
					class="mt-2.5 flex items-center gap-1.5 rounded-full border border-ink-200 px-3.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-60"
				>
					<Plus class="size-3.5" />
					{creatingRound ? 'Creando…' : `Crear ronda para la versión ${version}`}
				</button>
			{/if}
		</section>

		<!-- Propuestas desarrolladas pendientes -->
		{#if pendingProposals.length > 0}
			<section class="border-warning-200 mt-4 rounded-2xl border bg-warning-50 p-4 sm:p-5">
				<h2 class="font-display text-base font-semibold text-ink-900">
					Propuestas desarrolladas pendientes de revisión
				</h2>
				<ul class="mt-2 flex flex-col gap-2">
					{#each pendingProposals as proposal (proposal.id)}
						<li class="rounded-xl border border-ink-100 bg-white p-3">
							<p class="text-xs text-ink-500">
								Medida: {measureTitleFor(proposal.measureId)} · Estado: {proposal.status}
							</p>
							<p class="mt-0.5 text-sm font-medium text-ink-900">{proposal.title}</p>
							<p class="mt-0.5 text-sm text-ink-600">{proposal.description}</p>
							{#if proposal.measurePart}
								<p class="mt-1 text-xs text-ink-500">
									<strong class="font-semibold">Parte que modificaría:</strong>
									{proposal.measurePart}
								</p>
							{/if}
							{#if proposal.reason}
								<p class="mt-0.5 text-xs text-ink-500">
									<strong class="font-semibold">Motivo:</strong>
									{proposal.reason}
								</p>
							{/if}
							{#if proposal.expectedEffect}
								<p class="mt-0.5 text-xs text-ink-500">
									<strong class="font-semibold">Efecto esperado:</strong>
									{proposal.expectedEffect}
								</p>
							{/if}
							{#if proposal.acknowledgedRisks}
								<p class="mt-0.5 text-xs text-ink-500">
									<strong class="font-semibold">Riesgos reconocidos:</strong>
									{proposal.acknowledgedRisks}
								</p>
							{/if}
							{#if proposal.sourceUrl}
								<p class="mt-0.5 text-xs text-ink-500">
									<strong class="font-semibold">Fuente:</strong>
									{proposal.sourceUrl}
								</p>
							{/if}

							{#if editingProposalId === proposal.id}
								<div class="mt-2.5 space-y-2 rounded-xl border border-ink-100 bg-ink-50 p-3">
									<select
										bind:value={proposalModeration.status}
										class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
									>
										{#each ['pendiente_revision', 'necesita_cambios', 'en_estudio', 'publicada', 'incorporada_total', 'incorporada_parcial', 'no_incorporada', 'archivada'] as s (s)}
											<option value={s}>{s}</option>
										{/each}
									</select>
									<textarea
										bind:value={proposalModeration.reviewerNote}
										rows="2"
										placeholder="Nota interna de moderación (opcional)"
										class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
									></textarea>
									<textarea
										bind:value={proposalModeration.editorialResponse}
										rows="2"
										placeholder="Respuesta editorial pública (opcional, se muestra a la ciudadanía)"
										class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
									></textarea>
									<input
										bind:value={proposalModeration.linkedVersionLabel}
										placeholder="Versión con la que se relaciona la decisión (opcional)"
										class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
									/>
									<div class="flex gap-2">
										<button
											type="button"
											onclick={() => saveProposalModeration(proposal.id)}
											class="rounded-full bg-brand-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
										>
											Guardar decisión
										</button>
										<button
											type="button"
											onclick={() => (editingProposalId = null)}
											class="rounded-full border border-ink-200 px-3.5 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-50"
										>
											Cancelar
										</button>
									</div>
								</div>
							{:else}
								<button
									type="button"
									onclick={() => startModerateProposal(proposal)}
									class="mt-2 flex items-center gap-1.5 rounded-full bg-brand-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
								>
									<Check class="size-3.5" /> Revisar
								</button>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<!-- Alternativas ciudadanas pendientes -->
		{#if pendingAlternatives.length > 0}
			<section class="border-warning-200 mt-4 rounded-2xl border bg-warning-50 p-4 sm:p-5">
				<h2 class="font-display text-base font-semibold text-ink-900">
					Alternativas pendientes de revisión
				</h2>
				<ul class="mt-2 flex flex-col gap-2">
					{#each pendingAlternatives as group (group.alternative.id)}
						<li class="rounded-xl border border-ink-100 bg-white p-3">
							<p class="text-xs text-ink-500">
								{group.alternative.measureId ? `Medida: ${group.measureTitle}` : group.measureTitle}
							</p>
							<p class="mt-0.5 text-sm font-medium text-ink-900">{group.alternative.title}</p>
							<p class="mt-0.5 text-sm text-ink-600">{group.alternative.description}</p>
							<div class="mt-2 flex gap-2">
								<button
									type="button"
									onclick={() => approveAlternative(group)}
									class="flex items-center gap-1.5 rounded-full bg-brand-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
								>
									<Check class="size-3.5" /> Aprobar
								</button>
								<button
									type="button"
									onclick={() => openReject(group)}
									class="text-critical-600 flex items-center gap-1.5 rounded-full border border-critical-300 px-3.5 py-1.5 text-xs font-semibold hover:bg-critical-50"
								>
									<XIcon class="size-3.5" /> Rechazar
								</button>
							</div>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{:else}
		<p class="mt-4 text-sm text-ink-500">
			Guarda el tema para poder añadir fuentes, datos, medidas y vincular preguntas de Pulso.
		</p>
	{/if}
</div>

<NoteDialog
	bind:open={rejectOpen}
	title="Rechazar alternativa"
	description="Explica brevemente el motivo — se guarda como nota interna."
	confirmLabel="Rechazar"
	tone="critical"
	onConfirm={confirmReject}
	onClose={() => (rejectTarget = null)}
/>
