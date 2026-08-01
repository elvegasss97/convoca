<script lang="ts">
	import LegalPageShell from '$lib/components/legal/LegalPageShell.svelte';
	import { LEGAL_VERSIONS } from '$lib/legal/versions';
</script>

<LegalPageShell title="Términos de uso" updatedAt={LEGAL_VERSIONS.terms}>
	<section>
		<h2>1. Qué es Convoca</h2>
		<p>
			Convoca es una plataforma para descubrir, publicar y coordinar convocatorias ciudadanas
			(concentraciones, manifestaciones, marchas, asambleas y acciones similares) de carácter legal
			y pacífico. Convoca no organiza ni convoca ningún acto: se limita a ofrecer un espacio donde
			personas y colectivos pueden publicar información sobre sus propias convocatorias y donde
			otras personas pueden encontrarlas, informarse y expresar su interés.
		</p>
		<p>
			Convoca no sustituye ningún trámite administrativo que, en su caso, corresponda realizar a
			quien organiza la convocatoria (por ejemplo, la comunicación previa a la autoridad gubernativa
			cuando la ley lo exija). La responsabilidad de cumplir esos trámites es exclusivamente de la
			persona u organización que publica la convocatoria.
		</p>
	</section>

	<section>
		<h2>2. Quién puede usar Convoca</h2>
		<ul>
			<li>Debes ser mayor de edad (18 años) para crear una cuenta o publicar una convocatoria.</li>
			<li>Puedes consultar convocatorias publicadas y ver el mapa sin necesidad de registrarte.</li>
			<li>
				Para publicar una convocatoria, confirmar asistencia con tu cuenta o gestionar un perfil de
				organizador necesitas una cuenta con correo electrónico o iniciar sesión con Google.
			</li>
			<li>Los datos que nos proporciones al registrarte deben ser veraces.</li>
		</ul>
	</section>

	<section>
		<h2>3. Publicar una convocatoria</h2>
		<p>Si publicas una convocatoria en Convoca, declaras y te comprometes a que:</p>
		<ul>
			<li>
				Es una acción legal y de carácter pacífico (ver también la Declaración de uso pacífico).
			</li>
			<li>
				La información que facilitas (fecha, punto de encuentro, descripción, normas) es correcta y
				la mantendrás actualizada si cambia.
			</li>
			<li>
				Eres tú, o la organización a la que representas, quien asume la responsabilidad legal de la
				convocatoria — nunca Convoca.
			</li>
			<li>
				Si la convocatoria requiere comunicación previa a la autoridad competente, esa gestión te
				corresponde a ti, no a Convoca.
			</li>
		</ul>
		<p>
			Toda convocatoria nueva pasa por una revisión de moderación antes de publicarse. Convoca puede
			mostrar un nivel de verificación asociado a tu perfil de organizador (identidad verificada,
			organización verificada, documentación revisada) según la información que hayas aportado
			voluntariamente; ese nivel informa a quien visita la convocatoria, pero no es una garantía
			absoluta ni una certificación oficial.
		</p>
	</section>

	<section>
		<h2>4. Normas de conducta</h2>
		<p>Al usar Convoca, no puedes:</p>
		<ul>
			<li>
				Publicar convocatorias que inciten a la violencia, al odio o a la comisión de delitos.
			</li>
			<li>Suplantar la identidad de otra persona u organización.</li>
			<li>Publicar contenido falso, engañoso o spam.</li>
			<li>
				Usar los canales de coordinación (WhatsApp/Telegram) enlazados desde una convocatoria con
				fines distintos a coordinar esa acción.
			</li>
			<li>
				Intentar acceder a datos o funciones que no te correspondan, o eludir las medidas de
				seguridad de la plataforma.
			</li>
		</ul>
	</section>

	<section>
		<h2>5. Moderación</h2>
		<p>
			El equipo de moderación de Convoca puede revisar, ocultar o rechazar convocatorias, y ocultar
			canales de coordinación concretos, cuando incumplan estas normas o la ley. Estas decisiones
			quedan registradas en un historial interno de moderación. Cualquier persona puede reportar una
			convocatoria o un canal que considere inapropiado.
		</p>
		<p>
			Convoca puede suspender o cerrar una cuenta que incumpla repetidamente estas normas, sin
			perjuicio de las acciones legales que puedan corresponder.
		</p>
	</section>

	<section>
		<h2>6. Canales de coordinación externos</h2>
		<p>
			Convoca permite a quien organiza enlazar canales externos de coordinación (por ejemplo, grupos
			de WhatsApp o Telegram). Esos canales son gestionados por terceros ajenos a Convoca: no
			supervisamos su contenido, no somos parte de esos canales y no registramos quién los abre ni
			quién se une a ellos. Al abrir uno de esos enlaces sales de Convoca y quedas sujeto a las
			condiciones de la plataforma correspondiente (WhatsApp, Telegram, etc.).
		</p>
	</section>

	<section>
		<h2>7. Confirmaciones de asistencia</h2>
		<p>
			Las cifras de "voy" / "me interesa" que muestra Convoca son estimaciones basadas en
			confirmaciones anónimas del propio navegador de cada persona, no un censo ni un registro
			nominal de asistentes. No se usan para elaborar listas de participantes.
		</p>
	</section>

	<section>
		<h2>8. Tu cuenta</h2>
		<p>
			Eres responsable de mantener la confidencialidad de tu contraseña y de toda actividad que
			ocurra desde tu cuenta. Avísanos si sospechas de un acceso no autorizado.
		</p>
	</section>

	<section>
		<h2>9. Contenido que publicas</h2>
		<p>
			Conservas los derechos sobre el contenido que publicas (título, descripción, imágenes). Al
			publicarlo, nos concedes una licencia no exclusiva para mostrarlo dentro de Convoca con el
			único fin de operar el servicio (por ejemplo, mostrarlo en el listado, el mapa y la ficha de
			la convocatoria).
		</p>
	</section>

	<section>
		<h2>10. Limitación de responsabilidad</h2>
		<p>
			Convoca es un canal de difusión e información, no organiza ni supervisa lo que ocurre en los
			actos físicos publicados por terceros. En la medida permitida por la ley, Convoca no asume
			responsabilidad por lo que suceda durante una convocatoria, por el incumplimiento de trámites
			administrativos por parte de quien la organiza, ni por el contenido de canales externos
			enlazados desde la plataforma.
		</p>
	</section>

	<section>
		<h2>11. Cambios en estos términos</h2>
		<p>
			Podemos actualizar estos términos. Si el cambio es sustancial, se te pedirá que los vuelvas a
			aceptar la próxima vez que uses funciones que lo requieran, aunque ya los hubieras aceptado
			antes.
		</p>
	</section>

	<section>
		<h2>12. Ley aplicable</h2>
		<p>
			Estos términos se rigen por la legislación española. Cualquier controversia se someterá a los
			juzgados y tribunales que correspondan conforme a la normativa de protección de personas
			consumidoras y usuarias aplicable.
		</p>
	</section>

	<section>
		<h2>13. Contacto</h2>
		<p>
			Para cualquier consulta sobre estos términos, escribe a
			<a href="mailto:convocahelp@outlook.es">convocahelp@outlook.es</a>.
		</p>
	</section>
</LegalPageShell>
