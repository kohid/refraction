import LandingPagesModule from 'refraction/modules/landing-pages/assets/js/admin/module';
import ExperimentsModule from 'refraction/core/experiments/assets/js/admin/module';
import environment from '../../../../core/common/assets/js/utils/environment';
import Events from 'refraction-utils/events';
import FilesUploadHandler from '../editor/utils/files-upload-handler';
import TemplateControls from './new-template/template-controls.js';
import { showJsonUploadWarningMessageIfNeeded } from 'refraction-utils/json-upload-warning-message';
import FloatingButtonsHandler from 'refraction/modules/floating-buttons/assets/js/floating-buttons/admin/module';

( function( $ ) {
	var RefractionAdmin = refractionModules.ViewModule.extend( {

		maintenanceMode: null,

		config: refractionAdminConfig,

		getDefaultElements() {
			var elements = {
				$switchMode: $( '#refraction-switch-mode' ),
				$goToEditLink: $( '#refraction-go-to-edit-page-link' ),
				$switchModeInput: $( '#refraction-switch-mode-input' ),
				$switchModeButton: $( '#refraction-switch-mode-button' ),
				$refractionLoader: $( '.refraction-loader' ),
				$builderEditor: $( '#refraction-editor' ),
				$importButton: $( '#refraction-import-template-trigger' ),
				$importNowButton: $( '#e-import-template-action' ),
				$importArea: $( '#refraction-import-template-area' ),
				$importForm: $( '#refraction-import-template-form' ),
				$importFormFileInput: $( '#refraction-import-template-form input[type="file"]' ),
				$settingsForm: $( '#refraction-settings-form' ),
				$settingsTabsWrapper: $( '#refraction-settings-tabs-wrapper' ),
				$menuGoProLink: $( 'a[href="admin.php?page=go_refraction_pro"], a[href*="admin.php?page=refraction-one-upgrade"]' ),
				$reMigrateGlobalsButton: $( '.refraction-re-migrate-globals-button' ),
			};

			elements.$settingsFormPages = elements.$settingsForm.find( '.refraction-settings-form-page' );

			elements.$activeSettingsPage = elements.$settingsFormPages.filter( '.refraction-active' );

			elements.$settingsTabs = elements.$settingsTabsWrapper.children();

			elements.$activeSettingsTab = elements.$settingsTabs.filter( '.nav-tab-active' );

			return elements;
		},

		toggleStatus() {
			var isRefractionMode = this.isRefractionMode();

			refractionCommon.elements.$body
				.toggleClass( 'refraction-editor-active', isRefractionMode )
				.toggleClass( 'refraction-editor-inactive', ! isRefractionMode );
		},

		bindEvents() {
			var self = this;

			self.elements.$switchModeButton.on( 'click', function( event ) {
				event.preventDefault();

				if ( self.isRefractionMode() ) {
					refractionCommon.dialogsManager.createWidget( 'confirm', {
						message: __( 'You are about to switch this page from the Refraction editor to the WordPress editor. Your current layout, design, and content may break and need to be rebuilt. Are you sure you want to continue?', 'refraction' ),
						headerMessage: __( 'Edit with WordPress?', 'refraction' ),
						strings: {
							confirm: __( 'Continue', 'refraction' ),
							cancel: __( 'Cancel', 'refraction' ),
						},
						defaultOption: 'cancel',
						onConfirm() {
							self.elements.$switchModeInput.val( '' );
							self.toggleStatus();
						},
					} ).show();
				} else {
					self.elements.$switchModeInput.val( true );

					var $wpTitle = $( '#title' );

					if ( ! $wpTitle.val() ) {
						$wpTitle.val( 'Refraction #' + $( '#post_ID' ).val() );
					}

					if ( wp.autosave ) {
						wp.autosave.server.triggerSave();
					}

					self.animateLoader();

					$( document ).on( 'heartbeat-tick.autosave', function() {
						refractionCommon.elements.$window.off( 'beforeunload.edit-post' );

						location.href = self.elements.$goToEditLink.attr( 'href' );
					} );
					self.toggleStatus();
				}
			} );

			self.elements.$goToEditLink.on( 'click', function() {
				self.animateLoader();
			} );

			$( '.e-notice--dismissible' ).on( 'click', '.e-notice__dismiss, .e-notice-dismiss', function( event ) {
				event.preventDefault();

				const $wrapperElm = $( this ).closest( '.e-notice--dismissible' );

				$.post( ajaxurl, {
					action: 'refraction_set_admin_notice_viewed',
					notice_id: $wrapperElm.data( 'notice_id' ),
					_wpnonce: $wrapperElm.data( 'nonce' ),
				} );

				$wrapperElm.fadeTo( 100, 0, function() {
					$wrapperElm.slideUp( 100, function() {
						$wrapperElm.remove();
					} );
				} );
			} );

			const campaignNotices = {
				plugin_image_optimization: 'refraction_image_optimization_campaign',
			};

			Object.keys( campaignNotices ).forEach( ( noticeId ) => {
				$( `.e-notice--cta.e-notice--dismissible[data-notice_id="${ noticeId }"] a.e-button--cta` ).on( 'click', function() {
					const $button = $( this );
					refractionCommon.ajax.addRequest( campaignNotices[ noticeId ], {
						data: {
							campaign: $button?.data( 'campaign' ) || '',
							source: $button?.data( 'source' ) || '',
							medium: $button?.data( 'medium' ) || '',
						},
					} );
				} );
			} );

			$( '.e-a-apps .e-a-item[data-plugin="image-optimization/image-optimization.php"] a.e-btn' ).on( 'click', function() {
				const $button = $( this );
				refractionCommon.ajax.addRequest( 'refraction_image_optimization_campaign', {
					data: {
						campaign: $button?.data( 'campaign' ) || '',
						source: $button?.data( 'source' ) || '',
						medium: $button?.data( 'medium' ) || '',
					},
				} );
			} );

			$( '#refraction-clear-cache-button' ).on( 'click', function( event ) {
				event.preventDefault();
				var $thisButton = $( this );

				$thisButton.removeClass( 'success' ).addClass( 'loading' );

				$.post( ajaxurl, {
					action: 'refraction_clear_cache',
					_nonce: $thisButton.data( 'nonce' ),
				} )
					.done( function() {
						$thisButton.removeClass( 'loading' ).addClass( 'success' );
					} );
			} );

			$( '#refraction-library-sync-button' ).on( 'click', function( event ) {
				event.preventDefault();
				var $thisButton = $( this );

				$thisButton.removeClass( 'success' ).addClass( 'loading' );

				$.post( ajaxurl, {
					action: 'refraction_reset_library',
					_nonce: $thisButton.data( 'nonce' ),
				} )
					.done( function() {
						$thisButton.removeClass( 'loading' ).addClass( 'success' );
					} );
			} );

			$( '#refraction-recreate-kit-button' ).on( 'click', function( event ) {
				event.preventDefault();
				var $thisButton = $( this );

				$thisButton.removeClass( 'success error' ).addClass( 'loading' )
					.next( '.e-recreate-kit-error-message' ).remove();

				$.post( ajaxurl, {
					action: 'refraction_recreate_kit',
					_nonce: $thisButton.data( 'nonce' ),
				} )
					.done( function() {
						$thisButton.removeClass( 'loading' ).addClass( 'success' );
					} )
					.fail( function( { responseJSON } ) {
						$thisButton.removeClass( 'loading' ).addClass( 'error' );

						if ( responseJSON.data?.message ) {
							$thisButton.after( `<div class="e-recreate-kit-error-message">${ responseJSON.data.message }</div>` );
						}
					} );
			} );

			$( '#refraction-replace-url-button' ).on( 'click', function( event ) {
				event.preventDefault();
				var $this = $( this ),
					$tr = $this.parents( 'tr' ),
					$from = $tr.find( '[name="from"]' ),
					$to = $tr.find( '[name="to"]' );

				$this.removeClass( 'success' ).addClass( 'loading' );

				$.post( ajaxurl, {
					action: 'refraction_replace_url',
					from: $from.val(),
					to: $to.val(),
					_nonce: $this.data( 'nonce' ),
				} )
					.done( function( response ) {
						$this.removeClass( 'loading' );

						if ( response.success ) {
							$this.addClass( 'success' );
						}

						refractionCommon.dialogsManager.createWidget( 'alert', {
							message: response.data,
						} ).show();
					} );
			} );

			$( '#refraction_upgrade_fa_button' ).on( 'click', function( event ) {
				event.preventDefault();
				const $updateButton = $( this );
				$updateButton.addClass( 'loading' );

				refractionCommon.dialogsManager.createWidget( 'confirm', {
					id: 'confirm_fa_migration_admin_modal',
					message: __( 'I understand that by upgrading to Font Awesome 5,', 'refraction' ) + '<br>' + __( 'I acknowledge that some changes may affect my website and that this action cannot be undone.', 'refraction' ),
					headerMessage: __( 'Font Awesome 5 Migration', 'refraction' ),
					strings: {
						confirm: __( 'Continue', 'refraction' ),
						cancel: __( 'Cancel', 'refraction' ),
					},
					defaultOption: 'confirm',
					onConfirm: () => {
						$updateButton.removeClass( 'error' ).addClass( 'loading' );

						const {
							_nonce,
							action,
							redirectUrl,
						} = $updateButton.data();

						$.post( ajaxurl, { action, _nonce } )
							.done( function( response ) {
								$updateButton.removeClass( 'loading' ).addClass( 'success' );

								const messageElement = document.createElement( 'p' );
								messageElement.appendChild( document.createTextNode( response.data.message ) );

								$( '#refraction_upgrade_fa_button' ).parent().append( messageElement );

								if ( redirectUrl ) {
									location.href = decodeURIComponent( redirectUrl );

									return;
								}

								history.go( -1 );
							} )
							.fail( function() {
								$updateButton.removeClass( 'loading' ).addClass( 'error' );
							} );
					},
					onCancel: () => {
						$updateButton.removeClass( 'loading' ).addClass( 'error' );
					},
				} ).show();
			} );

			self.elements.$settingsTabs.on( {
				click( event ) {
					event.preventDefault();

					self.activateSettingsTab( event.currentTarget );

					event.currentTarget.focus();
				},
				focus() {
					self.activateSettingsTab( this );
				},
			} );

			$( 'select.refraction-rollback-select' ).on( 'change', function() {
				var $this = $( this ),
					$rollbackButton = $this.next( '.refraction-rollback-button' ),
					placeholderText = $rollbackButton.data( 'placeholder-text' ),
					placeholderUrl = $rollbackButton.data( 'placeholder-url' );

				$rollbackButton.html( placeholderText.replace( '{VERSION}', $this.val() ) );
				$rollbackButton.data( 'href', placeholderUrl.replace( 'VERSION', $this.val() ) );
			} ).trigger( 'change' );

			$( '.refraction-rollback-button' ).on( 'click', function( event ) {
				event.preventDefault();

				var $this = $( this );

				refractionCommon.dialogsManager.createWidget( 'confirm', {
					headerMessage: __( 'Rollback to Previous Version', 'refraction' ),
					message: __( 'Are you sure you want to reinstall previous version?', 'refraction' ),
					strings: {
						confirm: __( 'Continue', 'refraction' ),
						cancel: __( 'Cancel', 'refraction' ),
					},
					onConfirm() {
						$this.addClass( 'loading' );

						location.href = $this.data( 'href' );
					},
				} ).show();
			} );

			self.elements.$reMigrateGlobalsButton.on( 'click', ( event ) => {
				event.preventDefault();

				const $this = $( event.currentTarget );

				refractionCommon.dialogsManager.createWidget( 'confirm', {
					headerMessage: __( 'Migrate to v3.0', 'refraction' ),
					message: __( 'Please note that this process will revert all changes made to Global Colors and Fonts since upgrading to v3.x.', 'refraction' ),
					strings: {
						confirm: __( 'Continue', 'refraction' ),
						cancel: __( 'Cancel', 'refraction' ),
					},
					onConfirm: () => {
						$this.removeClass( 'success' ).addClass( 'loading' );

						refractionCommon.ajax.addRequest( 're_migrate_globals', {
							success: () => $this.removeClass( 'loading' ).addClass( 'success' ),
						} );
					},
				} ).show();
			} );

			$( '.refraction_google_font select' ).on( 'change', function() {
				$( '.refraction_font_display' ).toggle( '1' === $( this ).val() );
			} ).trigger( 'change' );
		},

		onInit() {
			refractionModules.ViewModule.prototype.onInit.apply( this, arguments );

			this.initTemplatesImport();

			this.initMaintenanceMode();

			this.goToSettingsTabFromHash();

			this.openLinksInNewTab();

			this.addUserAgentClasses();

			this.roleManager.init();

			if ( refractionCommon.config.experimentalFeatures[ 'landing-pages' ] ) {
				new LandingPagesModule();
			}

			if ( refractionCommon.config.experimentalFeatures.container ) {
				new FloatingButtonsHandler();
			}

			this.templateControls = new TemplateControls();

			new ExperimentsModule();
		},

		addUserAgentClasses() {
			const body = document.querySelector( 'body' );
			Object.entries( environment ).forEach( ( [ key, value ] ) => {
				if ( ! value ) {
					return;
				}

				body.classList.add( 'e--ua-' + key );
			} );
		},

		/**
		 * Open Links in New Tab
		 *
		 * Adds a `target="_blank"` attribute to the Admin Dashboard menu items specified in the `elements` array,
		 * if the elements are found in the DOM. The items in the `elements` array should be jQuery instances.
		 *
		 * @since 3.6.0
		 */
		openLinksInNewTab() {
			const elements = [
				this.elements.$menuGoProLink,
			];

			elements.forEach( ( $element ) => {
				// Only add the attribute if the element is found.
				if ( $element.length ) {
					$element.attr( 'target', '_blank' );
				}
			} );
		},

		initTemplatesImport() {
			const canImport = refractionAdminConfig.user.is_administrator || ( refractionAdminConfig.user.restrictions?.includes( 'json-upload' ) ?? false );

			if ( ! canImport || ! refractionCommon.elements.$body.hasClass( 'post-type-refraction_library' ) ) {
				return;
			}

			if ( 0 === this.elements.$importNowButton.length ) {
				return;
			}

			const self = this,
				$importForm = self.elements.$importForm,
				$importButton = self.elements.$importButton,
				$importArea = self.elements.$importArea,
				$importNowButton = self.elements.$importNowButton,
				$importFormFileInput = self.elements.$importFormFileInput;

			self.elements.$formAnchor = $( '.wp-header-end' );

			$( '#wpbody-content' ).find( '.page-title-action' ).first().before( $importButton );

			self.elements.$formAnchor.after( $importArea );

			$importButton.on( 'click', function() {
				$( '#refraction-import-template-area' ).toggle();
			} );

			const messages = {
				jsonUploadWarning: {
					shown: false,
				},
				enableUnfilteredFiles: {
					shown: false,
				},
			};
			const originalButtonValue = $importNowButton[ 0 ].value;

			$importForm.on( 'submit', async ( event ) => {
				$importNowButton[ 0 ].disabled = true;
				$importNowButton[ 0 ].value = __( 'Importing...', 'refraction' );

				if ( ! messages.jsonUploadWarning.shown ) {
					event.preventDefault();

					try {
						await showJsonUploadWarningMessageIfNeeded( {
							IntroductionClass: window.refractionModules.admin.utils.Introduction,
							introductionMap: window.refractionAdmin.config.user.introduction,
							waitForSetViewed: true,
						} );

						messages.jsonUploadWarning.shown = true;
						$importForm.trigger( 'submit' );
					} catch ( e ) {
						$importNowButton[ 0 ].disabled = false;
						$importNowButton[ 0 ].value = originalButtonValue;
					}

					return;
				}

				const hasImportedFiles = $importFormFileInput[ 0 ].files.length;
				const areUnfilteredFilesEnabled = refractionCommon.config.filesUpload.unfilteredFiles;

				if ( hasImportedFiles && ! areUnfilteredFilesEnabled && ! messages.enableUnfilteredFiles.shown ) {
					event.preventDefault();

					const enableUnfilteredFilesModal = FilesUploadHandler.getUnfilteredFilesNotEnabledImportTemplateDialog( () => {
						messages.enableUnfilteredFiles.shown = true;
						$importForm.trigger( 'submit' );
					} );

					enableUnfilteredFilesModal.show();

					return;
				}

				messages.jsonUploadWarning.shown = false;
				messages.enableUnfilteredFiles.shown = false;
			} );
		},

		initMaintenanceMode() {
			var MaintenanceMode = require( 'refraction-admin/maintenance-mode' );

			this.maintenanceMode = new MaintenanceMode();
		},

		isRefractionMode() {
			return ! ! this.elements.$switchModeInput.val();
		},

		animateLoader() {
			this.elements.$goToEditLink.addClass( 'refraction-animate' );
		},

		activateSettingsTab( tabElement ) {
			if ( ! tabElement?.hash ) {
				return;
			}

			const hrefWithoutHash = location.href.replace( /#.*/, '' );

			history.pushState( {}, '', hrefWithoutHash + tabElement.hash );

			this.goToSettingsTabFromHash();
		},

		goToSettingsTabFromHash() {
			var hash = location.hash.slice( 1 );

			if ( hash ) {
				this.goToSettingsTab( hash );
			}
		},

		goToSettingsTab( tabName ) {
			const $pages = this.elements.$settingsFormPages;

			if ( ! $pages.length ) {
				return;
			}

			const $activePage = $pages.filter( '#' + tabName );

			this.elements.$activeSettingsPage.removeClass( 'refraction-active' );

			this.elements.$activeSettingsTab.removeClass( 'nav-tab-active' );

			const $activeTab = this.elements.$settingsTabs.filter( '#refraction-settings-' + tabName );

			$activePage.addClass( 'refraction-active' );

			$activeTab.addClass( 'nav-tab-active' );

			this.elements.$settingsForm.attr( 'action', 'options.php#' + tabName );

			this.elements.$activeSettingsPage = $activePage;

			this.elements.$activeSettingsTab = $activeTab;
		},

		translate( stringKey, templateArgs ) {
			return refractionCommon.translate( stringKey, null, templateArgs, this.config.i18n );
		},

		roleManager: {
			selectors: {
				body: 'refraction-role-manager',
				row: '.refraction-role-row',
				label: '.refraction-role-label',
				excludedIndicator: '.refraction-role-excluded-indicator',
				excludedField: 'input[name="refraction_exclude_user_roles[]"]',
				controlsContainer: '.refraction-role-controls',
				toggleHandle: '.refraction-role-toggle',
				arrowUp: 'dashicons-arrow-up',
				arrowDown: 'dashicons-arrow-down',
			},
			toggle( $trigger ) {
				var self = this,
					$row = $trigger.closest( self.selectors.row ),
					$toggleHandleIcon = $row.find( self.selectors.toggleHandle ).find( '.dashicons' ),
					$controls = $row.find( self.selectors.controlsContainer );

				$controls.toggleClass( 'hidden' );
				if ( $controls.hasClass( 'hidden' ) ) {
					$toggleHandleIcon.removeClass( self.selectors.arrowUp ).addClass( self.selectors.arrowDown );
				} else {
					$toggleHandleIcon.removeClass( self.selectors.arrowDown ).addClass( self.selectors.arrowUp );
				}
				self.updateLabel( $row );
			},
			updateLabel( $row ) {
				var self = this,
					$indicator = $row.find( self.selectors.excludedIndicator ),
					excluded = $row.find( self.selectors.excludedField ).is( ':checked' );
				if ( excluded ) {
					$indicator.html( $indicator.data( 'excluded-label' ) );
				} else {
					$indicator.html( '' );
				}
				self.setAdvancedState( $row, excluded );
			},
			setAdvancedState( $row, state ) {
				var self = this,
					$controls = $row.find( 'input[type="checkbox"]' ).not( self.selectors.excludedField );

				$controls.each( function( index, input ) {
					$( input ).prop( 'disabled', state );
				} );
			},
			bind() {
				var self = this;
				$( document ).on( 'click', self.selectors.label + ',' + self.selectors.toggleHandle, function( event ) {
					event.stopPropagation();
					event.preventDefault();
					self.toggle( $( this ) );
				} ).on( 'change', self.selectors.excludedField, function() {
					self.updateLabel( $( this ).closest( self.selectors.row ) );
				} );
			},
			init() {
				var self = this;
				if ( ! $( 'body[class*="' + self.selectors.body + '"]' ).length ) {
					return;
				}
				self.bind();
				$( self.selectors.row ).each( function( index, row ) {
					self.updateLabel( $( row ) );
				} );
			},
		},
	} );

	$( function() {
		window.refractionAdmin = new RefractionAdmin();

		Events.dispatch( refractionCommon.elements.$window, 'refraction/admin/init' );
	} );
}( jQuery ) );
