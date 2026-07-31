import { browser } from '$app/environment';
import type {
	AuthService,
	User,
	UserSession,
	UserRole,
	SignUpInput,
	SignInInput,
	OrganizerPrivateProfile
} from './types';
import { AuthError } from './types';
import { hashPassword, generateSalt } from './mockHash';
import { randomId } from '$lib/utils/id';
import { loadPersisted, savePersisted } from '$lib/utils/persistedArray';
import { ENABLE_DEMO_DATA } from '$lib/config/env';
import {
	createOrganizer,
	updateOrganizerProfile,
	deleteOrganizer
} from '$lib/services/organizersService';

/**
 * ⚠️ Servicio de autenticación MOCK — sin seguridad real ⚠️
 *
 * Todo esto vive en `localStorage` del navegador. Sirve únicamente para que
 * el prototipo tenga sesión, cuentas y protección de rutas *funcionales*
 * mientras no exista un backend. No usar como referencia de cómo autenticar
 * en producción.
 *
 * Al conectar Supabase, este archivo se sustituye por un `authService.ts`
 * que delega en `supabase.auth.*` — el resto de la app (tipos, `authStore`,
 * páginas de login/registro/cuenta, guards de ruta) no cambia, porque todos
 * dependen de la interfaz `AuthService`, no de esta implementación.
 */

/** Cuenta tal y como se guarda en localStorage. Nunca sale de este archivo. */
interface StoredAccount {
	id: string;
	email: string;
	role: UserRole;
	emailVerified: boolean;
	organizerId?: string;
	createdAt: string;
	/** Ver `mockHash.ts`: hash simulado, no apto para producción. */
	passwordHash: string;
	passwordSalt: string;
}

const ACCOUNTS_KEY = 'auth-accounts';
const PROFILES_KEY = 'auth-organizer-profiles';
const SESSION_STORAGE_KEY = 'convoca:mock:v1:auth-session';

const REMEMBERED_SESSION_DAYS = 30;
const DEFAULT_SESSION_HOURS = 12;

let accounts: StoredAccount[] = loadPersisted<StoredAccount>(ACCOUNTS_KEY, []);
let profiles: OrganizerPrivateProfile[] = loadPersisted<OrganizerPrivateProfile>(PROFILES_KEY, []);

function persistAccounts(): void {
	savePersisted(ACCOUNTS_KEY, accounts);
}

function persistProfiles(): void {
	savePersisted(PROFILES_KEY, profiles);
}

function toPublicUser(account: StoredAccount): User {
	return {
		id: account.id,
		email: account.email,
		role: account.role,
		emailVerified: account.emailVerified,
		organizerId: account.organizerId,
		createdAt: account.createdAt
	};
}

function readSession(): UserSession | null {
	if (!browser) return null;
	try {
		const raw = localStorage.getItem(SESSION_STORAGE_KEY);
		if (!raw) return null;
		const session = JSON.parse(raw) as UserSession;
		if (new Date(session.expiresAt).getTime() < Date.now()) {
			localStorage.removeItem(SESSION_STORAGE_KEY);
			return null;
		}
		return session;
	} catch {
		return null;
	}
}

function writeSession(session: UserSession | null): void {
	if (!browser) return;
	if (session) localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
	else localStorage.removeItem(SESSION_STORAGE_KEY);
}

function createSession(user: User, remembered: boolean): UserSession {
	const hours = remembered ? REMEMBERED_SESSION_DAYS * 24 : DEFAULT_SESSION_HOURS;
	const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
	return { user, token: randomId(), expiresAt, remembered };
}

const listeners = new Set<(session: UserSession | null) => void>();

function notify(session: UserSession | null): void {
	for (const cb of listeners) cb(session);
}

if (browser) {
	window.addEventListener('storage', (e) => {
		if (e.key === SESSION_STORAGE_KEY) notify(readSession());
	});
}

async function buildAccount(params: {
	id: string;
	email: string;
	password: string;
	role: UserRole;
	organizerId?: string;
}): Promise<StoredAccount> {
	const passwordSalt = generateSalt();
	const passwordHash = await hashPassword(params.password, passwordSalt);
	return {
		id: params.id,
		email: params.email.toLowerCase(),
		role: params.role,
		emailVerified: false,
		organizerId: params.organizerId,
		createdAt: new Date().toISOString(),
		passwordHash,
		passwordSalt
	};
}

let seedingPromise: Promise<void> | null = null;

/** Siembra las cuentas de demostración una sola vez, la primera vez que se usa el servicio. */
function ensureSeeded(): Promise<void> {
	if (!seedingPromise) seedingPromise = seedDemoAccounts();
	return seedingPromise;
}

async function seedDemoAccounts(): Promise<void> {
	if (!browser || accounts.length > 0) return;
	// `if (!ENABLE_DEMO_DATA) return;` por sí solo NO basta para mantener la
	// contraseña y los correos de demostración fuera del build de producción:
	// Rollup igualmente empaqueta el módulo de un `import()` dinámico como un
	// chunk físico, se ejecute o no esa rama. Por eso el import se hace contra
	// el especificador virtual `convoca:demo-accounts`, que `vite.config.ts`
	// alía a `demoAccounts.ts` (real) o a `demoAccounts.empty.ts` (vacío) según
	// `PUBLIC_APP_ENV` — la sustitución ocurre en tiempo de bundling, así que
	// en producción el chunk generado ya no contiene los datos reales.
	if (!ENABLE_DEMO_DATA) return;

	const { DEMO_ACCOUNTS, DEMO_PASSWORD } = await import('convoca:demo-accounts');

	const built = await Promise.all(
		DEMO_ACCOUNTS.map((demo) =>
			buildAccount({
				id: demo.id,
				email: demo.email,
				password: DEMO_PASSWORD,
				role: demo.role,
				organizerId: demo.organizerId
			})
		)
	);

	accounts = built;
	persistAccounts();

	const now = new Date().toISOString();
	profiles = DEMO_ACCOUNTS.filter((demo) => demo.organizerId).map((demo) => ({
		organizerId: demo.organizerId!,
		userId: demo.id,
		acceptedTermsAt: now,
		acceptedPeacefulUseAt: now
	}));
	persistProfiles();
}

