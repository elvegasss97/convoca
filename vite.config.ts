import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
	// `if (ENABLE_DEMO_DATA) { await import('./demoAccounts') }` NO basta para
	// mantener la contraseña y los correos de demostración fuera del build de
	// producción: comprobamos (build real + grep del output) que Rollup igual
	// empaqueta el módulo importado dinámicamente como un chunk físico y lo
	// publica en `_app/immutable/chunks/`, se ejecute o no esa rama en el
	// navegador — el condicional en tiempo de ejecución no impide que el
	// archivo exista y sea servible.
	//
	// La sustitución real ocurre aquí, en tiempo de bundling: el especificador
	// virtual `convoca:demo-accounts` (ver `demo-accounts-virtual.d.ts`) se
	// alía a `demoAccounts.ts` (datos reales) o a `demoAccounts.empty.ts`
	// (vacío) según `PUBLIC_APP_ENV`, así que en un build de producción el
	// chunk que Rollup genera para ese import ya no contiene los datos reales
	// en ningún punto del pipeline.
	//
	// Usamos un especificador virtual (no `$lib/auth/demoAccounts`) a
	// propósito: un alias más específico que sea prefijo de otro alias más
	// genérico (`$lib`) no gana automáticamente — Vite resuelve alias en el
	// orden en que aparecen en el array final y `$lib`, añadido por el propio
	// plugin de SvelteKit, siempre queda primero. Un especificador único sin
	// solapamiento evita ese problema de orden por completo.
	const env = loadEnv(mode, process.cwd(), '');
	const isProductionBuild = env.PUBLIC_APP_ENV === 'production';
	const demoAccountsModule = isProductionBuild
		? './src/lib/auth/demoAccounts.empty.ts'
		: './src/lib/auth/demoAccounts.ts';

	return {
		resolve: {
			alias: {
				'convoca:demo-accounts': fileURLToPath(new URL(demoAccountsModule, import.meta.url))
			}
		},
		plugins: [
			tailwindcss(),
			SvelteKitPWA({
				// Preparado para fases futuras: registro de service worker desactivado
				// en desarrollo para no interferir con la iteración del prototipo.
				registerType: 'autoUpdate',
				devOptions: { enabled: false },
				manifest: {
					name: 'Convoca — Movilizaciones ciudadanas',
					short_name: 'Convoca',
					description:
						'Descubre, verifica y confirma tu asistencia a concentraciones y movilizaciones ciudadanas legales y pacíficas.',
					theme_color: '#176056',
					background_color: '#f7f6f4',
					display: 'standalone',
					start_url: '/',
					lang: 'es',
					icons: [
						{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
						{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
						{
							src: '/icons/icon-maskable-512.png',
							sizes: '512x512',
							type: 'image/png',
							purpose: 'maskable'
						}
					]
				},
				workbox: {
					globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}']
				}
			}),
			sveltekit({
				compilerOptions: {
					// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true
				},

				// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
				// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
				// See https://svelte.dev/docs/kit/adapters for more information about adapters.
				adapter: adapter()
			})
		],
		optimizeDeps: {
			// Vite's dependency pre-bundling breaks maplibre-gl's worker chunk
			// (requests a maplibre-gl-worker.mjs that never gets emitted, so the
			// map silently renders no markers). Excluding it forces Vite to serve
			// the package as-is, where the worker resolves correctly.
			exclude: ['maplibre-gl']
		},
		test: {
			environment: 'node',
			include: ['src/**/*.{test,spec}.ts']
		}
	};
});
