import NewFloatingElementsView from 'refraction-admin/floating-elements/view';
import ModalLayout from 'refraction-common/views/modal/layout';

export default class extends ModalLayout {
	getModalOptions() {
		return {
			id: 'refraction-new-floating-elements-modal',
		};
	}

	getLogoOptions() {
		return {
			title: __( 'New Floating Elements', 'refraction' ),
		};
	}

	initialize() {
		super.initialize();

		this.showLogo();

		this.showContentView();
	}

	showContentView() {
		this.modalContent.show( new NewFloatingElementsView() );
	}
}
