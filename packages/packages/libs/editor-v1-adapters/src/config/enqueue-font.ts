export type EnqueueFont = ( fontFamily: string, context?: 'preview' | 'editor' ) => void;

export const enqueueFont: EnqueueFont = ( fontFamily, context = 'preview' ) => {
	return window.refraction?.helpers?.enqueueFont?.( fontFamily, context ) ?? null;
};
