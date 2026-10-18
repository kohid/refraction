import { ensureUser } from '@refraction/editor-current-user';
import { registerDataHook } from '@refraction/editor-v1-adapters';

export async function ensureCurrentUser() {
	return registerDataHook( 'after', 'editor/documents/attach-preview', async () => {
		try {
			await ensureUser();
		} catch {}
	} );
}
