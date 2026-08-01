<script lang="ts">
	import LegalPageShell from '$lib/components/legal/LegalPageShell.svelte';
	import { LEGAL_VERSIONS } from '$lib/legal/versions';

	const sections = [
		{ id: 'que-es-convoca', label: '1. Qué es Convoca' },
		{ id: 'quien-puede-usar', label: '2. Quién puede usar Convoca' },
		{ id: 'publicar-una-convocatoria', label: '3. Publicar una convocatoria' },
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

<LegalPageShell title="Términos de uso" updatedAt={LEGAL_VERSIONS.terms} {sections}>
	<section>
		<h2 id="que-es-convoca">1. Qué es Convoca</h2>
		<p>
			Convoca es una plataforma para descubrir, publicar y coordinar convocatorias ciudadanas
			(concentraciones, manifestaciones, marchas, asambleas y acciones similares) de carácter legal
			y pacífico. Convoca no organiza ni convoca ningún acto: se limita a ofrecer un espacio donde
			personas y colectivos pueden publicar información sobre sus propias convocatorias y donde
			otras personas pueden encontrarlas, informarse y expresar su interés.
		</p>
		<p>
			Convoca <strong>no autoriza manifestaciones</strong> ni actúa como autoridad gubernativa: no tiene
			ninguna potestad para permitir, prohibir o modificar una convocatoria. Tampoco sustituye ningún
			trámite administrativo que, en su caso, corresponda realizar a quien organiza la convocatoria (por
			ejemplo, la comunicación previa a la autoridad gubernativa cuando la ley lo exija). La responsabilidad
			de cumplir esos trámites es exclusivamente de la persona u organización que publica la convocatoria.
		</p>
	</section>

	<section>
		<h2 id="quien-puede-usar">2. Quién puede usar Convoca</h2>
		<ul>
			<li>Debes ser mayor de edad (18 años) para crear una cuenta o publicar una convocatoria.</li>
			<li>
				Puedes consultar convocatorias publicadas, ver el mapa y confirmar tu asistencia ("voy" /
				"me interesa") sin necesidad de registrarte — ver el apartado "Confirmaciones de asistencia"
				más abajo.
			</li>
			<li>
				Para publicar una convocatoria o gestionar un perfil de organizador necesitas una cuenta,
				con correo electrónico o iniciando sesión con Google.
			</li>
			<li>Los datos que nos proporciones al registrarte deben ser veraces.</li>
		</ul>
	</section>

	<section>
		<h2 id="publicar-una-convocatoria">3. Publicar una convocatoria</h2>
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
			Toda convocatoria nueva pasa por una revisión antes de publicarse. Convoca puede mostrar un
			nivel de verificación asociado a tu perfil de organizador (identidad verificada, organización
			verificada, documentación revisada) según la información que hayas aportado voluntariamente;
			ese nivel informa a quien visita la convocatoria, pero <strong
				>no es una garantía absoluta ni una certificación oficial</strong
			>.
		</p>
	</section>

	<section>
		<h2 id="normas-de-conducta">4. Normas de conducta</h2>
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
		<h2 id="moderacion">5. Moderación</h2>
		<p>
			Convoca puede revisar, rechazar, ocultar, suspender o retirar convocatorias, canales de
			coordinación o cuentas que incumplan estas normas, la Declaración de uso pacífico o la ley.
		</p>
		<p>Cuando tome una de estas medidas, dentro de lo razonablemente posible:</p>
		<ul>
			<li>Te comunicará el motivo.</li>
			<li>Identificará el contenido o la cuenta afectados.</li>
			<li>Indicará la duración de la medida, si es temporal.</li>
			<li>
				Te permitirá solicitar una revisión de la decisión (ver "Solicitar revisión de una decisión"
				al final de este documento).
			</li>
		</ul>
		<p>
			En casos de amenaza, violencia, fraude, riesgo de seguridad, una investigación en curso o
			cuando así lo exija la ley, Convoca podrá actuar de forma inmediata y, si es necesario,
			limitar la información que comparte sobre la medida mientras dure esa circunstancia.
		</p>
		<p>
			Cualquier persona puede <strong>denunciar</strong> una convocatoria o un canal que considere
			inapropiado, usando el botón "Reportar" disponible en su ficha, o escribiendo a
			<a href="mailto:convocahelp@outlook.es">convocahelp@outlook.es</a>. Convoca puede suspender o
			cerrar una cuenta que incumpla repetidamente estas normas, sin perjuicio de las acciones
			legales que puedan corresponder.
		</p>
	</section>

	<section>
		<h2 id="canales-externos">6. Canales de coordinación externos</h2>
		<p>
			Convoca permite a quien organiza enlazar canales externos de coordinación (por ejemplo, grupos
			de WhatsApp o Telegram). Esos canales son gestionados por terceros ajenos a Convoca: no
			supervisamos su contenido, no somos parte de esos canales y no registramos quién los abre ni
			quién se une a ellos. Al abrir uno de esos enlaces sales de Convoca y quedas sujeto a las
			condiciones de la plataforma correspondiente (WhatsApp, Telegram, etc.).
		</p>
	</section>

	<section>
		<h2 id="confirmaciones-de-asistencia">7. Confirmaciones de asistencia</h2>
		<p>
			Las cifras de "voy" / "me interesa" que muestra Convoca son estimaciones agregadas y
			aproximadas, nunca un censo ni un registro nominal de asistentes. No hace falta tener una
			cuenta para confirmarlas: se gestionan mediante un identificador técnico guardado en tu propio
			navegador, generado la primera vez que confirmas asistencia a algo.
		</p>
		<p>
			Esa confirmación <strong
				>nunca se vincula a tu cuenta, a tu email ni a tu inicio de sesión con Google</strong
			>, y no se muestra la identidad de quién ha confirmado, ni a quien organiza ni a otras
			personas usuarias — solo el recuento total. No es un dato completamente anónimo en sentido
			estricto, porque ese identificador queda ligado a tu navegador; pero nunca se usa para
			elaborar una lista de personas asistentes ni para identificarte.
		</p>
	</section>

	<section>
		<h2 id="tu-cuenta">8. Tu cuenta</h2>
		<p>
			Puedes crear una cuenta con correo electrónico y contraseña, o iniciar sesión con tu cuenta de
			Google. Si usas Google, Convoca nunca ve ni almacena tu contraseña de Google — la gestiona
			Google directamente. Si usas correo y contraseña, tu contraseña se guarda siempre protegida,
			nunca en texto plano.
		</p>
		<ul>
			<li>
				Protege el acceso a tu cuenta de correo o de Google: quien acceda a ella puede iniciar
				sesión en Convoca.
			</li>
			<li>Cierra sesión si usas un dispositivo compartido o público.</li>
			<li>
				Avísanos de inmediato escribiendo a
				<a href="mailto:convocahelp@outlook.es">convocahelp@outlook.es</a> si sospechas de un acceso no
				autorizado a tu cuenta.
			</li>
		</ul>
	</section>

	<section>
		<h2 id="contenido-que-publicas">9. Contenido que publicas</h2>
		<p>
			Conservas en todo momento la propiedad y los derechos sobre el contenido que publicas (título,
			descripción, imágenes u otro material). Publicarlo en Convoca no te hace perder ni transferir
			esos derechos.
		</p>
		<p>Al publicar contenido, nos concedes una licencia:</p>
		<ul>
			<li>No exclusiva: puedes usar y publicar el mismo contenido en cualquier otro sitio.</li>
			<li>
				Limitada a operar y promocionar dentro de Convoca la convocatoria publicada (mostrarla en el
				listado, el mapa, su ficha y funciones equivalentes).
			</li>
			<li>
				Vigente mientras el contenido permanezca publicado, y durante el tiempo técnico
				imprescindible tras eliminarlo para purgar copias de seguridad.
			</li>
		</ul>
		<p>Esta licencia no transfiere la propiedad del contenido a Convoca.</p>
	</section>

	<section>
		<h2 id="limitacion-de-responsabilidad">10. Limitación de responsabilidad</h2>
		<p>
			Convoca es un canal de difusión e información: no organiza los actos publicados por terceros,
			no está presente en ellos y no supervisa lo que ocurre durante su celebración. En la medida
			permitida por la ley, y sin perjuicio de lo indicado en el párrafo siguiente, Convoca no asume
			responsabilidad por lo que suceda durante una convocatoria, por el incumplimiento de trámites
			administrativos por parte de quien la organiza, ni por el contenido de canales externos
			enlazados desde la plataforma.
		</p>
		<p>
			Nada de lo dispuesto en esta cláusula excluye o limita las responsabilidades que legalmente no
			puedan excluirse, incluidas las derivadas de actos u omisiones directamente imputables a
			Convoca.
		</p>
	</section>

	<section>
		<h2 id="cambios">11. Cambios en estos términos</h2>
		<p>
			Podemos actualizar estos términos. Si el cambio es sustancial, se te pedirá que los vuelvas a
			aceptar la próxima vez que uses funciones que lo requieran, aunque ya los hubieras aceptado
			antes.
		</p>
	</section>

	<section>
		<h2 id="ley-aplicable">12. Ley aplicable</h2>
		<p>
			Estos términos se rigen por la legislación española. Cualquier controversia se someterá a los
			juzgados y tribunales que correspondan conforme a la normativa de protección de personas
			consumidoras y usuarias aplicable.
		</p>
	</section>

	<section>
		<h2 id="contacto">13. Contacto</h2>
		<p>
			Para cualquier consulta sobre estos términos, escribe a
			<a href="mailto:convocahelp@outlook.es">convocahelp@outlook.es</a>.
		</p>
	</section>
</LegalPageShell>
