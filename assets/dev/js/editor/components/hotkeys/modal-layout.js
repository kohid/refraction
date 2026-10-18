import ModalContent from './modal-content';

export default class extends refractionModules.common.views.modal.Layout {
	getModalOptions() {
		return {
			id: 'refraction-hotkeys__modal',
		};
	}

	getLogoOptions() {
		return {
			title: __( 'Keyboard Shortcuts', 'refraction' ),
		};
	}

	initialize( ...args ) {
		super.initialize( ...args );

		this.showLogo();

		this.showContentView();
	}

	showContentView() {
		this.modalContent.show( new ModalContent() );
	}
}
