import {
	__privateIsRouteActive as isRouteActive,
	__privateListenTo as listenTo,
	routeOpenEvent,
	v1ReadyEvent,
} from '@refraction/editor-v1-adapters';
import { __ } from '@wordpress/i18n';

type ExtendedWindow = Window & {
	refraction: {
		getPanelView: () => {
			getHeaderView: () => {
				setTitle: ( title: string ) => void;
			};
		};
	};
};

export default function syncPanelTitle() {
	const panelTitle = __( 'Elements', 'refraction' );
	const tabTitle = __( 'Widgets', 'refraction' );

	listenTo( routeOpenEvent( 'panel/elements' ), () => {
		setPanelTitle( panelTitle );
		setTabTitle( tabTitle );
	} );

	listenTo( v1ReadyEvent(), () => {
		if ( isRouteActive( 'panel/elements' ) ) {
			setPanelTitle( panelTitle );
			setTabTitle( tabTitle );
		}
	} );
}

function setPanelTitle( title: string ) {
	( window as unknown as ExtendedWindow ).refraction?.getPanelView?.()?.getHeaderView?.()?.setTitle?.( title );
}

function setTabTitle( title: string ) {
	const tab = document.querySelector( '.refraction-component-tab[data-tab="categories"]' );

	if ( tab ) {
		tab.textContent = title;
	}
}
