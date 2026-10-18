import { type EditMode } from '@refraction/editor-v1-adapters';

export function mockEditMode( editMode: EditMode ) {
	window.refraction = {
		...window.refraction,
		changeEditMode: () => {},
		channels: {
			dataEditMode: {
				request: () => editMode,
			},
		},
	};
}
