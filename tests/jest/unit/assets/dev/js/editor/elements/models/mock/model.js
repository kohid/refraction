class Model {
	attributes = {};

	set( key, value ) {
		this.attributes[ key ] = value;
	}

	get( key ) {
		return this.attributes[ key ];
	}

	extend() {
		return MockBackbone.Model;
	}
}

/**
 * @return {Promise<Model>}
 */
export async function setupMock() {
	const MockBackbone = { Model };

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

	global.refraction = {
		getConfig: jest.fn( () => ( {
			elements: {
				section: {},
				container: {},
			},
		} ) ),
	};

	return new MockBackbone.Model;
}

export function freeMock() {
	delete global.Backbone;
	delete global.refractionModules;
	delete global._;
	delete global.refraction;

	jest.restoreAllMocks();
}
