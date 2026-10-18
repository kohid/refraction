import { type ExtendedWindow } from './types';

export function getCurrentDocumentContainer() {
	const extendedWindow = window as unknown as ExtendedWindow;

	return extendedWindow.refraction?.documents?.getCurrent?.()?.container ?? null;
}
