import HookUIAfter from 'refraction-api/modules/hooks/ui/after';

export class FooterSaverAfterSave extends HookUIAfter {
	getCommand() {
		return 'document/save/save';
	}

	getId() {
		return 'footer-saver-after-save';
	}

	apply( args, result ) {
		const { status } = args,
			{ footerSaver } = $e.components.get( 'document/save' );

		NProgress.done();

		footerSaver.refreshWpPreview();

		if ( result.statusChanged && 'publish' === status && refraction.config.document.urls.have_a_look ) {
			this.onPageStatusChange();
		}
	}

	onPageStatusChange() {
		const buttons = [];

		buttons.push( {
			name: 'view_page',
			text: __( 'Have a look', 'refraction' ),
			callback() {
				open( refraction.config.document.urls.have_a_look );
			},
		} );

		refraction.notifications.showToast( {
			message: refraction.config.document.panel.messages.publish_notification,
			buttons,
		} );
	}
}

export default FooterSaverAfterSave;
