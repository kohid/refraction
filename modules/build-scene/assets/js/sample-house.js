import {
	BoxGeometry,
	CanvasTexture,
	Color,
	ExtrudeGeometry,
	Group,
	Mesh,
	MeshStandardMaterial,
	RepeatWrapping,
	Shape,
	SRGBColorSpace,
} from 'three';

/**
 * The sample model: a modern gable house with a stone chimney, vertical timber cladding, full-height glazing, a slate
 * roof and a covered terrace. Built from simple shapes in code (nothing to download), with part names the default
 * stages match: foundation*, frame*, stone*, wall*, roof*, glass*, cladding*, terrace*, furniture*. Units are metres.
 */

/** A stone wall pattern drawn once on a canvas: offset courses of grey blocks with darker joints. */
function stoneTexture() {
	if ( 'undefined' === typeof document ) {
		return null;
	}

	const canvas = document.createElement( 'canvas' );
	canvas.width = 256;
	canvas.height = 256;
	const g = canvas.getContext( '2d' );
	g.fillStyle = '#5d5a55';
	g.fillRect( 0, 0, 256, 256 );
	let seed = 7;
	const rand = () => ( ( seed = ( seed * 16807 ) % 2147483647 ) / 2147483647 );

	for ( let y = 0, row = 0; y < 256; y += 32, row++ ) {
		for ( let x = row % 2 ? -24 : 0; x < 256; ) {
			const w = 36 + Math.floor( rand() * 40 );
			const shade = 112 + Math.floor( rand() * 50 );
			g.fillStyle = `rgb(${ shade },${ shade - 4 },${ shade - 10 })`;
			g.fillRect( x + 2, y + 2, w - 4, 28 );
			x += w;
		}
	}

	const texture = new CanvasTexture( canvas );
	texture.wrapS = RepeatWrapping;
	texture.wrapT = RepeatWrapping;
	texture.colorSpace = SRGBColorSpace;

	return texture;
}

