module.exports = refractionModules.ViewModule.extend( {
	getDefaultSettings() {
		return {
			selectors: {
				modeSelect: '.refraction_maintenance_mode_mode select',
				maintenanceModeTable: '#tab-maintenance_mode table',
				maintenanceModeDescriptions: '.refraction-maintenance-mode-description',
				excludeModeSelect: '.refraction_maintenance_mode_exclude_mode select',
				excludeRolesArea: '.refraction_maintenance_mode_exclude_roles',
				templateSelect: '.refraction_maintenance_mode_template_id select',
				editTemplateButton: '.refraction-edit-template',
				maintenanceModeError: '.refraction-maintenance-mode-error',
			},
			classes: {
				isEnabled: 'refraction-maintenance-mode-is-enabled',
			},
		};
	},

	getDefaultElements() {
		var elements = {},
			selectors = this.getSettings( 'selectors' );

		elements.$modeSelect = jQuery( selectors.modeSelect );
		elements.$maintenanceModeTable = elements.$modeSelect.parents( selectors.maintenanceModeTable );
		elements.$excludeModeSelect = elements.$maintenanceModeTable.find( selectors.excludeModeSelect );
		elements.$excludeRolesArea = elements.$maintenanceModeTable.find( selectors.excludeRolesArea );
		elements.$templateSelect = elements.$maintenanceModeTable.find( selectors.templateSelect );
		elements.$editTemplateButton = elements.$maintenanceModeTable.find( selectors.editTemplateButton );
		elements.$maintenanceModeDescriptions = elements.$maintenanceModeTable.find( selectors.maintenanceModeDescriptions );
		elements.$maintenanceModeError = elements.$maintenanceModeTable.find( selectors.maintenanceModeError );

		return elements;
	},

	handleModeSelectChange() {
		var settings = this.getSettings(),
			elements = this.elements;

		elements.$maintenanceModeTable.toggleClass( settings.classes.isEnabled, !! elements.$modeSelect.val() );
		elements.$maintenanceModeDescriptions.hide();
		elements.$maintenanceModeDescriptions.filter( '[data-value="' + elements.$modeSelect.val() + '"]' ).show();
	},

	handleExcludeModeSelectChange() {
		var elements = this.elements;

		elements.$excludeRolesArea.toggle( 'custom' === elements.$excludeModeSelect.val() );
	},

	handleTemplateSelectChange() {
		var elements = this.elements;

		var templateID = elements.$templateSelect.val();

		if ( ! templateID ) {
			elements.$editTemplateButton.hide();
			elements.$maintenanceModeError.show();
			return;
		}

		var editUrl = refractionAdmin.config.home_url + '?p=' + templateID + '&refraction';

		elements.$editTemplateButton
			.prop( 'href', editUrl )
			.show();
		elements.$maintenanceModeError.hide();
	},

	bindEvents() {
		var elements = this.elements;

		elements.$modeSelect.on( 'change', this.handleModeSelectChange.bind( this ) );

		elements.$excludeModeSelect.on( 'change', this.handleExcludeModeSelectChange.bind( this ) );

		elements.$templateSelect.on( 'change', this.handleTemplateSelectChange.bind( this ) );
	},

	onAdminInit() {
		this.handleModeSelectChange();
		this.handleExcludeModeSelectChange();
		this.handleTemplateSelectChange();
	},

	onInit() {
		refractionModules.ViewModule.prototype.onInit.apply( this, arguments );

		refractionCommon.elements.$window.on( 'refraction/admin/init', this.onAdminInit );
	},
} );
