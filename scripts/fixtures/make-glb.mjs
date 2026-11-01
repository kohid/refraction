/**
 * A tiny valid glTF binary for tests: one triangle mesh per name, stacked upwards (name i sits at height i), each in its
 * own node. Options: `materials` (a material name per mesh, shared names share one material) and `wrap` (put every node
 * under one parent node of that name, as many exporters do).
 * Usage: import { makeGlb } from './make-glb.mjs'; makeGlb( [ 'base', 'roof' ], { materials: [ 'Concrete', 'Slate' ] } ).
 */
export function makeGlb( names, options = {} ) {
	const positions = new Float32Array( [ 0, 0, 0, 1, 0, 0, 0, 0, 1 ] );
	const bin = Buffer.from( positions.buffer );
	const materialNames = options.materials ? [ ...new Set( options.materials ) ] : [];
	const nodes = names.map( ( name, i ) => ( { name, mesh: i, translation: [ 0, i, 0 ] } ) );
	let roots = names.map( ( _, i ) => i );

	if ( options.wrap ) {
		nodes.push( { name: options.wrap, children: roots } );
		roots = [ nodes.length - 1 ];
	}

	const json = {
		asset: { version: '2.0' },
		scene: 0,
		scenes: [ { nodes: roots } ],
		nodes,
		meshes: names.map( ( name, i ) => ( { name, primitives: [ { attributes: { POSITION: 0 }, ...( options.materials ? { material: materialNames.indexOf( options.materials[ i ] ) } : {} ) } ] } ) ),
		...( materialNames.length ? { materials: materialNames.map( ( name ) => ( { name } ) ) } : {} ),
		accessors: [ { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [ 0, 0, 0 ], max: [ 1, 0, 1 ] } ],
		bufferViews: [ { buffer: 0, byteOffset: 0, byteLength: bin.length } ],
		buffers: [ { byteLength: bin.length } ],
	};
	let text = Buffer.from( JSON.stringify( json ) );
	text = Buffer.concat( [ text, Buffer.alloc( ( 4 - ( text.length % 4 ) ) % 4, 0x20 ) ] );
	const chunk = ( type, data ) => {
		const head = Buffer.alloc( 8 );
		head.writeUInt32LE( data.length, 0 );
		head.write( type, 4, 'latin1' );
		return Buffer.concat( [ head, data ] );
	};
	const body = Buffer.concat( [ chunk( 'JSON', text ), chunk( 'BIN\0', bin ) ] );
	const header = Buffer.alloc( 12 );
	header.write( 'glTF', 0, 'latin1' );
	header.writeUInt32LE( 2, 4 );
	header.writeUInt32LE( 12 + body.length, 8 );
	return Buffer.concat( [ header, body ] );
}
