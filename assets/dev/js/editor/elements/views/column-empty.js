module.exports = Marionette.ItemView.extend( {
	template: '#tmpl-refraction-empty-preview',

	className: 'refraction-empty-view',

	events: {
		click: 'onClickAdd',
	},

	behaviors() {
		return {
			contextMenu: {
				behaviorClass: require( 'refraction-behaviors/context-menu' ),
				groups: this.getContextMenuGroups(),
			},
		};
	},

	getContextMenuGroups() {
		return [
			{
				name: 'general',
				actions: [
					{
						name: 'paste',
						title: __( 'Paste', 'refraction' ),
						isEnabled: () => $e.components.get( 'document/elements' ).utils.isPasteEnabled( this._parent.getContainer() ),
						callback: () => $e.run( 'document/ui/paste', {
							container: this._parent.getContainer(),
						} ),
					},
				],
			},
		];
	},

	onClickAdd() {
		$e.route( 'panel/elements/categories' );
	},
} );
