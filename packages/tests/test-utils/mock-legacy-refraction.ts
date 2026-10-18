import type { LegacyWindow } from '@refraction/editor-canvas';

export const mockLegacyRefraction = () => {
	const mockBaseView = class {
		getContextMenuGroups() {
			return [];
		}
	};

	const legacyWindow = window as unknown as LegacyWindow;

	legacyWindow.refraction = {
		modules: {
			elements: {
				types: {
					Widget: class {
						getType() {
							return 'widget';
						}

						getView() {
							return mockBaseView;
						}
					},
				},
				views: {
					Widget: mockBaseView,
				},
			},
		},
	} as unknown as LegacyWindow[ 'refraction' ];
};

