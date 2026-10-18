/* global RefractionGutenbergSettings */
( function( $ ) {
	'use strict';

	var RefractionGutenbergApp = {

		cacheElements() {
			var self = this;

			self.isRefractionMode = RefractionGutenbergSettings.isRefractionMode;

			self.cache = {};

			self.cache.$gutenberg = $( '#editor' );
			self.cache.$switchMode = $( $( '#refraction-gutenberg-button-switch-mode' ).html() );
			self.cache.$switchModeButton = self.cache.$switchMode.find( '#refraction-switch-mode-button' );

			self.bindEvents();
			self.toggleStatus();

			wp.data.subscribe( function() {
				setTimeout( function() {
					self.buildPanel();
				}, 1 );
			} );
		},

		buildPanel() {
			var self = this;

			if ( ! self.cache.$gutenberg.find( '#refraction-switch-mode' ).length ) {
				self.cache.$gutenberg.find( '.edit-post-header-toolbar' ).append( self.cache.$switchMode );
			}

			if ( this.hasIframe() ) {
				this.handleIframe();
			}

			if ( ! $( '#refraction-editor' ).length ) {
				self.cache.$editorPanel = $( $( '#refraction-gutenberg-panel' ).html() );
				let editorButtonParent = self.cache.$gutenberg.find( '.block-editor-writing-flow' );
				if ( ! editorButtonParent.length ) {
					editorButtonParent = self.cache.$gutenberg.find( '.is-desktop-preview' );
				}

				self.cache.$gurenbergBlockList = editorButtonParent;
				self.cache.$gurenbergBlockList.append( self.cache.$editorPanel );

				self.cache.$editorPanelButton = self.cache.$editorPanel.find( '#refraction-go-to-edit-page-link' );

				self.cache.$editorPanelButton.on( 'click', function( event ) {
					event.preventDefault();

					self.handleEditButtonClick();
				} );
			}
		},

		handleIframe() {
			this.hideIframeContent();
			this.buildPanelTopBar();
		},

		// Sometimes Gutenberg uses iframe instead of div.
		hasIframe() {
			return !! this.cache.$gutenberg.find( 'iframe[name="editor-canvas"]' ).length;
		},

		hideIframeContent() {
			if ( ! this.isRefractionMode ) {
				return;
			}

			const style = `<style>
				.editor-post-text-editor,
				.block-editor-block-list__layout {
					display: none;
				}

				body {
					padding: 0 !important;
				}
			</style>`;

			this.cache.$gutenberg.find( 'iframe[name="editor-canvas"]' ).contents().find( 'body' ).append( style );
		},

		buildPanelTopBar() {
			var self = this;

			if ( ! $( '#refraction-edit-mode-button' ).length && this.isRefractionMode ) {
				self.cache.$editorBtnTop = $( $( '#refraction-gutenberg-button-tmpl' ).html() );
				self.cache.$gutenberg.find( '.edit-post-header-toolbar' ).append( self.cache.$editorBtnTop );

				$( '#refraction-edit-mode-button' ).on( 'click', function( event ) {
					event.preventDefault();

					self.handleEditButtonClick( false );
				} );
			}
		},

		handleEditButtonClick( withAnimation = true ) {
			var self = this;

			if ( withAnimation ) {
				self.animateLoader();
			}

			// A new post is initialized as an 'auto-draft'.
			// if the post is not a new post it should not save it to avoid some saving conflict between refraction and gutenberg.
			const isNewPost = 'auto-draft' === wp.data.select( 'core/editor' ).getCurrentPost().status;

			if ( isNewPost ) {
				var documentTitle = wp.data.select( 'core/editor' ).getEditedPostAttribute( 'title' );
				if ( ! documentTitle ) {
					wp.data.dispatch( 'core/editor' ).editPost( { title: 'Refraction #' + $( '#post_ID' ).val() } );
				}

				wp.data.dispatch( 'core/editor' ).savePost();
			}

			self.redirectWhenSave();
		},

		bindEvents() {
			var self = this;

			self.cache.$switchModeButton.on( 'click', function() {
				if ( self.isRefractionMode ) {
					refractionCommon.dialogsManager.createWidget( 'confirm', {
						message: __( 'You are about to switch this page from the Refraction editor to the WordPress editor. Your current layout, design, and content may break and need to be rebuilt. Are you sure you want to continue?', 'refraction' ),
						headerMessage: __( 'Edit with WordPress?', 'refraction' ),
						strings: {
							confirm: __( 'Continue', 'refraction' ),
							cancel: __( 'Cancel', 'refraction' ),
						},
						defaultOption: 'cancel',
						onConfirm() {
							const wpEditor = wp.data.dispatch( 'core/editor' );

							wpEditor.editPost( { gutenberg_refraction_mode: false } );
							wpEditor.savePost();
							self.isRefractionMode = ! self.isRefractionMode;
							self.toggleStatus();
						},
					} ).show();
				} else {
					self.isRefractionMode = ! self.isRefractionMode;
					self.toggleStatus();
					self.cache.$editorPanelButton.trigger( 'click' );
				}
			} );
		},

		redirectWhenSave() {
			var self = this;

			setTimeout( function() {
				if ( wp.data.select( 'core/editor' ).isSavingPost() ) {
					self.redirectWhenSave();
				} else {
					location.href = RefractionGutenbergSettings.editLink;
				}
			}, 300 );
		},

		animateLoader() {
			this.cache.$editorPanelButton.addClass( 'refraction-animate' );
		},

		toggleStatus() {
			jQuery( 'body' )
				.toggleClass( 'refraction-editor-active', this.isRefractionMode )
				.toggleClass( 'refraction-editor-inactive', ! this.isRefractionMode );
		},

		init() {
			this.cacheElements();
		},
	};

	$( function() {
		RefractionGutenbergApp.init();
	} );
}( jQuery ) );
