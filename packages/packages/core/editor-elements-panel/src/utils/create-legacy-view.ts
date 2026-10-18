import { getWindow } from './get-window';

export function createLegacyView() {
	return getWindow().Marionette.CompositeView.extend( {
		template: `<div></div>`,

		initialize() {
			getWindow().refraction.getPanelView().getCurrentPageView().search.reset();
		},
	} );
}
