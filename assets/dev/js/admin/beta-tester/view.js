export default class BetaTesterView extends Marionette.ItemView {
	constructor() {
		super();
		this.id = 'refraction-beta-tester-dialog-content';
		this.template = '#tmpl-refraction-beta-tester';
	}

	ui() {
		return {
			betaForm: '#refraction-beta-tester-form',
			betaEmail: '#refraction-beta-tester-form__email',
			betaButton: '#refraction-beta-tester-form__submit',
		};
	}

	events() {
		return {
			'submit @ui.betaForm': 'onBetaFormSubmit',
		};
	}

	onBetaFormSubmit( event ) {
		event.preventDefault();

		const email = this.ui.betaEmail.val();

		this.ui.betaButton.addClass( 'refraction-button-state' );

		refractionCommon.ajax.addRequest( 'beta_tester_signup', {
			data: {
				betaTesterEmail: email,
			},
			// Do not wait for response.
		} );
		refractionBetaTester.layout.hideModal();
	}

	onRender() {}
}
