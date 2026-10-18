import { stylesRepository } from '@refraction/editor-styles-repository';
import { __createStore as createStore, __registerSlice as registerSlice } from '@refraction/store';

import { DEFAULT_STYLES_PROVIDER_KEY, defaultStylesStylesProvider } from '../default-styles-provider';
import { slice } from '../store';

describe( 'defaultStylesStylesProvider', () => {
	beforeEach( () => {
		(
			window as unknown as {
				refraction: {
					config: {
						atomic: { default_styles: { allowed_tags: string[] } };
					};
				};
			}
		 ).refraction = {
			config: {
				atomic: {
					default_styles: {
						allowed_tags: [ 'h1', 'h2' ],
					},
				},
			},
		};

		registerSlice( slice );
		createStore();
		stylesRepository.register( defaultStylesStylesProvider );
	} );
	it( 'registers with priority between base and global', () => {
		const provider = stylesRepository
			.getProviders()
			.find( ( entry ) => entry.getKey() === DEFAULT_STYLES_PROVIDER_KEY );

		expect( provider ).toBeDefined();
		expect( provider?.priority ).toBe( 15 );
	} );

	it( 'requires manage_options for write actions', () => {
		expect( defaultStylesStylesProvider.capabilities ).toEqual( {
			update: 'manage_options',
			create: 'manage_options',
			delete: 'manage_options',
			updateProps: 'manage_options',
		} );
	} );

	it( 'returns class style definitions with prefixed cssName from all()', () => {
		const all = defaultStylesStylesProvider.actions.all();

		expect( all.length ).toBeGreaterThan( 0 );
		expect( all[ 0 ].type ).toBe( 'class' );
		expect( all[ 0 ].id ).toBeTruthy();
		expect( defaultStylesStylesProvider.actions.resolveCssName( all[ 0 ].id ) ).toBe(
			`e-default-${ all[ 0 ].id }`
		);
	} );
} );
