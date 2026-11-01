import { __, sprintf } from '@wordpress/i18n';
import { proposeStages, readGlbJson } from './glb-outline';

// Editor: "Fill stages from the model" (3D Build Scene, Build section). Reads the chosen .glb's outline and replaces the
// Stages list with one stage per named group (or per material), bottom to top, as one undoable step.

const toast = ( message ) => {
	try {
		window.refraction.notifications.showToast( { message } );
	} catch ( e ) {
		window.alert( message ); // eslint-disable-line no-alert
	}
};

function confirmReplace( count, onConfirm ) {
	const common = window.refractionCommon;

	if ( ! count ) {
		onConfirm();
		return;
	}

	if ( common && common.dialogsManager ) {
		common.dialogsManager.createWidget( 'confirm', {
			id: 'rf3d-fill-stages',
			headerMessage: __( 'Replace the stages?', 'refraction' ),
			/* Translators: %d: Number of stages. */
			message: sprintf( __( 'The %d stages in the list will be replaced by the ones read from the model. Undo brings them back.', 'refraction' ), count ),
			strings: { confirm: __( 'Replace', 'refraction' ), cancel: __( 'Cancel', 'refraction' ) },
			onConfirm,
		} ).show();
		return;
	}

	if ( window.confirm( __( 'Replace the stages with the ones read from the model?', 'refraction' ) ) ) { // eslint-disable-line no-alert
		onConfirm();
	}
}

function fill( container, stages ) {
	const log = window.$e.internal( 'document/history/start-log', { type: 'change', title: __( 'Stages from the model', 'refraction' ) } );

	try {
		const current = container.settings.get( 'stages' );

		for ( let index = ( current ? current.length : 0 ) - 1; index >= 0; index-- ) {
			window.$e.run( 'document/repeater/remove', { container, name: 'stages', index } );
		}

		stages.forEach( ( stage ) => window.$e.run( 'document/repeater/insert', {
			container,
			name: 'stages',
			model: { stage_title: stage.title, stage_text: '', stage_parts: stage.parts.join( ', ' ) },
		} ) );
	} finally {
		window.$e.internal( 'document/history/end-log', { id: log } );
	}
}

async function onFill( { container } ) {
	const model = container.settings.get( 'model' );
	const url = model && ( model.url || ( model.get && model.get( 'url' ) ) );

	if ( ! url ) {
		toast( __( 'Choose a .glb file first.', 'refraction' ) );
		return;
	}

	let gltf = null;

	try {
		const response = await fetch( url, { credentials: 'same-origin' } );
		gltf = response.ok ? readGlbJson( await response.arrayBuffer() ) : null;
	} catch ( e ) {
		gltf = null;
	}

	if ( ! gltf ) {
		toast( __( 'The model could not be read. Is it a .glb file?', 'refraction' ) );
		return;
	}

	const { stages, by } = proposeStages( gltf );

	if ( ! stages.length ) {
		toast( __( 'The model has no named groups or materials to make stages from. Name the groups in your 3D tool, or write the part names by hand.', 'refraction' ) );
		return;
	}

	const current = container.settings.get( 'stages' );

	confirmReplace( current ? current.length : 0, () => {
		fill( container, stages );
		/* Translators: 1: Number of stages, 2: "groups" or "materials". */
		toast( sprintf( __( '%1$d stages made from the model\'s %2$s. Add a text to each, or rename them.', 'refraction' ), stages.length, 'groups' === by ? __( 'groups', 'refraction' ) : __( 'materials', 'refraction' ) ) );
	} );
}

window.addEventListener( 'refraction/init', () => {
	window.refraction.channels.editor.on( 'refraction:build-scene:fill', ( view ) => onFill( view ) );
} );
