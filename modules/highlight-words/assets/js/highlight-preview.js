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

	const TITLE = [ 'title', 'heading', 'headline', 'name' ];
	const DESC = [ 'description', 'desc', 'content', 'text', 'subtitle', 'subheading', 'excerpt', 'caption', 'quote', 'editor' ];

	/**
	 * 'title', 'desc' or '' for an element, from the parts of its class names (split at - and _).
	 *
	 * @param {Element} el
	 */
	function kind( el ) {
		let desc = false;

		for ( const name of el.classList ) {
			const parts = name.toLowerCase().split( /[-_]+/ );

			if ( parts.some( ( p ) => TITLE.includes( p ) ) ) {
				return 'title';
			}

			desc = desc || parts.some( ( p ) => DESC.includes( p ) );
		}

		return desc ? 'desc' : '';
	}

	/**
	 * The part a text node is in: its innermost ancestor (inside root) whose class says title or description.
	 *
	 * @param {Node}    node A text node.
	 * @param {Element} root The widget.
	 */
	function partOf( node, root ) {
		for ( let el = node.parentElement; el && el !== root; el = el.parentElement ) {
			const k = kind( el );

			if ( k ) {
				return k;
			}
		}

		return '';
	}

	const regex = ( list, flags ) => ( list.length ? new RegExp( `(?<![\\p{L}\\p{N}])(${ list.map( escape ).join( '|' ) })(?![\\p{L}\\p{N}])`, flags ) : null );

	/**
	 * @param {Element}     root      The widget.
	 * @param {string}      words     Words for the title (or everywhere, without descWords).
	 * @param {string|null} descWords Words for the description, or null when the widget has one list.
	 * @param {boolean}     matchCase
	 */
	function wrap( root, words, descWords, matchCase ) {
		const flags = matchCase ? 'u' : 'iu';
		const title = phrases( words );
		const desc = null === descWords ? [] : phrases( descWords );
		const lists = null === descWords ? { '': title, title, desc: title } : { title, desc, '': phrases( [ ...title, ...desc ].join( '\n' ) ) };
		const tests = Object.fromEntries( Object.entries( lists ).map( ( [ k, l ] ) => [ k, regex( l, flags ) ] ) );
		const nodes = [];
		const walker = document.createTreeWalker( root, NodeFilter.SHOW_TEXT );

		for ( let node = walker.nextNode(); node; node = walker.nextNode() ) {
			const parent = node.parentElement;

			if ( ! parent || parent.closest( '.refraction-heading-dual' ) || SKIP.includes( parent.tagName ) ) {
				continue;
			}

			const part = null === descWords ? '' : partOf( node, root );

			if ( tests[ part ] && tests[ part ].test( node.nodeValue ) ) {
				nodes.push( [ node, lists[ part ] ] );
			}
		}

		nodes.forEach( ( [ node, list ] ) => {
			const source = regex( list, flags ).source;
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

		const two = Object.prototype.hasOwnProperty.call( settings, 'rf_hl_desc' );

		if ( settings.rf_hl_words || ( two && settings.rf_hl_desc ) ) {
			wrap( element, settings.rf_hl_words, two ? settings.rf_hl_desc || '' : null, 'yes' === settings.rf_hl_case );
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
