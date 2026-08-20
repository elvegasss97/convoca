<script lang="ts">
	import LegalPageShell from '$lib/components/legal/LegalPageShell.svelte';
	import { LEGAL_VERSIONS } from '$lib/legal/versions';

	const sections = [
		{ id: 'que-es-convoca', label: '1. Qué es Convoca' },
		{ id: 'quien-puede-usar', label: '2. Quién puede usar Convoca' },
		{ id: 'publicar-una-convocatoria', label: '3. Publicar una convocatoria' },
		{ id: 'muro-municipal', label: '3 bis. Muro municipal y apoyos' },
		{ id: 'normas-de-conducta', label: '4. Normas de conducta' },
		{ id: 'moderacion', label: '5. Moderación' },
		{ id: 'canales-externos', label: '6. Canales de coordinación externos' },
		{ id: 'confirmaciones-de-asistencia', label: '7. Confirmaciones de asistencia' },
		{ id: 'tu-cuenta', label: '8. Tu cuenta' },
		{ id: 'contenido-que-publicas', label: '9. Contenido que publicas' },
		{ id: 'limitacion-de-responsabilidad', label: '10. Limitación de responsabilidad' },
		{ id: 'cambios', label: '11. Cambios en estos términos' },
		{ id: 'ley-aplicable', label: '12. Ley aplicable' },
		{ id: 'contacto', label: '13. Contacto' }
	];
</script>

<LegalPageShell
	title="Términos de uso"
	description="Condiciones de uso de Convoca: quién puede crear convocatorias, qué normas rigen la participación y qué ocurre si se incumplen."
	updatedAt={LEGAL_VERSIONS.terms}
	{sections}
