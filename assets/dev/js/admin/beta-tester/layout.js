import BetaTesterView from './view';

export default class BetaTesterLayout extends refractionModules.common.views.modal.Layout {
	ui() {
		return {
			closeModal: '.refraction-templates-modal__header__close',
			dontShowAgain: '.refraction-beta-tester-do-not-show-again',
		};
	}

	events() {
		return {
			'click @ui.closeModal': this.onCloseModalClick,
			'click @ui.dontShowAgain': this.onDontShowAgainClick,
		};
	}

	getModalOptions() {
		return {
			id: 'refraction-beta-tester-modal',
			hide: {
				onBackgroundClick: false,
			},
		};
	}

	getLogoOptions() {
		return {
			title: __( 'Sign Up', 'refraction' ),
		};
	}

	initialize() {
		refractionModules.common.views.modal.Layout.prototype.initialize.apply( this, arguments );

		this.showLogo();

		this.showContentView();

		const doNotShowAgain = __( 'Don\'t Show Again', 'refraction' );

		this.modalHeader.currentView.ui.closeModal.after( jQuery( '<div>', { class: 'refraction-beta-tester-do-not-show-again' } ).text( doNotShowAgain ) );
	}

	showContentView() {
		this.modalContent.show( new BetaTesterView() );
	}

	onDontShowAgainClick() {
		this.hideModal();
		this.onCloseModalClick();
	}

	onCloseModalClick() {
		refractionCommon.ajax.addRequest( 'introduction_viewed', {
			data: {
				introductionKey: refractionAdmin.config.beta_tester.beta_tester_signup,
			},
		} );
	}
}
