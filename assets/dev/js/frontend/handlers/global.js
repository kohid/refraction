class GlobalHandler extends refractionModules.frontend.handlers.Base {
	getWidgetType() {
		return 'global';
	}

	animate() {
		const $element = this.$element,
			animation = this.getAnimation();

		if ( 'none' === animation ) {
			$element.removeClass( 'refraction-invisible' );
			return;
		}

		const elementSettings = this.getElementSettings(),
			animationDelay = elementSettings._animation_delay || elementSettings.animation_delay || 0;

		$element.removeClass( animation );

		if ( this.currentAnimation ) {
			$element.removeClass( this.currentAnimation );
		}

		this.currentAnimation = animation;

		setTimeout( () => {
			$element.removeClass( 'refraction-invisible' ).addClass( 'animated ' + animation );
		}, animationDelay );
	}

	getAnimation() {
		return this.getCurrentDeviceSetting( 'animation' ) || this.getCurrentDeviceSetting( '_animation' );
	}

	onInit( ...args ) {
		super.onInit( ...args );
		if ( this.getAnimation() ) {
			const observer = refractionModules.utils.Scroll.scrollObserver( {
				callback: ( event ) => {
					if ( event.isInViewport ) {
						this.animate();

						observer.unobserve( this.$element[ 0 ] );
					}
				},
			} );

			observer.observe( this.$element[ 0 ] );
		}
	}

	onElementChange( propertyName ) {
		if ( /^_?animation/.test( propertyName ) ) {
			this.animate();
		}
	}
}

export default ( $scope ) => {
	refractionFrontend.elementsHandler.addHandler( GlobalHandler, { $element: $scope } );
};
