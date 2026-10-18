/**
 * @typedef {import('refraction/assets/dev/js/editor/elements/manager')} ElementsManager
 */

/**
 * @return {Promise<ElementsManager>}
 */
export async function setupMock() {
	const MockBackbone = {
		Model: class {
			extend() {
				return MockBackbone.Model;
			}
		},
	};

	global.Backbone = {
		Model: MockBackbone.Model,
	};

	global.refractionModules = {
		editor: {
			elements: {
				models: {
					get BaseSettings() {
						return {
							extend: jest.fn( () => {
								return {
									get: MockBackbone.Model,
								};
							} ),
						};
					},
				},
			},
		},

		ViewModule: {
			extend: () => class {},
		},

		Module: {
			extend: () => class {},
		},
	};

	jest.mock( 'refraction-elements/models/base-element-model', () => {
		return class {
			static extend() {
				return MockBackbone.Model;
			}
		};
	} );

	global._ = {
		noop: () => {},
	};

	global.Marionette = {
		ItemView: class {
			static extend() {
				return class {};
			}
		},
		CompositeView: {
			extend: () => class {},
		},
		CollectionView: class {},
		TemplateCache: {
			get: () => '',
		},
		Behavior: class {},
	};

	global.refractionCommon = {
		config: {
			experimentalFeatures: {
				container: false,
			},
		},
	};

	if ( ! global.window ) {
		global.window = {};
	}

	global.jQuery = {};

	jest.mock( 'refraction-views/base-container', () => {
		return {
			extend: () => class {},
		};
	} );

	jest.mock( 'refraction-elements/views/base', () => {
		return class {
			static extend() {
				return class {};
			}
		};
	} );

	jest.mock( 'refraction-elements/views/container/empty-component', () => {} );

	return new ( await import( 'refraction-elements/manager' ) ).default;
}

export function freeMock() {
	delete global.Backbone;
	delete global.refractionModules;
	delete global._;
	delete global.Marionette;
	delete global.refractionCommon;
	delete global.navigator;
	delete global.window;
	delete global.jQuery;

	jest.restoreAllMocks();
}
