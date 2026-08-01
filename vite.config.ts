import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vitest/config';

export default defineConfig(() => {
	return {
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

				// Despliegue fijado a Vercel (staging primero, ver MIGRACION-PRODUCCION.md).
				// Runtime Node por defecto: toda la app tiene `ssr = false`
				// (src/routes/+layout.ts) y no hay ningún +server.ts/hooks.server.ts,
				// así que no hay código de servidor real que se beneficie de edge —
				// el runtime por defecto es el más simple y suficiente aquí.
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
