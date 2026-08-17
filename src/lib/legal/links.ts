export interface RelatedLegalLink {
	href: string;
	label: string;
}

/**
 * Enlaces que se muestran en todas las páginas de /legal/*, para que desde
 * cualquiera de ellas se pueda llegar a las demás sin volver al formulario
 * donde se aceptaron. "Normas de publicación" y "Denunciar contenido" no son
 * documentos aparte: apuntan a las secciones correspondientes de Términos de
 * uso (evita multiplicar documentos legales sin necesidad). "Solicitar
 * revisión de una decisión" es un mailto real con asunto/cuerpo
 * precumplimentados, no un enlace a un sistema que no existe.
 */
export const RELATED_LEGAL_LINKS: RelatedLegalLink[] = [
	{ href: '/legal/aviso-legal', label: 'Aviso legal' },
	{ href: '/legal/privacidad', label: 'Política de privacidad' },
	{ href: '/legal/uso-pacifico', label: 'Declaración de uso pacífico' },
	{ href: '/legal/terminos#normas-de-conducta', label: 'Normas de publicación' },
	{ href: '/legal/terminos#moderacion', label: 'Denunciar contenido' },
	{
		href:
			'mailto:contacto@convoca.cloud' +
			'?subject=' +
			encodeURIComponent('Solicitud de revisión de una decisión') +
			'&body=' +
			encodeURIComponent(
				'Convocatoria o cuenta afectada (enlace o nombre):\n\nMotivo por el que solicito la revisión:\n'
			),
		label: 'Solicitar revisión de una decisión'
	}
];