async function getSession(): Promise<UserSession | null> {
	await ensureSeeded();
	return readSession();
}

function onAuthStateChange(callback: (session: UserSession | null) => void): () => void {
	listeners.add(callback);
	return () => listeners.delete(callback);
}

async function signUp(input: SignUpInput): Promise<UserSession> {
	await ensureSeeded();

	const email = input.email.trim().toLowerCase();
	const displayName = input.displayName.trim();

	if (!email || !email.includes('@'))
		throw new AuthError('Introduce un correo electrónico válido.');
	if (!displayName) throw new AuthError('Indica el nombre público del organizador.');
	if (input.password.length < 8)
		throw new AuthError('La contraseña debe tener al menos 8 caracteres.');
	if (!input.acceptedTerms || !input.acceptedPeacefulUse) {
		throw new AuthError('Debes aceptar las condiciones y la declaración de uso pacífico.');
	}
	if (accounts.some((a) => a.email === email)) {
		throw new AuthError('Ya existe una cuenta con ese correo electrónico.');
	}

	const organizer = await createOrganizer({
		displayName,
		kind: input.organizerKind
	});

	const account = await buildAccount({
		id: `user-${randomId().slice(0, 8)}`,
		email,
		password: input.password,
		role: 'organizer',
		organizerId: organizer.id
	});
	accounts.push(account);
	persistAccounts();

	const now = new Date().toISOString();
	profiles.push({
		organizerId: organizer.id,
		userId: account.id,
		legalOrganizationName: input.organizationName?.trim() || undefined,
		acceptedTermsAt: now,
		acceptedPeacefulUseAt: now
	});
	persistProfiles();

	const session = createSession(toPublicUser(account), true);
	writeSession(session);
	notify(session);
	return session;
}

async function signInWithPassword(input: SignInInput): Promise<UserSession> {
	await ensureSeeded();

	const email = input.email.trim().toLowerCase();
	// Mensaje deliberadamente genérico: no revela si el correo existe o si
	// fue la contraseña lo que falló, para no facilitar enumerar cuentas.
	const genericError = 'Correo o contraseña incorrectos.';

	const account = accounts.find((a) => a.email === email);
	if (!account) throw new AuthError(genericError);

	const hash = await hashPassword(input.password, account.passwordSalt);
	if (hash !== account.passwordHash) throw new AuthError(genericError);

	const session = createSession(toPublicUser(account), input.rememberSession);
	writeSession(session);
	notify(session);
	return session;
}

async function signOut(): Promise<void> {
	writeSession(null);
	notify(null);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- firma exigida por AuthService; el mock no envía correo real (ver comentario abajo).
async function resetPasswordForEmail(_email: string): Promise<void> {
	await ensureSeeded();
	// Simulado: no se envía ningún correo real todavía. Se resuelve igual
	// exista o no la cuenta, para no filtrar qué correos están registrados.
	// Al conectar Supabase, esto pasa a ser supabase.auth.resetPasswordForEmail(...).
	await new Promise((resolve) => setTimeout(resolve, 500));
}

async function updateDisplayName(displayName: string, organizationName?: string): Promise<void> {
	const session = readSession();
	if (!session) throw new AuthError('No has iniciado sesión.');
	const account = accounts.find((a) => a.id === session.user.id);
	if (!account?.organizerId) throw new AuthError('Esta cuenta no tiene un perfil de organizador.');

	await updateOrganizerProfile(account.organizerId, { displayName: displayName.trim() });

	const profile = profiles.find((p) => p.userId === session.user.id);
	if (profile) {
		profile.legalOrganizationName = organizationName?.trim() || undefined;
		persistProfiles();
	}
}

async function deleteAccount(): Promise<void> {
	const session = readSession();
	if (!session) return;

	accounts = accounts.filter((a) => a.id !== session.user.id);
	persistAccounts();
	profiles = profiles.filter((p) => p.userId !== session.user.id);
	persistProfiles();

	// Se borra el perfil público del organizador, pero nunca las convocatorias
	// de otras cuentas: solo se toca lo que pertenece a esta cuenta.
	if (session.user.organizerId) {
		await deleteOrganizer(session.user.organizerId);
	}

	writeSession(null);
	notify(null);
}

export const authService: AuthService = {
	getSession,
	onAuthStateChange,
	signUp,
	signInWithPassword,
	signOut,
	resetPasswordForEmail,
	updateDisplayName,
	deleteAccount
};

/**
 * Fuera de `AuthService` a propósito: no es una operación de autenticación,
 * sino una lectura del perfil privado del organizador (con Supabase sería
 * una consulta normal a una tabla `organizer_private_profiles`, no una
 * llamada a `supabase.auth`).
 */
export async function getMyOrganizerPrivateProfile(
	userId: string
): Promise<OrganizerPrivateProfile | undefined> {
	await ensureSeeded();
	return profiles.find((p) => p.userId === userId);
}
