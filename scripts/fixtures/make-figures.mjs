/**
 * Small valid glTF binaries for the 3D Build Scene checks, built from boxes (with normals, so they light):
 *   makeCar()       - a car: "Body", "Cabin" and four wheels "Wheel_FL", "Wheel_FR", "Wheel_RL", "Wheel_RR" (thin boxes
 *                     facing sideways, so they spin around the car's width), 4 long along x.
 *   makeCharacter() - a figure: "Body" with "Head", "Arm_L" and "Arm_R" under it, and two animations: "Wave" (the right
 *                     arm swings) and "Idle" (the body bobs).
 * Usage: import { makeCar, makeCharacter } from './make-figures.mjs'; writeFileSync( 'car.glb', makeCar() ).
 */

/** Geometry of a box of size [ w, h, d ] centred on the origin: 24 positions and normals, 36 indices. */
function box( [ w, h, d ] ) {
	const x = w / 2;
	const y = h / 2;
	const z = d / 2;
	const faces = [
		[ [ 1, 0, 0 ], [ [ x, -y, -z ], [ x, y, -z ], [ x, y, z ], [ x, -y, z ] ] ],
		[ [ -1, 0, 0 ], [ [ -x, -y, z ], [ -x, y, z ], [ -x, y, -z ], [ -x, -y, -z ] ] ],
		[ [ 0, 1, 0 ], [ [ -x, y, -z ], [ -x, y, z ], [ x, y, z ], [ x, y, -z ] ] ],
		[ [ 0, -1, 0 ], [ [ -x, -y, z ], [ -x, -y, -z ], [ x, -y, -z ], [ x, -y, z ] ] ],
		[ [ 0, 0, 1 ], [ [ -x, -y, z ], [ x, -y, z ], [ x, y, z ], [ -x, y, z ] ] ],
		[ [ 0, 0, -1 ], [ [ x, -y, -z ], [ -x, -y, -z ], [ -x, y, -z ], [ x, y, -z ] ] ],
	];
	const pos = [];
	const nor = [];
	const idx = [];

	faces.forEach( ( [ n, quad ], f ) => {
		quad.forEach( ( v ) => {
			pos.push( ...v );
			nor.push( ...n );
		} );
		const b = f * 4;
		idx.push( b, b + 1, b + 2, b, b + 2, b + 3 );
	} );

	return { pos, nor, idx, size: [ w, h, d ] };
}

/**
 * @param {Array}  parts      [ { name, size, at, color, parent } ]: one box node each (parent: index of another part).
 * @param {Array}  animations [ { name, channels: [ { part, path: 'rotation'|'translation', times, values } ] } ]
 * @return {Buffer} The .glb file.
 */
