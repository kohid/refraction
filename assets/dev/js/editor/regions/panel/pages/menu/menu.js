import MenuPageView from 'refraction-panel/pages/menu/base';

export default class PanelMenu extends MenuPageView {
	initialize() {
		this.collection = PanelMenu.getGroups();
	}

	getArrowClass() {
		return 'eicon-chevron-' + ( refractionCommon.config.isRTL ? 'right' : 'left' );
	}

	onRender() {
		refraction.getPanelView().getHeaderView().ui.menuIcon.removeClass( 'eicon-menu-bar' ).addClass( this.getArrowClass() );
	}

	onDestroy() {
		refraction.getPanelView().getHeaderView().ui.menuIcon.removeClass( this.getArrowClass() ).addClass( 'eicon-menu-bar' );
	}
}

PanelMenu.groups = null;

PanelMenu.initGroups = () => {
	PanelMenu.groups = new Backbone.Collection( [] );

	// Keep the old `more` for BC, since 3.0.0.
	PanelMenu.groups.add( {
		name: 'more',
		title: __( 'More', 'refraction' ),
		items: [],
	} );

	PanelMenu.groups.add( {
		name: 'navigate_from_page',
		title: __( 'Navigate From Page', 'refraction' ),
		items: [
			// Todo: internal command.
			{
				name: 'view-page',
				icon: 'eicon-preview-thin',
				title: __( 'View Page', 'refraction' ),
				type: 'link',
				link: refraction.config.document.urls.permalink,
			},
		],
	} );

	if ( refraction.config.user.is_administrator ) {
		PanelMenu.addAdminMenu();
	}

	PanelMenu.addExitItem();
};

PanelMenu.addAdminMenu = () => {
	PanelMenu.groups.add( {
		name: 'style',
		title: __( 'Settings', 'refraction' ),
		items: [
			{
				name: 'editor-preferences',
				icon: 'eicon-user-preferences',
				title: __( 'User Preferences', 'refraction' ),
				type: 'page',
				callback: () => $e.route( 'panel/editor-preferences' ),
			},
		],
	}, { at: 0 } );

	PanelMenu.addItem( {
		name: 'finder',
		icon: 'eicon-search',
		title: __( 'Finder', 'refraction' ),
		callback: () => $e.route( 'finder' ),
	}, 'navigate_from_page', 'view-page' );

	PanelMenu.addItem( {
		name: 'apps',
		icon: 'eicon-apps',
		title: __( 'Add-ons', 'refraction' ),
		type: 'link',
		link: refraction.config.admin_apps_url,
		newTab: true,
	}, 'navigate_from_page', 'finder' );
};

PanelMenu.addExitItem = () => {
	let itemArgs;

	if ( ! refraction.config.user.introduction.exit_to && refraction.config.user.is_administrator ) {
		PanelMenu.exitShouldRedirect = false;

		itemArgs = {
			callback: () => PanelMenu.clickExitItem(),
		};
	} else {
		itemArgs = {
			type: 'link',
			link: PanelMenu.getExitUrl(),
		};
	}

	PanelMenu.addItem( {
		name: 'exit',
		icon: 'eicon-exit',
		title: __( 'Exit', 'refraction' ),
		...itemArgs,
	}, 'navigate_from_page' );
};

// Callback being used to determine when to open the modal or redirect the user.
PanelMenu.clickExitItem = () => {
	const currentValue = refraction.getPreferences( 'exit_to' );
	const defaultValue = refraction.settings.editorPreferences.getEditedView().getContainer().controls.exit_to.default;

	// The modal will pop if the user has not set the exit to preference yet or if the model never showed before.
	if ( currentValue !== defaultValue || PanelMenu.exitShouldRedirect ) {
		window.location.href = PanelMenu.getExitUrl();
	} else {
		const exitIntroduction = PanelMenu.createExitIntroductionDialog();

		exitIntroduction.show();
	}
};

PanelMenu.createExitIntroductionDialog = () => {
	const template = document.querySelector( '#tmpl-refraction-exit-dialog' );
	const { options } = refraction.settings.editorPreferences.getEditedView().getContainer().controls.exit_to;

	const introduction = new refractionModules.editor.utils.Introduction( {
		introductionKey: 'exit_to',
		dialogType: 'confirm',
		dialogOptions: {
			id: 'refraction-change-exit-preference-dialog',
			className: 'dialog-exit-preferences',
			headerMessage: __( 'New options for "Exit to..."', 'refraction' ),
			message: template.innerHTML,
			position: {
				my: 'center center',
				at: 'center center',
			},
			strings: {
				confirm: __( 'Apply', 'refraction' ),
				cancel: __( 'Decide Later', 'refraction' ),
			},
			effects: {
				show: 'fadeIn',
				hide: 'fadeOut',
			},
			onShow: () => {
				introduction.setViewed();
				refraction.config.user.introduction.exit_to = true;
				PanelMenu.exitShouldRedirect = true;
			},
			onConfirm: async () => {
				$e.run( 'document/elements/settings', {
					container: refraction.settings.editorPreferences.getEditedView().getContainer(),
					settings: {
						exit_to: select.value,
					},
					options: {
						external: true,
					},
				} );

				await refraction.settings.editorPreferences.save();
				window.location.href = PanelMenu.getExitUrl();
			},
			onCancel: () => {
				window.location.href = PanelMenu.getExitUrl();
			},
		},
	} );

	// Edit the template inside the dialog
	const messageContainer = introduction.getDialog().getElements().message[ 0 ],
		select = messageContainer.querySelector( '#exit-to-preferences' ),
		link = messageContainer.querySelector( '#user-preferences' );

	for ( const [ key, value ] of Object.entries( options ) ) {
		const option = document.createElement( 'option' );
		option.innerText = value;
		option.value = key;
		select.appendChild( option );
	}

	// Bind click event to the link in the dialog to open the editor preferences.
	link.addEventListener( 'click', ( e ) => {
		e.preventDefault();

		introduction.getDialog().hide();
		$e.route( 'panel/editor-preferences' );

		// Force the exit button to rerender by creating new exit button.
		PanelMenu.addExitItem();
	} );

	return introduction;
};

/**
 * Get the exit url according to the 'exit_to' user preference.
 */
PanelMenu.getExitUrl = () => {
	const exitPreference = refraction.getPreferences( 'exit_to' );

	switch ( exitPreference ) {
		case 'dashboard':
			return refraction.config.document.urls.main_dashboard;

		case 'all_posts':
			return refraction.config.document.urls.all_post_type;

		case 'this_post':
		default:
			return refraction.config.document.urls.exit_to_dashboard;
	}
};

PanelMenu.getGroups = () => {
	if ( ! PanelMenu.groups ) {
		PanelMenu.initGroups();
	}

	return PanelMenu.groups;
};

PanelMenu.addItem = ( itemData, groupName, before ) => {
	MenuPageView.addItem( PanelMenu.getGroups(), itemData, groupName, before );
};
