<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import {
		ShieldCheck,
		FileClock,
		Flag,
		FileCheck2,
		ScrollText,
		Check,
		Pencil,
		EyeOff,
		X as XIcon,
		MapPin,
		CalendarDays,
		Activity,
		Lightbulb,
		Plus,
		MessageCircleHeart,
		FileSearch,
		LayoutDashboard,
		CircleCheck,
		ArrowRight,
		Users,
		Vote,
		History,
		TrendingUp,
		AlertCircle
	} from '@lucide/svelte';
	import PulsoModerationPanel from '$lib/components/pulso/PulsoModerationPanel.svelte';
	import NextBlockVoteAdminPanel from '$lib/components/pulso/NextBlockVoteAdminPanel.svelte';
	import VozAbiertaModerationPanel from '$lib/components/pulso/VozAbiertaModerationPanel.svelte';
	import TopicCard from '$lib/components/pulso/TopicCard.svelte';
	import OperationsNav, {
		type OperationsNavGroup
	} from '$lib/components/moderacion/OperationsNav.svelte';
	import {
		buildAttentionItems,
		totalPendingModerationItems,
		type OperationsTabKey
	} from '$lib/utils/operationsSummary';
	import type { PageData } from './$types';
	import type { AuditLog, Event, ModerationAction } from '$lib/types';
	import {
		categoryLabels,
		reportReasonLabels,
		moderationActionLabels,
		channelPlatformLabels,
		channelReportReasonLabels,
		nextBlockVoteRoundStatusLabels,
		auditTrailActionLabels,
		auditTrailTargetTypeLabels,
		auditTrailActorTypeLabels
	} from '$lib/labels';
	import { formatEventDate, formatEventTime, formatRelativeTime } from '$lib/utils/date';
	import { applyModerationAction, listAllAuditLogs } from '$lib/services/moderationService';
	import {
		reviewDocument,
		getVerificationDocumentSignedUrl
	} from '$lib/services/organizersService';
	import { getEvent } from '$lib/services/eventsService';
	import { setChannelHidden, listReportedChannels } from '$lib/services/channelsService';
	import StatusPill from '$lib/components/StatusPill.svelte';
	import VerificationBadge from '$lib/components/VerificationBadge.svelte';
	import NoteDialog from '$lib/components/NoteDialog.svelte';

	let { data }: { data: PageData } = $props();

	const MODERATOR_ID = data.session.user.id;

	let pending = $state(data.pending);
	let reported = $state(data.reported);
	let auditLog = $state(data.auditLog);
	let pendingDocuments = $state(data.pendingDocuments);
	let reportedChannels = $state(data.reportedChannels);
	let concerns = $state(data.concerns);
	let concernProposals = $state(data.concernProposals);
	let topics = $state(data.topics);
	let nextBlockVoteRounds = $state(data.nextBlockVoteRounds);
	let pendingOpenVoiceContributions = $state(data.pendingOpenVoiceContributions);
	const pendingAlternativesCount = $derived(data.pendingAlternatives.length);

	// Datos exclusivos de "Resumen" — snapshot del momento de carga, ver
	// comentario de `+page.ts`. `null` = no se pudo calcular (error de
	// consulta), nunca se confunde con 0.
	const participantCount = data.participantCount;
	const openVoiceTotal = data.openVoiceTotal;
	const recentAuditTrail = data.recentAuditTrail;
	const activeVoteRound = data.activeVoteRound;
	const activeVoteTotal = data.activeVoteTotal;

	const orgNameById = $derived(new Map(data.organizers.map((o) => [o.id, o.displayName])));

	let activeTab = $state<OperationsTabKey>('resumen');

	const pendingProposalsCount = $derived(
		concernProposals.filter((p) => p.status === 'pending').length
	);
	const activeTopicsCount = $derived(topics.filter((t) => t.status === 'open').length);

	/**
	 * Navegación agrupada del Centro de Operaciones (sustituye a la fila de
	 * pestañas horizontal anterior). Mismas claves, mismos componentes por
	 * pestaña — solo cambia cómo se eligen.
	 */
	const navGroups = $derived<OperationsNavGroup[]>([
		{ label: 'Resumen', items: [{ key: 'resumen', label: 'Resumen', icon: LayoutDashboard }] },
		{
			label: 'Escucha ciudadana',
			items: [
				{
					key: 'pulso',
					label: 'Pulso ciudadano',
					icon: Activity,
					badge: pendingProposalsCount || undefined,
					badgeTone: 'warning'
				},
				{
					key: 'vozAbierta',
					label: 'Voz abierta',
					icon: MessageCircleHeart,
					badge: pendingOpenVoiceContributions.length || undefined,
					badgeTone: 'warning'
				}
			]
		},
		{
			label: 'Convocatorias',
			items: [
				{
					key: 'pendientes',
					label: 'Pendientes',
					icon: FileClock,
					badge: pending.length || undefined,
					badgeTone: 'warning'
				},
				{
					key: 'reportadas',
					label: 'Reportadas',
					icon: Flag,
					badge: reported.length || undefined,
					badgeTone: 'critical'
				},
				{
					key: 'documentacion',
					label: 'Documentación',
					icon: FileCheck2,
					badge: pendingDocuments.length || undefined,
					badgeTone: 'warning'
				}
			]
		},
		{
			label: 'Planificación',
			items: [
				{
					key: 'temas',
					label: 'Temas',
					icon: Lightbulb,
					badge: pendingAlternativesCount || undefined,
					badgeTone: 'warning'
				}
			]
		},
		{
			label: 'Control',
			items: [{ key: 'registro', label: 'Registro de decisiones', icon: ScrollText }]
		}
	]);

	const attentionItems = $derived(
		buildAttentionItems({
			openVoicePending: pendingOpenVoiceContributions.length,
			eventsReported: reported.length,
			channelsReported: reportedChannels.length,
			eventsPending: pending.length,
			documentsPending: pendingDocuments.length,
			proposalsPending: pendingProposalsCount,
			alternativesPending: pendingAlternativesCount
		})
	);

	interface SummaryCard {
		label: string;
		value: number | null;
	}

	const summaryCards = $derived<SummaryCard[]>([
		{ label: 'Personas participantes únicas', value: participantCount },
		{ label: 'Aportaciones de Voz abierta recibidas', value: openVoiceTotal },
		{
			label: 'Elementos pendientes de moderación',
			value: totalPendingModerationItems({
				openVoicePending: pendingOpenVoiceContributions.length,
				eventsReported: reported.length,
				channelsReported: reportedChannels.length,
				eventsPending: pending.length,
				documentsPending: pendingDocuments.length,
				proposalsPending: pendingProposalsCount,
				alternativesPending: pendingAlternativesCount
			})
		},
		{ label: 'Convocatorias pendientes', value: pending.length },
		{ label: 'Documentos pendientes de verificación', value: pendingDocuments.length },
		{ label: 'Temas activos', value: activeTopicsCount }
	]);

	/**
	 * `hide_channel`/`unhide_channel` no son acciones de este flujo (operan
	 * sobre un canal, no sobre `{ event, action }`) — tienen su propia
	 * confirmación en la pestaña "Canales reportados", vía `setChannelHidden`.
	 */
	type EventModerationAction = Exclude<ModerationAction, 'hide_channel' | 'unhide_channel'>;

	let actionTarget = $state<{ event: Event; action: EventModerationAction } | null>(null);
	let actionOpen = $state(false);

	const actionCopy: Record<
		EventModerationAction,
		{ title: string; confirmLabel: string; tone: 'brand' | 'critical'; requireNote: boolean }
	> = {
		approve: {
			title: 'Aprobar convocatoria',
			confirmLabel: 'Aprobar y publicar',
			tone: 'brand',
			requireNote: false
		},
		request_changes: {
			title: 'Solicitar cambios al organizador',
			confirmLabel: 'Solicitar cambios',
			tone: 'critical',
			requireNote: true
		},
		hide: {
			title: 'Ocultar convocatoria',
			confirmLabel: 'Ocultar',
			tone: 'critical',
			requireNote: true
		},
		reject: {
			title: 'Rechazar convocatoria',
			confirmLabel: 'Rechazar',
			tone: 'critical',
			requireNote: true
		},
		reinstate: {
			title: 'Restaurar convocatoria',
			confirmLabel: 'Restaurar',
			tone: 'brand',
			requireNote: false
		}
	};

	function openAction(event: Event, action: EventModerationAction) {
		actionTarget = { event, action };
		actionOpen = true;
	}

	async function confirmAction(note: string) {
		if (!actionTarget) return;
		const { event, action } = actionTarget;
		await applyModerationAction(event.id, action, MODERATOR_ID, note || undefined);

		pending = pending.filter((e) => e.id !== event.id);
		reported = reported.filter((g) => g.event.id !== event.id);
		auditLog = await listAllAuditLogs();
	}

	/**
	 * Oculta solo el canal reportado (nunca toda la convocatoria) y descarta
	 * los reportes abiertos contra él. Queda registrado en `audit_logs`
	 * (`hide_channel`, ver `channelsService.setChannelHidden`).
	 */
	async function hideReportedChannel(channelId: string) {
		await setChannelHidden(channelId, true, MODERATOR_ID);
		reportedChannels = await listReportedChannels();
	}

	/** El reporte puede ser un falso positivo: descartarlo sin ocultar nada. */
	async function dismissChannelReport(channelId: string) {
		await setChannelHidden(channelId, false, MODERATOR_ID, 'Reporte descartado tras revisión.');
		reportedChannels = await listReportedChannels();
	}

	async function reviewDoc(documentId: string, status: 'approved' | 'rejected') {
		await reviewDocument(
			documentId,
			status,
			status === 'approved'
				? 'Documentación verificada correctamente.'
				: 'Documentación insuficiente.'
		);
		pendingDocuments = pendingDocuments.filter((d) => d.id !== documentId);
	}

	/**
	 * Abre el archivo real con una URL firmada de corta duración (nunca un
	 * archivo público, ver `getVerificationDocumentSignedUrl`). Queda
	 * registrado en `audit_trail` por el propio RPC antes de que exista la
	 * URL — si falla el registro, no llega a abrirse nada.
	 */
	let viewingDocId = $state<string | null>(null);
	async function viewDocument(documentId: string, storagePath: string) {
		viewingDocId = documentId;
		try {
			const url = await getVerificationDocumentSignedUrl(documentId, storagePath);
			window.open(url, '_blank', 'noopener');
		} catch (err) {
			alert(err instanceof Error ? err.message : 'No se ha podido abrir el documento.');
		} finally {
			viewingDocId = null;
		}
	}

	let auditEventTitles = $state<Map<string, string>>(new Map());
	$effect(() => {
		const ids = [...new Set(auditLog.map((l: AuditLog) => l.eventId))];
		Promise.all(ids.map((id) => getEvent(id))).then((events) => {
			auditEventTitles = new Map(
				events.filter((e): e is Event => Boolean(e)).map((e) => [e.id, e.title])
			);
		});
	});
