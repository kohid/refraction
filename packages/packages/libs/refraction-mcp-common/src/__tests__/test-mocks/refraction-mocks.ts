import type { RefractionContainer } from '../../types';
import { refractionCommon } from './refraction-common';

interface MockRefractionControl {
	type?: string;
	default?: unknown;
	options?: Record< string, string > | undefined;
	return_value?: string | undefined;
	fields?: Record< string, Partial< MockRefractionControl > > | undefined;
	size_units?: string[] | undefined;
	range?: { min?: number; max?: number; step?: number } | undefined;
	[ key: string ]: unknown;
}

interface MockRefractionWidget {
	controls: Record< string, MockRefractionControl >;
}

interface MockRefractionDocuments {
	getCurrent: jest.Mock< MockRefractionDocument | null >;
}

interface MockRefraction {
	documents: MockRefractionDocuments;
	getContainer: jest.Mock< RefractionContainer | null, [ string ] >;
	widgetsCache: Record< string, MockRefractionWidget >;
	config: {
		controls: Record< string, MockRefractionControl >;
	};
}

interface MockRefractionDocument {
	id: string;
	history: {
		active: boolean;
		setActive: jest.Mock;
	};
	config: {
		type: string;
		settings: {
			settings: {
				post_title: string;
			};
		};
	};
	container: RefractionContainer;
}

export function createMockContainer( overrides: Partial< Record< string, unknown > > = {} ): RefractionContainer {
	const defaultContainer = {
		id: 'test-container-id',
		type: 'widget',
		model: {
			get: jest.fn(),
			widgetType: 'heading',
			attributes: {
				id: 'test-container-id',
				elType: 'widget',
				widgetType: 'heading',
				title: 'Test Heading',
			},
		},
		view: {
			el: document.createElement( 'div' ),
		},
		settings: {
			attributes: {
				text: 'Test heading text',
				size: 'large',
			},
			controls: {},
			get: jest.fn(),
			toJSON: jest.fn( () => ( {} ) ),
		},
		children: [],
		parent: null,
		globals: {
			get: jest.fn(),
			set: jest.fn(),
		},
	};

	return { ...defaultContainer, ...overrides } as unknown as RefractionContainer;
}

export function createMockDocument( overrides: Partial< MockRefractionDocument > = {} ): MockRefractionDocument {
	const defaultDocument: MockRefractionDocument = {
		id: 'test-document-id',
		history: {
			active: false,
			setActive: jest.fn(),
		},
		config: {
			type: 'wp-page',
			settings: {
				settings: {
					post_title: 'Test Page',
				},
			},
		},
		container: createMockContainer(),
	};

	return { ...defaultDocument, ...overrides };
}

export function createMockRefraction( overrides: Partial< MockRefraction > = {} ): MockRefraction {
	const defaultRefraction: MockRefraction = {
		documents: {
			getCurrent: jest.fn( () => createMockDocument() ),
		},
		getContainer: jest.fn( ( id: string ) => ( id === 'test-container-id' ? createMockContainer() : null ) ),
		config: {
			controls: {
				text: { type: 'text' },
				select: { type: 'select' },
				color: { type: 'color' },
				repeater: { type: 'repeater' },
				dimensions: { type: 'dimensions' },
			},
		},
		widgetsCache: {
			heading: {
				controls: {
					text: {
						type: 'text',
						default: 'Default heading',
					},
					size: {
						type: 'select',
						default: 'medium',
						options: {
							small: 'Small',
							medium: 'Medium',
							large: 'Large',
						},
					},
					color: {
						type: 'color',
						default: '#000000',
						return_value: 'yes',
					},
					repeater_field: {
						type: 'repeater',
						default: [],
						fields: {
							item_text: {
								default: 'Item text',
							},
							item_link: {
								default: '',
							},
						},
					},
				},
			},
		},
	};

	return { ...defaultRefraction, ...overrides };
}

export interface RefractionMockSetup {
	mockRefraction: MockRefraction;
	mockRefractionCommon: typeof refractionCommon;
	mockDocument: MockRefractionDocument;
	mockContainer: RefractionContainer;
}

export function setupRefractionMocks(
	overrides: {
		refraction?: Partial< MockRefraction >;
		refractionCommon?: Partial< typeof refractionCommon >;
		document?: Partial< MockRefractionDocument >;
		container?: Partial< Record< string, unknown > >;
	} = {}
): RefractionMockSetup {
	const mockContainer = createMockContainer( overrides.container );
	const mockDocument = createMockDocument( overrides.document );
	const mockRefraction = createMockRefraction( {
		...overrides.refraction,
		documents: {
			getCurrent: jest.fn( () => mockDocument ),
			...overrides.refraction?.documents,
		},
		getContainer: jest.fn( ( id: string ) =>
			id === ( mockContainer as unknown as { id: string } ).id ? mockContainer : null
		),
		...overrides.refraction,
	} );
	const mockRefractionCommon = { ...refractionCommon, ...overrides.refractionCommon };

	Object.defineProperty( window, 'refraction', {
		value: mockRefraction,
		writable: true,
		configurable: true,
	} );

	Object.defineProperty( window, 'refractionCommon', {
		value: mockRefractionCommon,
		writable: true,
		configurable: true,
	} );

	return {
		mockRefraction,
		mockRefractionCommon,
		mockDocument,
		mockContainer,
	};
}

export function cleanupRefractionMocks() {
	Object.defineProperty( window, 'refraction', {
		value: undefined,
		writable: true,
		configurable: true,
	} );

	Object.defineProperty( window, 'refractionCommon', {
		value: undefined,
		writable: true,
		configurable: true,
	} );
}

export function createContainerMock( children: RefractionContainer[] = [] ): RefractionContainer {
	return createMockContainer( {
		model: {
			get: jest.fn(),
			widgetType: '',
			attributes: {
				id: 'container-id',
				elType: 'container',
			},
		},
		children,
	} );
}
