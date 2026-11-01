/**
 * Reads the outline of a .glb (its JSON chunk: nodes, meshes, materials, bounds) without loading the geometry, and
 * proposes build stages from it: one stage per top-level group when the model has named groups, else one per material
 * (Glass, Concrete, Wood...). Stages are ordered bottom to top. Pure functions, tested in scripts/test-build-scene.mjs.
 */

/**
 * The glTF JSON of a .glb file, or null when the bytes are not a glTF 2 binary.
 *
 * @param {ArrayBuffer} buffer The file.
 * @return {Object|null} The parsed JSON chunk.
 */
export function readGlbJson( buffer ) {
	if ( ! buffer || buffer.byteLength < 20 ) {
		return null;
	}

	const view = new DataView( buffer );

	if ( 0x46546c67 !== view.getUint32( 0, true ) || 2 !== view.getUint32( 4, true ) ) {
		return null;
	}

	const length = view.getUint32( 12, true );

	if ( 0x4e4f534a !== view.getUint32( 16, true ) || 20 + length > buffer.byteLength ) {
		return null;
	}

	try {
		return JSON.parse( new TextDecoder().decode( new Uint8Array( buffer, 20, length ) ) );
	} catch ( e ) {
		return null;
	}
}

/**
 * "Box_06 - Default" -> "Box"; "roof-glass_left.002" -> "Roof glass left".
 *
 * @param {string} name A node or material name.
 * @return {string} A title for a stage.
 */
export function humanize( name ) {
	const words = String( name )
		.replace( /\.\d+$/, '' )
		.replace( /\s*-\s*default\b/gi, '' )
		.replace( /[_\-.]+/g, ' ' )
		.replace( /([a-z])([A-Z])/g, '$1 $2' )
		.replace( /\s+\d+\s*$/, '' )
		.replace( /\s+/g, ' ' )
		.trim()
		.toLowerCase();

	return words ? words.charAt( 0 ).toUpperCase() + words.slice( 1 ) : String( name );
}

// The lowest point of a mesh (from its POSITION accessor bounds), moved by its node's translation and its parents'.
function meshBottom( gltf, meshIndex, offsetY ) {
	const mesh = ( gltf.meshes || [] )[ meshIndex ];
	let bottom = Infinity;

	( mesh && mesh.primitives ? mesh.primitives : [] ).forEach( ( primitive ) => {
		const accessor = ( gltf.accessors || [] )[ primitive.attributes && primitive.attributes.POSITION ];

		if ( accessor && Array.isArray( accessor.min ) ) {
			bottom = Math.min( bottom, accessor.min[ 1 ] + offsetY );
		}
	} );

	return bottom;
}

// Everything under a node: its meshes' lowest point and material names.
function collect( gltf, index, offsetY, out ) {
	const node = ( gltf.nodes || [] )[ index ];

	if ( ! node ) {
		return out;
	}

	const y = offsetY + ( ( node.translation ? node.translation[ 1 ] : 0 ) * ( node.scale ? node.scale[ 1 ] : 1 ) );

	if ( undefined !== node.mesh ) {
		const bottom = meshBottom( gltf, node.mesh, y );
		out.meshes++;
		out.bottom = Math.min( out.bottom, bottom );
		( gltf.meshes[ node.mesh ].primitives || [] ).forEach( ( primitive ) => {
			const material = ( gltf.materials || [] )[ primitive.material ];

			if ( material && material.name ) {
				out.materials[ material.name ] = Math.min( out.materials[ material.name ] ?? Infinity, bottom );
			}
		} );
	}

	( node.children || [] ).forEach( ( child ) => collect( gltf, child, y, out ) );

	return out;
}

/**
 * Proposed stages: [ { title, parts: [ name ] } ], bottom to top. Empty when the model has no usable names.
 *
 * @param {Object} gltf The glTF JSON.
 * @param {number} max  At most this many stages.
 * @return {Object} { stages, by } where by is "groups", "materials" or "".
 */
export function proposeStages( gltf, max = 12 ) {
	const scene = ( gltf.scenes || [] )[ gltf.scene || 0 ] || { nodes: [] };
	let level = scene.nodes || [];

	// A single wrapper node (common in exports): look inside it.
	while ( 1 === level.length && ( ( gltf.nodes[ level[ 0 ] ] || {} ).children || [] ).length > 1 ) {
		level = gltf.nodes[ level[ 0 ] ].children;
	}

	const groups = level
		.map( ( index ) => ( { name: ( gltf.nodes[ index ] || {} ).name || '', ...collect( gltf, index, 0, { meshes: 0, bottom: Infinity, materials: {} } ) } ) )
		.filter( ( group ) => group.name && group.meshes > 0 );
	const unique = new Set( groups.map( ( g ) => g.name ) ).size === groups.length;

	if ( groups.length >= 2 && groups.length <= max && unique ) {
		return {
			by: 'groups',
			stages: groups.sort( ( a, b ) => a.bottom - b.bottom ).map( ( g ) => ( { title: humanize( g.name ), parts: [ g.name ] } ) ),
		};
	}

	// Many loose pieces with generic names: group them by material instead.
	const materials = {};
	level.forEach( ( index ) => {
		const found = collect( gltf, index, 0, { meshes: 0, bottom: Infinity, materials: {} } ).materials;
		Object.keys( found ).forEach( ( name ) => ( materials[ name ] = Math.min( materials[ name ] ?? Infinity, found[ name ] ) ) );
	} );
	const names = Object.keys( materials );

	if ( names.length >= 2 && names.length <= max ) {
		return {
			by: 'materials',
			stages: names.sort( ( a, b ) => materials[ a ] - materials[ b ] ).map( ( name ) => ( { title: humanize( name ), parts: [ name ] } ) ),
		};
	}

	return { by: '', stages: [] };
}
