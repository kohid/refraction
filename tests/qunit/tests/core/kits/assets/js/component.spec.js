import * as ajax from 'refraction/tests/qunit/mock/ajax';
import * as eData from 'refraction/tests/qunit/mock/e-data';
import * as hooks from './hooks/index.spec';
import DocumentHelper from 'refraction/tests/qunit/tests/assets/dev/js/editor/document/helper';

QUnit.module( 'Component: panel/global', () => {
	QUnit.module( 'hooks', ( qunitHooks ) => {
		qunitHooks.before( async () => {
			// Hook `refractionCommon.ajax.send` mock.
			ajax.mock();

			// Default addMock callback is return args.data merged with args.query.
			eData.addMock( 'get', 'globals/index' );
			eData.attachMock();

			await $e.run( 'panel/global/open' );
			ajax.silence();
		} );

		qunitHooks.after( async () => {
			ajax.mock();
			await $e.run( 'panel/global/close', { mode: 'discard' } );
			ajax.silence();

			// Hook `refractionCommon.ajax.send` silence (empty function).
			eData.emptyFetch();

			eData.removeMock( 'get', 'globals/index' );
		} );

		DocumentHelper.testCommands( hooks );
	} );
} );
