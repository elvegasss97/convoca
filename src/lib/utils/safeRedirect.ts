/**
 * Verifica que `path` sea una ruta interna segura antes de usarla como
 * destino de `goto()`. Un `?redirect=` manipulado (URL absoluta,
 * `//evil.com` protocol-relative, o una ruta con backslash que algunos
 * navegadores normalizan a `/`) podría, si no se validara, sacar a la
 * persona de Convoca hacia un sitio ajeno justo después de iniciar sesión
 * — el momento en que más confía en la página.
 */
export function safeRedirect(path: string | null | undefined, fallback: string): string {
	if (!path) return fallback;
	if (!path.startsWith('/')) return fallback;
	if (path.startsWith('//')) return fallback;
	if (path.includes('\\')) return fallback;

	try {
		const base = 'http://convoca.internal';
		const resolved = new URL(path, base);
		if (resolved.origin !== base) return fallback;
	} catch {
		return fallback;
	}

	return path;
}
