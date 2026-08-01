<script lang="ts">
	import LegalPageShell from '$lib/components/legal/LegalPageShell.svelte';
	import { LEGAL_VERSIONS } from '$lib/legal/versions';

	const sections = [
		{ id: 'compromiso', label: '1. Compromiso' },
		{ id: 'prohibido', label: '2. Queda prohibido' },
		{ id: 'tramites', label: '3. Trámites administrativos' },
		{ id: 'incumplimiento', label: '4. Qué hacemos si se incumple' },
		{ id: 'responsabilidad', label: '5. Responsabilidad' }
	];
</script>

<LegalPageShell
	title="Declaración de uso pacífico"
	description="Convoca solo admite convocatorias legales y pacíficas: qué queda prohibido y cómo actuamos ante contenido que incite a la violencia."
	updatedAt={LEGAL_VERSIONS.peacefulUse}
	{sections}
>
	<section>
		<h2 id="compromiso">1. Compromiso</h2>
		<p>
			Convoca existe para facilitar el ejercicio del derecho de reunión y manifestación pacífica,
			reconocido por el artículo 21 de la Constitución Española y regulado por la Ley Orgánica
			9/1983, reguladora del derecho de reunión. Al publicar o promover una convocatoria en Convoca,
			declaras que se trata de una acción <strong>legal, pacífica y no violenta</strong>.
		</p>
	</section>

	<section>
		<h2 id="prohibido">2. Queda prohibido</h2>
		<ul>
			<li>Convocar o incitar a la violencia contra personas o bienes.</li>
			<li>
				Convocar o incitar al odio contra cualquier persona o grupo por razón de origen, etnia,
				religión, orientación sexual, identidad de género, discapacidad o cualquier otra condición.
			</li>
			<li>Usar Convoca para organizar actividades delictivas.</li>
			<li>Portar o incitar a portar armas u objetos destinados a causar daño.</li>
		</ul>
	</section>

	<section>
		<h2 id="tramites">3. Trámites administrativos</h2>
		<p>
			En España, las reuniones en lugares de tránsito público y las manifestaciones deben
			comunicarse por escrito a la autoridad gubernativa correspondiente con una antelación mínima
			de diez días naturales (o, en casos urgentes, veinticuatro horas antes), conforme a la Ley
			Orgánica 9/1983. <strong
				>Esa comunicación es responsabilidad exclusiva de quien organiza la convocatoria</strong
			>, no de Convoca. El campo "comunicación previa" que puedes rellenar al crear una convocatoria
			es informativo para quien la vaya a consultar: no sustituye ni acredita ante ninguna autoridad
			el cumplimiento de ese trámite.
		</p>
	</section>

	<section>
		<h2 id="incumplimiento">4. Qué hacemos si se incumple</h2>
		<p>
			Si una convocatoria incumple esta declaración, Convoca puede rechazarla antes de publicarla,
			ocultarla si ya estaba publicada, o cancelarla. Si el incumplimiento es reiterado, la cuenta
			responsable puede ser suspendida. Cualquier persona usuaria puede reportar una convocatoria
			que considere que incumple esta declaración.
		</p>
	</section>

	<section>
		<h2 id="responsabilidad">5. Responsabilidad</h2>
		<p>
			Convoca es un canal de difusión: no organiza el acto, no está presente en él y no puede
			controlar el comportamiento de quienes asistan. La responsabilidad por lo que ocurra durante
			la convocatoria, y por el cumplimiento de la normativa aplicable, corresponde a quien la
			organiza y, en su caso, a quienes participen en ella — nunca a Convoca.
		</p>
	</section>
</LegalPageShell>
