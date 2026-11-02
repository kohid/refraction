/**
 * YouTube videos as slide backgrounds (Slides widget, both layouts). The player loads only when its slide is shown,
 * from youtube-nocookie.com (no cookies until the visitor plays it with sound), muted (browsers only autoplay muted
 * videos) unless the slide asks for sound, without controls, covering the slide. The slide's image shows until the
 * video actually plays. Nothing plays for visitors who ask for reduced motion.
 *
 * Markup: <div class="refraction-slide__video" data-rf-yt="VIDEO_ID" data-rf-yt-sound="0|1"></div> inside the slide,
 * and optionally a <button class="refraction-slide__sound"> to switch the sound on and off.
 */
let api = null;

/** Loads the YouTube IFrame API once. @return {Promise} Resolves with window.YT. */
export function loadYouTube() {
	if ( api ) {
		return api;
	}

	api = new Promise( ( resolve, reject ) => {
		if ( window.YT && window.YT.Player ) {
			resolve( window.YT );
			return;
		}

		const previous = window.onYouTubeIframeAPIReady;
		window.onYouTubeIframeAPIReady = () => {
			if ( 'function' === typeof previous ) {
				previous();
			}

			resolve( window.YT );
		};

		const tag = document.createElement( 'script' );
		tag.src = 'https://www.youtube.com/iframe_api';
		tag.async = true;
		tag.onerror = () => {
			api = null;
			reject( new Error( 'YouTube could not be loaded' ) );
		};
		document.head.appendChild( tag );
	} );

	return api;
}

export const reducedMotion = () => window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

/**
 * One slide's video.
 *
 * @param {Element}  box                 The .refraction-slide__video element.
 * @param {Object}   handlers
 * @param {Function} handlers.onEnd      The video reached its end.
 * @param {Function} handlers.onProgress Called while playing with the share played (0 to 1).
 * @param {Element}  handlers.sound      The sound button (default: the one inside the slide).
 * @return {Object} play(), pause(), destroy(), and `has` (false when there is no video to play).
 */
export function slideVideo( box, { onEnd = () => {}, onProgress = () => {}, sound: soundButton = null } = {} ) {
	const id = box ? box.getAttribute( 'data-rf-yt' ) : '';

	if ( ! box || ! /^[\w-]{11}$/.test( id || '' ) || reducedMotion() ) {
		return { has: false, play() {}, pause() {}, destroy() {} };
	}

	const slide = box.closest( '.refraction-slide, .rf-tco__slide' );
	const sound = soundButton || ( slide ? slide.querySelector( '.refraction-slide__sound' ) : null );
	let player = null;
	let wanted = false;
	let ticker = 0;

	const tick = () => {
		window.clearInterval( ticker );
		ticker = window.setInterval( () => {
			if ( player && player.getDuration && player.getDuration() > 0 ) {
				onProgress( Math.min( 1, player.getCurrentTime() / player.getDuration() ) );
			}
		}, 200 );
	};

	const create = () => loadYouTube().then( ( YT ) => {
		if ( player ) {
			return;
		}

		const mount = document.createElement( 'div' );
		box.appendChild( mount );
		player = new YT.Player( mount, {
			videoId: id,
			host: 'https://www.youtube-nocookie.com',
			playerVars: { autoplay: 1, mute: '1' === box.getAttribute( 'data-rf-yt-sound' ) ? 0 : 1, controls: 0, playsinline: 1, rel: 0, modestbranding: 1, disablekb: 1, iv_load_policy: 3 },
			events: {
				onReady: ( e ) => {
					if ( '1' !== box.getAttribute( 'data-rf-yt-sound' ) ) {
						e.target.mute();
					}

					if ( wanted ) {
						e.target.playVideo();
					} else {
						e.target.pauseVideo();
					}
				},
				onStateChange: ( e ) => {
					if ( YT.PlayerState.PLAYING === e.data ) {
						box.classList.add( 'is-playing' );
						tick();
					} else if ( YT.PlayerState.ENDED === e.data ) {
						window.clearInterval( ticker );
						onProgress( 1 );
						onEnd();
					}
				},
			},
		} );
	} ).catch( () => {} );

	if ( sound ) {
		sound.hidden = false;
		sound.addEventListener( 'click', () => {
			if ( ! player || ! player.isMuted ) {
				return;
			}

			if ( player.isMuted() ) {
				player.unMute();
				sound.setAttribute( 'aria-pressed', 'true' );
			} else {
				player.mute();
				sound.setAttribute( 'aria-pressed', 'false' );
			}
		} );
	}

	return {
		has: true,
		play() {
			wanted = true;

			if ( player && player.playVideo ) {
				player.seekTo( 0, true );
				player.playVideo();
			} else {
				create();
			}
		},
		pause() {
			wanted = false;
			window.clearInterval( ticker );

			if ( player && player.pauseVideo ) {
				player.pauseVideo();
			}
		},
		destroy() {
			window.clearInterval( ticker );

			if ( player && player.destroy ) {
				player.destroy();
			}
		},
	};
}