export function sampleHouse() {
	const stone = stoneTexture();
	const mat = {
		concrete: new MeshStandardMaterial( { color: new Color( '#b7b4ae' ), roughness: 0.92 } ),
		stone: new MeshStandardMaterial( { color: new Color( '#ffffff' ), map: stone, roughness: 0.95 } ),
		wall: new MeshStandardMaterial( { color: new Color( '#3b3936' ), roughness: 0.85 } ),
		timber: new MeshStandardMaterial( { color: new Color( '#a4612f' ), roughness: 0.7 } ),
		steel: new MeshStandardMaterial( { color: new Color( '#1d1e21' ), roughness: 0.45, metalness: 0.6 } ),
		roof: new MeshStandardMaterial( { color: new Color( '#2c2f33' ), roughness: 0.75, metalness: 0.15 } ),
		glass: new MeshStandardMaterial( { color: new Color( '#8fa6b3' ), roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.55 } ),
		deck: new MeshStandardMaterial( { color: new Color( '#a9aaa8' ), roughness: 0.8 } ),
		chair: new MeshStandardMaterial( { color: new Color( '#4a4b4d' ), roughness: 0.6 } ),
		table: new MeshStandardMaterial( { color: new Color( '#8a6a4a' ), roughness: 0.6 } ),
	};

	const house = new Group();
	house.name = 'sample-house';
	const box = ( name, material, [ w, h, d ], [ x, y, z ], rotate = null ) => {
		const mesh = new Mesh( new BoxGeometry( w, h, d ), material );
		mesh.name = name;
		mesh.position.set( x, y, z );

		if ( rotate ) {
			mesh.rotation.set( ...rotate );
		}

		house.add( mesh );

		return mesh;
	};
	const stoneBox = ( name, size, at ) => {
		const mesh = box( name, mat.stone.clone(), size, at );
		mesh.material.map = stone ? stone.clone() : null;

		if ( mesh.material.map ) {
			mesh.material.map.repeat.set( Math.max( size[ 0 ], size[ 2 ] ) / 1.6, size[ 1 ] / 1.6 );
			mesh.material.map.needsUpdate = true;
		}

		return mesh;
	};

	// Main gable volume: x -1.5..5.5 (centre 2, width 7), z -4..4, walls 4 m, ridge 3 m higher.
	const cx = 2;
	const half = 3.5;
	const wallH = 4;
	const rise = 3;
	const base = 0.3;

	// Groundwork
	box( 'foundation-slab', mat.concrete, [ 14.5, base, 9.4 ], [ -0.75, base / 2, 0 ] );
	box( 'foundation-terrace', mat.concrete, [ 8.5, 0.2, 4.2 ], [ 6.25, 0.1, 6.3 ] );

	// Structure: corner posts, ridge beam, rafters, wing posts.
	[ [ -1.4, -3.9 ], [ 5.4, -3.9 ], [ -1.4, 3.9 ], [ 5.4, 3.9 ] ].forEach( ( [ x, z ], i ) => box( `frame-post-${ i + 1 }`, mat.steel, [ 0.22, wallH, 0.22 ], [ x, base + ( wallH / 2 ), z ] ) );
	box( 'frame-ridge', mat.steel, [ 0.22, 0.22, 8.6 ], [ cx, base + wallH + rise, 0 ] );
	const rafter = Math.hypot( half, rise );
	const pitch = Math.atan2( rise, half );
	[ -3.9, -1.95, 0, 1.95, 3.9 ].forEach( ( z, i ) => {
		box( `frame-rafter-${ i + 1 }a`, mat.steel, [ rafter, 0.16, 0.16 ], [ cx - ( half / 2 ), base + wallH + ( rise / 2 ), z ], [ 0, 0, pitch ] );
		box( `frame-rafter-${ i + 1 }b`, mat.steel, [ rafter, 0.16, 0.16 ], [ cx + ( half / 2 ), base + wallH + ( rise / 2 ), z ], [ 0, 0, -pitch ] );
	} );
	[ [ -7.4, -3.4 ], [ -7.4, 3.4 ] ].forEach( ( [ x, z ], i ) => box( `frame-wing-post-${ i + 1 }`, mat.steel, [ 0.2, 3, 0.2 ], [ x, base + 1.5, z ] ) );
	box( 'frame-terrace-post', mat.steel, [ 0.18, 3, 0.18 ], [ 2.6, base + 1.5, 7.9 ] );

	// Stone: chimney and the terrace pier.
	stoneBox( 'stone-chimney', [ 1.3, 8.6, 1.3 ], [ -2.2, base + 4.3, 1.6 ] );
	box( 'stone-chimney-cap', mat.steel, [ 1.5, 0.15, 1.5 ], [ -2.2, base + 8.68, 1.6 ] );
	box( 'stone-chimney-flue', mat.steel, [ 0.22, 0.9, 0.22 ], [ -2.2, base + 9.2, 1.6 ] );
	stoneBox( 'stone-pier', [ 1.5, 3.1, 1.5 ], [ 9.6, base + 1.55, 7.6 ] );
	stoneBox( 'stone-wing-end', [ 1.2, 3, 7 ], [ -7.6, base + 1.5, 0 ] );

	// Walls: the main volume and its gables, the low wing.
	box( 'wall-main', mat.wall, [ 6.8, wallH, 7.6 ], [ cx, base + ( wallH / 2 ), -0.2 ] );
	const gable = new Shape();
	gable.moveTo( -half, 0 );
	gable.lineTo( half, 0 );
	gable.lineTo( 0, rise );
	gable.closePath();
	[ [ 'wall-gable-front', 3.62 ], [ 'wall-gable-back', -4.0 ] ].forEach( ( [ name, z ] ) => {
		const mesh = new Mesh( new ExtrudeGeometry( gable, { depth: 0.2, bevelEnabled: false } ), mat.wall );
		mesh.name = name;
		mesh.position.set( cx, base + wallH, z );
		mesh.scale.set( 0.97, 0.97, 1 );
		house.add( mesh );
	} );
	box( 'wall-wing', mat.wall, [ 5.6, 2.9, 6.6 ], [ -4.6, base + 1.45, -0.1 ] );

	// Roof: two slate planes with eaves, the wing's flat roof and the terrace canopy.
	const slab = Math.hypot( half + 0.7, rise * ( ( half + 0.7 ) / half ) );
	const reach = ( half + 0.7 ) / 2; // From the ridge to the middle of a roof plane
	const roofY = base + wallH + ( rise * ( 1 - ( reach / half ) ) ) + 0.14;
	box( 'roof-left', mat.roof, [ slab, 0.22, 9.2 ], [ cx - reach, roofY, 0 ], [ 0, 0, pitch ] );
	box( 'roof-right', mat.roof, [ slab, 0.22, 9.2 ], [ cx + reach, roofY, 0 ], [ 0, 0, -pitch ] );
	box( 'roof-wing', mat.roof, [ 6.6, 0.25, 7.8 ], [ -4.6, base + 3.05, 0 ] );
	box( 'roof-canopy', mat.roof, [ 9.4, 0.25, 4.8 ], [ 6.4, base + 3.12, 6.1 ] );
	box( 'roof-canopy-fascia', mat.steel, [ 9.5, 0.35, 0.08 ], [ 6.4, base + 3.0, 8.52 ] );

	// Glass: full-height panes in the gable front and along the wing.
	box( 'glass-main-front', mat.glass, [ 3.6, wallH - 0.1, 0.06 ], [ cx + 0.4, base + ( wallH / 2 ), 3.85 ] );
	box( 'glass-gable', mat.glass, [ 2.4, 2.0, 0.06 ], [ cx + 0.4, base + wallH + 0.95, 3.85 ] );
	box( 'glass-wing-front', mat.glass, [ 4.2, 2.6, 0.06 ], [ -4.9, base + 1.4, 3.3 ] );
	box( 'glass-side', mat.glass, [ 0.06, 3.2, 3.4 ], [ 5.45, base + 1.7, 1.6 ] );

	// Cladding: vertical timber battens on the gable front, each its own part so they rise one by one.
	for ( let x = -1.35; x <= 5.36; x += 0.2 ) {
		const inGlass = x > cx + 0.4 - 1.85 && x < cx + 0.4 + 1.85;
		const top = wallH + ( rise * ( 1 - ( Math.abs( x - cx ) / half ) ) ) - 0.15;
		const from = inGlass ? wallH + 1.95 : 0.05;

		if ( top - from > 0.2 ) {
			box( `cladding-${ x.toFixed( 2 ) }`, mat.timber, [ 0.09, top - from, 0.1 ], [ x, base + from + ( ( top - from ) / 2 ), 3.92 ] );
		}
	}

	// Terrace: the deck and the furniture.
	box( 'terrace-deck', mat.deck, [ 8.3, 0.08, 4.0 ], [ 6.25, 0.24, 6.3 ] );
	box( 'furniture-table', mat.table, [ 2.2, 0.07, 1.0 ], [ 6.4, 0.28 + 0.75, 6.2 ] );
	[ [ -1, -0.4 ], [ 1, -0.4 ], [ -1, 0.4 ], [ 1, 0.4 ] ].forEach( ( [ dx, dz ], i ) => box( `furniture-table-leg-${ i + 1 }`, mat.steel, [ 0.06, 0.75, 0.06 ], [ 6.4 + dx, 0.28 + 0.375, 6.2 + dz ] ) );
	[ [ 5.6, 5.3 ], [ 7.2, 5.3 ], [ 5.6, 7.1 ], [ 7.2, 7.1 ] ].forEach( ( [ x, z ], i ) => {
		box( `furniture-chair-${ i + 1 }-seat`, mat.chair, [ 0.5, 0.06, 0.5 ], [ x, 0.28 + 0.45, z ] );
		box( `furniture-chair-${ i + 1 }-back`, mat.chair, [ 0.5, 0.5, 0.06 ], [ x, 0.28 + 0.72, z + ( z < 6.2 ? -0.25 : 0.25 ) ] );
	} );

	return house;
}
