import {
	ACESFilmicToneMapping,
	AnimationMixer,
	Box3,
	DirectionalLight,
	Euler,
	HemisphereLight,
	MathUtils,
	Mesh,
	PCFSoftShadowMap,
	PerspectiveCamera,
	PlaneGeometry,
	PMREMGenerator,
	Quaternion,
	Scene,
	ShadowMaterial,
	SRGBColorSpace,
	Vector3,
	WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { sampleHouse } from './sample-house.js';
import { activeStep, assignStages, EASINGS, nameMatcher, partProgress, schedule, scrollProgress } from './timeline.js';

const LIGHTS = {
	daylight: { sky: '#dfe9f5', ground: '#6b5f52', hemi: 0.9, sun: '#fff3e0', power: 2.2, dir: [ -0.6, 1, 0.7 ], env: 0.55 },
	studio: { sky: '#ffffff', ground: '#8a8a8a', hemi: 1.0, sun: '#ffffff', power: 1.7, dir: [ 0.7, 1, 0.8 ], env: 0.8 },
	dusk: { sky: '#8193c2', ground: '#3a2c26', hemi: 0.55, sun: '#ffb27a', power: 2.6, dir: [ -1, 0.55, 0.45 ], env: 0.3 },
};

const TEXT = {
	loading: 'Loading the 3D model…',
	failed: 'The 3D model could not be loaded.',
	noWebgl: 'This browser can not show 3D.',
	noModel: 'Choose a .glb file in the Model section.',
};

/**
 * One 3D Build Scene on the page: loads the model when it comes near the screen, then moves every part between its
 * start offset and its place according to the scroll progress through the section, renders only when something
 * changed, and frees the GPU when it is removed (dispose).
 */
export class BuildScene {
	constructor( root ) {
		this.root = root;
		this.cfg = JSON.parse( root.dataset.rf3d || '{}' );
		this.canvas = root.querySelector( '.rf3d-canvas' );
		this.poster = root.querySelector( '.rf3d-poster' );
		this.status = root.querySelector( '.rf3d-status' );
		this.caps = [ ...root.querySelectorAll( '[data-rf3d-cap]' ) ];
		this.steps = [ ...root.querySelectorAll( '[data-rf3d-step]' ) ];
		this.reduced = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
		this.target = this.reduced ? 1 : 0;
		this.shown = this.target;
		this.yaw = 0;
		this.pitch = 0;
		this.view = 'build';
		this.explode = 0;
		this.free = 0;
		this.focus = null;
		this.elevation = this.cfg.elevation;
		this.rotating = !! this.cfg.autoRotate && ! this.reduced;
		this.lastTime = 0;
		this.dirty = true;
		this.visible = false;
		this.listeners = [];
		// Animation other than building: turntable, drive, clip (the model's own animation) or float.
		this.motion = this.cfg.motion || 'build';
		this.clock = 0;
		this.spin = 0;
		this.follow = { x: 0, y: 0, nx: 0, ny: 0 };

		if ( this.reduced ) {
			root.classList.add( 'rf3d--still' );
		}

		if ( this.cfg.mobilePoster && window.matchMedia( '(max-width: 767px)' ).matches ) {
			this.showPoster();

			return;
		}

		if ( 'media' === this.cfg.source && ! this.cfg.model ) {
			this.say( this.cfg.editor ? TEXT.noModel : '' );
			this.root.classList.add( 'rf3d--empty' );

			return;
		}

		this.observe();
	}

	say( text ) {
		if ( this.status ) {
			this.status.textContent = text;
		}
	}

	showPoster( message = '' ) {
		this.root.classList.add( 'rf3d--poster' );

		if ( this.poster ) {
			this.poster.hidden = false;
		} else {
			this.say( message );
		}
	}

	on( target, type, fn, options ) {
		target.addEventListener( type, fn, options );
		this.listeners.push( () => target.removeEventListener( type, fn, options ) );
	}

	/** Loads when the section is within a screen or so of the viewport; draws only while it is on screen. */
	observe() {
		this.io = new IntersectionObserver( ( entries ) => {
			for ( const entry of entries ) {
				this.visible = entry.isIntersecting;

				if ( this.visible && ! this.started ) {
					this.start();
				}

				if ( this.visible ) {
					this.kick();
				}
			}
		}, { rootMargin: '100% 0px' } );
		this.io.observe( this.root );
	}

	start() {
		this.started = true;

		try {
			this.renderer = new WebGLRenderer( { canvas: this.canvas, antialias: true, alpha: true, powerPreference: 'high-performance' } );
		} catch ( e ) {
			this.showPoster( TEXT.noWebgl );

			return;
		}

		const small = window.matchMedia( '(max-width: 767px)' ).matches;
		this.renderer.setPixelRatio( Math.min( window.devicePixelRatio || 1, small ? 1.5 : 2 ) );
		this.renderer.outputColorSpace = SRGBColorSpace;
		this.renderer.toneMapping = ACESFilmicToneMapping;
		this.renderer.shadowMap.enabled = !! this.cfg.shadows;
		this.renderer.shadowMap.type = PCFSoftShadowMap;
		this.scene = new Scene();
		this.camera = new PerspectiveCamera( 35, 1, 0.05, 2000 );
		this.light( small );
		this.say( TEXT.loading );
		this.root.classList.add( 'rf3d--loading' );

		this.load().then( ( model ) => {
			if ( this.disposed ) {
				return;
			}

			this.root.classList.remove( 'rf3d--loading' );
			this.say( '' );
			this.prepare( model );
			this.bind();
			this.kick();
		} ).catch( () => {
			this.root.classList.remove( 'rf3d--loading' );
			this.showPoster( TEXT.failed );
		} );
	}

	load() {
		if ( 'sample' === this.cfg.source ) {
			return Promise.resolve( sampleHouse() );
		}

		return new GLTFLoader().loadAsync( this.cfg.model ).then( ( gltf ) => {
			this.clips = gltf.animations || [];

			return gltf.scene;
		} );
	}

	light( small ) {
		const preset = LIGHTS[ this.cfg.light ] || LIGHTS.daylight;
		const pmrem = new PMREMGenerator( this.renderer );
		this.scene.environment = pmrem.fromScene( new RoomEnvironment(), 0.04 ).texture;
		this.scene.environmentIntensity = preset.env;
		pmrem.dispose();
		this.hemi = new HemisphereLight( preset.sky, preset.ground, preset.hemi );
		this.scene.add( this.hemi );
		this.sun = new DirectionalLight( preset.sun, preset.power );
		this.sunDir = new Vector3( ...preset.dir ).normalize();
		this.sun.castShadow = !! this.cfg.shadows;
		this.sun.shadow.mapSize.set( small ? 1024 : 2048, small ? 1024 : 2048 );
		this.sun.shadow.bias = -0.0004;
		this.sun.shadow.normalBias = 0.02;
		this.scene.add( this.sun, this.sun.target );
	}

	/**
	 * Switches the light (Day / Dusk buttons) without rebuilding the scene.
	 *
	 * @param {string} name daylight, studio or dusk.
	 */
	setLight( name ) {
		const preset = LIGHTS[ name ] || LIGHTS.daylight;
		this.hemi.color.set( preset.sky );
		this.hemi.groundColor.set( preset.ground );
		this.hemi.intensity = preset.hemi;
		this.sun.color.set( preset.sun );
		this.sun.intensity = preset.power;
		this.sunDir.set( ...preset.dir ).normalize();
		this.scene.environmentIntensity = preset.env;

		if ( this.center ) {
			this.sun.position.copy( this.center ).addScaledVector( this.sunDir, this.radius * 3 );
		}

		this.root.dataset.rf3dLighting = name;
		this.kick();
	}

	/**
	 * Measures the model, frames it, and gives every mesh its start offset and its place in the timeline.
	 * @param {Object3D} model The loaded model.
	 */
	prepare( model ) {
		this.scene.add( model );
		model.updateMatrixWorld( true );
		const box = new Box3().setFromObject( model );
		this.center = box.getCenter( new Vector3() );
		this.radius = Math.max( 0.001, box.getSize( new Vector3() ).length() / 2 );
		const reach = this.cfg.distance * this.radius * 2;
		const parts = [];
		let index = 0;

		model.traverse( ( object ) => {
			if ( ! object.isMesh ) {
				return;
			}

			const names = [];

			for ( let o = object; o && o !== this.scene; o = o.parent ) {
				if ( o.name ) {
					names.push( o.name );
				}
			}

			// Stages can also name a material ("Glass"): stages filled from the model by material use that.
			( Array.isArray( object.material ) ? object.material : [ object.material ] ).forEach( ( m ) => m && m.name && names.push( m.name ) );

			const own = new Box3().setFromObject( object );
			const at = own.getCenter( new Vector3() );
			const away = this.direction( at );
			const world = object.getWorldPosition( new Vector3() );
			const parent = object.parent;
			const offset = parent.worldToLocal( world.clone().addScaledVector( away, reach ) ).sub( parent.worldToLocal( world.clone() ) );
			// Parts view: every part moves straight out from the middle of the model.
			const out = new Vector3().subVectors( at, this.center );
			out.y = Math.max( out.y, 0 ) * 1.4;
			const spread = parent.worldToLocal( world.clone().addScaledVector( out.lengthSq() < 1e-6 ? new Vector3( 0, 1, 0 ) : out, this.cfg.spread || 0.8 ) ).sub( parent.worldToLocal( world.clone() ) );
			const materials = ( Array.isArray( object.material ) ? object.material : [ object.material ] ).map( ( m ) => m.clone() );
			object.material = Array.isArray( object.material ) ? materials : materials[ 0 ];
			object.castShadow = !! this.cfg.shadows;
			object.receiveShadow = !! this.cfg.shadows;

			parts.push( {
				names: names.length ? names : [ '' ],
				bottom: own.min.y,
				index: index++,
				mesh: object,
				home: object.position.clone(),
				offset,
				spread,
				materials: materials.map( ( m ) => ( { m, opacity: m.opacity, transparent: m.transparent, depthWrite: m.depthWrite } ) ),
			} );
		} );

		this.model = model;
		this.modelHome = model.position.clone();
		this.size = box.getSize( new Vector3() );
		this.prepareMotion( parts );

		const steps = assignStages( parts, this.cfg.stages, this.cfg.order );
		this.timeline = schedule( steps, this.cfg.overlap, this.cfg.hold );
		this.byStage = steps.length === ( this.cfg.stages || [] ).length;
		steps.forEach( ( stepParts, i ) => stepParts.forEach( ( part ) => ( part.stage = i ) ) );
		this.root.dataset.rf3dParts = String( parts.length );

		if ( this.cfg.shadows ) {
			const ground = new Mesh( new PlaneGeometry( this.radius * 12, this.radius * 12 ), new ShadowMaterial( { opacity: 0.22 } ) );
			ground.rotation.x = -Math.PI / 2;
			ground.position.set( this.center.x, box.min.y - 0.002, this.center.z );
			ground.receiveShadow = true;
			this.scene.add( ground );
			const cam = this.sun.shadow.camera;
			// Wide enough for the long shadows of a low sun (Dusk) and of the spread-out parts.
			cam.left = cam.bottom = -this.radius * 2.6;
			cam.right = cam.top = this.radius * 2.6;
			cam.near = 0.1;
			cam.far = this.radius * 6;
			cam.updateProjectionMatrix();
		}

		this.sun.position.copy( this.center ).addScaledVector( this.sunDir, this.radius * 3 );
		this.sun.target.position.copy( this.center );
		this.resize();
	}

	/**
	 * Drive: the wheels (parts named like the Wheels setting) spin around their thinnest side while the model rolls in
	 * along its length. Clip: the model's own animation (by name, else the first). Follow cursor "head": the first
	 * part or bone named like a head.
	 *
	 * @param {Array} parts The meshes of the model.
	 */
	prepareMotion( parts ) {
		if ( 'drive' === this.motion ) {
			const isWheel = nameMatcher( String( this.cfg.wheels || '' ).split( ',' ) );
			// Along the model's long side; from the left or the right of the first view.
			this.driveAxis = this.size.x >= this.size.z ? new Vector3( 1, 0, 0 ) : new Vector3( 0, 0, 1 );
			this.wheels = parts.filter( ( p ) => p.names.some( isWheel ) ).map( ( p ) => {
				const mesh = p.mesh;
				const own = new Box3().setFromObject( mesh );
				const dims = own.getSize( new Vector3() );
				let thin = dims.y <= dims.z ? 'y' : 'z';

				if ( dims.x <= dims.y && dims.x <= dims.z ) {
					thin = 'x';
				}

				const axis = new Vector3( 'x' === thin ? 1 : 0, 'y' === thin ? 1 : 0, 'z' === thin ? 1 : 0 );
				const parentTurn = mesh.parent.getWorldQuaternion( new Quaternion() ).invert();
				const pivot = mesh.parent.worldToLocal( own.getCenter( new Vector3() ) );

				return {
					mesh,
					axis: axis.applyQuaternion( parentTurn ).normalize(),
					pivot,
					quat: mesh.quaternion.clone(),
					radius: Math.max( 0.001, Math.max( ...[ 'x', 'y', 'z' ].filter( ( k ) => k !== thin ).map( ( k ) => dims[ k ] ) ) / 2 ),
				};
			} );
			this.root.dataset.rf3dWheels = String( this.wheels.length );
		}

		if ( 'clip' === this.motion && this.clips && this.clips.length ) {
			const wanted = String( this.cfg.clip || '' ).trim().toLowerCase();
			const clip = this.clips.find( ( c ) => wanted && c.name.toLowerCase() === wanted ) || this.clips.find( ( c ) => wanted && c.name.toLowerCase().includes( wanted ) ) || this.clips[ 0 ];
			this.mixer = new AnimationMixer( this.model );
			this.action = this.mixer.clipAction( clip );
			this.action.play();
			this.root.dataset.rf3dClip = clip.name;
		}

		if ( 'head' === this.cfg.follow ) {
			this.model.traverse( ( o ) => {
				if ( ! this.head && /head/i.test( o.name ) && ! /headlight|header/i.test( o.name ) ) {
					this.head = o;
					this.headQuat = o.quaternion.clone();
				}
			} );
		}
	}

	/**
	 * The whole model's own movement for the animations other than building, at scroll progress p.
	 *
	 * @param {number} progress 0 to 1.
	 * @return {number} Extra turn of the view, in degrees.
	 */
	moveModel( progress ) {
		if ( ! this.model ) {
			return 0;
		}

		this.model.position.copy( this.modelHome );

		if ( 'turntable' === this.motion ) {
			return progress * ( this.cfg.turns || 1 ) * 360;
		}

		if ( 'drive' === this.motion ) {
			// Rolls in during the first 60 % of the scroll, then the view turns around it.
			const arrive = EASINGS.out( MathUtils.clamp( progress / 0.6, 0, 1 ) );
			const length = Math.max( this.size.x, this.size.z );
			const travel = ( 1 - arrive ) * length * 2.4;
			const side = 'right' === this.cfg.driveFrom ? 1 : -1;
			this.model.position.addScaledVector( this.driveAxis, side * travel );
			this.root.dataset.rf3dTravel = travel.toFixed( 2 );

			for ( const w of this.wheels || [] ) {
				const turn = new Quaternion().setFromAxisAngle( w.axis, side * travel / w.radius );
				w.mesh.quaternion.copy( turn ).multiply( w.quat );
			}

			return 0;
		}

		if ( 'float' === this.motion ) {
			this.model.position.y += Math.sin( this.clock * 1.6 ) * this.radius * 0.035;

			return this.clock * 10;
		}

		if ( this.action && 'scroll' === this.cfg.clipPlay ) {
			this.action.time = progress * this.action.getClip().duration * 0.999;
			this.mixer.update( 0 );
		}

		return 0;
	}

	/**
	 * Where a part comes from, as a unit vector from its place.
	 * @param {Vector3} at The centre of the part.
	 */
	direction( at ) {
		const v = new Vector3();

		if ( 'drop' === this.cfg.from ) {
			return v.set( 0, 1, 0 );
		}

		v.subVectors( at, this.center );

		if ( 'sides' === this.cfg.from ) {
			v.y = 0;
		}

		return v.lengthSq() < 1e-6 ? v.set( 1, 0.2, 0 ).normalize() : v.normalize();
	}

	bind() {
		const update = () => this.kick();
		this.on( window, 'scroll', update, { passive: true } );
		this.on( window, 'resize', () => {
			this.resize();
			this.kick();
		} );

		// Drag to turn: sideways always; up and down too in the Parts and Aerial views (mouse and pen only, so a
		// vertical swipe on a phone still scrolls the page).
		// Grab to rotate: at any time, in any direction with a mouse, and it keeps turning a little after letting go.
		let from = null;
		this.on( this.canvas, 'pointerdown', ( e ) => {
			if ( this.canTurn() ) {
				from = { x: e.clientX, y: e.clientY, v: 0, orbit: ( 'build' !== this.view || !! this.cfg.grab ) && 'touch' !== e.pointerType };
				this.spin = 0;
				this.canvas.setPointerCapture( e.pointerId );
				this.root.classList.add( 'rf3d--grabbing' );
			}
		} );
		this.on( this.canvas, 'pointermove', ( e ) => {
			if ( null !== from ) {
				const dx = ( e.clientX - from.x ) * 0.35;
				this.yaw -= dx;
				from.v = dx;

				if ( from.orbit ) {
					this.pitch = MathUtils.clamp( this.pitch + ( ( e.clientY - from.y ) * 0.3 ), -60, 60 );
				}

				from.x = e.clientX;
				from.y = e.clientY;
				this.kick();
			}
		} );
		const release = () => {
			if ( from && this.cfg.grab && ! this.reduced ) {
				this.spin = from.v;
			}

			from = null;
			this.root.classList.remove( 'rf3d--grabbing' );
			this.kick();
		};
		this.on( this.canvas, 'pointerup', release );
		this.on( this.canvas, 'pointercancel', release );

		// Follow the cursor: the model (or its head) turns toward the pointer while it is over the scene.
		if ( this.cfg.follow && ! this.reduced ) {
			this.on( this.root, 'pointermove', ( e ) => {
				if ( 'touch' === e.pointerType ) {
					return;
				}

				const r = this.root.getBoundingClientRect();
				const stage = this.root.querySelector( '.rf3d-stage' );
				const view = stage ? stage.getBoundingClientRect() : r;
				this.follow.x = MathUtils.clamp( ( ( e.clientX - view.left ) / ( view.width || 1 ) * 2 ) - 1, -1, 1 );
				this.follow.y = MathUtils.clamp( ( ( e.clientY - view.top ) / ( view.height || 1 ) * 2 ) - 1, -1, 1 );
				this.kick();
			} );
			this.on( this.root, 'pointerleave', () => {
				this.follow.x = 0;
				this.follow.y = 0;
				this.kick();
			} );
		}
		this.bindTools();
		this.bindStages();
	}

	/**
	 * The stage names under the progress line. In Build a name scrolls the page to where that stage is finished; in
	 * Parts and Aerial it picks that stage's parts out (the others fade) and shows its caption; again to clear.
	 */
	bindStages() {
		const nav = this.root.querySelector( '.rf3d-progress' );

		if ( ! nav ) {
			return;
		}

		this.on( nav, 'click', ( e ) => {
			const button = e.target.closest( '[data-rf3d-go]' );

			if ( ! button ) {
				return;
			}

			const index = Number( button.dataset.rf3dGo );

			if ( 'build' === this.view ) {
				this.scrollToStage( index );
				return;
			}

			this.focus = this.focus === index || ! this.byStage ? null : index;
			nav.querySelectorAll( '[data-rf3d-go]' ).forEach( ( b ) => b.setAttribute( 'aria-pressed', String( Number( b.dataset.rf3dGo ) === this.focus ) ) );
			this.root.classList.toggle( 'rf3d--focus', null !== this.focus );
			this.captionKey = null;
			this.kick();
		} );
	}

	/**
	 * Where a stage is finished, as a share of the scroll through the section.
	 *
	 * @param {number} index The stage.
	 * @return {number} 0 to 1.
	 */
	stageEnd( index ) {
		if ( this.byStage && this.timeline.steps[ index ] ) {
			return this.timeline.steps[ index ].end;
		}

		const count = Math.max( this.caps.length, this.steps.length, 1 );

		return ( ( index + 1 ) * ( 1 - this.cfg.hold ) ) / count;
	}

	scrollToStage( index ) {
		const stage = this.root.querySelector( '.rf3d-stage' );
		const rect = this.root.getBoundingClientRect();
		const room = this.root.offsetHeight - ( stage ? stage.offsetHeight : window.innerHeight );
		const top = window.scrollY + rect.top + ( Math.min( 1, this.stageEnd( index ) ) * Math.max( 0, room ) );

		window.scrollTo( { top: Math.round( top ), behavior: this.reduced ? 'auto' : 'smooth' } );
	}

	canTurn() {
		return !! this.cfg.grab || 'build' !== this.view || ( this.cfg.drag && this.shown >= 0.999 );
	}

	/** The view buttons: Build, Parts, Aerial, Auto-rotate, Day and Dusk. */
	bindTools() {
		const tools = this.root.querySelector( '.rf3d-tools' );

		if ( ! tools ) {
			return;
		}

		const press = ( selector, on ) => tools.querySelectorAll( selector ).forEach( ( b ) => b.setAttribute( 'aria-pressed', on( b ) ? 'true' : 'false' ) );

		this.on( tools, 'click', ( e ) => {
			const button = e.target.closest( 'button' );

			if ( ! button ) {
				return;
			}

			if ( button.dataset.rf3dView ) {
				this.setView( button.dataset.rf3dView );
				press( '[data-rf3d-view]', ( b ) => b.dataset.rf3dView === this.view );
			} else if ( button.dataset.rf3dLight ) {
				this.setLight( 'dusk' === button.dataset.rf3dLight ? 'dusk' : 'daylight' );
				press( '[data-rf3d-light]', ( b ) => b === button );
			} else if ( 'rotate' === button.dataset.rf3dToggle ) {
				this.rotating = ! this.rotating;
				button.setAttribute( 'aria-pressed', this.rotating ? 'true' : 'false' );
				this.kick();
			}
		} );
	}

	/**
	 * Build follows the scroll; Parts spreads the finished model out; Aerial looks at it from above.
	 *
	 * @param {string} view build, parts or aerial.
	 */
	setView( view ) {
		this.view = [ 'build', 'parts', 'aerial' ].indexOf( view ) > -1 ? view : 'build';
		this.pitch = 0;

		if ( 'build' === this.view && null !== this.focus ) {
			this.focus = null;
			this.root.classList.remove( 'rf3d--focus' );
			this.root.querySelectorAll( '[data-rf3d-go]' ).forEach( ( b ) => b.removeAttribute( 'aria-pressed' ) );
			this.captionKey = null;
		}
		this.root.dataset.rf3dView = this.view;
		this.root.classList.toggle( 'rf3d--free', 'build' !== this.view );
		this.kick();
	}

	resize() {
		if ( ! this.renderer ) {
			return;
		}

		const w = this.canvas.clientWidth || 1;
		const h = this.canvas.clientHeight || 1;
		this.renderer.setSize( w, h, false );
		this.camera.aspect = w / h;
		// Captions on a side: frame the model in the rest of the scene (wide screens only).
		const side = { left: -1, right: 1 }[ this.root.className.match( /rf3d-cap-(left|right)/ )?.[ 1 ] ] || 0;
		const shift = this.caps.length && w > 900 ? side * w * 0.14 : 0;
		// Captions at the bottom (always on phones): lift the model above them.
		const lift = this.caps.length && ( w <= 767 || this.root.classList.contains( 'rf3d-cap-bottom' ) ) ? h * 0.12 : 0;

		// Kept, and applied each frame: Parts and Aerial hide the captions, so the model moves back to the middle.
		this.frameOffset = { w, h, shift, lift };
		this.offsetCamera();

		if ( this.center ) {
			const vfov = MathUtils.degToRad( this.camera.fov );
			const hfov = 2 * Math.atan( Math.tan( vfov / 2 ) * this.camera.aspect );
			const fit = Math.min( vfov, hfov ) * ( shift ? 0.86 : 1 ) * ( lift ? 0.85 : 1 );
			this.distance = ( this.radius / Math.sin( fit / 2 ) ) * 0.8 / this.cfg.zoom;
		}

		this.dirty = true;
	}

	/** The progress the page asks for: the editor preview value, or how far the track has scrolled. */
	wanted() {
		if ( this.reduced ) {
			return 1;
		}

		if ( this.fixed() ) {
			return this.cfg.preview;
		}

		const rect = this.root.getBoundingClientRect();
		const stage = this.root.querySelector( '.rf3d-stage' );

		return scrollProgress( rect.top, rect.height, stage ? stage.offsetHeight : window.innerHeight );
	}

	/** The caption room (side shift, lift), fading out as the view leaves Build. */
	offsetCamera() {
		const { w, h, shift, lift } = this.frameOffset || {};
		const keep = 1 - this.free;

		if ( ( shift || lift ) && keep > 0.001 ) {
			this.camera.setViewOffset( w, h, shift * keep, lift * keep, w, h );
		} else {
			this.camera.clearViewOffset();
		}

		this.camera.updateProjectionMatrix();
	}

	/** The editor preview slider holds the build at one point. */
	fixed() {
		return null !== this.cfg.preview && undefined !== this.cfg.preview;
	}

	kick() {
		this.dirty = true;

		if ( ! this.raf && this.timeline ) {
			this.raf = requestAnimationFrame( () => this.frame() );
		}
	}

	frame() {
		this.raf = 0;

		if ( this.disposed || ! this.visible ) {
			return;
		}

		const now = performance.now();
		// Seconds since the last drawing (capped), so views move at the same speed on slow and fast screens.
		const dt = this.lastTime ? Math.min( 0.25, ( now - this.lastTime ) / 1000 ) : 1 / 60;
		this.lastTime = now;
		this.target = 'build' === this.view ? this.wanted() : 1;
		const goals = { explode: 'parts' === this.view ? 1 : 0, free: 'build' === this.view ? 0 : 1, elevation: MathUtils.clamp( ( 'aerial' === this.view ? 72 : this.cfg.elevation ) + this.pitch, 2, 88 ) };
		let moving = false;

		for ( const key of [ 'explode', 'free', 'elevation' ] ) {
			const gap = goals[ key ] - this[ key ];
			this[ key ] = Math.abs( gap ) < ( 'elevation' === key ? 0.1 : 0.002 ) ? goals[ key ] : this[ key ] + ( gap * ( 1 - Math.exp( -dt * 7 ) ) );
			moving = moving || this[ key ] !== goals[ key ];
		}

		// Auto-rotate turns the finished model (or any other view) slowly.
		if ( this.rotating && ( 'build' !== this.view || this.shown >= 0.999 ) ) {
			this.yaw += this.cfg.rotateSpeed * dt;
			moving = true;
		}

		// Animations that run by themselves: float, and a model's own animation played in a loop.
		if ( ! this.reduced && ( 'float' === this.motion || ( this.mixer && 'scroll' !== this.cfg.clipPlay ) ) ) {
			this.clock += dt;

			if ( this.mixer && 'scroll' !== this.cfg.clipPlay ) {
				this.mixer.update( dt * ( this.cfg.clipSpeed || 1 ) );
			}

			moving = true;
		}

		// After letting go of a grab, the turn slows down.
		if ( Math.abs( this.spin ) > 0.01 ) {
			this.yaw -= this.spin;
			this.spin *= Math.exp( -dt * 4 );
			moving = true;
		} else {
			this.spin = 0;
		}

		for ( const k of [ 'x', 'y' ] ) {
			const n = 'n' + k;
			const gap = this.follow[ k ] - this.follow[ n ];
			this.follow[ n ] = Math.abs( gap ) < 0.001 ? this.follow[ k ] : this.follow[ n ] + ( gap * ( 1 - Math.exp( -dt * 6 ) ) );
			moving = moving || this.follow[ n ] !== this.follow[ k ];
		}

		// Follow the scroll with a little smoothing; jump on the first drawing (a page opened halfway down), in the
		// editor preview, and when the difference is tiny.
		const diff = this.target - this.shown;
		const jump = ! this.drawn || this.fixed() || Math.abs( diff ) < 0.0005;
		this.shown = jump ? this.target : this.shown + ( diff * 0.2 );
		this.drawn = true;
		this.apply( this.shown );
		this.renderer.render( this.scene, this.camera );
		this.dirty = false;

		if ( this.shown !== this.target || moving ) {
			this.kick();
		} else {
			this.lastTime = 0;
		}
	}

	apply( progress ) {
		const ease = EASINGS[ this.cfg.easing ] || EASINGS.out;

		const building = 'build' === this.motion;

		for ( const item of this.timeline.parts ) {
			// Other animations show the whole model; the stages only drive the captions.
			const t = building ? partProgress( item, progress ) : 1;
			const e = ease( t );
			const { mesh, home, offset, spread } = item.part;
			mesh.visible = t > 0;
			mesh.position.copy( home ).addScaledVector( offset, 1 - e ).addScaledVector( spread, this.explode );
			// A picked stage (Parts and Aerial): its parts stay solid, the others are ghosted.
			const ghost = null !== this.focus && item.part.stage !== this.focus ? 0.12 : 1;
			mesh.castShadow = !! this.cfg.shadows && 1 === ghost;
			const fade = Math.min( 1, t * 3 ) * ghost;

			for ( const m of item.part.materials ) {
				m.m.opacity = m.opacity * fade;
				m.m.transparent = m.transparent || fade < 1;
				m.m.depthWrite = m.depthWrite && fade >= 1;
			}
		}

		const extra = building ? 0 : this.moveModel( progress );
		this.root.dataset.rf3dTurn = extra.toFixed( 1 );

		if ( this.model && ! building ) {
			this.root.dataset.rf3dLift = ( this.model.position.y - this.modelHome.y ).toFixed( 3 );
		}
		const strength = this.cfg.followStrength || 15;
		const fx = this.follow.nx * strength;
		const fy = this.follow.ny * strength * 0.5;
		const headTurn = this.head && 'head' === this.cfg.follow;

		if ( headTurn ) {
			const look = new Quaternion().setFromEuler( new Euler( MathUtils.degToRad( fy * 1.6 ), MathUtils.degToRad( fx * 1.8 ), 0, 'YXZ' ) );
			this.head.quaternion.copy( this.headQuat ).multiply( look );
		}

		const turn = this.reduced ? 1 : EASINGS.inout( Math.min( 1, progress / Math.max( 0.01, 1 - this.cfg.hold ) ) );
		const azimuth = MathUtils.degToRad( MathUtils.lerp( this.cfg.angleStart, this.cfg.angleEnd, turn ) + this.yaw + extra - ( headTurn ? 0 : fx ) );
		const elevation = MathUtils.degToRad( MathUtils.clamp( this.elevation + ( headTurn ? 0 : fy ), 2, 88 ) );
		// Pulled back while the parts are spread, so the whole spread-out model stays in view.
		const distance = this.distance * ( 1 + ( this.explode * ( this.cfg.spread || 0.8 ) * 0.9 ) );
		this.offsetCamera();
		this.camera.position.set(
			this.center.x + ( distance * Math.sin( azimuth ) * Math.cos( elevation ) ),
			this.center.y + ( distance * Math.sin( elevation ) ),
			this.center.z + ( distance * Math.cos( azimuth ) * Math.cos( elevation ) ),
		);
		this.camera.lookAt( this.center );
		this.caption( progress );
		this.root.dataset.rf3dProgress = progress.toFixed( 3 );
		this.root.dataset.rf3dExplode = this.explode.toFixed( 2 );
		this.root.dataset.rf3dElevation = this.elevation.toFixed( 1 );
		this.root.dataset.rf3dYaw = this.yaw.toFixed( 1 );
		this.root.dataset.rf3dFollow = this.follow.nx.toFixed( 2 );

		if ( this.action ) {
			this.root.dataset.rf3dClipTime = this.action.time.toFixed( 2 );
		}

		if ( this.head ) {
			this.root.dataset.rf3dHead = this.head.name;
		}
		this.root.dataset.rf3dFocus = null === this.focus ? '' : String( this.focus );
		this.root.classList.toggle( 'rf3d--done', this.canTurn() );
	}

	/**
	 * Shows the caption of the stage being built and marks the stages done so far.
	 * @param {number} progress The build progress, 0 to 1.
	 */
	caption( progress ) {
		const count = Math.max( this.caps.length, this.steps.length );

		if ( ! count ) {
			return;
		}

		const spans = this.byStage ? this.timeline.steps : Array.from( { length: count }, ( _, i ) => ( { start: ( i * ( 1 - this.cfg.hold ) ) / count } ) );
		const active = null !== this.focus ? this.focus : activeStep( spans, progress );
		const finished = progress >= 0.999;
		const key = active + ( finished ? '+' : '' );

		if ( key === this.captionKey ) {
			return;
		}

		this.captionKey = key;
		this.root.dataset.rf3dStep = String( active );
		this.caps.forEach( ( cap ) => cap.classList.toggle( 'is-active', Number( cap.dataset.rf3dCap ) === active ) );
		this.steps.forEach( ( step ) => {
			const i = Number( step.dataset.rf3dStep );
			step.classList.toggle( 'is-done', i < active || finished );
			step.classList.toggle( 'is-active', i === active );
		} );
	}

	dispose() {
		this.disposed = true;
		cancelAnimationFrame( this.raf );

		if ( this.io ) {
			this.io.disconnect();
		}

		this.listeners.forEach( ( off ) => off() );

		if ( this.scene ) {
			this.scene.traverse( ( o ) => {
				if ( o.geometry ) {
					o.geometry.dispose();
				}

				( Array.isArray( o.material ) ? o.material : [ o.material ] ).filter( Boolean ).forEach( ( m ) => {
					if ( m.map ) {
						m.map.dispose();
					}

					m.dispose();
				} );
			} );
		}

		if ( this.renderer ) {
			this.renderer.dispose();
			this.renderer.forceContextLoss();
		}
	}
}
