<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import {
		Pencil,
		MessageSquareText,
		Ban,
		ExternalLink,
		FileLock2,
		Users,
		CalendarCheck,
		Lock,
		Copy,
		Archive,
		ArchiveRestore
	} from '@lucide/svelte';
	import type { PageData } from './$types';
	import type { Event, VerificationDocument } from '$lib/types';
	import {
		cancelEventAsOwner,
		duplicateEventAsOwner,
		setArchivedAsOwner
	} from '$lib/services/eventsService';
	import { formatEventDate, formatEventTime } from '$lib/utils/date';
	import StatusPill from '$lib/components/StatusPill.svelte';
	import VerificationBadge from '$lib/components/VerificationBadge.svelte';
	import AttendanceCounter from '$lib/components/AttendanceCounter.svelte';
	import EditEventDialog from '$lib/components/EditEventDialog.svelte';
	import PublishUpdateDialog from '$lib/components/PublishUpdateDialog.svelte';
	import NoteDialog from '$lib/components/NoteDialog.svelte';

	let { data }: { data: PageData } = $props();

	const userId = data.session.user.id;

	let events = $state<Event[]>(data.events);
	let documents = $state<VerificationDocument[]>(data.documents);
	let estimatedAttendance = $state(data.estimatedAttendance);

	const documentTypeLabels: Record<VerificationDocument['type'], string> = {
		identity: 'Identidad',
		organization_registration: 'Registro de la organización',
		prior_communication_receipt: 'Justificante de comunicación previa',
		other: 'Otro documento'
	};

	const documentStatusLabels: Record<VerificationDocument['status'], string> = {
		pending: 'Pendiente de revisión',
		approved: 'Aprobado',
		rejected: 'Rechazado'
	};

	type Tab = 'activas' | 'borradores' | 'pendientes' | 'archivadas';
	const tabs: { key: Tab; label: string }[] = [
		{ key: 'activas', label: 'Activas' },
		{ key: 'borradores', label: 'Borradores' },
		{ key: 'pendientes', label: 'En revisión' },
		{ key: 'archivadas', label: 'Archivadas' }
	];
	let activeTab = $state<Tab>('activas');

	const filteredEvents = $derived(
		events.filter((e) => {
			if (activeTab === 'archivadas') return Boolean(e.archived);
			if (e.archived) return false;
			if (activeTab === 'borradores') return e.status === 'draft';
			if (activeTab === 'pendientes') return e.status === 'pending_review';
			return true;
		})
	);

	let editingEvent = $state<Event | null>(null);
	let editOpen = $state(false);

	let updateEventId = $state<string | null>(null);
	let updateOpen = $state(false);

	let cancelEventTarget = $state<Event | null>(null);
	let cancelOpen = $state(false);

	function openEdit(event: Event) {
		editingEvent = event;
		editOpen = true;
	}

	function openUpdate(event: Event) {
		updateEventId = event.id;
		updateOpen = true;
	}

	function openCancel(event: Event) {
		cancelEventTarget = event;
		cancelOpen = true;
	}

	function patchEvent(updated: Event) {
		events = events.map((e) => (e.id === updated.id ? updated : e));
	}

	async function duplicate(event: Event) {
		const created = await duplicateEventAsOwner(userId, event.id);
		events = [created, ...events];
		activeTab = 'borradores';
	}

	async function toggleArchived(event: Event) {
		const updated = await setArchivedAsOwner(userId, event.id, !event.archived);
		patchEvent(updated);
	}

	const cancellableStates = new Set([
		'published',
		'identity_verified',
		'organization_verified',
		'documentation_reviewed',
		'modified'
	]);
</script>

<Seo
	title="Panel del organizador"
	description="Gestiona tus convocatorias publicadas en Convoca."
	noindex
/>

