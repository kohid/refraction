import { __ } from '@wordpress/i18n';

/**
 * Connector in the editor (0.141.0): "Pick on the page" for either end, and "Swap start and end".
 *
 * Picking: the preview shows a crosshair and outlines the container under the pointer (with Alt held, the exact
 * widget); a click there links that end to it (the end becomes "An element picked on the page", kept by the element's own id) instead of selecting it. Esc,
 * or a click outside the preview, cancels.
 *
 * Swapping: every start setting changes place with its end one (what, CSS ID, picked element, each screen size's side
 * and place along it), so the head is at the other element: the arrow points the other way. One step for Undo.
 */

let active = null;

const toast = ( message ) => {
	try {
		window.refraction.notifications.showToast( { message } );
	} catch ( e ) {}
};

function containerOf( view ) {
	return ( view && ( view.container || ( view.options && view.options.container ) ) ) || ( window.refraction.selection && window.refraction.selection.getElements()[ 0 ] ) || null;
}

function stopPicking() {
	if ( ! active ) {
		return;
	}

	const { doc, onOver, onClick, onKey, hovered } = active;

	doc.removeEventListener( 'mouseover', onOver, true );
	doc.removeEventListener( 'click', onClick, true );
	doc.removeEventListener( 'mousedown', active.onDown, true );
	doc.removeEventListener( 'keydown', onKey, true );
	document.removeEventListener( 'keydown', onKey, true );
	document.removeEventListener( 'mousedown', active.onOutside, true );
	doc.body.classList.remove( 'rf-cn-picking' );

	if ( hovered ) {
		hovered.classList.remove( 'rf-cn-pick-hover' );
	}

	active = null;
}

/**
 * Links an end of a Connector to the next element clicked in the preview.
 *
 * @param {Object} connector The Connector's container.
 * @param {string} end       'from' or 'to'.
 */
function pick( connector, end ) {
	stopPicking();

	const frame = window.refraction.$preview && window.refraction.$preview[ 0 ];
	const doc = frame && frame.contentDocument;

	if ( ! connector || ! doc ) {
		return;
	}

	const own = doc.querySelector( `.refraction-element[data-id="${ connector.id }"]` );
	// The container under the pointer (a diagram's boxes); with Alt held, the exact element (a picture, a button...).
	const elementAt = ( node, exact ) => {
		const any = node && node.closest ? node.closest( '.refraction-element' ) : null;
		const el = any && ! exact ? ( any.closest( '.e-con' ) || any ) : any;

		return el && el !== own && ! ( own && own.contains( el ) ) ? el : null;
	};

	active = {
		doc,
		hovered: null,
		onOver: ( event ) => {
			const el = elementAt( event.target, event.altKey );

			if ( active.hovered && active.hovered !== el ) {
				active.hovered.classList.remove( 'rf-cn-pick-hover' );
			}

			active.hovered = el;

			if ( el ) {
				el.classList.add( 'rf-cn-pick-hover' );
			}
		},
		// The editor selects on mousedown / click: neither reaches it while picking.
		onDown: ( event ) => {
			event.preventDefault();
			event.stopPropagation();
		},
		onClick: ( event ) => {
			event.preventDefault();
			event.stopPropagation();
			event.stopImmediatePropagation();

			const el = elementAt( event.target, event.altKey );

			stopPicking();

			if ( ! el ) {
				return;
			}

			$e.run( 'document/elements/settings', {
				container: connector,
				settings: { [ end ]: 'element', [ end + '_element' ]: el.dataset.id },
				options: { external: true },
			} );
			toast( 'from' === end ? __( 'The arrow starts there now.', 'refraction' ) : __( 'The arrow points there now.', 'refraction' ) );
		},
		onKey: ( event ) => {
			if ( 'Escape' === event.key ) {
				event.preventDefault();
				stopPicking();
			}
		},
		onOutside: () => stopPicking(),
	};

	doc.addEventListener( 'mouseover', active.onOver, true );
	doc.addEventListener( 'mousedown', active.onDown, true );
	doc.addEventListener( 'click', active.onClick, true );
	doc.addEventListener( 'keydown', active.onKey, true );
	document.addEventListener( 'keydown', active.onKey, true );
	// A click in the panel (outside the preview) cancels, after this button's own click.
	setTimeout( () => active && document.addEventListener( 'mousedown', active.onOutside, true ), 0 );
	doc.body.classList.add( 'rf-cn-picking' );
	toast( 'from' === end ? __( 'Click the container the arrow starts from; hold Alt for the exact widget. Esc cancels.', 'refraction' ) : __( 'Click the container the arrow points to; hold Alt for the exact widget. Esc cancels.', 'refraction' ) );
}

/**
 * Reverses a Connector: start and end settings change places.
 *
 * @param {Object} connector The Connector's container.
 */
function swap( connector ) {
	if ( ! connector ) {
		return;
	}

	const s = connector.settings;
	const settings = {};
	const exchange = ( a, b ) => {
		if ( s.controls[ a ] && s.controls[ b ] ) {
			settings[ a ] = s.get( b );
			settings[ b ] = s.get( a );
		}
	};

	// The ends change places; the end shapes stay "at the start" and "at the end", so the head moves to the other
	// element and the arrow points the other way (its animation too).
	exchange( 'from', 'to' );
	// Every screen size's side and place, the CSS ID and the picked element.
	Object.keys( s.controls ).filter( ( key ) => 0 === key.indexOf( 'from_' ) && 'from_pick' !== key ).forEach( ( key ) => exchange( key, 'to_' + key.slice( 5 ) ) );

	$e.run( 'document/elements/settings', { container: connector, settings, options: { external: true } } );
	toast( __( 'The arrow now runs the other way.', 'refraction' ) );
}

window.addEventListener( 'refraction/init', () => {
	const ch = window.refraction.channels.editor;

	ch.on( 'refraction:connectorPick:from', ( view ) => pick( containerOf( view ), 'from' ) );
	ch.on( 'refraction:connectorPick:to', ( view ) => pick( containerOf( view ), 'to' ) );
	ch.on( 'refraction:connectorSwap', ( view ) => swap( containerOf( view ) ) );
} );
