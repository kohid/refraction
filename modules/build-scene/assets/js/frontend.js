import { BuildScene } from './scene.js';

/**
 * Starts every 3D Build Scene on the page, and the ones the editor preview draws again after a change. A scene whose
 * markup left the page is disposed first, so the browser never runs out of WebGL contexts while you edit.
 */
( function() {
	const live = new Set();

	const initAll = ( scope ) => {
		for ( const scene of live ) {
			if ( ! scene.root.isConnected ) {
				scene.dispose();
				live.delete( scene );
			}
		}

		( scope || document ).querySelectorAll( '.rf3d' ).forEach( ( root ) => {
			if ( ! root.rf3d ) {
				root.rf3d = new BuildScene( root );
				live.add( root.rf3d );
			}
		} );
	};

	const hook = () => {
		const hooks = window.refractionFrontend && window.refractionFrontend.hooks;

		if ( hooks && ! hook.done ) {
			hook.done = true;
			hooks.addAction( 'frontend/element_ready/build-scene.default', ( $scope ) => initAll( $scope[ 0 ] ) );
		}
	};

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', () => initAll() );
	} else {
		initAll();
	}

	hook();
	window.addEventListener( 'refraction/frontend/init', hook );
}() );
