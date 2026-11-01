/**
 * Starts every widget root matching `selector` on the page, and the ones the editor preview draws again after a
 * change. A root that left the page is disposed first, so the editor never piles up canvases or WebGL contexts.
 *
 * @param {string}   selector The widget's root element.
 * @param {Function} Widget   Class taking the root; has `root` and `dispose()`.
 * @param {string}   name     The widget name, for the editor's element_ready hook.
 */
export function boot( selector, Widget, name ) {
	const live = new Set();
	const key = `rf_${ name.replace( /-/g, '_' ) }`;

	const initAll = ( scope ) => {
		for ( const item of live ) {
			if ( ! item.root.isConnected ) {
				item.dispose();
				live.delete( item );
			}
		}

		( scope || document ).querySelectorAll( selector ).forEach( ( root ) => {
			if ( ! root[ key ] ) {
				root[ key ] = new Widget( root );
				live.add( root[ key ] );
			}
		} );
	};

	let hooked = false;
	const hook = () => {
		const hooks = window.refractionFrontend && window.refractionFrontend.hooks;

		if ( hooks && ! hooked ) {
			hooked = true;
			hooks.addAction( `frontend/element_ready/${ name }.default`, ( $scope ) => initAll( $scope[ 0 ] ) );
		}
	};

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', () => initAll() );
	} else {
		initAll();
	}

	hook();
	window.addEventListener( 'refraction/frontend/init', hook );
}
