<script lang="ts">
	import { page } from '$app/state';
	import { SITE_NAME, DEFAULT_OG_IMAGE, absoluteUrl } from '$lib/seo';

	let {
		title,
		description,
		image = DEFAULT_OG_IMAGE,
		type = 'website',
		noindex = false,
		jsonLd
	}: {
		/** Parte específica del título de esta página; se le añade "— Convoca" automáticamente. */
		title: string;
		description: string;
		/** Ruta relativa (p. ej. "/og/default.png") o URL absoluta. */
		image?: string;
		type?: 'website' | 'article';
		/** Páginas privadas, de administración o transaccionales que no deben indexarse. */
		noindex?: boolean;
		jsonLd?: Record<string, unknown> | Record<string, unknown>[];
	} = $props();

	const fullTitle = $derived(`${title} — ${SITE_NAME}`);
	const canonical = $derived(absoluteUrl(page.url.pathname));
	const absoluteImage = $derived(image.startsWith('http') ? image : absoluteUrl(image));
	const jsonLdList = $derived(jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []);

	// Serializa cada bloque JSON-LD por separado y escapa "</" para que un valor de texto
	// que contenga esa secuencia de cierre nunca pueda cerrar la etiqueta de script real
	// e inyectar HTML arbitrario en la página.
	const jsonLdBlocks = $derived(
		jsonLdList.map(
			(ld) =>
				// eslint-disable-next-line no-useless-escape -- el escape de "\/" es funcional, no redundante: sin él, el texto de cierre de esta plantilla coincidiría literalmente con el del bloque <script> real de este archivo y el compilador de Svelte lo cerraría ahí mismo (ver error "script_duplicate").
				`<script type="application/ld+json">${JSON.stringify(ld).replace(/<\//g, '<\\/')}<\/script>`
		)
	);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />
	{#if noindex}
		<meta name="robots" content="noindex, nofollow" />
	{/if}

	<meta property="og:type" content={type} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:locale" content="es_ES" />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	<meta property="og:image" content={absoluteImage} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={`${title} — ${SITE_NAME}`} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={absoluteImage} />

	{#each jsonLdBlocks as block (block)}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- JSON-LD generado por eventJsonLd()/organizationJsonLd(), con "</" escapado arriba para que no pueda cerrar la etiqueta <script> e inyectar HTML. -->
		{@html block}
	{/each}
</svelte:head>
