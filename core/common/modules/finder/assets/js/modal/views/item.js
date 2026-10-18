import { EditorOneEventManager } from 'refraction-editor-utils/editor-one-events';

export default class extends Marionette.ItemView {
	className() {
		return 'refraction-finder__results__item';
	}

	getTemplate() {
		return '#tmpl-refraction-finder__results__item';
	}

	events() {
		this.$el[ 0 ].addEventListener( 'click', this.onClick.bind( this ), true );
	}

	trackResultSelect() {
		const title = this.model.get( 'title' );
		EditorOneEventManager.sendFinderResultSelect( title );
	}

	onClick( e ) {
		const lockOptions = this.model.get( 'lock' );

		if ( ! lockOptions?.is_locked ) {
			this.trackResultSelect();

			// Open refraction-app URLs in the app overlay instead of navigating away.
			const url = this.model.get( 'url' ) || '';
			if ( url.includes( 'page=refraction-app' ) && window.$e ) {
				e.preventDefault();
				e.stopImmediatePropagation();
				$e.run( 'finder/close' );
				$e.run( 'app/open', { url } );
			}
			return;
		}

		e.preventDefault();
		e.stopImmediatePropagation();

		refractionCommon.dialogsManager.createWidget( 'confirm', {
			id: 'refraction-finder__lock-dialog',
			headerMessage: lockOptions.content.heading,
			message: lockOptions.content.description,
			position: {
				my: 'center center',
				at: 'center center',
			},
			strings: {
				confirm: lockOptions.button.text,
				cancel: __( 'Cancel', 'refraction' ),
			},
			onConfirm: () => {
				this.trackResultSelect();
				const link = this.replaceLockLinkPlaceholders( lockOptions.button.url );

				window.open( link, '_blank' );
			},
		} ).show();
	}

	replaceLockLinkPlaceholders( link ) {
		return link
			.replace( /%%utm_source%%/g, 'finder' )
			.replace( /%%utm_medium%%/g, 'wp-dash' );
	}
}
