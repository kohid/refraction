var ControlBaseView = require( 'refraction-controls/base' );

module.exports = ControlBaseView.extend( {

	ui() {
		const ui = ControlBaseView.prototype.ui.apply( this, arguments );

		ui.button = '.refraction-control-notice-dismiss';

		return ui;
	},

	events: {
		'click @ui.button.e-btn-1': 'onButton1Click',
		'click @ui.button.e-btn-2': 'onButton2Click',
		'click @ui.button.refraction-control-notice-dismiss': 'onDismissButtonClick',
	},

	onButton1Click() {
		const eventName = this.model.get( 'event' );

		refraction.channels.editor.trigger( eventName, this );
	},

	onButton2Click() {
		const eventName = this.model.get( 'event' );

		refraction.channels.editor.trigger( eventName, this );
	},

	getDismissId() {
		const controlName = this.model.get( 'name' );
		const elementType = 'widget' === this.options?.element?.model?.attributes?.elType
			? this.options?.element?.model?.attributes?.widgetType
			: this.options?.element?.model?.attributes?.elType;

		return `${ elementType }-${ controlName }`;
	},

	onDismissButtonClick() {
		const dismissId = this.getDismissId();

		refractionCommon.ajax.addRequest( 'dismissed_editor_notices', {
			data: {
				dismissId,
			},
			success: () => {
				this.$el.remove();
				const dismissedNotices = refraction?.config?.user?.dismissed_editor_notices ? [ ...refraction.config.user.dismissed_editor_notices ] : [];
				refraction.config.user.dismissed_editor_notices = [ ...dismissedNotices, dismissId ];
			},
		} );
	},

	templateHelpers() {
		const controlData = ControlBaseView.prototype.templateHelpers.apply( this, arguments );
		const dismissedNotices = refraction?.config?.user?.dismissed_editor_notices ? [ ...refraction.config.user.dismissed_editor_notices ] : [];
		const dismissId = this.getDismissId();

		controlData.data.shouldRenderNotice = ! dismissedNotices.includes( dismissId );

		return controlData;
	},
} );
