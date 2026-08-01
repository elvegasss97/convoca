<script lang="ts">
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
		CalendarDays
	} from '@lucide/svelte';
	import type { PageData } from './$types';
	import type { AuditLog, Event, ModerationAction } from '$lib/types';
	import {
		categoryLabels,
		reportReasonLabels,
		moderationActionLabels,
		channelPlatformLabels,
		channelReportReasonLabels
	} from '$lib/labels';
	import { formatEventDate, formatEventTime, formatRelativeTime } from '$lib/utils/date';
	import { applyModerationAction, listAllAuditLogs } from '$lib/services/moderationService';
	import { reviewDocument } from '$lib/services/organizersService';
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

	const orgNameById = $derived(new Map(data.organizers.map((o) => [o.id, o.displayName])));

	const tabs = [
		{ key: 'pendientes', label: 'Pendientes', icon: FileClock },
		{ key: 'reportadas', label: 'Reportadas', icon: Flag },
		{ key: 'documentacion', label: 'Documentación', icon: FileCheck2 },
		{ key: 'registro', label: 'Registro de decisiones', icon: ScrollText }
	] as const;

	let activeTab = $state<(typeof tabs)[number]['key']>('pendientes');

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

<svelte:head>
	<title>Panel de moderación — Convoca</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 pt-4 pb-16 sm:px-6">
	<div class="flex items-center gap-2">
		<ShieldCheck class="size-6 text-brand-700" />
		<h1 class="font-display text-2xl font-semibold text-ink-900">Panel de moderación</h1>
	</div>
	<p class="mt-1 max-w-2xl text-sm text-ink-500">
		Ruta interna para revisar convocatorias, reportes y documentación antes de que lleguen al
		público. No visible desde la navegación principal ni accesible con una cuenta de organizador.
	</p>
	<p class="mt-1 text-xs text-ink-400">Conectado como {data.session.user.email}</p>

	<div class="no-scrollbar mt-5 flex gap-1.5 overflow-x-auto border-b border-ink-100 pb-px">
		{#each tabs as tab (tab.key)}
			<button
				type="button"
				onclick={() => (activeTab = tab.key)}
				class="flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-sm font-medium transition {activeTab ===
				tab.key
					? 'border-brand-700 text-brand-800'
					: 'border-transparent text-ink-500 hover:text-ink-800'}"
			>
				<tab.icon class="size-4" />
				{tab.label}
				{#if tab.key === 'pendientes' && pending.length > 0}
					<span class="rounded-full bg-warning-100 px-1.5 text-xs font-bold text-warning-700"
						>{pending.length}</span
					>
				{:else if tab.key === 'reportadas' && reported.length > 0}
					<span class="rounded-full bg-critical-100 px-1.5 text-xs font-bold text-critical-700"
						>{reported.length}</span
					>
				{:else if tab.key === 'documentacion' && pendingDocuments.length > 0}
					<span class="rounded-full bg-warning-100 px-1.5 text-xs font-bold text-warning-700"
						>{pendingDocuments.length}</span
					>
				{/if}
			</button>
		{/each}
	</div>

	<div class="mt-5">
		{#if activeTab === 'pendientes'}
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
										<p class="font-medium text-critical-700">{reportReasonLabels[report.reason]}</p>
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
					<p class="py-6 text-center text-sm text-ink-400">No hay canales con reportes abiertos.</p>
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
											{#if report.details}<p class="text-xs text-ink-500">{report.details}</p>{/if}
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
		{:else if activeTab === 'registro'}
			{#if auditLog.length === 0}
				<p class="py-10 text-center text-sm text-ink-400">Todavía no hay decisiones registradas.</p>
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
