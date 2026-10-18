import BaseModalLayout from 'refraction-common/views/modal/layout';

export default class extends BaseModalLayout {
	getModalOptions() {
		return {
			id: 'refraction-icons-manager-modal',
		};
	}

	getLogoOptions() {
		return {
			title: __( 'Icon Library', 'refraction' ),
		};
	}

	initialize( ...args ) {
		super.initialize( ...args );

		this.showLogo();
	}
}
