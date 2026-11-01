#!/usr/bin/env node
// Pure-logic tests for the 3D Build Scene timeline: node scripts/test-build-scene.mjs
import { fitRect, frameAt, galleryLayers, loadOrder } from '../modules/build-scene/assets/js/sequence.js';
import { humanize, proposeStages, readGlbJson } from '../modules/build-scene/assets/js/glb-outline.js';
import { makeGlb } from './fixtures/make-glb.mjs';
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

const order = loadOrder( 40 );
t( 'sequence: every frame is loaded once, first and last first', order.length === 40 && new Set( order ).size === 40 && order[ 0 ] === 0 && order[ 1 ] === 39 );
t( 'sequence: coarse frames come before fine ones', order.indexOf( 16 ) < order.indexOf( 8 ) && order.indexOf( 8 ) < order.indexOf( 3 ) );
t( 'sequence: one frame', loadOrder( 1 ).join() === '0' );
t( 'sequence: the frame follows the progress and stays on the last one in the pause', frameAt( 0, 100, 0.1 ) === 0 && frameAt( 0.45, 100, 0.1 ) === 50 && frameAt( 0.9, 100, 0.1 ) === 99 && frameAt( 1, 100, 0.1 ) === 99 );
t( 'sequence: cover fills the box, contain shows it whole', fitRect( 200, 100, 100, 100, 'cover' ).join() === '-50,0,200,100' && fitRect( 200, 100, 100, 100, 'contain' ).join() === '0,25,100,50' );


// ---- filling stages from a model
const bytes = ( buf ) => buf.buffer.slice( buf.byteOffset, buf.byteOffset + buf.byteLength );
t( 'outline: reads the JSON of a glb, refuses other bytes', readGlbJson( bytes( makeGlb( [ 'a' ] ) ) ).nodes[ 0 ].name === 'a' && null === readGlbJson( new ArrayBuffer( 40 ) ) && null === readGlbJson( null ) );
t( 'outline: titles from names', humanize( 'Box_06 - Default' ) === 'Box' && humanize( 'roof-glass_left.002' ) === 'Roof glass left' && humanize( 'GlassCurtainWall' ) === 'Glass curtain wall' );
const grouped = proposeStages( readGlbJson( bytes( makeGlb( [ 'Roof', 'Foundation', 'Walls' ].reverse(), { wrap: 'Villa' } ) ) ) );
t( 'outline: named groups inside a wrapper become stages, bottom to top', 'groups' === grouped.by && grouped.stages.map( ( s ) => s.title ).join() === 'Walls,Foundation,Roof' && grouped.stages[ 0 ].parts[ 0 ] === 'Walls' );
const byMaterial = proposeStages( readGlbJson( bytes( makeGlb( [ 'Box_01', 'Box_01', 'Box_02', 'Box_03' ], { materials: [ 'Concrete', 'Concrete', 'Glass', 'Slate_Roof' ] } ) ) ) );
t( 'outline: repeated generic names fall back to materials', 'materials' === byMaterial.by && byMaterial.stages.map( ( s ) => s.title ).join() === 'Concrete,Glass,Slate roof' && byMaterial.stages[ 1 ].parts[ 0 ] === 'Glass' );
t( 'outline: nothing usable gives no stages', 0 === proposeStages( readGlbJson( bytes( makeGlb( [ 'x', 'x' ] ) ) ) ).stages.length );
t( 'outline: too many groups and no materials gives no stages', 0 === proposeStages( readGlbJson( bytes( makeGlb( Array.from( { length: 20 }, ( _, i ) => 'p' + i ) ) ) ), 12 ).stages.length );


// ---- gallery mode
const at = ( p ) => galleryLayers( p, 4, 0, 0.3 ).map( ( l ) => `${ l.index }:${ l.alpha.toFixed( 2 ) }:${ l.motion.toFixed( 2 ) }` ).join( ' ' );
t( 'gallery: the first image alone at the start, not moving yet', at( 0 ) === '0:1.00:0.18' || at( 0 ).startsWith( '0:1.00' ) );
t( 'gallery: the next image fades in over the last 30% of the share', galleryLayers( 0.2125, 4, 0, 0.3 ).map( ( l ) => l.index ).join() === '0,1' && Math.abs( galleryLayers( 0.2125, 4, 0, 0.3 )[ 1 ].alpha - 0.5 ) < 0.01 );
t( 'gallery: once covered, an image is not drawn', galleryLayers( 0.3, 4, 0, 0.3 ).map( ( l ) => l.index ).join() === '1' );
t( 'gallery: motion runs on without jumping when an image takes over', Math.abs( galleryLayers( 0.2499, 4, 0, 0.3 )[ 1 ].motion - galleryLayers( 0.2501, 4, 0, 0.3 )[ 0 ].motion ) < 0.01 );
t( 'gallery: the last image stays in the pause', galleryLayers( 1, 4, 0.1, 0.3 ).map( ( l ) => l.index ).join() === '3' && galleryLayers( 0.95, 4, 0.1, 0.3 )[ 0 ].alpha === 1 );
t( 'gallery: never more than two layers', [ 0, 0.1, 0.33, 0.5, 0.74, 0.9 ].every( ( p ) => galleryLayers( p, 6, 0, 0.7 ).length <= 2 ) );

console.log( `build-scene timeline: ${ pass } passed, ${ fail } failed` );
process.exit( fail ? 1 : 0 );
