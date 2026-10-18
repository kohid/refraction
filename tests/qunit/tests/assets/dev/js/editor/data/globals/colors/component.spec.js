import DocumentHelper from 'refraction/tests/qunit/tests/assets/dev/js/editor/document/helper';
import * as commands from './commands/index.spec';

QUnit.module( 'Component: globals/colors', () => {
	DocumentHelper.testCommands( commands );
} );
