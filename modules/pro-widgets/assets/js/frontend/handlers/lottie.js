/**
 * Lottie: loads the bundled player and the animation JSON only when the widget is close to the viewport,
 * then plays it as configured (as it loads, while in view, on hover, on click or tied to the scroll position).
 */
let libPromise = null;

function loadLibrary( url ) {
	if ( window.lottie ) {
		return Promise.resolve( window.lottie );
	}

	if ( ! libPromise ) {
		libPromise = new Promise( ( resolve, reject ) => {
			const script = document.createElement( 'script' );

			script.src = url;
			script.async = true;
			script.onload = () => resolve( window.lottie );
			script.onerror = () => {
				libPromise = null;
				reject( new Error( 'lottie player not available' ) );
			};
			document.head.appendChild( script );
		} );
	}

	return libPromise;
}

export default class Lottie extends refractionModules.frontend.handlers.Base {
	getDefaultSettings() {
		return { selectors: { box: '.refraction-lottie' } };
	}

	getDefaultElements() {
		return { $box: this.$element.find( this.getSettings( 'selectors.box' ) ) };
	}

	onInit() {
		super.onInit();

		const box = this.elements.$box[ 0 ];

		if ( ! box || ! box.dataset.src ) {
			return;
		}

		this.reduceMotion = window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

		if ( 'IntersectionObserver' in window ) {
			// Start loading shortly before the animation is visible.
			this.loader = new IntersectionObserver( ( entries ) => {
				if ( entries.some( ( entry ) => entry.isIntersecting ) ) {
					this.loader.disconnect();
					this.load();
				}
			}, { rootMargin: '300px 0px' } );
			this.loader.observe( box );
		} else {
			this.load();
		}
	}

	async load() {
		const box = this.elements.$box[ 0 ];

		try {
			const [ lottie, response ] = await Promise.all( [ loadLibrary( box.dataset.lib ), fetch( box.dataset.src ) ] );

			if ( ! response.ok ) {
				throw new Error( 'animation not found' );
			}

			const data = await response.json();

			// An earlier render of the same widget (editor) may have replaced the node meanwhile.
			if ( ! box.isConnected ) {
				return;
			}

			box.textContent = '';
			this.animation = lottie.loadAnimation( {
				container: box,
				renderer: 'svg',
				loop: false,
				autoplay: false,
				animationData: data,
				rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
			} );
		} catch ( e ) {
			box.dataset.state = 'error';
			return;
		}

		box.dataset.state = 'ready';
		this.setup();
	}

	setup() {
		const box = this.elements.$box[ 0 ],
			anim = this.animation,
			trigger = box.dataset.trigger,
			speed = Number( box.dataset.speed ) || 1,
			direction = 'yes' === box.dataset.reverse ? -1 : 1,
			loop = 'yes' === box.dataset.loop;

		anim.setSpeed( speed );
		anim.setDirection( direction );
		anim.loop = loop;

		const rewindToStart = () => anim.goToAndStop( direction < 0 ? anim.totalFrames - 1 : 0, true );
		const play = () => anim.play();

		rewindToStart();

		if ( 'scroll' === trigger ) {
			this.bindScroll();
			return;
		}

		if ( 'click' === trigger ) {
			const toggle = () => {
				if ( anim.isPaused ) {
					anim.goToAndPlay( anim.currentFrame >= anim.totalFrames - 1 ? 0 : anim.currentFrame, true );
					play();
				} else {
					anim.pause();
				}
				box.setAttribute( 'aria-pressed', anim.isPaused ? 'false' : 'true' );
			};

			anim.addEventListener( 'complete', () => box.setAttribute( 'aria-pressed', 'false' ) );
			box.addEventListener( 'click', toggle );
			box.addEventListener( 'keydown', ( event ) => {
				if ( 'Enter' === event.key || ' ' === event.key ) {
					event.preventDefault();
					toggle();
				}
			} );
			return;
		}

		if ( 'hover' === trigger ) {
			const leave = box.dataset.hoverLeave;

			box.addEventListener( 'mouseenter', play );
			box.addEventListener( 'mouseleave', () => {
				if ( 'pause' === leave ) {
					anim.pause();
				} else if ( 'stop' === leave ) {
					rewindToStart();
				}
			} );
			return;
		}

		// Visitors who prefer less motion get the first frame; click and hover above still let them choose to play.
		if ( this.reduceMotion ) {
			return;
		}

		if ( 'autoplay' === trigger ) {
			play();
			return;
		}

		this.watcher = new IntersectionObserver( ( entries ) => {
			entries.forEach( ( entry ) => ( entry.isIntersecting ? play() : anim.pause() ) );
		}, { threshold: 0.2 } );
		this.watcher.observe( box );
	}

	bindScroll() {
		const box = this.elements.$box[ 0 ],
			anim = this.animation;

		this.onScroll = () => {
			const rect = box.getBoundingClientRect(),
				travel = window.innerHeight + rect.height,
				progress = Math.min( 1, Math.max( 0, ( window.innerHeight - rect.top ) / travel ) );

			anim.goToAndStop( progress * ( anim.totalFrames - 1 ), true );
		};

		window.addEventListener( 'scroll', this.onScroll, { passive: true } );
		window.addEventListener( 'resize', this.onScroll );
		this.onScroll();
	}

	onDestroy() {
		super.onDestroy();

		this.loader?.disconnect();
		this.watcher?.disconnect();

		if ( this.onScroll ) {
			window.removeEventListener( 'scroll', this.onScroll );
			window.removeEventListener( 'resize', this.onScroll );
		}

		this.animation?.destroy();
	}
}
