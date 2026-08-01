<script lang="ts">
	import LegalPageShell from '$lib/components/legal/LegalPageShell.svelte';
	import { LEGAL_VERSIONS } from '$lib/legal/versions';

	const sections = [
		{ id: 'titular', label: '1. Titular del sitio' },
		{ id: 'objeto', label: '2. Objeto' },
		{ id: 'alojamiento', label: '3. Alojamiento' },
		{ id: 'propiedad-intelectual', label: '4. Propiedad intelectual' },
		{ id: 'otros-documentos', label: '5. Otros documentos' }
	];
</script>

<LegalPageShell
	title="Aviso legal"
	description="Identificación del titular de Convoca, condiciones de acceso y responsabilidad sobre el contenido publicado por las personas usuarias."
	updatedAt={LEGAL_VERSIONS.terms}
	{sections}
>
	<section>
		<h2 id="titular">1. Titular del sitio</h2>
		<p>
			En cumplimiento del deber de información de la Ley 34/2002, de Servicios de la Sociedad de la
			Información y de Comercio Electrónico (LSSI-CE):
		</p>
		<ul>
			<li>
				<strong>Titular:</strong> Elias Vega, persona física (proyecto en fase de prototipo, sin una sociedad
				mercantil constituida a día de hoy).
			</li>
			<li>Contacto: <a href="mailto:convocahelp@outlook.es">convocahelp@outlook.es</a></li>
			<li>
				NIF y domicilio: <strong>[DATOS DEL TITULAR PENDIENTES DE COMPLETAR]</strong> — se añadirán a
				este documento antes de un lanzamiento público real.
			</li>
		</ul>
	</section>

	<section>
		<h2 id="objeto">2. Objeto</h2>
		<p>
			Convoca es una plataforma para descubrir, publicar y coordinar convocatorias ciudadanas
			legales y pacíficas. El uso del sitio implica la aceptación de este aviso legal, de los
			<a href="/legal/terminos">Términos de uso</a> y de la
			<a href="/legal/privacidad">Política de privacidad</a>.
		</p>
	</section>

	<section>
		<h2 id="alojamiento">3. Alojamiento</h2>
		<p>
			El sitio se aloja en infraestructura de Vercel Inc. y usa Supabase como proveedor de base de
			datos, autenticación y almacenamiento. Más detalle sobre estos proveedores en la
			<a href="/legal/privacidad#con-quien-compartimos">Política de privacidad</a>.
		</p>
	</section>

	<section>
		<h2 id="propiedad-intelectual">4. Propiedad intelectual</h2>
		<p>
			El diseño, la marca "Convoca" y el código de la plataforma pertenecen a su titular. El
			contenido publicado por cada persona usuaria (título, descripción, imágenes de sus
			convocatorias) es de su propiedad — ver el apartado
			<a href="/legal/terminos#contenido-que-publicas">"Contenido que publicas"</a> de los Términos de
			uso.
		</p>
	</section>

	<section>
		<h2 id="otros-documentos">5. Otros documentos</h2>
		<p>
			Este aviso legal se complementa con los <a href="/legal/terminos">Términos de uso</a>, la
			<a href="/legal/privacidad">Política de privacidad</a>
			y la <a href="/legal/uso-pacifico">Declaración de uso pacífico</a>.
		</p>
	</section>
</LegalPageShell>
