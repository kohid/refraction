type EnqueueFont = ( fontFamily: string, context?: 'preview' | 'editor' ) => void;

type ExtendedWindow = Window & {
	refraction?: {
		helpers?: {
			enqueueFont?: EnqueueFont;
		};
	};
};

export const enqueueFont: EnqueueFont = ( fontFamily, context = 'editor' ) => {
	const extendedWindow = window as unknown as ExtendedWindow;

	return extendedWindow.refraction?.helpers?.enqueueFont?.( fontFamily, context ) ?? null;
};
