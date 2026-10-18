import { Empty as _Empty } from 'refraction-document/elements/commands';
import ElementsHelper from '../helper';

export const Empty = () => {
	QUnit.module( 'Empty', () => {
		QUnit.test( 'Single Selection', ( assert ) => {
			const eColumn = ElementsHelper.createSection( 1, true );

			ElementsHelper.createWidgetButton( eColumn );
			ElementsHelper.createWidgetButton( eColumn );

			// Ensure editor saver.
			$e.internal( 'document/save/set-is-modified', { status: false } );

			ElementsHelper.empty();

			// Check.
			assert.equal( refraction.getPreviewContainer().children.length, 0,
				'all elements were removed.' );
			assert.equal( refraction.saver.isEditorChanged(), true, 'Command applied the saver editor is changed.' );
		} );

		QUnit.test( 'Restore()', ( assert ) => {
			const random = Math.random(),
				historyItem = {
					get: ( key ) => {
						if ( 'data' === key ) {
							return random;
						}
					},
				};

			let orig = $e.run,
				tempCommand = '';

			// TODO: Do not override '$e.run', use 'on' method instead.
			$e.run = ( command ) => {
				tempCommand = command;
			};

			// Redo: `true`
			_Empty.restore( historyItem, true );

			$e.run = orig;

			assert.equal( tempCommand, 'document/elements/empty' );

			const addChildModelOrig = refraction.getPreviewView().addChildModel;

			// Clear.
			orig = $e.run;
			tempCommand = '';

			let tempData = '';

			refraction.getPreviewView().addChildModel = ( data ) => tempData = data;

			// TODO: Do not override '$e.run', use 'on' method instead.
			$e.run = ( command ) => {
				tempCommand = command;
			};

			// Redo: `false`
			_Empty.restore( historyItem, false );

			$e.run = orig;

			refraction.getPreviewView().addChildModel = addChildModelOrig;

			assert.equal( tempData, random );
		} );
	} );
};

export default Empty;
