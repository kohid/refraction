import { scrollProgress } from './timeline.js';

const TEXT = {
	empty: 'Choose the frames or a video in the Media section.',
	failed: 'The sequence could not be loaded.',
};

/**
 * The order frames are loaded in: first and last, then every 16th, 8th, 4th... so a rough version plays early.
 *
 * @param {number} count The number of frames.
 * @return {number[]} Frame indexes.
 */
export function loadOrder( count ) {
	const order = [];
	const seen = new Set();
	const add = ( i ) => {
		if ( i >= 0 && i < count && ! seen.has( i ) ) {
			seen.add( i );
			order.push( i );
		}
	};

	add( 0 );
	add( count - 1 );

	for ( let step = 16; step >= 1; step = step / 2 ) {
		for ( let i = 0; i < count; i += step ) {
			add( i );
		}
	}

	return order;
}

/**
 * The frame to show for a progress: the sequence plays over the scroll before the pause on the last frame.
 *
 * @param {number} progress The scroll progress, 0 to 1.
 * @param {number} count    The number of frames.
 * @param {number} hold     Share of the scroll kept on the last frame.
 * @return {number} The frame index.
 */
export function frameAt( progress, count, hold ) {
	const share = Math.min( 1, progress / Math.max( 0.01, 1 - hold ) );

	return Math.round( share * ( count - 1 ) );
}

/**
 * Where to draw a picture of w x h in a box of W x H to fill it (cover) or show it whole (contain).
 *
 * @param {number} w   Picture width.
 * @param {number} h   Picture height.
 * @param {number} W   Box width.
 * @param {number} H   Box height.
 * @param {string} fit cover or contain.
 * @return {number[]} x, y, width and height.
 */
export function fitRect( w, h, W, H, fit ) {
	const scale = 'contain' === fit ? Math.min( W / w, H / h ) : Math.max( W / w, H / h );
	const dw = w * scale;
	const dh = h * scale;

	return [ ( W - dw ) / 2, ( H - dh ) / 2, dw, dh ];
}

/**
 * One Scroll Sequence: plays image frames (drawn on a canvas, loaded progressively) or a video (seeked) as the page
 * scrolls through the pinned section, and shows each text overlay between its two points.
 */
export class ScrollSequence {
	constructor( root ) {
		this.root = root;
		this.cfg = JSON.parse( root.dataset.rfseq || '{}' );
		this.canvas = root.querySelector( '.rfseq-canvas' );
		this.ctx = this.canvas.getContext( '2d' );
		this.video = root.querySelector( '.rfseq-video' );
		this.poster = root.querySelector( '.rfseq-poster' );
		this.status = root.querySelector( '.rf3d-status' );
		this.overlays = [ ...root.querySelectorAll( '.rfseq-overlay' ) ];
		this.bar = root.querySelector( '.rfseq-bar span' );
		this.images = [];
		this.listeners = [];
		this.shown = 0;
		this.drawn = false;

		const reduced = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
		const phone = this.cfg.mobilePoster && window.matchMedia( '(max-width: 767px)' ).matches;

		if ( reduced || phone ) {
			this.still();

			return;
		}

		if ( ! this.cfg.frames.length && ! this.video ) {
			this.say( this.cfg.editor ? TEXT.empty : '' );
			root.classList.add( 'rf3d--empty' );

			return;
		}

		this.io = new IntersectionObserver( ( entries ) => {
			this.visible = entries.some( ( e ) => e.isIntersecting );

			if ( this.visible && ! this.started ) {
				this.start();
			}

			this.kick();
		}, { rootMargin: '100% 0px' } );
		this.io.observe( root );
	}

	say( text ) {
		if ( this.status ) {
			this.status.textContent = text;
		}
	}

	/** Reduced motion or the phone option: the still image and every overlay as plain text, one after another. */
	still() {
		this.root.classList.add( 'rf3d--still', 'rfseq--still' );

		if ( this.poster ) {
			this.poster.hidden = false;
		}

		this.overlays.forEach( ( o ) => o.classList.add( 'is-visible' ) );
		this.root.dataset.rfseqProgress = '1.000';
	}

	on( target, type, fn, options ) {
		target.addEventListener( type, fn, options );
		this.listeners.push( () => target.removeEventListener( type, fn, options ) );
	}

	start() {
		this.started = true;
		this.on( window, 'scroll', () => this.kick(), { passive: true } );
		this.on( window, 'resize', () => {
			this.resize();
			this.kick();
		} );
		this.resize();

		if ( this.video ) {
			this.on( this.video, 'loadeddata', () => this.kick() );
			this.on( this.video, 'seeked', () => {
				this.seeking = false;
				this.paint( this.video, this.video.videoWidth, this.video.videoHeight );
				this.kick();
			} );
			this.on( this.video, 'error', () => this.say( TEXT.failed ) );
			this.loadVideo();

			return;
		}

		this.loaded = 0;
		loadOrder( this.cfg.frames.length ).forEach( ( i ) => {
			const img = new Image();
			img.decoding = 'async';
			img.onload = () => {
				this.images[ i ] = img;
				this.loaded++;
				this.root.dataset.rfseqLoaded = String( this.loaded );
				this.kick();
			};
			img.onerror = () => {
				this.loaded++;
			};
			img.src = this.cfg.frames[ i ];
		} );
	}

