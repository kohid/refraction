import { __, sprintf } from '@wordpress/i18n';
import { detectMotion, proposeStages, readGlbJson } from './glb-outline';

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

const modelUrl = ( container ) => {
	const model = container.settings.get( 'model' );

	return model && ( model.url || ( model.get && model.get( 'url' ) ) );
};

async function readModel( url ) {
	try {
		const response = await fetch( url, { credentials: 'same-origin' } );

		return response.ok ? readGlbJson( await response.arrayBuffer() ) : null;
	} catch ( e ) {
		return null;
	}
}

/**
 * "Detect wheels and animations" (Animation section): fills Wheel parts and Animation name from the chosen .glb.
 * Run by the button (always says what it found) and by itself when a model or an animation is chosen (quietly,
 * and only filling what is still empty or at its default).
 *
 * @param {Object}  container The widget.
 * @param {boolean} quiet     From a change, not the button.
 */
async function detect( container, quiet ) {
	const url = modelUrl( container );
	const motion = container.settings.get( 'motion' );

	if ( ! url || ! [ 'drive', 'clip' ].includes( motion ) ) {
		if ( ! quiet ) {
			toast( __( 'Choose a .glb file first.', 'refraction' ) );
		}
		return;
	}

	const gltf = await readModel( url );

	if ( ! gltf ) {
		if ( ! quiet ) {
			toast( __( 'The model could not be read. Is it a .glb file?', 'refraction' ) );
		}
		return;
	}

	const found = detectMotion( gltf );
	const settings = {};
	const wheels = String( container.settings.get( 'wheels' ) || '' ).trim();
	const clip = String( container.settings.get( 'clip' ) || '' ).trim();

	if ( 'drive' === motion && found.wheels.length && ( ! quiet || ! wheels || '*wheel*, *tire*, *tyre*' === wheels ) && found.patterns !== wheels ) {
		settings.wheels = found.patterns;
	}

	if ( 'clip' === motion && found.animations.length && ( ! quiet || ! clip ) && ! found.animations.includes( clip ) ) {
		settings.clip = found.animations[ 0 ];
	}

	if ( Object.keys( settings ).length ) {
		window.$e.run( 'document/elements/settings', { container, settings, options: { external: true } } );
	}

	const messages = [];

	if ( 'drive' === motion ) {
		/* Translators: 1: Number of wheel parts, 2: Their names. */
		messages.push( found.wheels.length ? sprintf( __( '%1$d wheel parts: %2$s.', 'refraction' ), found.wheels.length, found.wheels.slice( 0, 6 ).join( ', ' ) ) : __( 'No parts named like a wheel, tyre or rim: write the wheel part names by hand.', 'refraction' ) );
	}

	if ( 'clip' === motion ) {
		/* Translators: %s: Animation names. */
		messages.push( found.animations.length ? sprintf( __( 'Animations in the model: %s.', 'refraction' ), found.animations.join( ', ' ) ) : __( 'This model has no animations of its own.', 'refraction' ) );
	}

	if ( ! quiet || Object.keys( settings ).length ) {
		toast( messages.join( ' ' ) );
	}
}

window.addEventListener( 'refraction/init', () => {
	window.refraction.channels.editor.on( 'refraction:build-scene:fill', ( view ) => onFill( view ) );
	window.refraction.channels.editor.on( 'refraction:build-scene:detect', ( view ) => detect( view.container, false ) );

	// Choosing a model, or the Drive or own-animation option, detects by itself.
	window.$e.commands.on( 'run:after', ( _component, command, args ) => {
		const changed = args && args.settings ? Object.keys( args.settings ) : [];
		const container = args && args.container;

		if ( 'document/elements/settings' === command && container && 'build-scene' === container.model.get( 'widgetType' ) && ! ( args.options && args.options.external ) && ( changed.includes( 'model' ) || changed.includes( 'motion' ) ) ) {
			detect( container, true );
		}
	} );
} );
