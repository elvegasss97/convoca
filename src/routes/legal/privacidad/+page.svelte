<script lang="ts">
	import LegalPageShell from '$lib/components/legal/LegalPageShell.svelte';
	import { LEGAL_VERSIONS } from '$lib/legal/versions';

	const sections = [
		{ id: 'responsable', label: '1. Responsable del tratamiento' },
		{ id: 'que-datos', label: '2. Qué datos recogemos y para qué' },
		{ id: 'base-legal', label: '3. Base legal' },
		{ id: 'con-quien-compartimos', label: '4. Con quién compartimos datos' },
		{ id: 'conservacion', label: '5. Cuánto tiempo conservamos tus datos' },
		{ id: 'tus-derechos', label: '6. Tus derechos' },
		{ id: 'menores', label: '7. Menores de edad' },
		{ id: 'seguridad', label: '8. Seguridad' },
		{ id: 'cookies', label: '9. Cookies' },
		{ id: 'cambios', label: '10. Cambios en esta política' }
	];
</script>

<LegalPageShell
	title="Política de privacidad"
	description="Qué datos trata Convoca, con qué finalidad, cuánto tiempo se conservan y cómo ejercer tus derechos de acceso, rectificación y supresión."
	updatedAt={LEGAL_VERSIONS.privacy}
	{sections}
