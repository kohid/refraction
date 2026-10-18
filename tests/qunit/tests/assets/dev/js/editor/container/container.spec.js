import ElementsHelper from 'refraction/tests/qunit/tests/assets/dev/js/editor/document/elements/helper';
import GlobalsHelper from 'refraction/tests/qunit/tests/assets/dev/js/editor/document/globals/helper';
import DynamicHelper from 'refraction/tests/qunit/tests/assets/dev/js/editor/document/dynamic/helper';

require( './model/children-array.spec' );

jQuery( () => {
	QUnit.module( 'File: assets/dev/js/editor/container/container.js', () => {
		QUnit.test( 'constructor()', ( assert ) => {
			const fakeArgs = {
					type: 'fake',
					id: 'fake',
					settings: new Backbone.Model(),
					model: new Backbone.Model(),
					label: 'Fake Label',
					parent: false,
				},
				container = new refractionModules.editor.Container( fakeArgs );

			assert.equal( !! container, true );
		} );

		QUnit.test( 'constructor(): without args', ( assert ) => {
			assert.throws(
				() => {
					new refractionModules.editor.Container( {} );
				},
				new Error( 'type is required.' ),
			);
		} );

		QUnit.test( 'getGroupRelatedControls(): Simple', ( assert ) => {
			const excepted = [ 'typography_typography', 'typography_font_family', 'typography_font_size', 'typography_font_size_tablet', 'typography_font_size_mobile', 'typography_font_weight', 'typography_text_transform', 'typography_font_style', 'typography_text_decoration', 'typography_line_height', 'typography_line_height_tablet', 'typography_line_height_mobile', 'typography_letter_spacing', 'typography_letter_spacing_tablet', 'typography_letter_spacing_mobile', 'button_text_color' ],
				settings = {
					typography_typography: '',
					button_text_color: '',
				},
				eButton = ElementsHelper.createWrappedButton(),
				controls = eButton.getGroupRelatedControls( settings );

			assert.deepEqual( Object.keys( controls ), excepted );
		} );

		QUnit.test( 'getAffectingControls(): Simple', ( assert ) => {
			const eButtonSimple = ElementsHelper.createWrappedButton(),
				eButtonStyled = ElementsHelper.createWrappedButton( null, {
					text: 'createAutoButtonStyled',
					background_color: '#000000',
				} );

			assert.deepEqual( eButtonSimple.getAffectingControls(), {} );
			assert.deepEqual( Object.keys( eButtonStyled.getAffectingControls() ), [ 'text', 'background_color' ] );
		} );

		QUnit.test( 'getAffectingControls(): Ensure global control', ( assert ) => {
			// Arrange.
			const eButton = ElementsHelper.createWrappedButton(),
				id = refractionCommon.helpers.getUniqueId(),
				background_color = `globals/colors?id=${ id }`; // eslint-disable-line camelcase

			eButton.controls.background_color.global = {};

			$e.data.setCache( $e.components.get( 'globals' ), 'globals/colors', {}, {
				[ id ]: {
					id,
					// eslint-disable-next-line camelcase
					value: background_color,
				},
			} );

			// eslint-disable-next-line camelcase
			GlobalsHelper.enable( eButton, { background_color } );

			// Act.
			const controls = eButton.getAffectingControls();

			// Assert.
			assert.equal( controls.background_color.global.utilized, true );
		} );

		QUnit.test( 'getAffectingControls(): Ensure dynamic control', ( assert ) => {
			// Arrange.
			const eButton = ElementsHelper.createWrappedButton(),
				dynamicTag = '[refraction-tag id="33e3c57" name="post-custom-field" settings="%7B%7D"]',
				dynamicValue = '{ dynamic text }',
				{ id, name, settings } = refraction.dynamicTags.tagTextToTagData( dynamicTag ),
				tag = refraction.dynamicTags.createTag( id, name, settings ),
				key = refraction.dynamicTags.createCacheKey( tag );

			// Set fake data.
			refraction.dynamicTags.cache[ key ] = dynamicValue;

			DynamicHelper.enable( eButton, {
				text: dynamicTag,
			} );

			// Act.
			const controls = eButton.getAffectingControls();

			// Assert.
			assert.equal( controls.text.dynamic.utilized, true );
		} );

		QUnit.test( 'getParentAncestry(): simple', ( assert ) => {
			// Arrange.
			const eButton = ElementsHelper.createAuto( 'widget', 'button' );

			// Act.
			const ancestry = eButton.getParentAncestry();

			// Assert.
			assert.equal( ancestry.length, 4 /* Document>section>column>widget */ );
		} );
	} );
} );