</script>

<Seo
	title="Centro de Operaciones"
	description="Espacio interno para analizar la participación ciudadana, moderar contenidos y convertir las aportaciones en decisiones trazables."
	noindex
/>

<div class="mx-auto max-w-6xl px-4 pt-4 pb-16 sm:px-6">
	<div class="flex items-center gap-2">
		<ShieldCheck class="size-6 text-brand-700" />
		<h1 class="font-display text-2xl font-semibold text-ink-900">Centro de Operaciones</h1>
	</div>
	<p class="mt-1 max-w-2xl text-sm text-ink-500">
		Espacio interno para analizar la participación ciudadana, moderar contenidos y convertir las
		aportaciones en decisiones trazables. No visible desde la navegación principal ni accesible con
		una cuenta de organizador.
	</p>
	<p class="mt-1 text-xs text-ink-400">Conectado como {data.session.user.email}</p>

	<div class="mt-5 lg:flex lg:items-start lg:gap-6">
		<OperationsNav groups={navGroups} bind:activeKey={activeTab} />

		<div class="mt-4 min-w-0 flex-1 lg:mt-0">
			{#if activeTab === 'resumen'}
				<div class="space-y-8">
					<section>
						<h2 class="font-display text-base font-semibold text-ink-900">
							Indicadores principales
						</h2>
						<div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{#each summaryCards as card (card.label)}
								<div class="rounded-2xl border border-ink-100 bg-white p-4">
									<p class="text-xs font-medium text-ink-500">{card.label}</p>
									{#if card.value === null}
										<p class="mt-1 flex items-center gap-1.5 text-sm text-ink-400">
											<AlertCircle class="size-4" /> Todavía sin datos
										</p>
									{:else}
										<p class="mt-1 font-display text-2xl font-semibold text-ink-900">
											{card.value}
										</p>
									{/if}
								</div>
							{/each}
						</div>
					</section>

					<section>
						<h2 class="font-display text-base font-semibold text-ink-900">Qué requiere atención</h2>
						{#if attentionItems.length === 0}
							<div
								class="mt-3 flex items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-800"
							>
								<CircleCheck class="size-5 shrink-0" />
								Todo al día. No hay elementos pendientes de moderación en este momento.
							</div>
						{:else}
							<div class="mt-3 space-y-2">
								{#each attentionItems as item (item.key + item.label)}
									<button
										type="button"
										onclick={() => (activeTab = item.key)}
										class="flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left text-sm transition {item.tone ===
										'critical'
											? 'border-critical-200 bg-critical-50/40 hover:bg-critical-50'
											: 'border-warning-200 bg-warning-50/40 hover:bg-warning-50'}"
									>
										<span class="font-medium text-ink-800">{item.label}</span>
										<ArrowRight class="size-4 shrink-0 text-ink-400" />
									</button>
								{/each}
							</div>
						{/if}
					</section>

					<section>
						<h2 class="font-display text-base font-semibold text-ink-900">
							Pulso de la ciudadanía
						</h2>
						<div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
							<div class="rounded-2xl border border-ink-100 bg-white p-4">
								<p class="flex items-center gap-1.5 text-xs font-medium text-ink-500">
									<Users class="size-3.5" /> Participación reciente
								</p>
								{#if participantCount === null}
									<p class="mt-1 text-sm text-ink-400">Todavía sin datos</p>
								{:else}
									<p class="mt-1 text-sm text-ink-700">
										<strong class="font-display text-lg font-semibold text-ink-900"
											>{participantCount}</strong
										>
										persona{participantCount === 1 ? '' : 's'} participante{participantCount === 1
											? ''
											: 's'} en Pulso ciudadano
									</p>
								{/if}
								<p class="mt-1 text-xs text-ink-500">
									{activeTopicsCount} tema{activeTopicsCount === 1 ? '' : 's'} activo{activeTopicsCount ===
									1
										? ''
										: 's'}
								</p>
							</div>

							<div class="rounded-2xl border border-ink-100 bg-white p-4">
								<p class="flex items-center gap-1.5 text-xs font-medium text-ink-500">
									<Vote class="size-3.5" /> Votación activa
								</p>
								{#if activeVoteRound}
									<p class="mt-1 text-sm text-ink-700">
										<strong class="font-display text-lg font-semibold text-ink-900"
											>{activeVoteRound.versionLabel}</strong
										>
										· {nextBlockVoteRoundStatusLabels[activeVoteRound.status]}
									</p>
									<p class="mt-1 text-xs text-ink-500">
										{#if activeVoteTotal === null}
											Todavía sin datos de participación
										{:else}
											{activeVoteTotal} voto{activeVoteTotal === 1 ? '' : 's'} en total
										{/if}
									</p>
								{:else}
									<p class="mt-1 text-sm text-ink-400">
										No hay ninguna votación abierta ahora mismo.
									</p>
								{/if}
							</div>
						</div>
						<p class="mt-3 flex items-center gap-1.5 text-xs text-ink-400">
							<TrendingUp class="size-3.5" /> Todavía no hay datos suficientes para mostrar una evolución
							reciente.
						</p>
					</section>

					<section>
						<h2 class="font-display text-base font-semibold text-ink-900">Actividad reciente</h2>
						{#if recentAuditTrail === null}
							<p class="mt-3 flex items-center gap-1.5 text-sm text-ink-400">
								<AlertCircle class="size-4" /> No se ha podido cargar la actividad reciente.
							</p>
						{:else if recentAuditTrail.length === 0}
							<p class="mt-3 text-sm text-ink-400">Todavía no hay actividad registrada.</p>
						{:else}
							<div class="mt-3 space-y-2">
								{#each recentAuditTrail as entry, i (i)}
									<div
										class="flex items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-3 text-sm"
									>
										<div class="flex items-center gap-2 text-ink-700">
											<History class="size-4 shrink-0 text-ink-400" />
											<span>
												<span class="font-medium text-ink-900"
													>{auditTrailActionLabels[entry.action] ?? entry.action}</span
												>
												· {auditTrailTargetTypeLabels[entry.targetType] ?? entry.targetType}
												· {auditTrailActorTypeLabels[entry.actorType]}
											</span>
										</div>
										<span class="shrink-0 text-xs text-ink-400"
											>{formatRelativeTime(entry.createdAt)}</span
										>
									</div>
								{/each}
							</div>
						{/if}
					</section>
				</div>
			{:else if activeTab === 'pendientes'}
				{#if pending.length === 0}
					<p class="py-10 text-center text-sm text-ink-400">
						No hay convocatorias pendientes de revisión.
					</p>
				{:else}
					<div class="space-y-3">
						{#each pending as event (event.id)}
							<div class="rounded-2xl border border-ink-100 bg-white p-4">
								<div class="flex flex-wrap items-start justify-between gap-2">
									<div>
										<div class="flex flex-wrap items-center gap-1.5">
											<StatusPill status={event.status} />
											<span
												class="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-medium text-ink-600"
											>
												{categoryLabels[event.category]}
											</span>
										</div>
										<p class="mt-1 font-display text-base font-semibold text-ink-900">
											{event.title}
										</p>
										<p class="text-xs text-ink-500">
											Por {orgNameById.get(event.organizerId) ?? 'Organizador desconocido'} · enviada
											{formatRelativeTime(event.createdAt)}
										</p>
									</div>
								</div>
								<p class="mt-2 line-clamp-2 text-sm text-ink-600">{event.description}</p>
								<div class="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-500">
									<span class="flex items-center gap-1"
										><CalendarDays class="size-3.5" />{formatEventDate(event.startAt)} · {formatEventTime(
											event.startAt
										)}</span
									>
									<span class="flex items-center gap-1"
										><MapPin class="size-3.5" />{event.meetingPoint.city}</span
									>
								</div>
								<div class="mt-3 flex flex-wrap gap-2 border-t border-ink-100 pt-3">
									<button
										type="button"
										onclick={() => openAction(event, 'approve')}
										class="flex items-center gap-1.5 rounded-full bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
									>
										<Check class="size-3.5" /> Aprobar
									</button>
									<button
										type="button"
										onclick={() => openAction(event, 'request_changes')}
										class="flex items-center gap-1.5 rounded-full border border-warning-300 px-3 py-1.5 text-xs font-semibold text-warning-700 hover:bg-warning-50"
									>
										<Pencil class="size-3.5" /> Solicitar cambios
									</button>
									<button
										type="button"
										onclick={() => openAction(event, 'reject')}
										class="border-critical-200 text-critical-600 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-critical-50"
									>
										<XIcon class="size-3.5" /> Rechazar
									</button>
									<a
										href={`/convocatorias/${event.slug}`}
										class="ml-auto text-xs font-semibold text-brand-700 hover:underline"
									>
										Vista previa
									</a>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			{:else if activeTab === 'reportadas'}
				{#if reported.length === 0}
					<p class="py-10 text-center text-sm text-ink-400">
						No hay convocatorias con reportes abiertos.
					</p>
				{:else}
					<div class="space-y-3">
						{#each reported as group (group.event.id)}
							<div class="border-critical-200 rounded-2xl border bg-critical-50/40 p-4">
								<div class="flex flex-wrap items-center gap-1.5">
									<StatusPill status={group.event.status} />
									<VerificationBadge level={group.event.verification.level} />
								</div>
								<p class="mt-1 font-display text-base font-semibold text-ink-900">
									{group.event.title}
								</p>
								<p class="text-xs text-ink-500">
									Por {orgNameById.get(group.event.organizerId) ?? 'Organizador desconocido'}
								</p>

								<div class="mt-2 space-y-1.5">
									{#each group.reports as report (report.id)}
										<div class="rounded-xl bg-white px-3 py-2 text-sm">
											<p class="font-medium text-critical-700">
												{reportReasonLabels[report.reason]}
											</p>
											{#if report.details}<p class="text-xs text-ink-500">{report.details}</p>{/if}
										</div>
									{/each}
								</div>

								<div class="mt-3 flex flex-wrap gap-2 border-t border-critical-100 pt-3">
									<button
										type="button"
										onclick={() => openAction(group.event, 'approve')}
										class="flex items-center gap-1.5 rounded-full bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
									>
										<Check class="size-3.5" /> Descartar reporte
									</button>
									<button
										type="button"
										onclick={() => openAction(group.event, 'hide')}
										class="flex items-center gap-1.5 rounded-full border border-warning-300 px-3 py-1.5 text-xs font-semibold text-warning-700 hover:bg-warning-50"
									>
										<EyeOff class="size-3.5" /> Ocultar
									</button>
									<button
										type="button"
										onclick={() => openAction(group.event, 'reject')}
										class="text-critical-600 flex items-center gap-1.5 rounded-full border border-critical-300 px-3 py-1.5 text-xs font-semibold hover:bg-critical-100"
									>
										<XIcon class="size-3.5" /> Rechazar
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}

				<div class="mt-6 border-t border-ink-100 pt-4">
					<h3 class="font-display text-sm font-semibold text-ink-900">Canales reportados</h3>
					{#if reportedChannels.length === 0}
						<p class="py-6 text-center text-sm text-ink-400">
							No hay canales con reportes abiertos.
						</p>
					{:else}
						<div class="mt-2 space-y-3">
							{#each reportedChannels as group (group.channel.id)}
								<div class="border-critical-200 rounded-2xl border bg-critical-50/40 p-4">
									<p class="font-display text-sm font-semibold text-ink-900">
										{channelPlatformLabels[group.channel.platform]}
										{#if group.channel.label}· {group.channel.label}{/if}
									</p>
									<p class="truncate text-xs text-ink-500">{group.channel.url}</p>
									<div class="mt-2 space-y-1.5">
										{#each group.reports as report (report.id)}
											<div class="rounded-xl bg-white px-3 py-2 text-sm">
												<p class="font-medium text-critical-700">
													{channelReportReasonLabels[report.reason]}
												</p>
												{#if report.details}<p class="text-xs text-ink-500">
														{report.details}
													</p>{/if}
											</div>
										{/each}
									</div>
									<div class="mt-3 flex flex-wrap gap-2 border-t border-critical-100 pt-3">
										<button
											type="button"
											onclick={() => dismissChannelReport(group.channel.id)}
											class="flex items-center gap-1.5 rounded-full bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
										>
											<Check class="size-3.5" /> Descartar reporte
										</button>
										<button
											type="button"
											onclick={() => hideReportedChannel(group.channel.id)}
											class="flex items-center gap-1.5 rounded-full border border-warning-300 px-3 py-1.5 text-xs font-semibold text-warning-700 hover:bg-warning-50"
										>
											<EyeOff class="size-3.5" /> Ocultar solo el canal
										</button>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{:else if activeTab === 'documentacion'}
				{#if pendingDocuments.length === 0}
					<p class="py-10 text-center text-sm text-ink-400">
						No hay documentación pendiente de revisión.
					</p>
				{:else}
					<div class="space-y-2.5">
						{#each pendingDocuments as doc (doc.id)}
							<div
								class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white p-4"
							>
								<div>
									<p class="text-sm font-semibold text-ink-900">
										{orgNameById.get(doc.organizerId) ?? 'Organizador desconocido'}
									</p>
									<p class="text-xs text-ink-500">{doc.fileName}</p>
								</div>
								<div class="flex gap-2">
									<button
										type="button"
										disabled={viewingDocId === doc.id}
										onclick={() => viewDocument(doc.id, doc.storagePath)}
										class="flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50 disabled:opacity-50"
									>
										<FileSearch class="size-3.5" />
										{viewingDocId === doc.id ? 'Abriendo…' : 'Ver documento'}
									</button>
									<button
										type="button"
										onclick={() => reviewDoc(doc.id, 'approved')}
										class="rounded-full bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
									>
										Aprobar
									</button>
									<button
										type="button"
										onclick={() => reviewDoc(doc.id, 'rejected')}
										class="border-critical-200 text-critical-600 rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-critical-50"
									>
										Rechazar
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			{:else if activeTab === 'pulso'}
				<PulsoModerationPanel
					bind:concerns
					bind:proposals={concernProposals}
					events={data.publicEvents}
					moderatorId={MODERATOR_ID}
				/>
				<NextBlockVoteAdminPanel bind:rounds={nextBlockVoteRounds} moderatorId={MODERATOR_ID} />
			{:else if activeTab === 'vozAbierta'}
				<VozAbiertaModerationPanel bind:items={pendingOpenVoiceContributions} />
			{:else if activeTab === 'temas'}
				<div>
					<a
						href="/moderacion/temas/nuevo"
						class="flex w-fit items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
					>
						<Plus class="size-4" /> Nuevo tema
					</a>
					{#if pendingAlternativesCount > 0}
						<p class="mt-3 text-sm text-warning-700">
							{pendingAlternativesCount}
							{pendingAlternativesCount === 1 ? 'alternativa pendiente' : 'alternativas pendientes'} de
							revisión — entra en el tema correspondiente para aprobarla o rechazarla.
						</p>
					{/if}
					{#if topics.length > 0}
						<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
							{#each topics as topic (topic.id)}
								<TopicCard {topic} showStatus href={`/moderacion/temas/${topic.id}`} />
							{/each}
						</div>
					{:else}
						<p class="mt-4 py-10 text-center text-sm text-ink-400">Todavía no hay temas creados.</p>
					{/if}
				</div>
			{:else if activeTab === 'registro'}
				{#if auditLog.length === 0}
					<p class="py-10 text-center text-sm text-ink-400">
						Todavía no hay decisiones registradas.
					</p>
				{:else}
					<div class="space-y-2">
						{#each auditLog as log (log.id)}
							<div class="rounded-2xl border border-ink-100 bg-white px-4 py-3 text-sm">
								<div class="flex items-center justify-between">
									<span class="font-semibold text-ink-800"
										>{auditEventTitles.get(log.eventId) ?? log.eventId}</span
									>
									<span class="text-xs text-ink-400">{formatRelativeTime(log.createdAt)}</span>
								</div>
								<p class="mt-0.5 text-xs text-ink-500">
									Acción: <strong class="font-medium text-ink-700"
										>{moderationActionLabels[log.action]}</strong
									>
									· moderador {log.moderatorId}
								</p>
								{#if log.note}<p class="mt-1 text-ink-600">{log.note}</p>{/if}
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>

{#if actionTarget}
	{@const copy = actionCopy[actionTarget.action]}
	<NoteDialog
		bind:open={actionOpen}
		title={copy.title}
		description={actionTarget.event.title}
		confirmLabel={copy.confirmLabel}
		tone={copy.tone}
		requireNote={copy.requireNote}
		onConfirm={confirmAction}
		onClose={() => (actionTarget = null)}
	/>
{/if}
