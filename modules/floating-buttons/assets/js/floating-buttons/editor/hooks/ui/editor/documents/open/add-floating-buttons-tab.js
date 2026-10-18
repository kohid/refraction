export class FloatingButtonsAddLibraryTab extends $e.modules.hookUI.After {
	getCommand() {
		return 'editor/documents/open';
	}

	getId() {
		return 'refraction-floating-buttons-add-library-tab';
	}

	getConditions( args ) {
		const document = refraction.documents.get( args.id );
		return 'floating-buttons' === document.config.type;
	}

	getSubtype() {
		const urlParams = new URLSearchParams( window.location.search );
		switch ( urlParams.get( 'floating_element' ) ) {
			case 'floating-bars':
				return 'Floating Bar';
			case 'floating-buttons':
				return 'Floating Button';
			default:
				return 'Floating Button';
		}
	}

	getTitle() {
		const urlParams = new URLSearchParams( window.location.search );
		switch ( urlParams.get( 'floating_element' ) ) {
			case 'floating-bars':
				return __( 'Floating Bars', 'refraction' );
			case 'floating-buttons':
				return __( 'Floating Buttons', 'refraction' );
			default:
				return __( 'Floating Buttons', 'refraction' );
		}
	}

	apply() {
		$e.components.get( 'library' ).addTab( 'templates/floating-buttons', {
			title: this.getTitle(),
			filter: {
				source: 'remote',
				type: 'floating_button',
				subtype: this.getSubtype(),
			},
		}, 2 );

		$e.components.get( 'library' ).removeTab( 'templates/blocks' );
		$e.components.get( 'library' ).removeTab( 'templates/pages' );
	}
}

export default FloatingButtonsAddLibraryTab;