<div class="mx-auto max-w-4xl px-4 pt-4 pb-24 sm:px-6 md:pb-10">
	<div>
		<h1 class="font-display text-2xl font-semibold text-ink-900">Panel del organizador</h1>
		<p class="mt-1 text-sm text-ink-500">
			Convocatorias de <strong class="font-semibold text-ink-700"
				>{data.organizer?.displayName}</strong
			>. Solo tú puedes verlas y administrarlas desde aquí.
		</p>
	</div>

	<div class="mt-5 flex flex-wrap gap-3">
		<div
			class="flex items-center gap-2 rounded-2xl border border-ink-100 bg-white px-4 py-2.5 shadow-card"
		>
			<CalendarCheck class="size-4 text-brand-600" />
			<span class="text-sm"
				><strong class="font-semibold text-ink-900">{events.length}</strong> convocatorias creadas</span
			>
		</div>
		<div
			class="flex items-center gap-2 rounded-2xl border border-ink-100 bg-white px-4 py-2.5 shadow-card"
		>
			<Users class="size-4 text-accent-500" />
			<span class="text-sm">
				<strong class="font-semibold text-ink-900">{estimatedAttendance}</strong> asistencia estimada
				acumulada
			</span>
		</div>
	</div>

	<div class="no-scrollbar mt-5 flex gap-1.5 overflow-x-auto border-b border-ink-100 pb-px">
		{#each tabs as tab (tab.key)}
			<button
				type="button"
				onclick={() => (activeTab = tab.key)}
				class="shrink-0 border-b-2 px-3.5 py-2.5 text-sm font-medium transition {activeTab ===
				tab.key
					? 'border-brand-700 text-brand-800'
					: 'border-transparent text-ink-500 hover:text-ink-800'}"
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<section class="mt-4 space-y-3">
		{#if filteredEvents.length === 0}
			<div
				class="rounded-2xl border border-dashed border-ink-200 bg-white py-12 text-center text-sm text-ink-500"
			>
				No hay convocatorias en esta sección todavía.
			</div>
		{:else}
			{#each filteredEvents as event (event.id)}
				<div class="rounded-2xl border border-ink-100 bg-white p-4">
					<div class="flex flex-wrap items-start justify-between gap-2">
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-1.5">
								<StatusPill status={event.status} />
								<VerificationBadge level={event.verification.level} />
								{#if event.archived}
									<span class="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-500"
										>Archivada</span
									>
								{/if}
							</div>
							<a
								href={`/convocatorias/${event.slug}`}
								class="mt-1 block truncate font-display text-base font-semibold text-ink-900 hover:underline"
							>
								{event.title}
							</a>
							<p class="text-xs text-ink-500">
								{formatEventDate(event.startAt)} · {formatEventTime(event.startAt)} · {event
									.meetingPoint.city}
							</p>
						</div>
						<AttendanceCounter attendance={event.attendance} />
					</div>

					<div class="mt-3 flex flex-wrap gap-2 border-t border-ink-100 pt-3">
						<button
							type="button"
							onclick={() => openEdit(event)}
							class="flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50"
						>
							<Pencil class="size-3.5" /> Editar
						</button>
						<button
							type="button"
							onclick={() => openUpdate(event)}
							class="flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50"
						>
							<MessageSquareText class="size-3.5" /> Publicar actualización
						</button>
						<button
							type="button"
							onclick={() => duplicate(event)}
							class="flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50"
						>
							<Copy class="size-3.5" /> Duplicar
						</button>
						{#if event.status === 'completed' || event.status === 'cancelled'}
							<button
								type="button"
								onclick={() => toggleArchived(event)}
								class="flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50"
							>
								{#if event.archived}
									<ArchiveRestore class="size-3.5" /> Restaurar
								{:else}
									<Archive class="size-3.5" /> Archivar
								{/if}
							</button>
						{/if}
						{#if cancellableStates.has(event.status)}
							<button
								type="button"
								onclick={() => openCancel(event)}
								class="border-critical-200 text-critical-600 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-critical-50"
							>
								<Ban class="size-3.5" /> Marcar como cancelada
							</button>
						{/if}
						<a
							href={`/convocatorias/${event.slug}`}
							class="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
						>
							Ver página <ExternalLink class="size-3.5" />
						</a>
					</div>
				</div>
			{/each}
		{/if}
	</section>

	<section class="mt-8">
		<div class="flex items-center gap-2">
			<FileLock2 class="size-5 text-ink-400" />
			<h2 class="font-display text-lg font-semibold text-ink-900">Documentación privada</h2>
		</div>
		<p class="mt-1 text-sm text-ink-500">
			Solo visible para ti y para el equipo de moderación. No se guarda en este navegador entre
			sesiones: en esta fase del prototipo es de solo lectura y vive solo en memoria; la subida real
			se habilitará al conectar Supabase Storage.
		</p>

		<div class="mt-3 space-y-2">
			{#if documents.length === 0}
				<p class="text-sm text-ink-400">Todavía no se ha aportado documentación.</p>
			{:else}
				{#each documents as doc (doc.id)}
					<div
						class="flex items-center justify-between rounded-2xl border border-ink-100 bg-ink-50 px-4 py-3 text-sm"
					>
						<div>
							<p class="font-medium text-ink-800">{documentTypeLabels[doc.type]}</p>
							<p class="text-xs text-ink-500">{doc.fileName}</p>
						</div>
						<span class="text-xs font-semibold text-ink-500"
							>{documentStatusLabels[doc.status]}</span
						>
					</div>
				{/each}
			{/if}
			<button
				type="button"
				disabled
				class="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-ink-200 py-3 text-sm font-medium text-ink-400"
			>
				<Lock class="size-4" /> Subida de documentación disponible próximamente
			</button>
		</div>
	</section>
</div>

{#if editingEvent}
	<EditEventDialog
		bind:open={editOpen}
		event={editingEvent}
		{userId}
		onSaved={patchEvent}
		onClose={() => (editingEvent = null)}
	/>
{/if}

{#if updateEventId && data.organizer}
	<PublishUpdateDialog
		bind:open={updateOpen}
		eventId={updateEventId}
		organizerId={data.organizer.id}
		onPublished={() => {}}
		onClose={() => (updateEventId = null)}
	/>
{/if}

{#if cancelEventTarget}
	<NoteDialog
		bind:open={cancelOpen}
		title="Marcar convocatoria como cancelada"
		description="Explica brevemente el motivo. Este mensaje se mostrará en un aviso destacado a las personas interesadas."
		placeholder="Ej. Se cancela por lluvia, se convocará nueva fecha…"
		confirmLabel="Confirmar cancelación"
		tone="critical"
		requireNote
		onConfirm={async (note) => {
			if (!cancelEventTarget) return;
			const updated = await cancelEventAsOwner(userId, cancelEventTarget.id, note);
			patchEvent(updated);
		}}
		onClose={() => (cancelEventTarget = null)}
	/>
{/if}