	/**
	 * Downloads the whole video once and plays it from memory: seeking is then instant and works even where the server
	 * does not answer range requests. If the download fails (another site without CORS), the address is used directly.
	 */
	loadVideo() {
		const url = this.cfg.video;
		const direct = () => {
			this.video.preload = 'auto';
			this.video.src = url;
		};

		fetch( url, { credentials: 'same-origin' } )
			.then( ( response ) => ( response.ok ? response.blob() : Promise.reject( new Error( String( response.status ) ) ) ) )
			.then( ( blob ) => {
				if ( this.disposed ) {
					return;
				}

				this.blobUrl = URL.createObjectURL( blob );
				this.video.preload = 'auto';
				this.video.src = this.blobUrl;
			} )
			.catch( direct );
	}

	resize() {
		const ratio = Math.min( window.devicePixelRatio || 1, 2 );
		this.canvas.width = Math.max( 1, Math.round( this.canvas.clientWidth * ratio ) );
		this.canvas.height = Math.max( 1, Math.round( this.canvas.clientHeight * ratio ) );
		this.last = null;
	}

	kick() {
		if ( ! this.raf && this.started && ! this.disposed ) {
			this.raf = requestAnimationFrame( () => this.frame() );
		}
	}

	wanted() {
		if ( null !== this.cfg.preview && undefined !== this.cfg.preview ) {
			return this.cfg.preview;
		}

		const rect = this.root.getBoundingClientRect();
		const stage = this.root.querySelector( '.rf3d-stage' );

		return scrollProgress( rect.top, rect.height, stage ? stage.offsetHeight : window.innerHeight );
	}

	frame() {
		this.raf = 0;

		if ( ! this.visible ) {
			return;
		}

		const target = this.wanted();
		const diff = target - this.shown;
		this.shown = ! this.drawn || null !== this.cfg.preview || Math.abs( diff ) < 0.0005 ? target : this.shown + ( diff * 0.25 );
		this.drawn = true;
		this.show( this.shown );

		if ( this.shown !== target ) {
			this.kick();
		}
	}

	show( progress ) {
		this.root.dataset.rfseqProgress = progress.toFixed( 3 );
		let side = '';
		this.overlays.forEach( ( o ) => {
			const on = progress >= Number( o.dataset.from ) && progress <= Number( o.dataset.to );
			o.classList.toggle( 'is-visible', on );
			side = side || ( on ? o.dataset.place : '' );
		} );

		if ( side ) {
			this.root.dataset.rfseqSide = side;
		} else {
			delete this.root.dataset.rfseqSide;
		}

		if ( this.bar ) {
			this.bar.style.transform = `scaleX(${ progress })`;
		}

		if ( this.video ) {
			this.seek( progress );

			return;
		}

		const count = this.cfg.frames.length;
		const want = frameAt( progress, count, this.cfg.hold );
		const index = this.nearest( want );

		if ( index < 0 ) {
			return;
		}

		this.root.dataset.rfseqFrame = String( index );

		if ( index !== this.last ) {
			this.last = index;
			const img = this.images[ index ];
			this.paint( img, img.naturalWidth, img.naturalHeight );
		}
	}

	/**
	 * The loaded frame closest to the one wanted, looking back first (no frame yet: -1).
	 *
	 * @param {number} want The frame index wanted.
	 * @return {number} A loaded frame index, or -1.
	 */
	nearest( want ) {
		for ( let d = 0; d < this.cfg.frames.length; d++ ) {
			if ( this.images[ want - d ] ) {
				return want - d;
			}

			if ( this.images[ want + d ] ) {
				return want + d;
			}
		}

		return -1;
	}

	seek( progress ) {
		const duration = this.video.duration;

		if ( ! duration || ! Number.isFinite( duration ) ) {
			return;
		}

		const time = Math.min( 1, progress / Math.max( 0.01, 1 - this.cfg.hold ) ) * Math.max( 0, duration - 0.05 );

		if ( this.seeking || Math.abs( time - this.video.currentTime ) < 0.01 ) {
			if ( ! this.drawn2 && this.video.readyState >= 2 ) {
				this.drawn2 = true;
				this.paint( this.video, this.video.videoWidth, this.video.videoHeight );
			}

			return;
		}

		this.seeking = true;
		this.video.currentTime = time;
		this.root.dataset.rfseqTime = time.toFixed( 2 );
	}

	paint( source, w, h ) {
		if ( ! w || ! h ) {
			return;
		}

		const { width, height } = this.canvas;
		this.ctx.fillStyle = getComputedStyle( this.root.querySelector( '.rf3d-stage' ) ).backgroundColor || '#111';
		this.ctx.fillRect( 0, 0, width, height );
		this.ctx.drawImage( source, ...fitRect( w, h, width, height, this.cfg.fit ) );
	}

	dispose() {
		this.disposed = true;
		cancelAnimationFrame( this.raf );

		if ( this.io ) {
			this.io.disconnect();
		}

		this.listeners.forEach( ( off ) => off() );
		this.images = [];

		if ( this.blobUrl ) {
			URL.revokeObjectURL( this.blobUrl );
		}
	}
}
