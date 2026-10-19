/**
 * Animated Headline.
 * Rotating types swap the phrase list one by one (typing types it out); highlight types draw a shape
 * when the headline scrolls into view. With "reduce motion" nothing moves: the first phrase stays and
 * shapes are drawn at once.
 */
const HIGHLIGHT_TYPES = [ 'highlight', 'underline', 'circle', 'strikethrough' ];
const LETTER_TYPES = [ 'swirl', 'blinds', 'drop-in', 'wave' ];

export default class AnimatedHeadline extends refractionModules.frontend.handlers.Base {
	getDefaultSettings() {
		return {
			selectors: {
				root: '.refraction-headline',
				dynamic: '.refraction-headline__dynamic',
				word: '.refraction-headline__word',
			},
		};
	}

	getDefaultElements() {
		const selectors = this.getSettings( 'selectors' );

		return {
			$root: this.$element.find( selectors.root ),
			$dynamic: this.$element.find( selectors.dynamic ),
			$words: this.$element.find( selectors.word ),
		};
	}

	onInit() {
		super.onInit();

		this.timers = [];
		this.stopped = false;
		this.type = this.getElementSettings( 'animation_type' );
		this.delay = Math.max( 200, Number( this.getElementSettings( 'animation_delay' ) ) || 2500 );
		this.typingSpeed = Math.max( 10, Number( this.getElementSettings( 'typing_speed' ) ) || 90 );
		this.loop = 'yes' === this.getElementSettings( 'loop' );
		this.reduceMotion = !! ( window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches );

		if ( ! this.elements.$root.length || ! this.elements.$dynamic.length ) {
			return;
		}

		if ( HIGHLIGHT_TYPES.includes( this.type ) ) {
			this.initHighlight();
		} else {
			this.initRotation();
		}
	}

	onDestroy() {
		super.onDestroy();
		this.stopped = true;
		this.timers.forEach( ( id ) => window.clearTimeout( id ) );

		if ( this.observer ) {
			this.observer.disconnect();
		}
	}

	later( fn, ms ) {
		const id = window.setTimeout( () => {
			if ( ! this.stopped ) {
				fn();
			}
		}, ms );

		this.timers.push( id );
	}

	/* --------------------------------------------------------------- highlight */
	initHighlight() {
		const root = this.elements.$root;

		if ( this.reduceMotion || ! ( 'IntersectionObserver' in window ) ) {
			root.addClass( 'is-drawn' );
			return;
		}

		const draw = () => {
			root.addClass( 'is-drawn' );

			if ( this.loop ) {
				this.later( () => {
					root.removeClass( 'is-drawn' );
					this.later( draw, 700 );
				}, this.delay );
			}
		};

		this.observer = new IntersectionObserver( ( entries ) => {
			if ( entries.some( ( entry ) => entry.isIntersecting ) ) {
				this.observer.disconnect();
				this.later( draw, 300 );
			}
		}, { threshold: 0.3 } );
		this.observer.observe( root[ 0 ] );
	}

	/* --------------------------------------------------------------- rotation */
	initRotation() {
		this.words = this.elements.$words.toArray();
		this.texts = this.words.map( ( word ) => word.textContent );
		this.index = 0;

		if ( ! this.reduceMotion ) {
			this.reserveWidth();
		}

		if ( this.reduceMotion || this.words.length < 2 ) {
			return;
		}

		if ( 'typing' === this.type ) {
			// The first phrase is already printed; after its time it is erased and the next one is typed.
			this.later( () => this.eraseWord( 0 ), this.delay );
		} else {
			this.later( () => this.rotate(), this.delay );
		}
	}

	/** Keep the line from jumping: reserve the width of the longest phrase (not for typing). */
	reserveWidth() {
		if ( 'typing' === this.type ) {
			return;
		}

		const apply = () => {
			let widest = 0;

			this.words.forEach( ( word ) => {
				const wasActive = word.classList.contains( 'is-active' );

				word.style.display = 'inline-block';
				widest = Math.max( widest, word.getBoundingClientRect().width );
				word.style.display = '';

				if ( ! wasActive ) {
					word.classList.remove( 'is-active' );
				}
			} );

			this.elements.$dynamic[ 0 ].style.minWidth = widest ? `${ Math.ceil( widest ) }px` : '';
		};

		apply();

		if ( document.fonts && document.fonts.ready ) {
			document.fonts.ready.then( () => ! this.stopped && apply() );
		}
	}

	setActive( index ) {
		this.words.forEach( ( word, i ) => {
			word.classList.remove( 'is-active', 'is-leaving' );

			if ( i === index ) {
				word.classList.add( 'is-active' );
			}
		} );

		this.index = index;

		if ( LETTER_TYPES.includes( this.type ) ) {
			this.splitLetters( this.words[ index ], this.texts[ index ] );
		}
	}

	splitLetters( word, text ) {
		word.textContent = '';

		const sr = document.createElement( 'span' );
		sr.className = 'refraction-headline__sr';
		sr.textContent = text;
		word.appendChild( sr );

		Array.from( text ).forEach( ( char, i ) => {
			const letter = document.createElement( 'span' );
			letter.className = 'refraction-headline__letter';
			letter.setAttribute( 'aria-hidden', 'true' );
			letter.style.setProperty( '--i', String( i ) );
			letter.textContent = char;
			word.appendChild( letter );
		} );
	}

	rotate() {
		const next = ( this.index + 1 ) % this.words.length;

		if ( 0 === next && ! this.loop ) {
			return;
		}

		this.elements.$root.addClass( 'is-running' );

		const current = this.words[ this.index ];
		current.classList.add( 'is-leaving' );

		const duration = parseFloat( getComputedStyle( this.elements.$root[ 0 ] ).getPropertyValue( '--refraction-hl-dur' ) ) || 500;
		const letters = LETTER_TYPES.includes( this.type ) ? this.texts[ this.index ].length * 25 : 0;

		this.later( () => {
			this.setActive( next );
			this.later( () => this.rotate(), this.delay );
		}, duration + letters );
	}

	/* ----------------------------------------------------------------- typing */
	typeWord( index ) {
		this.elements.$root.addClass( 'is-running' );
		this.setActive( index );
		const word = this.words[ index ];
		const text = this.texts[ index ];
		let count = 0;

		word.textContent = '';

		const step = () => {
			count += 1;
			word.textContent = text.slice( 0, count );

			if ( count < text.length ) {
				this.later( step, this.typingSpeed );
			} else {
				this.later( () => this.eraseWord( index ), this.delay );
			}
		};

		this.later( step, this.typingSpeed );
	}

	eraseWord( index ) {
		const next = ( index + 1 ) % this.words.length;

		if ( 0 === next && ! this.loop ) {
			return;
		}

		const word = this.words[ index ];
		let text = this.texts[ index ];

		const step = () => {
			text = text.slice( 0, -1 );
			word.textContent = text;

			if ( text.length ) {
				this.later( step, Math.max( 20, this.typingSpeed / 2 ) );
			} else {
				this.typeWord( next );
			}
		};

		step();
	}
}
