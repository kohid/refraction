import API from 'refraction-api/api';

jQuery( () => {
	QUnit.module( 'File: core/kits/assets/js/manager.js', ( hooks ) => {
		const eOrig = $e,
			refractionConfigUserOrig = refraction.config.user;

		hooks.beforeEach( () => {
			window.$e = new API();
		} );

		hooks.afterEach( () => {
			window.$e = eOrig;

			refraction.config.user = refractionConfigUserOrig;
		} );

		QUnit.test( 'Initialize() - Validate component available - User can edit kit', ( assert ) => {
			// Arrange.
			refraction.config.user.can_edit_kit = true;

			// Act.
			refraction.kitManager.initialize();

			// Assert.
			assert.true( !! $e.components.get( 'panel/global' ) );
		} );

		QUnit.test( 'Initialize() - Validate component not available - User cannot edit kit', ( assert ) => {
			// Arrange.
			refraction.config.user.can_edit_kit = false;

			// Act.
			refraction.kitManager.initialize();

			// Assert.
			assert.false( !! $e.components.get( 'panel/global' ) );
		} );
	} );
} );
