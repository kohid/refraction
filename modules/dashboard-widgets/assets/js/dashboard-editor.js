/**
 * Data Table in the editor: "Type Each Row: One field per column" shows one field per column in each typed-in row,
 * named after the column's heading (the widget has fields cell_1 to cell_12; the ones past the last column are
 * hidden, and so is the one-line Cells field). Switching to fields fills them from each row's line, so nothing is
 * typed twice.
 */
( function() {
	const MAX = 12;

	function columnsOf( settings ) {
		const columns = settings.get( 'columns' );

		return columns && columns.models ? columns.models.map( ( m ) => m.get( 'heading' ) || '' ) : [];
	}

	/**
	 * Shows, hides and names the row fields in the open panel.
	 *
	 * @param {HTMLElement} root     The panel.
	 * @param {Object}      settings The widget's settings model.
	 */
	function apply( root, settings ) {
		if ( ! root.querySelector( '.refraction-control-manual_input' ) ) {
			return;
		}

		const fields = 'manual' === ( settings.get( 'source' ) || 'manual' ) && 'fields' === settings.get( 'manual_input' );
		const headings = columnsOf( settings );
		const count = Math.max( 1, Math.min( MAX, headings.length ) );

		// Only what differs is changed: the panel is watched for changes, so writing the same text again would loop.
		const show = ( el, on ) => {
			const display = on ? '' : 'none';

			if ( el.style.display !== display ) {
				el.style.display = display;
			}
		};

		root.querySelectorAll( '.refraction-control-rows .refraction-control-cells' ).forEach( ( el ) => show( el, ! fields ) );

		for ( let i = 1; i <= MAX; i++ ) {
			root.querySelectorAll( `.refraction-control-rows .refraction-control-cell_${ i }` ).forEach( ( el ) => {
				show( el, fields && i <= count );

				const title = el.querySelector( '.refraction-control-title' );
				const name = headings[ i - 1 ] || `Column ${ i }`;

				if ( title && title.textContent !== name ) {
					title.textContent = name;
				}
			} );
		}
	}

	/**
	 * Fills empty row fields from each row's one-line cells.
	 *
	 * @param {Object} container The widget's editor container.
	 */
	function fillFromLines( container ) {
		const rows = container.repeaters && container.repeaters.rows ? container.repeaters.rows.children : [];

		rows.forEach( ( row ) => {
			const s = row.settings;
			let empty = true;

			for ( let i = 1; i <= MAX; i++ ) {
				if ( s.get( `cell_${ i }` ) ) {
					empty = false;
				}
			}

			if ( ! empty || ! s.get( 'cells' ) ) {
				return;
			}

			const parts = String( s.get( 'cells' ) ).split( '|' ).map( ( p ) => p.trim() ).slice( 0, MAX );
			const values = {};

			parts.forEach( ( p, i ) => {
				values[ `cell_${ i + 1 }` ] = p;
			} );

			window.$e.run( 'document/elements/settings', { container: row, settings: values, options: { external: true } } );
		} );
	}

	let cleanup = null;

	function onOpen( panel, model, view ) {
		if ( cleanup ) {
			cleanup();
			cleanup = null;
		}

		const settings = model.get( 'settings' );
		const root = panel && panel.$el ? panel.$el[ 0 ] : document.getElementById( 'refraction-panel' );

		if ( ! settings || ! root ) {
			return;
		}

		const run = () => apply( root, settings );
		const observer = new MutationObserver( run );

		observer.observe( root, { childList: true, subtree: true } );
		run();

		const onChange = () => {
			if ( settings.changed && 'fields' === settings.changed.manual_input && view && view.getContainer ) {
				fillFromLines( view.getContainer() );
			}

			run();
		};

		settings.on( 'change', onChange );
		settings.get( 'columns' )?.on?.( 'change add remove reset', run );

		// The next time a Data Table opens, stop watching this one.
		cleanup = () => {
			observer.disconnect();
			settings.off( 'change', onChange );
			settings.get( 'columns' )?.off?.( 'change add remove reset', run );
		};
	}

	function start( tries ) {
		if ( window.refraction && window.refraction.hooks ) {
			window.refraction.hooks.addAction( 'panel/open_editor/widget/refraction-data-table', onOpen );
		} else if ( tries < 100 ) {
			setTimeout( () => start( tries + 1 ), 100 );
		}
	}

	start( 0 );
}() );
