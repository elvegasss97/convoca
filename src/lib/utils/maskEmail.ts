/**
 * Oculta parcialmente un correo electrónico para mostrarlo en pantallas de
 * confirmación ("revisa tu correo") sin exponerlo por completo — útil en
 * capturas de pantalla o si alguien mira por encima del hombro.
 *
 * `ab@example.com` -> `ab@e***.com`
 * `organizadora@gmail.com` -> `or**********@g***.com`
 */
export function maskEmail(email: string): string {
	const at = email.indexOf('@');
	if (at <= 0) return email;

	const local = email.slice(0, at);
	const domain = email.slice(at + 1);
	const dot = domain.lastIndexOf('.');
	const domainName = dot > 0 ? domain.slice(0, dot) : domain;
	const tld = dot > 0 ? domain.slice(dot) : '';

	const maskedLocal =
		local.length <= 2 ? `${local[0]}*` : `${local.slice(0, 2)}${'*'.repeat(local.length - 2)}`;
	const maskedDomain =
		domainName.length <= 1
			? `${domainName}*`
			: `${domainName.slice(0, 1)}${'*'.repeat(domainName.length - 1)}`;

	return `${maskedLocal}@${maskedDomain}${tld}`;
}
