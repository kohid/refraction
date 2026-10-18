import Component from './component';
import HistoryComponent from './history/component';
import RevisionsComponent from './revisions/component';
import PanelPage from './panel-page';

export default class Manager {
	constructor() {
		refractionCommon.elements.$window.on( 'refraction:loaded', this.init );
	}

	init() {
		$e.components.register( new Component() );
		$e.components.register( new HistoryComponent() );
		$e.components.register( new RevisionsComponent() );

		refraction.on( 'panel:init', () => {
			refraction.getPanelView().addPage( 'historyPage', {
				view: PanelPage,
				title: __( 'History', 'refraction' ),
			} );
		} );
	}

	/**
	 * @deprecated since 2.9.0, use `refraction.documents.getCurrent().history` instead.
	 */
	get history() {
		refractionDevTools.deprecation.deprecated( 'refraction.history.history', '2.9.0', 'refraction.documents.getCurrent().history' );

		return refraction.documents.getCurrent().history;
	}

	/**
	 * @deprecated since 2.9.0, use `refraction.documents.getCurrent().revisions` instead.
	 */
	get revisions() {
		refractionDevTools.deprecation.deprecated( 'refraction.history.revisions', '2.9.0', 'refraction.documents.getCurrent().revisions' );

		return refraction.documents.getCurrent().revisions;
	}
}
