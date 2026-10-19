/**
 * Video Playlist: nothing is requested from a video site until a visitor presses play or picks an item.
 * "Play next" listens to the players' own postMessage events (no extra script).
 */
export default class VideoPlaylist extends refractionModules.frontend.handlers.Base {
	getDefaultSettings() {
		return {
			selectors: {
				root: '.refraction-vp',
				cover: '.refraction-vp__cover',
				media: '.refraction-vp__media',
				play: '.refraction-vp__play',
				item: '.refraction-vp__item',
				now: '.refraction-vp__now',
				prev: '.refraction-vp__prev',
				next: '.refraction-vp__next',
			},
		};
	}

	getDefaultElements() {
		const s = this.getSettings( 'selectors' );

		return {
			$root: this.$element.find( s.root ),
			$cover: this.$element.find( s.cover ),
			$media: this.$element.find( s.media ),
			$play: this.$element.find( s.play ),
			$items: this.$element.find( s.item ),
			$now: this.$element.find( s.now ),
			$prev: this.$element.find( s.prev ),
			$next: this.$element.find( s.next ),
		};
	}

	onInit() {
		super.onInit();
		this.index = 0;
		this.autoplayNext = 'yes' === this.elements.$root.attr( 'data-autoplay-next' );
		this.loop = 'yes' === this.elements.$root.attr( 'data-loop' );
	}

	select( index, play ) {
		const count = this.elements.$items.length;

		if ( index < 0 || index >= count ) {
			return;
		}

		this.index = index;
		const item = this.elements.$items[ index ];

		this.elements.$items.attr( 'aria-current', 'false' );
		item.setAttribute( 'aria-current', 'true' );
		this.elements.$now.text( item.dataset.title );
		this.elements.$cover.css( 'background-image', item.dataset.thumb ? `url("${ item.dataset.thumb }")` : '' );
		this.elements.$play.attr( 'aria-label', item.dataset.title );
		this.stop();

		if ( play ) {
			this.play();
		}
	}

	stop() {
		this.elements.$media.empty();
		this.elements.$root.removeClass( 'is-playing' );
		this.frame = null;
	}

	play() {
		const item = this.elements.$items[ this.index ],
			media = this.elements.$media[ 0 ];

		media.textContent = '';

		if ( 'hosted' === item.dataset.provider ) {
			const video = document.createElement( 'video' );

			video.src = item.dataset.src;
			video.controls = true;
			video.autoplay = true;
			video.playsInline = true;
			video.setAttribute( 'aria-label', item.dataset.title );
			video.addEventListener( 'ended', () => this.onEnded() );
			media.appendChild( video );
			this.frame = null;
		} else {
			const iframe = document.createElement( 'iframe' ),
				youtube = 'youtube' === item.dataset.provider;
			let src = item.dataset.src;

			if ( youtube && this.autoplayNext ) {
				src += `&origin=${ encodeURIComponent( window.location.origin ) }`;
			}

			iframe.src = src;
			iframe.title = item.dataset.title;
			iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
			iframe.allowFullscreen = true;
			iframe.referrerPolicy = 'strict-origin-when-cross-origin';
			iframe.addEventListener( 'load', () => this.listen( iframe, item.dataset.provider ) );
			media.appendChild( iframe );
			this.frame = iframe;
		}

		this.elements.$root.addClass( 'is-playing' );
	}

	// Ask the already loaded player to tell us when the video ends.
	listen( iframe, provider ) {
		if ( ! this.autoplayNext || ! iframe.contentWindow ) {
			return;
		}

		if ( 'youtube' === provider ) {
			iframe.contentWindow.postMessage( JSON.stringify( { event: 'listening', id: 1, channel: 'widget' } ), '*' );
			iframe.contentWindow.postMessage( JSON.stringify( { event: 'command', func: 'addEventListener', args: [ 'onStateChange' ], id: 1, channel: 'widget' } ), '*' );
		} else if ( 'vimeo' === provider ) {
			iframe.contentWindow.postMessage( JSON.stringify( { method: 'addEventListener', value: 'finish' } ), '*' );
		}
	}

	onMessage( event ) {
		if ( ! this.frame || event.source !== this.frame.contentWindow ) {
			return;
		}

		let data = event.data;

		if ( 'string' === typeof data ) {
			try {
				data = JSON.parse( data );
			} catch ( e ) {
				return;
			}
		}

		if ( ! data || 'object' !== typeof data ) {
			return;
		}

		const youtubeEnded = ( 'onStateChange' === data.event && 0 === data.info ) || ( 'infoDelivery' === data.event && data.info && 0 === data.info.playerState ),
			vimeoEnded = 'finish' === data.event;

		if ( youtubeEnded || vimeoEnded ) {
			this.onEnded();
		}
	}

	onEnded() {
		if ( ! this.autoplayNext ) {
			return;
		}

		const last = this.elements.$items.length - 1;

		if ( this.index < last ) {
			this.select( this.index + 1, true );
		} else if ( this.loop ) {
			this.select( 0, true );
		} else {
			this.stop();
		}
	}

	bindEvents() {
		this.elements.$play.on( 'click', () => this.play() );
		this.elements.$items.on( 'click', ( event ) => this.select( Number( event.currentTarget.dataset.index ), true ) );
		this.elements.$prev.on( 'click', () => this.select( this.index - 1 < 0 ? this.elements.$items.length - 1 : this.index - 1, this.elements.$root.hasClass( 'is-playing' ) ) );
		this.elements.$next.on( 'click', () => this.select( this.index + 1 >= this.elements.$items.length ? 0 : this.index + 1, this.elements.$root.hasClass( 'is-playing' ) ) );

		this.messageHandler = ( event ) => this.onMessage( event );
		window.addEventListener( 'message', this.messageHandler );
	}

	unbindEvents() {
		this.elements.$play.off();
		this.elements.$items.off();
		this.elements.$prev.off();
		this.elements.$next.off();
		window.removeEventListener( 'message', this.messageHandler );
	}
}