function build( parts, animations = [] ) {
	const chunks = [];
	const accessors = [];
	const views = [];
	let offset = 0;

	const add = ( array, type, componentType, target, minmax ) => {
		const data = Buffer.from( 5123 === componentType ? new Uint16Array( array ).buffer : new Float32Array( array ).buffer );
		const pad = Buffer.alloc( ( 4 - ( data.length % 4 ) ) % 4 );
		views.push( { buffer: 0, byteOffset: offset, byteLength: data.length, ...( target ? { target } : {} ) } );
		chunks.push( data, pad );
		offset += data.length + pad.length;
		const size = { SCALAR: 1, VEC3: 3, VEC4: 4 }[ type ];
		accessors.push( { bufferView: views.length - 1, componentType, count: array.length / size, type, ...( minmax || {} ) } );
		return accessors.length - 1;
	};

	const materials = [];
	const meshes = parts.map( ( part ) => {
		const g = box( part.size );
		const half = part.size.map( ( s ) => s / 2 );
		const position = add( g.pos, 'VEC3', 5126, 34962, { min: half.map( ( h ) => -h ), max: half } );
		const normal = add( g.nor, 'VEC3', 5126, 34962 );
		const indices = add( g.idx, 'SCALAR', 5123, 34963 );
		materials.push( { name: part.name + ' paint', pbrMetallicRoughness: { baseColorFactor: part.color || [ 0.7, 0.7, 0.7, 1 ], metallicFactor: 0.1, roughnessFactor: 0.6 } } );
		return { name: part.name, primitives: [ { attributes: { POSITION: position, NORMAL: normal }, indices, material: materials.length - 1 } ] };
	} );
	const nodes = parts.map( ( part, i ) => ( { name: part.name, mesh: i, translation: part.at || [ 0, 0, 0 ] } ) );
	parts.forEach( ( part, i ) => {
		if ( undefined !== part.parent ) {
			nodes[ part.parent ].children = ( nodes[ part.parent ].children || [] ).concat( i );
		}
	} );
	const roots = parts.map( ( _, i ) => i ).filter( ( i ) => undefined === parts[ i ].parent );

	const anims = animations.map( ( anim ) => {
		const samplers = [];
		const channels = anim.channels.map( ( ch ) => {
			const input = add( ch.times, 'SCALAR', 5126, null, { min: [ Math.min( ...ch.times ) ], max: [ Math.max( ...ch.times ) ] } );
			const output = add( ch.values, 'rotation' === ch.path ? 'VEC4' : 'VEC3', 5126 );
			samplers.push( { input, output, interpolation: 'LINEAR' } );
			return { sampler: samplers.length - 1, target: { node: ch.part, path: ch.path } };
		} );
		return { name: anim.name, samplers, channels };
	} );

	const bin = Buffer.concat( chunks );
	const json = { asset: { version: '2.0', generator: 'refraction-test' }, scene: 0, scenes: [ { nodes: roots } ], nodes, meshes, materials, accessors, bufferViews: views, buffers: [ { byteLength: bin.length } ], ...( anims.length ? { animations: anims } : {} ) };
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

export function makeCar() {
	const red = [ 0.8, 0.1, 0.1, 1 ];
	const tyre = [ 0.08, 0.08, 0.08, 1 ];
	const wheel = ( name, x, z ) => ( { name, size: [ 0.7, 0.7, 0.25 ], at: [ x, 0.35, z ], color: tyre } );

	return build( [
		{ name: 'Body', size: [ 4, 0.6, 1.8 ], at: [ 0, 0.75, 0 ], color: red },
		{ name: 'Cabin', size: [ 2, 0.6, 1.6 ], at: [ -0.2, 1.35, 0 ], color: [ 0.2, 0.25, 0.35, 1 ] },
		wheel( 'Wheel_FL', 1.3, 0.9 ),
		wheel( 'Wheel_FR', 1.3, -0.9 ),
		wheel( 'Wheel_RL', -1.3, 0.9 ),
		wheel( 'Wheel_RR', -1.3, -0.9 ),
	] );
}

export function makeCharacter() {
	const q = ( axis, deg ) => {
		const r = ( deg * Math.PI ) / 360;
		const s = Math.sin( r );
		return [ 'x' === axis ? s : 0, 'y' === axis ? s : 0, 'z' === axis ? s : 0, Math.cos( r ) ];
	};

	return build( [
		{ name: 'Body', size: [ 0.8, 1.2, 0.4 ], at: [ 0, 1.1, 0 ], color: [ 0.2, 0.45, 0.85, 1 ] },
		{ name: 'Head', size: [ 0.5, 0.5, 0.5 ], at: [ 0, 0.9, 0 ], color: [ 0.95, 0.8, 0.65, 1 ], parent: 0 },
		{ name: 'Arm_L', size: [ 0.2, 0.9, 0.2 ], at: [ 0.55, 0.05, 0 ], color: [ 0.2, 0.45, 0.85, 1 ], parent: 0 },
		{ name: 'Arm_R', size: [ 0.2, 0.9, 0.2 ], at: [ -0.55, 0.05, 0 ], color: [ 0.2, 0.45, 0.85, 1 ], parent: 0 },
		{ name: 'Legs', size: [ 0.7, 0.5, 0.35 ], at: [ 0, 0.25, 0 ], color: [ 0.15, 0.15, 0.2, 1 ] },
	], [
		{ name: 'Wave', channels: [ { part: 3, path: 'rotation', times: [ 0, 0.5, 1 ], values: [ ...q( 'z', 0 ), ...q( 'z', -150 ), ...q( 'z', 0 ) ] } ] },
		{ name: 'Idle', channels: [ { part: 0, path: 'translation', times: [ 0, 1, 2 ], values: [ 0, 1.1, 0, 0, 1.18, 0, 0, 1.1, 0 ] } ] },
	] );
}
