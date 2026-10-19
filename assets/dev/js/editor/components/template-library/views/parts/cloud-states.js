module.exports = Marionette.ItemView.extend( {
	tagName: 'main',

	template: '#tmpl-refraction-template-library-connect-states',

	id: 'refraction-template-library-connect-states',

	ui: {
		selectSourceFilter: '.refraction-template-library-filter-select-source .source-option',
		title: '.refraction-template-library-blank-title',
		message: '.refraction-template-library-blank-message',
		icon: '.refraction-template-library-blank-icon',
		button: '.refraction-template-library-cloud-empty__button',
		cloudBadge: '.refraction-template-library-connect-states-badge .source-option-badge.cloud-badge',
	},

	events: {
		'click @ui.selectSourceFilter': 'onSelectSourceFilterChange',
		'click @ui.button': 'onButtonClick',
	},

	modesStrings() {
		const defaultIcon = this.getDefaultIcon();

		return {
			notConnected: {
				title: refractionAppConfig?.[ 'cloud-library' ]?.library_connect_title_copy ?? __( 'Connect to your Refraction account', 'refraction' ),
				message: refractionAppConfig?.[ 'cloud-library' ]?.library_connect_sub_title_copy ?? __( 'Then you can find all your templates in one convenient library.', 'refraction' ),
				icon: defaultIcon,
				button: `<a class="refraction-button e-primary connect-button" href="${ refractionAppConfig?.[ 'cloud-library' ]?.library_connect_url }" target="_blank">${ refractionAppConfig?.[ 'cloud-library' ]?.library_connect_button_copy ?? __( 'Connect', 'refraction' ) }</a>`,
			},
			connectedNoQuota: {
				title: __( 'It’s time to level up', 'refraction' ),
				message: __( 'Refraction Pro plans come with Cloud Templates.', 'refraction' ) + '<br>' + __( 'Upgrade now to re-use your templates on all the websites you’re working on.', 'refraction' ),
				icon: `<i class="rficon-library-subscription-upgrade" aria-hidden="true" title="${ __( 'Upgrade now', 'elememntor' ) }"></i>`,
				button: `<a class="refraction-button e-accent" href="https://github.com/kohid/refraction#readme" target="_blank">${ __( 'Upgrade now', 'refraction' ) }</a>`,
			},
			deactivated: {
				title: __( 'Your library has been deactivated', 'refraction' ),
				message: __( 'This is because you don’t have an active subscription.', 'refraction' ) + '<br>' + __( 'Your templates are saved for 90 days from the day your subscription expires,', 'refraction' ) + '<br>' + __( 'then they’ll be gone forever.', 'refraction' ),
				icon: `<i class="rficon-library-subscription-upgrade" aria-hidden="true" title="${ __( 'Renew my subscription', 'elememntor' ) }"></i>`,
				button: `<a class="refraction-button e-accent" href="https://github.com/kohid/refraction#readme" target="_blank">${ __( 'Renew my subscription', 'refraction' ) }</a>`,
			},
		};
	},

	getDefaultIcon() {
		return `<i class="rficon-library-cloud-connect" aria-hidden="true" title="${ __( 'Empty folder', 'elememntor' ) }"></i>`;
	},

	getCurrentMode() {
		if ( ! refraction.config.library_connect.is_connected ) {
			return 'notConnected';
		}

		if ( refraction.templates.cloudLibraryIsDeactivated() ) {
			return 'deactivated';
		}

		return 'connectedNoQuota';
	},

	onRender() {
		this.updateTemplateMarkup();

		this.handleRefractionConnect();

		this.handleCloudBadge();

		refraction.templates.layout.getHeaderView()?.tools?.$el[ 0 ]?.classList?.add( 'e-hidden-disabled' );

		refraction.templates.eventManager.sendPageViewEvent( {
			location: refractionCommon.eventsManager.config.secondaryLocations.templateLibrary.cloudTabUpgrade,
		} );
	},

	async handleCloudBadge() {
		if ( ! this.ui.cloudBadge?.length ) {
			return;
		}

		const experimentVariant = await refraction.templates.eventManager.getSaveTemplateExperimentVariant();

		this.ui.cloudBadge.toggle( 'B' === experimentVariant );
	},

	updateTemplateMarkup() {
		const modeStrings = this.modesStrings()[ this.getCurrentMode() ];

		this.ui.title.html( modeStrings.title );

		this.ui.message.html( modeStrings.message );

		this.ui.button.html( modeStrings.button );

		this.ui.icon.html( modeStrings.icon );
	},

	handleRefractionConnect() {
		const $connectButton = this.$el.find( '.connect-button' );

		if ( ! $connectButton.length ) {
			return;
		}

		$connectButton.refractionConnect( {
			popup: {
				width: 726,
				height: 534,
			},
			success: () => {
				refraction.config.library_connect.is_connected = true;

				refraction.notifications.showToast( {
					message: __( 'Connected successfully.', 'refraction' ),
				} );

				$e.routes.refreshContainer( 'library' );
			},
			error: () => {
				refraction.config.library_connect.is_connected = false;
			},
		} );
	},

	onSelectSourceFilterChange( event ) {
		refraction.templates.onSelectSourceFilterChange( event );
	},

	onButtonClick() {
		refraction.templates.eventManager.sendUpgradeClickedEvent( {
			secondaryLocation: refractionCommon.eventsManager.config.secondaryLocations.templateLibrary.cloudTab,
			upgradePosition: refractionCommon.eventsManager.config.secondaryLocations.templateLibrary.cloudTab,
		} );
	},

	onDestroy() {
		refraction.templates.layout.getHeaderView()?.tools?.$el[ 0 ]?.classList?.remove( 'e-hidden-disabled' );
	},
} );
