import ElementView from './element';

export default class extends Marionette.LayoutView {
	getTemplate() {
		return '#tmpl-refraction-navigator';
	}

	id() {
		return 'refraction-navigator__inner';
	}

	ui() {
		return {
			toggleButton: '#refraction-navigator__toggle-all',
			toggleButtonIcon: '#refraction-navigator__toggle-all i',
			toggleButtonA11yText: '#refraction-navigator__toggle-all span',
			closeButton: '#refraction-navigator__close',
		};
	}

	behaviors() {
		const behaviors = {};
		return refraction.hooks.applyFilters( 'navigator/layout/behaviors', behaviors, this );
	}

	events() {
		return {
			'click @ui.toggleButton': 'toggleElements',
			'click @ui.closeButton': 'onCloseButtonClick',
			'keyup @ui.closeButton': 'onCloseButtonKeyPress',
		};
	}

	regions() {
		return {
			elements: '#refraction-navigator__elements',
		};
	}

	toggleElements() {
		const state = 'expand' === this.ui.toggleButton.data( 'refraction-action' ),
			a11yText = state ? __( 'Collapse all elements', 'refraction' ) : __( 'Expand all elements', 'refraction' ),
			classes = [ 'rficon-collapse', 'rficon-expand' ];

		this.ui.toggleButton
			.data( 'refraction-action', state ? 'collapse' : 'expand' );

		this.ui.toggleButtonIcon
			.removeClass( classes[ +state ] )
			.addClass( classes[ +! state ] );

		this.ui.toggleButtonA11yText.text( a11yText );

		this.elements.currentView.recursiveChildInvoke( 'toggleList', state );
	}

	activateElementsMouseInteraction() {
		this.elements.currentView.recursiveChildInvoke( 'activateMouseInteraction' );
	}

	deactivateElementsMouseInteraction() {
		this.elements.currentView.recursiveChildInvoke( 'deactivateMouseInteraction' );
	}

	/**
	 * Recursively update elements selection in the navigator.
	 */
	updateSelection() {
		this.elements.currentView.recursiveChildInvoke( 'updateSelection' );
	}

	onShow() {
		this.elements.show( new ElementView( {
			model: refraction.elementsModel,
		} ) );
	}

	onCloseButtonClick() {
		$e.components.get( 'navigator' ).close();
	}

	onCloseButtonKeyPress( event ) {
		const ENTER_KEY = 13;

		if ( ENTER_KEY === event.keyCode ) {
			this.onCloseButtonClick();
		}
	}
}
