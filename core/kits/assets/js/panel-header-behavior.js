import {
	buttonBack,
	buttonClose,
} from './panel-header-buttons';

export default class extends Marionette.Behavior {
	ui() {
		return {
			buttonClose: '#refraction-panel-header-kit-close',
			buttonBack: '#refraction-panel-header-kit-back',
		};
	}

	events() {
		return {
			'click @ui.buttonClose': 'onClickClose',
			'click @ui.buttonBack': 'onClickBack',
		};
	}

	onBeforeShow() {
		this.$el.prepend( refraction.compileTemplate( buttonBack, { Back: __( 'Back', 'refraction' ) } ) );
		this.$el.append( refraction.compileTemplate( buttonClose, { Close: __( 'Close', 'refraction' ) } ) );
	}

	onClickClose() {
		$e.run( 'panel/global/close' );
	}

	onClickBack() {
		$e.run( 'panel/global/back' );
	}
}