>
	<section>
		<h2 id="responsable">1. Responsable del tratamiento</h2>
		<p>
			Elías Vega, persona física responsable de Convoca (proyecto en fase de prototipo, sin una
			sociedad mercantil constituida a día de hoy).
		</p>
		<ul>
			<li>Contacto: <a href="mailto:contacto@convoca.cloud">contacto@convoca.cloud</a></li>
			<li>
				NIF y domicilio a efectos de notificaciones: <strong>pendientes de completar</strong> — se añadirán
				a este documento antes de un lanzamiento público real.
			</li>
		</ul>
	</section>

	<section>
		<h2 id="que-datos">2. Qué datos recogemos y para qué</h2>
		<ul>
			<li>
				<strong>Cuenta:</strong> correo electrónico y contraseña (nunca almacenamos la contraseña en claro;
				queda protegida mediante hash), o tu identificador de Google si inicias sesión así. Para poder
				darte acceso a tu cuenta y a las funciones que requieren estar identificado.
			</li>
			<li>
				<strong>Perfil de organizador (público):</strong> nombre visible, tipo de organización y nivel
				de verificación. Para que quien vea tus convocatorias sepa quién las publica.
			</li>
			<li>
				<strong>Perfil de organizador (privado):</strong> nombre legal de la organización y, si los aportas
				voluntariamente, documentos de verificación de identidad u organización. Guardados en almacenamiento
				privado, solo accesibles por ti y por las personas responsables de moderación. Para poder ofrecer
				niveles de verificación fiables.
			</li>
			<li>
				<strong>Convocatorias:</strong> título, descripción, categoría, fecha, punto de encuentro y demás
				datos que decidas publicar. Es contenido que tú mismo eliges hacer público.
			</li>
			<li>
				<strong>Confirmaciones de asistencia ("voy" / "me interesa"):</strong> guardadas mediante un identificador
				técnico seudónimo de tu navegador, nunca vinculadas a tu identidad, a tu cuenta ni a tu inicio
				de sesión con Google, y usadas únicamente para evitar confirmaciones duplicadas. Nunca elaboramos
				una lista de personas asistentes ni mostramos quién ha confirmado.
			</li>
			<li>
				<strong>Reportes y moderación:</strong> si reportas una convocatoria o un canal, guardamos el
				motivo y, si estás identificado, tu cuenta, para poder gestionar el reporte. El historial de decisiones
				de moderación (quién aprobó, ocultó o rechazó cada convocatoria) es interno y nunca público.
			</li>
			<li>
				<strong>Datos técnicos:</strong> dirección IP y registros técnicos de acceso, gestionados por
				nuestros proveedores de infraestructura, con fines de seguridad y para el funcionamiento del servicio.
			</li>
			<li>
				<strong>Ubicación:</strong> por defecto, la única "ubicación" que se trata es la ciudad o el
				punto de encuentro que tú u otras personas organizadoras escribís manualmente al publicar
				una convocatoria, o la ciudad que elijas para explorar el mapa. Si pulsas voluntariamente el
				botón "Usar mi ubicación" del selector de ciudad, tu navegador te pedirá permiso y, si lo
				concedes, usamos tu posición aproximada <strong>una sola vez</strong> para centrar el mapa — nunca
				se guarda, ni en nuestros servidores ni en tu dispositivo, ni se comparte con nadie, y no volvemos
				a acceder a ella hasta que pulses el botón de nuevo. Convoca nunca te geolocaliza en segundo plano
				ni de forma automática al abrir la página.
			</li>
		</ul>
	</section>

	<section>
		<h2 id="base-legal">3. Base legal</h2>
		<ul>
			<li>
				<strong>Ejecución de un contrato:</strong> los datos de cuenta y perfil, para poder prestarte
				el servicio que solicitas al registrarte.
			</li>
			<li>
				<strong>Consentimiento:</strong> los documentos de verificación que aportas de forma voluntaria,
				y el inicio de sesión con Google.
			</li>
			<li>
				<strong>Interés legítimo:</strong> los registros técnicos de seguridad, la prevención de abuso
				y las decisiones de moderación.
			</li>
			<li>
				<strong>Obligación legal:</strong> cuando debamos conservar o ceder algún dato porque así lo exija
				la normativa aplicable.
			</li>
		</ul>
	</section>

	<section>
		<h2 id="con-quien-compartimos">4. Con quién compartimos datos</h2>
		<p>
			No vendemos tus datos. Los compartimos únicamente con los proveedores que necesitamos para
			operar Convoca, en calidad de encargados del tratamiento, bajo contrato:
		</p>
		<ul>
			<li>
				<strong>Supabase</strong> (base de datos, autenticación y almacenamiento de archivos).
			</li>
			<li><strong>Vercel</strong> (alojamiento de la aplicación).</li>
			<li>
				<strong>Google</strong>, únicamente si eliges iniciar sesión con tu cuenta de Google
				("Continuar con Google").
			</li>
		</ul>
		<p>
			Estos proveedores pueden procesar datos en centros fuera del Espacio Económico Europeo. En ese
			caso, se apoyan en las garantías previstas por el RGPD (como las cláusulas contractuales tipo
			de la Comisión Europea). Nunca compartimos tus datos con terceros con fines publicitarios.
		</p>
	</section>

	<section>
		<h2 id="conservacion">5. Cuánto tiempo conservamos tus datos</h2>
		<p>
			Mientras mantengas tu cuenta activa. Si la eliminas, borramos o anonimizamos tus datos
			personales en un plazo razonable, salvo la información que debamos conservar por obligación
			legal (por ejemplo, el registro de decisiones de moderación, que se conserva de forma interna
			y sin datos identificativos innecesarios).
		</p>
	</section>

	<section>
		<h2 id="tus-derechos">6. Tus derechos</h2>
		<p>
			Puedes ejercer en cualquier momento tus derechos de acceso, rectificación, supresión,
			oposición, limitación y portabilidad de tus datos, escribiendo a
			<a href="mailto:contacto@convoca.cloud">contacto@convoca.cloud</a>. También tienes derecho a
			presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD,
			<a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">www.aepd.es</a>) si
			consideras que no hemos tratado tus datos correctamente.
		</p>
	</section>

	<section>
		<h2 id="menores">7. Menores de edad</h2>
		<p>
			Convoca no está dirigido a menores de 18 años y no debes registrarte si no los has cumplido.
			Si detectamos una cuenta de una persona menor de edad, la eliminaremos.
		</p>
	</section>

	<section>
		<h2 id="seguridad">8. Seguridad</h2>
		<p>
			Aplicamos medidas técnicas para proteger tus datos: las contraseñas nunca se guardan en claro,
			las conexiones van cifradas (HTTPS), y el acceso a los datos en nuestra base de datos está
			restringido por reglas de autorización aplicadas a nivel de base de datos (no solo en la
			interfaz), de forma que ni siquiera una llamada directa a la API salta esas restricciones.
		</p>
	</section>

	<section>
		<h2 id="cookies">9. Cookies</h2>
		<p>
			Convoca usa únicamente cookies técnicas necesarias para mantener tu sesión iniciada. Si usas
			"Continuar con Google", Google puede establecer sus propias cookies conforme a su propia
			política de privacidad. No usamos cookies de publicidad ni de seguimiento con terceros.
		</p>
	</section>

	<section>
		<h2 id="cambios">10. Cambios en esta política</h2>
		<p>
			Si cambiamos esta política de forma sustancial, se te pedirá que la vuelvas a aceptar la
			próxima vez que uses funciones que lo requieran.
		</p>
	</section>
</LegalPageShell>
