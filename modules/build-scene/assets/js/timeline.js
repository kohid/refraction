/**
 * The build timeline, without three.js: which stage each part belongs to, the order of the parts in a stage, and when
 * each part moves for a scroll progress between 0 and 1. Pure functions, tested in scripts/test-build-scene.mjs.
 */

/**
 * "roof*, chimney" -> a test for a name (case-insensitive; * matches anything).
 * @param {string[]} patterns Name patterns.
 */
export function nameMatcher( patterns ) {
	const tests = patterns
		.map( ( p ) => String( p ).trim().toLowerCase() )
		.filter( Boolean )
		.map( ( p ) => new RegExp( '^' + p.split( '*' ).map( ( s ) => s.replace( /[.+?^${}()|[\]\\]/g, '\\$&' ) ).join( '.*' ) + '$' ) );

	return ( name ) => tests.some( ( t ) => t.test( String( name ).toLowerCase() ) );
}

/**
 * Puts parts ({ names: [own name, parent names...], bottom, index }) into stages. A part joins the first stage one of
 * whose patterns matches one of its names; parts that match none join the last stage. When no part matches any stage
 * (or there are no stages), every part is its own step.
 *
 * @param {Object[]} parts  The parts.
 * @param {Object[]} stages The stages, each with its name patterns in `parts`.
 * @param {string}   order  bottom, name or file.
 * @return {Array<Array<object>>} The parts of each step, in order.
 */
export function assignStages( parts, stages, order ) {
	const sorted = sortParts( parts, order );
	const matchers = ( stages || [] ).map( ( s ) => nameMatcher( s.parts || [] ) );
	const steps = matchers.map( () => [] );
	let matched = 0;

	for ( const part of sorted ) {
		const at = matchers.findIndex( ( m ) => part.names.some( m ) );

		if ( at >= 0 ) {
			matched++;
			steps[ at ].push( part );
		} else if ( steps.length ) {
			steps[ steps.length - 1 ].push( part );
		}
	}

	return matched ? steps : sorted.map( ( p ) => [ p ] );
}

export function sortParts( parts, order ) {
	const list = [ ...parts ];

	if ( 'name' === order ) {
		const collator = new Intl.Collator( undefined, { numeric: true, sensitivity: 'base' } );
		list.sort( ( a, b ) => collator.compare( a.names[ 0 ] || '', b.names[ 0 ] || '' ) || a.index - b.index );
	} else if ( 'bottom' === order ) {
		list.sort( ( a, b ) => a.bottom - b.bottom || a.index - b.index );
	} else {
		list.sort( ( a, b ) => a.index - b.index );
	}

	return list;
}

/**
 * When each part moves. Steps share the scroll equally, after which `hold` of it is spent on the finished model. In
 * a step, parts start one after another: overlap 0 waits for the previous part, 1 starts them all together.
 *
 * @param {Array[]} steps   The parts of each step.
 * @param {number}  overlap 0 to 1.
 * @param {number}  hold    Share of the scroll kept for the finished model.
 * @return {{ parts: Array<{ part, start, duration }>, steps: Array<{ start, end }> }}
 */
export function schedule( steps, overlap, hold ) {
	const span = ( 1 - hold ) / Math.max( 1, steps.length );
	const out = { parts: [], steps: [] };

	steps.forEach( ( parts, s ) => {
		const start = s * span;
		const n = Math.max( 1, parts.length );
		const duration = span / ( 1 + ( ( n - 1 ) * ( 1 - overlap ) ) );
		const gap = duration * ( 1 - overlap );

		out.steps.push( { start, end: start + span } );
		parts.forEach( ( part, i ) => out.parts.push( { part, start: start + ( i * gap ), duration } ) );
	} );

	return out;
}

export const EASINGS = {
	linear: ( t ) => t,
	out: ( t ) => 1 - Math.pow( 1 - t, 3 ),
	inout: ( t ) => ( t < 0.5 ? 4 * t * t * t : 1 - ( Math.pow( ( -2 * t ) + 2, 3 ) / 2 ) ),
	back: ( t ) => 1 + ( 2.70158 * Math.pow( t - 1, 3 ) ) + ( 1.70158 * Math.pow( t - 1, 2 ) ),
};

/**
 * How far along (0..1) a scheduled part is at a progress.
 * @param {Object} item     A scheduled part.
 * @param {number} progress The build progress, 0 to 1.
 * @return {number} 0 to 1.
 */
export function partProgress( item, progress ) {
	return Math.min( 1, Math.max( 0, ( progress - item.start ) / item.duration ) );
}

/**
 * The step shown at a progress: the last one that has started (the last step once the build is done).
 * @param {Object[]} steps    The scheduled steps.
 * @param {number}   progress The build progress, 0 to 1.
 * @return {number} The index of the step.
 */
export function activeStep( steps, progress ) {
	let active = 0;

	steps.forEach( ( step, i ) => {
		if ( progress >= step.start ) {
			active = i;
		}
	} );

	return active;
}

/**
 * How far through the scroll track the page is: 0 when its top reaches the top of the screen, 1 at the end.
 * @param {number} top      The track's top relative to the screen.
 * @param {number} height   The track's height.
 * @param {number} viewport The pinned scene's height.
 * @return {number} 0 to 1.
 */
export function scrollProgress( top, height, viewport ) {
	const room = height - viewport;

	if ( room <= 0 ) {
		return top <= 0 ? 1 : 0;
	}

	return Math.min( 1, Math.max( 0, -top / room ) );
}

/**
 * The first row of Content > Parts whose names match one of a part's names (its own, its parents', its materials').
 *
 * @param {string[]} names     The part's names.
 * @param {Object[]} overrides The rows: { match: [patterns], ... }.
 * @return {Object|null} The row, or null.
 */
export function partOverride( names, overrides ) {
	for ( const row of overrides || [] ) {
		if ( row && Array.isArray( row.match ) && row.match.length ) {
			row.test = row.test || nameMatcher( row.match );

			if ( names.some( row.test ) ) {
				return row;
			}
		}
	}

	return null;
}
