import { RevertKitHandler } from './shared/revert-kit-handler';

class Admin {
	constructor() {
		this.revertButton = document.getElementById( 'refraction-import-export__revert_kit' );

		this.initializeRevertHandler();
		this.bindEventListeners();
	}

	initializeRevertHandler() {
		if ( this.revertButton ) {
			this.revertHandler = new RevertKitHandler( {
				revertButton: this.revertButton,
			} );

			this.revertHandler.maybeShowReferrerKitDialog();
		}
	}

	bindEventListeners() {
		if ( this.revertButton ) {
			this.revertButton.addEventListener( 'click', this.onRevertButtonClick.bind( this ) );
		}
	}

	onRevertButtonClick( event ) {
		event.preventDefault();

		this.revertHandler?.revertKit();
	}
}

window.addEventListener( 'load', () => {
	new Admin();
} );
