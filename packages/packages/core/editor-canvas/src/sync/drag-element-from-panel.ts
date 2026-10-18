import { type V1ElementModelProps } from '@refraction/editor-elements';

import { type CanvasExtendedWindow } from './types';

const DRAG_GROUPS = [ 'refraction-element' ];

export const endDragElementFromPanel = () => {
	getRefractionChannels()?.panelElements?.trigger( 'element:drag:end' );
};

export const startDragElementFromPanel = ( props: Omit< V1ElementModelProps, 'id' >, event: React.DragEvent ) => {
	setDragGroups( event );

	const channels = getRefractionChannels();

	channels?.editor.reply( 'element:dragged', null );

	channels?.panelElements
		.reply( 'element:selected', getLegacyPanelElementView( props ) )
		.trigger( 'element:drag:start' );
};

const setDragGroups = ( event: React.DragEvent ) => {
	const dataContainer = { groups: getDragGroups( event ) };
	event.dataTransfer?.setData( JSON.stringify( dataContainer ), 'true' );
};

const getDragGroups = ( event: React.DragEvent ) => {
	const dataContainer = event.dataTransfer?.getData( 'text/plain' );

	return dataContainer ? JSON.parse( dataContainer ).groups : DRAG_GROUPS;
};

const getRefractionChannels = () => {
	const extendedWindow = window as unknown as CanvasExtendedWindow;
	const channels = extendedWindow.refraction?.channels;

	if ( ! channels ) {
		throw new Error(
			'Refraction channels not found: Refraction editor is not initialized or channels are unavailable.'
		);
	}

	return channels;
};

const getLegacyPanelElementView = ( { settings, ...rest }: Omit< V1ElementModelProps, 'id' > ) => {
	const extendedWindow = window as unknown as CanvasExtendedWindow;
	const LegacyElementModel = extendedWindow.refraction?.modules?.elements?.models?.Element;

	if ( ! LegacyElementModel ) {
		throw new Error( 'Refraction legacy Element model not found in editor modules' );
	}

	const elementModel = new LegacyElementModel( {
		...rest,
		custom: {
			isPreset: !! settings,
			preset_settings: settings,
		},
	} );

	return { model: elementModel };
};
