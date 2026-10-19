/**
 * Editor side of Display Conditions: a badge on elements that have conditions, and the page level toggle
 * "Show elements with conditions". The server never hides anything in the editor.
 */
const ITEMS = 'refraction_dc_items';
const SHOW = 'refraction_dc_editor_show';

const ConditionsBadge = Marionette.Behavior.extend( {
	onRender() {
		this.update();

		const settings = this.view.getEditModel().get( 'settings' );

		this.stopListening( settings );
		this.listenTo( settings, 'change:' + ITEMS, this.update );
	},

	update() {
		const items = this.view.getEditModel().get( 'settings' ).get( ITEMS );
		const has = !! ( items && ( items.length || ( items.models && items.models.length ) ) );

		this.view.$el.toggleClass( 'refraction-has-conditions', has );
	},
} );

refraction.hooks.addFilter( 'elements/base/behaviors', ( behaviors ) => {
	behaviors.refractionConditionsBadge = { behaviorClass: ConditionsBadge };

	return behaviors;
} );

function applyToggle( container ) {
	const settings = container && container.settings;

	if ( ! settings || ! settings.get || ! refraction.$previewContents ) {
		return;
	}

	refraction.$previewContents.find( 'body' ).toggleClass( 'refraction-dc-hide', 'yes' !== settings.get( SHOW ) );
}

class ConditionsToggle extends $e.modules.hookUI.After {
	getCommand() {
		return 'document/elements/settings';
	}

	getId() {
		return 'refraction-dc-editor-toggle';
	}

	getContainerType() {
		return 'document';
	}

	getConditions( args ) {
		return args.settings && Object.prototype.hasOwnProperty.call( args.settings, SHOW );
	}

	apply( args ) {
		( args.containers || [ args.container ] ).forEach( applyToggle );
	}
}

refraction.on( 'preview:loaded', () => {
	const current = refraction.documents.getCurrent();

	current && current.container && applyToggle( current.container );
} );

$e.hooks.registerUIAfter( new ConditionsToggle() );
