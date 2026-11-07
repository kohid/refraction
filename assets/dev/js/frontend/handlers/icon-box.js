/**
 * Icon Box: with "Play once, when it comes into view", the icons' animation starts when the box is first seen
 * (the class is-visible, see icon-box.scss).
 */
export default class IconBox extends refractionModules.frontend.handlers.Base {
	onInit() {
		super.onInit();
		this.watchView();
	}

	watchView() {
		const element = this.$element[ 0 ];

		this.observer?.disconnect();

		if ( ! element || ! element.classList.contains( 'refraction-icons-anim-on-view' ) ) {
			return;
		}

		element.classList.remove( 'is-visible' );

		if ( ! ( 'IntersectionObserver' in window ) ) {
			element.classList.add( 'is-visible' );

			return;
		}

		this.observer = new IntersectionObserver( ( entries ) => {
			if ( entries.some( ( entry ) => entry.isIntersecting ) ) {
				element.classList.add( 'is-visible' );
				this.observer.disconnect();
			}
		}, { threshold: 0.2 } );

		this.observer.observe( element );
	}

	onElementChange( setting ) {
		// The editor changes the classes first: look again once it has.
		if ( /^icons_animation/.test( setting ) ) {
			setTimeout( () => this.watchView() );
		}
	}

	onDestroy() {
		super.onDestroy();
		this.observer?.disconnect();
	}
}
