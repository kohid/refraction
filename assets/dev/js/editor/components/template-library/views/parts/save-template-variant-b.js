const TemplateLibrarySaveTemplateView = require( './save-template' );

const TemplateLibrarySaveTemplateVariantBView = TemplateLibrarySaveTemplateView.extend( {
	id: 'refraction-template-library-save-template-variant-b',

	template: '#tmpl-refraction-template-library-save-template-variant-b',

	ui() {
		return _.extend( TemplateLibrarySaveTemplateView.prototype.ui.apply( this, arguments ), {
			selectFolderLink: '.select-folder-link',
			cloudAccountBadge: '.cloud-account-badge',
			siteAccountBadge: '.site-account-badge',
			connect: '#refraction-template-library-connect__badge-variant-b',
		} );
	},

	events() {
		return _.extend( TemplateLibrarySaveTemplateView.prototype.events.apply( this, arguments ), {
			'click @ui.selectFolderLink': 'onEllipsisIconClick',
			'mouseenter @ui.upgradeBadge': 'showInfoTip',
			'mouseenter @ui.cloudAccountBadge': 'showCloudAccountBadgeTooltip',
			'mouseenter @ui.siteAccountBadge': 'showSiteAccountBadgeTooltip',
			'mouseleave @ui.cloudAccountBadge': 'hideCloudAccountBadgeTooltip',
			'mouseleave @ui.siteAccountBadge': 'hideSiteAccountBadgeTooltip',
			'mouseleave @ui.upgradeBadge': 'hideInfoTip',
		} );
	},

	getConnectInfoTipPosition() {
		return 'top-50';
	},

	addVariantClass( $widget ) {
		return $widget.addClass( 'variant-b' );
	},

	showInfoTip() {
		if ( this.infoTipDialog ) {
			this.infoTipDialog.hide();
		}

		const message = refraction.templates.hasCloudLibraryQuota()
			? __( 'Upgrade your subscription to get more space and reuse saved assets across all your sites.', 'refraction' )
			: __( 'Upgrade your subscription to access Cloud Templates and reuse saved assets across all your sites.', 'refraction' );

		this.infoTipDialog = refraction.dialogsManager.createWidget( 'buttons', {
			id: 'refraction-library--infotip__dialog',
			effects: {
				show: 'show',
				hide: 'hide',
			},
			position: {
				of: this.ui.upgradeBadge,
				at: 'top-50',
			},
		} )
			.setMessage( message );

		this.infoTipDialog.getElements( 'header' ).remove();
		this.infoTipDialog.getElements( 'buttonsWrapper' ).remove();
		this.infoTipDialog.getElements( 'widget' ).addClass( 'variant-b' );

		this.infoTipDialog.show();

		this.sendCTBadgeEvent( 'cloud' );
	},

	showCloudAccountBadgeTooltip() {
		if ( this.cloudAccountBadgeDialog ) {
			this.cloudAccountBadgeDialog.hide();
		}

		const emailReplacement = refraction.config.library_connect.is_connected ? refraction.config.library_connect.user_email : __( 'connected', 'refraction' );
		/* Translators: %s: User's email. */
		const message = sprintf( __( 'Only %s Refraction account can access Cloud Templates from any connected site.', 'refraction' ), emailReplacement );

		this.cloudAccountBadgeDialog = refraction.dialogsManager.createWidget( 'buttons', {
			id: 'refraction-library--cloud-upgrade__dialog',
			effects: {
				show: 'show',
				hide: 'hide',
			},
			position: {
				of: this.ui.cloudAccountBadge,
				at: 'top-55',
			},
		} )
			.setMessage( message );

		this.cloudAccountBadgeDialog.getElements( 'widget' ).addClass( 'variant-b' );
		this.cloudAccountBadgeDialog.getElements( 'header' ).remove();
		this.cloudAccountBadgeDialog.getElements( 'buttonsWrapper' ).remove();
		this.cloudAccountBadgeDialog.show();
	},

	hideCloudAccountBadgeTooltip() {
		if ( this.cloudAccountBadgeDialog ) {
			this.cloudAccountBadgeDialog.hide();
		}
	},

	showSiteAccountBadgeTooltip() {
		if ( this.siteAccountBadgeDialog ) {
			this.siteAccountBadgeDialog.hide();
		}

		const message = __( 'Authorized users on this site can access Site Templates.', 'refraction' );

		this.siteAccountBadgeDialog = refraction.dialogsManager.createWidget( 'buttons', {
			id: 'refraction-library--site-info__dialog',
			effects: {
				show: 'show',
				hide: 'hide',
			},
			position: {
				of: this.ui.siteAccountBadge,
				at: 'top-35',
			},
		} )
			.setMessage( message );

		this.siteAccountBadgeDialog.getElements( 'widget' ).addClass( 'variant-b' );
		this.siteAccountBadgeDialog.getElements( 'header' ).remove();
		this.siteAccountBadgeDialog.getElements( 'buttonsWrapper' ).remove();

		this.siteAccountBadgeDialog.show();

		this.sendCTBadgeEvent( 'site' );
	},

	hideSiteAccountBadgeTooltip() {
		if ( this.siteAccountBadgeDialog ) {
			this.siteAccountBadgeDialog.hide();
		}
	},

	sendCTBadgeEvent( badgeType ) {
		refraction.templates.eventManager.sendCTBadgeEvent( {
			ct_badge_hover_position: this.getOption( 'context' ),
			ct_badge_type: badgeType,
			ct_position_state: this.getPositionState(),
		} );
	},

	getPositionState() {
		if ( ! refraction.config.library_connect.is_connected ) {
			return 'connect';
		}

		if ( ! refraction.templates.hasCloudLibraryQuota() || this.cloudMaxCapacityReached() ) {
			return 'upgrade';
		}

		return 'eligible';
	},
} );

module.exports = TemplateLibrarySaveTemplateVariantBView;