>
	<section><h2 id="que-es-convoca">1. Qué es Convoca</h2><p>Convoca es una plataforma de participación ciudadana para descubrir, publicar y coordinar convocatorias, documentar problemas municipales y abrir recogidas de apoyos ciudadanos sobre actuaciones concretas. Convoca no organiza ni convoca por sí sola los actos publicados por terceros ni convierte una recogida interna de apoyos en un procedimiento administrativo oficial.</p><p>Convoca <strong>no autoriza manifestaciones</strong> ni actúa como autoridad gubernativa: no tiene ninguna potestad para permitir, prohibir o modificar una convocatoria. Tampoco sustituye ningún trámite administrativo que, en su caso, corresponda realizar a quien organiza la convocatoria. La responsabilidad de cumplir esos trámites es exclusivamente de la persona u organización que publica la convocatoria.</p></section>
	<section><h2 id="quien-puede-usar">2. Quién puede usar Convoca</h2><ul><li>Debes ser mayor de edad (18 años) para crear una cuenta o publicar una convocatoria.</li><li>Puedes consultar convocatorias publicadas, ver el mapa y confirmar tu asistencia sin necesidad de registrarte.</li><li>Para publicar una convocatoria o gestionar un perfil de organizador necesitas una cuenta.</li><li>Los datos que nos proporciones al registrarte deben ser veraces.</li></ul></section>
	<section><h2 id="publicar-una-convocatoria">3. Publicar una convocatoria</h2><p>Si publicas una convocatoria en Convoca, declaras y te comprometes a que es una acción legal y pacífica, la información es correcta, asumes la responsabilidad legal y realizarás los trámites administrativos que correspondan. Toda convocatoria nueva pasa por una revisión antes de publicarse. Los niveles de verificación informan, pero <strong>no son una garantía absoluta ni una certificación oficial</strong>.</p></section>
	<section><h2 id="muro-municipal">3 bis. Muro municipal y recogidas de apoyos</h2><p>El Muro municipal permite documentar problemas locales y que una persona usuaria abra una recogida para solicitar una actuación concreta. Salvo que se indique expresamente otra cosa, los botones “Firmar”, “Firmado” o equivalentes representan <strong>apoyos ciudadanos dentro de CONVOCA</strong>: no son firmas electrónicas cualificadas, firmas administrativas, una iniciativa legislativa popular ni sustituyen los requisitos de ningún procedimiento oficial.</p><p>Si abres una recogida, declaras y te comprometes a que:</p><ul><li>La petición describe de buena fe un problema o una actuación relacionada con el municipio seleccionado.</li><li>No atribuyes delitos, conductas o hechos graves a personas identificables sin una base suficiente y verificable.</li><li>No publicas domicilios, teléfonos, documentos de identidad u otros datos personales de terceros que no sean necesarios.</li><li>No utilizas la herramienta para acoso, amenazas, discriminación, spam, suplantación o campañas coordinadas de abuso.</li></ul><p>La publicación es normalmente inmediata. Eso no supone que CONVOCA haya verificado, aprobado o adoptado como propia la petición. Cualquier persona puede reportarla y CONVOCA podrá ocultarla, cerrarla o retirarla si incumple estas condiciones o existe un riesgo legal o de seguridad.</p></section>
	<section><h2 id="normas-de-conducta">4. Normas de conducta</h2><p>Al usar Convoca, no puedes publicar convocatorias, problemas o peticiones que inciten a la violencia, al odio o a delitos; suplantar identidades; publicar contenido falso, engañoso o spam; usar canales externos para fines ajenos; ni intentar eludir las medidas de seguridad.</p></section>
	<section><h2 id="moderacion">5. Moderación</h2><p>Convoca puede revisar, rechazar, ocultar, cerrar, suspender o retirar convocatorias, peticiones municipales, canales de coordinación o cuentas que incumplan estas normas, la Declaración de uso pacífico o la ley.</p><p>Cualquier persona puede <strong>denunciar</strong> una convocatoria, una petición municipal o un canal usando el botón "Reportar" disponible en su ficha, o escribiendo a <a href="mailto:contacto@convoca.cloud">contacto@convoca.cloud</a>.</p></section>
	<section><h2 id="canales-externos">6. Canales de coordinación externos</h2><p>Los canales externos de coordinación son gestionados por terceros ajenos a Convoca. No supervisamos su contenido, no somos parte de esos canales y no registramos quién los abre ni quién se une.</p></section>
	<section><h2 id="confirmaciones-de-asistencia">7. Confirmaciones de asistencia</h2><p>Las cifras de "voy" / "me interesa" son estimaciones agregadas y aproximadas, nunca un censo ni un registro nominal. Se gestionan mediante un identificador técnico del navegador y <strong>nunca se vinculan a tu cuenta, email o inicio de sesión con Google</strong>.</p></section>
	<section><h2 id="tu-cuenta">8. Tu cuenta</h2><p>Puedes crear una cuenta con correo y contraseña o Google. Protege el acceso a tu cuenta y avísanos a <a href="mailto:contacto@convoca.cloud">contacto@convoca.cloud</a> si sospechas de un acceso no autorizado.</p></section>
	<section><h2 id="contenido-que-publicas">9. Contenido que publicas</h2><p>Conservas la propiedad y derechos sobre el contenido que publicas. Nos concedes una licencia no exclusiva y limitada a operar y promocionar dentro de Convoca el contenido publicado.</p></section>
	<section><h2 id="limitacion-de-responsabilidad">10. Limitación de responsabilidad</h2><p>Convoca es un canal de difusión e información y no organiza los actos publicados por terceros. Nada de esta cláusula excluye responsabilidades que legalmente no puedan excluirse.</p></section>
	<section><h2 id="cambios">11. Cambios en estos términos</h2><p>Podemos actualizar estos términos. Si el cambio es sustancial, se te pedirá que los vuelvas a aceptar.</p></section>
	<section><h2 id="ley-aplicable">12. Ley aplicable</h2><p>Estos términos se rigen por la legislación española y por las normas de protección de consumidores aplicables.</p></section>
	<section><h2 id="contacto">13. Contacto</h2><p>Para cualquier consulta, escribe a <a href="mailto:contacto@convoca.cloud">contacto@convoca.cloud</a>.</p></section>
</LegalPageShell>
