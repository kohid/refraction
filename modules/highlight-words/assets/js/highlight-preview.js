/**
 * Highlight Words and the Heading's Pill Label in the editor's preview, where most widgets are drawn by their JS
 * templates (the site gets the same markup from the server, modules/highlight-words/classes/pure-highlight.php).
 * Same rules: one phrase per line, longest first, whole words, text only (never inside script, style, textarea or a
 * part already highlighted).
 */
( function() {
	const SKIP = [ 'SCRIPT', 'STYLE', 'TEXTAREA' ];

	function phrases( words ) {
		const list = [ ...new Set( String( words || '' ).split( /[\r\n]+/ ).map( ( w ) => w.trim() ).filter( Boolean ) ) ].slice( 0, 30 );

		return list.sort( ( a, b ) => b.length - a.length );
	}

	const escape = ( s ) => s.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );

	function wrap( root, words, matchCase ) {
		const list = phrases( words );

		if ( ! list.length ) {
			return;
		}

		const source = `(?<![\\p{L}\\p{N}])(${ list.map( escape ).join( '|' ) })(?![\\p{L}\\p{N}])`;
		const flags = matchCase ? 'u' : 'iu';
		const test = new RegExp( source, flags );
		const nodes = [];
		const walker = document.createTreeWalker( root, NodeFilter.SHOW_TEXT );

		for ( let node = walker.nextNode(); node; node = walker.nextNode() ) {
			const parent = node.parentElement;

			if ( parent && ! parent.closest( '.refraction-heading-dual' ) && ! SKIP.includes( parent.tagName ) && test.test( node.nodeValue ) ) {
				nodes.push( node );
			}
		}

		nodes.forEach( ( node ) => {
			const fragment = document.createDocumentFragment();
			const parts = node.nodeValue.split( new RegExp( source, `g${ flags }` ) );

			parts.forEach( ( part, i ) => {
				if ( i % 2 ) {
					const span = document.createElement( 'span' );
					span.className = 'refraction-heading-dual rf-hl is-drawn';
					span.textContent = part;
					fragment.appendChild( span );
				} else if ( part ) {
					fragment.appendChild( document.createTextNode( part ) );
				}
			} );

			node.parentNode.replaceChild( fragment, node );
		} );
	}

	function pill( root, settings ) {
		const title = root.querySelector( '.refraction-heading-title' );

		if ( ! title || 'yes' !== settings.rf_pill || title.querySelector( '.rf-pill__badge' ) ) {
			return;
		}

		const text = String( settings.rf_pill_badge || '' ).trim();
		const icon = settings.rf_pill_icon && settings.rf_pill_icon.value;

		if ( ! text && ! icon ) {
			return;
		}

		const badge = document.createElement( 'span' );
		badge.className = 'rf-pill__badge' + ( text ? '' : ' rf-pill__badge--icon' );

		if ( text ) {
			badge.textContent = text;
		} else if ( 'string' === typeof icon ) {
			const i = document.createElement( 'i' );
			i.className = icon;
			i.setAttribute( 'aria-hidden', 'true' );
			badge.appendChild( i );
		}

		title.insertBefore( badge, title.firstChild );
	}

	function apply( $scope ) {
		const element = $scope && $scope[ 0 ];
		const editor = window.parent && window.parent !== window ? window.parent.refraction : null;
		const container = element && editor && editor.getContainer ? editor.getContainer( element.getAttribute( 'data-id' ) ) : null;

		if ( ! container || ! container.settings ) {
			return;
		}

		const settings = container.settings.attributes || {};

		if ( settings.rf_hl_words ) {
			wrap( element, settings.rf_hl_words, 'yes' === settings.rf_hl_case );
		}

		pill( element, settings );
	}

	function start( tries ) {
		const fe = window.refractionFrontend;

		if ( fe && fe.hooks ) {
			fe.hooks.addAction( 'frontend/element_ready/widget', apply );
		} else if ( tries < 100 ) {
			setTimeout( () => start( tries + 1 ), 100 );
		}
	}

	start( 0 );
}() );
