import { getDefaultStyleTagFromPreviewElement } from '@refraction/editor-elements';
import { __privateUseListenTo as useListenTo, commandEndEvent, windowEvent } from '@refraction/editor-v1-adapters';

export function useDefaultStyleTagFromPreview( elementId: string ) {
	return useListenTo(
		[
			windowEvent( 'refraction/preview/atomic-widget/render' ),
			commandEndEvent( 'document/elements/settings' ),
			commandEndEvent( 'document/elements/set-settings' ),
			commandEndEvent( 'document/elements/select' ),
		],
		() => getDefaultStyleTagFromPreviewElement( elementId )
	);
}
