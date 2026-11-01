#!/usr/bin/env node
// Pure-logic tests for the 3D Build Scene timeline: node scripts/test-build-scene.mjs
import { activeStep, assignStages, EASINGS, nameMatcher, partProgress, schedule, scrollProgress, sortParts } from '../modules/build-scene/assets/js/timeline.js';

let pass = 0;
let fail = 0;
const t = ( name, ok ) => {
	if ( ok ) {
		pass++;
	} else {
		fail++;
		console.log( `FAIL ${ name }` );
	}
};
const part = ( names, bottom, index ) => ( { names, bottom, index } );
const names = ( steps ) => steps.map( ( s ) => s.map( ( p ) => p.names[ 0 ] ) );

const m = nameMatcher( [ 'roof*', ' Chimney ' ] );
t( 'patterns: * matches anything, case does not matter', m( 'ROOF-left' ) && m( 'chimney' ) && ! m( 'chimney-cap' ) && ! m( 'big-roof' ) );
t( 'patterns: dots and brackets are literal', nameMatcher( [ 'a.b' ] )( 'a.b' ) && ! nameMatcher( [ 'a.b' ] )( 'axb' ) );

const parts = [ part( [ 'roof-a', 'house' ], 5, 0 ), part( [ 'slab' ], 0, 1 ), part( [ 'wall-1' ], 1, 2 ), part( [ 'misc' ], 2, 3 ) ];
t( 'stages: parts join the first matching stage; unmatched ones join the last', JSON.stringify( names( assignStages( parts, [ { parts: [ 'slab' ] }, { parts: [ 'wall*' ] }, { parts: [ 'roof*' ] } ], 'bottom' ) ) ) === '[["slab"],["wall-1"],["misc","roof-a"]]' );
t( 'stages: a parent name matches too', JSON.stringify( names( assignStages( parts, [ { parts: [ 'house' ] }, { parts: [ 'slab' ] } ], 'file' ) ) ) === '[["roof-a"],["slab","wall-1","misc"]]' );
t( 'stages: when nothing matches, every part is its own step', assignStages( parts, [ { parts: [ 'nothing' ] } ], 'bottom' ).length === 4 );
t( 'stages: no stages, one step per part', assignStages( parts, [], 'file' ).length === 4 );
t( 'order: bottom to top', sortParts( parts, 'bottom' ).map( ( p ) => p.index ).join() === '1,2,3,0' );
t( 'order: by name with numbers in order', sortParts( [ part( [ 'p10' ], 0, 0 ), part( [ 'p2' ], 0, 1 ) ], 'name' ).map( ( p ) => p.names[ 0 ] ).join() === 'p2,p10' );
t( 'order: as in the file', sortParts( parts, 'file' ).map( ( p ) => p.index ).join() === '0,1,2,3' );

const plan = schedule( [ [ 'a' ], [ 'b', 'c' ] ], 0, 0.2 );
t( 'schedule: steps share the scroll before the pause', Math.abs( plan.steps[ 1 ].end - 0.8 ) < 1e-9 && Math.abs( plan.steps[ 1 ].start - 0.4 ) < 1e-9 );
t( 'schedule: overlap 0 runs parts one after another', Math.abs( plan.parts[ 2 ].start - ( plan.parts[ 1 ].start + plan.parts[ 1 ].duration ) ) < 1e-9 );
const together = schedule( [ [ 'b', 'c' ] ], 1, 0 );
t( 'schedule: overlap 1 starts them together', together.parts[ 0 ].start === together.parts[ 1 ].start && together.parts[ 0 ].duration === 1 );
t( 'schedule: every part ends by the end of its step', schedule( [ [ 1, 2, 3, 4, 5 ] ], 0.6, 0.1 ).parts.every( ( p ) => p.start + p.duration <= 0.9 + 1e-9 ) );
t( 'part progress is clamped', partProgress( { start: 0.2, duration: 0.2 }, 0.1 ) === 0 && Math.abs( partProgress( { start: 0.2, duration: 0.2 }, 0.3 ) - 0.5 ) < 1e-9 && partProgress( { start: 0.2, duration: 0.2 }, 1 ) === 1 );
t( 'easings start at 0 and end at 1', Object.values( EASINGS ).every( ( e ) => Math.abs( e( 0 ) ) < 1e-9 && Math.abs( e( 1 ) - 1 ) < 1e-9 ) );
t( 'active step: the last one started', activeStep( plan.steps, 0 ) === 0 && activeStep( plan.steps, 0.5 ) === 1 && activeStep( plan.steps, 1 ) === 1 );
t( 'scroll progress: 0 above, 1 at the end, clamped', scrollProgress( 100, 3000, 1000 ) === 0 && scrollProgress( -1000, 3000, 1000 ) === 0.5 && scrollProgress( -5000, 3000, 1000 ) === 1 );
t( 'scroll progress: a track no taller than the screen', scrollProgress( 0, 800, 1000 ) === 1 && scrollProgress( 10, 800, 1000 ) === 0 );

console.log( `build-scene timeline: ${ pass } passed, ${ fail } failed` );
process.exit( fail ? 1 : 0 );
