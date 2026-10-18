import { __privateUseListenTo as useListenTo, commandEndEvent, windowEvent } from '@refraction/editor-v1-adapters';

export function useComputedStyle( elementId: string | null ) {
	return useListenTo(
		[
			windowEvent( 'refraction/device-mode/change' ),
			commandEndEvent( 'document/elements/reset-style' ),
			commandEndEvent( 'document/elements/settings' ),
			commandEndEvent( 'document/elements/paste-style' ),
		],
		() => {
			if ( ! elementId ) {
				return null;
			}

			const element = window.refraction?.getContainer?.( elementId );

			if ( ! element?.view?.el ) {
				return null;
			}

			const resp = window.getComputedStyle( element.view.el );
			return resp;
		}
	);
}
