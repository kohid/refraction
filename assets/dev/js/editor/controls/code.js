var ControlBaseDataView = require( 'refraction-controls/base-data' ),
	ControlCodeEditorItemView;

ControlCodeEditorItemView = ControlBaseDataView.extend( {
	ui() {
		var ui = ControlBaseDataView.prototype.ui.apply( this, arguments );

		ui.editor = '.refraction-code-editor';

		return ui;
	},

	onReady() {
		var self = this;

		if ( 'undefined' === typeof ace ) {
			return;
		}

		const langTools = ace.require( 'ace/ext/language_tools' ),
			uiTheme = refraction.settings.editorPreferences.model.get( 'ui_theme' ),
			userPrefersDark = matchMedia( '(prefers-color-scheme: dark)' ).matches;

		self.editor = ace.edit( this.ui.editor[ 0 ] );

		// Since the code control is wrapped with a dynamic div, the class refraction-control-tag-area need to be had dynamically to handle the dynamic tag functionality.
		jQuery( self.editor.container ).addClass( 'e-input-style refraction-code-editor refraction-control-tag-area' );

		self.editor.setOptions( {
			mode: 'ace/mode/' + self.model.attributes.language,
			minLines: 10,
			maxLines: Infinity,
			showGutter: true,
			useWorker: true,
			enableBasicAutocompletion: true,
			enableLiveAutocompletion: true,
		} );

		if ( 'dark' === uiTheme || ( 'auto' === uiTheme && userPrefersDark ) ) {
			self.editor.setTheme( 'ace/theme/merbivore_soft' );
		}

		self.editor.getSession().setUseWrapMode( true );

		refraction.panel.$el.on( 'resize.aceEditor', self.onResize.bind( this ) );

		if ( 'css' === self.model.attributes.language ) {
			var selectorCompleter = {
				getCompletions( editor, session, pos, prefix, callback ) {
					var list = [],
						token = session.getTokenAt( pos.row, pos.column );

					if ( 0 < prefix.length && 'selector'.match( prefix ) && 'constant' === token.type ) {
						list = [ {
							name: 'selector',
							value: 'selector',
							score: 1,
							meta: 'Refraction',
						} ];
					}

					callback( null, list );
				},
			};

			langTools.addCompleter( selectorCompleter );
		}

		self.editor.setValue( self.getControlValue(), -1 ); // -1 =  move cursor to the start

		if ( this.isEditable() ) {
			self.editor.on( 'change', function() {
				self.setValue( self.editor.getValue() );
			} );
		}

		if ( 'html' === self.model.attributes.language ) {
			// Remove the `doctype` annotation
			var session = self.editor.getSession();

			session.on( 'changeAnnotation', function() {
				var annotations = session.getAnnotations() || [],
					annotationsLength = annotations.length,
					index = annotations.length;

				while ( index-- ) {
					if ( /doctype first\. Expected/.test( annotations[ index ].text ) ) {
						annotations.splice( index, 1 );
					}
				}

				if ( annotationsLength > annotations.length ) {
					session.setAnnotations( annotations );
				}
			} );
		}
	},

	onResize() {
		this.editor.resize();
	},

	onDestroy() {
		refraction.panel.$el.off( 'resize.aceEditor' );
	},

	isEditable() {
		const isEditable = this.model.get( 'is_editable' );

		return undefined !== isEditable ? isEditable : true;
	},
} );

module.exports = ControlCodeEditorItemView;
