import * as React from 'react';
import { renderWithStore } from 'test-utils';
import { useUserStylesCapability } from '@refraction/editor-styles-repository';
import { QueryClient, QueryClientProvider } from '@refraction/query';
import { setSessionStorageItem } from '@refraction/session';
import { __createStore as createStore, __registerSlice as registerSlice, type Store } from '@refraction/store';
import { act, screen } from '@testing-library/react';

import { DefaultStylesTabEmbedded } from '../components/default-styles-tab-embedded';
import { slice } from '../store';

jest.mock( '@refraction/editor-styles-repository', () => ( {
	...jest.requireActual( '@refraction/editor-styles-repository' ),
	useUserStylesCapability: jest.fn( () => ( {
		userCan: () => ( {
			create: true,
			delete: true,
			update: true,
			updateProps: true,
		} ),
	} ) ),
} ) );

jest.mock( '@refraction/editor-controls', () => ( {
	ControlActionsProvider: ( { children }: React.PropsWithChildren ) => children,
	ControlReplacementsProvider: ( { children }: React.PropsWithChildren ) => children,
	getControlReplacements: () => ( {} ),
} ) );

jest.mock( '@refraction/editor-editing-panel', () => ( {
	ClassesPropProvider: ( { children }: React.PropsWithChildren ) => children,
	CreatableAutocomplete: ( { selected }: { selected: { label: string }[] } ) => <div>{ selected[ 0 ]?.label }</div>,
	ElementProvider: ( { children }: React.PropsWithChildren ) => children,
	SectionsList: ( { children }: React.PropsWithChildren ) => children,
	StyleInheritanceProvider: ( { children }: React.PropsWithChildren ) => children,
	StyleProvider: ( { children }: React.PropsWithChildren ) => children,
	StyleSections: () => null,
	StyleTabSlot: () => null,
} ) );

jest.mock( '@refraction/editor-responsive', () => ( {
	useActiveBreakpoint: () => 'desktop',
} ) );

jest.mock( '@refraction/menus', () => ( {
	controlActionsMenu: {
		useMenuItems: () => ( { default: [] } ),
	},
} ) );

jest.mock( '@refraction/editor-ui', () => ( {
	...jest.requireActual( '@refraction/editor-ui' ),
	ThemeProvider: ( { children }: { children: React.ReactNode } ) => <>{ children }</>,
} ) );

jest.mock( '../allowed-tags', () => ( {
	getAllowedDefaultStyleTags: () => [ 'h1', 'h2', 'h3' ],
	getDefaultActiveTag: ( tags: string[] ) => tags[ 0 ],
	isAllowedDefaultStyleTag: ( tag: string, tags: string[] ) => tags.includes( tag ),
} ) );

jest.mock( '../save-default-styles', () => ( {
	saveDefaultStyles: jest.fn(),
} ) );

describe( 'DefaultStylesTabEmbedded', () => {
	let store: Store;
	const queryClient = new QueryClient( {
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	} );

	beforeEach( () => {
		jest.mocked( useUserStylesCapability ).mockReturnValue( {
			userCan: () => ( {
				create: true,
				delete: true,
				update: true,
				updateProps: true,
			} ),
		} );

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
						allowed_tags: [ 'h1', 'h2', 'h3' ],
					},
				},
			},
		};

		registerSlice( slice );
		store = createStore();
		sessionStorage.clear();
	} );

	it( 'should render the stored active tag on the first paint', () => {
		setSessionStorageItem( 'default-styles/last-active-tag', 'h3' );

		renderWithStore(
			<QueryClientProvider client={ queryClient }>
				<DefaultStylesTabEmbedded onRequestClose={ jest.fn() } />
			</QueryClientProvider>,
			store
		);

		expect( screen.getByText( 'h3' ) ).toBeInTheDocument();
	} );

	it( 'should expose a close attempt that calls onRequestClose when clean', () => {
		const onRequestClose = jest.fn();
		let closeAttempt: ( () => void ) | null = null;

		renderWithStore(
			<QueryClientProvider client={ queryClient }>
				<DefaultStylesTabEmbedded
					onRequestClose={ onRequestClose }
					onExposeCloseAttempt={ ( fn ) => {
						closeAttempt = fn;
					} }
				/>
			</QueryClientProvider>,
			store
		);

		act( () => {
			closeAttempt?.();
		} );

		expect( onRequestClose ).toHaveBeenCalled();
	} );

	it( 'should expose a close attempt that opens save dialog when dirty', () => {
		const onRequestClose = jest.fn();
		let closeAttempt: ( () => void ) | null = null;

		renderWithStore(
			<QueryClientProvider client={ queryClient }>
				<DefaultStylesTabEmbedded
					onRequestClose={ onRequestClose }
					onExposeCloseAttempt={ ( fn ) => {
						closeAttempt = fn;
					} }
				/>
			</QueryClientProvider>,
			store
		);

		act( () => {
			store.dispatch(
				slice.actions.load( {
					data: {
						h1: {
							id: 'h1',
							label: 'h1',
							type: 'class',
							variants: [],
						},
					},
				} )
			);
			store.dispatch(
				slice.actions.update( {
					style: {
						id: 'h1',
						label: 'h1',
						type: 'class',
						variants: [
							{
								meta: { breakpoint: 'desktop', state: null },
								props: {},
								custom_css: null,
							},
						],
					},
				} )
			);
		} );

		act( () => {
			closeAttempt?.();
		} );

		expect( screen.getByRole( 'dialog', { name: 'You have unsaved changes' } ) ).toBeInTheDocument();
		expect( onRequestClose ).not.toHaveBeenCalled();
	} );

	it( 'should render a save changes button', () => {
		renderWithStore(
			<QueryClientProvider client={ queryClient }>
				<DefaultStylesTabEmbedded onRequestClose={ jest.fn() } />
			</QueryClientProvider>,
			store
		);

		expect( screen.getByRole( 'button', { name: 'Save changes' } ) ).toBeDisabled();
	} );

	it( 'should hide the save changes button when the user cannot edit default styles', () => {
		jest.mocked( useUserStylesCapability ).mockReturnValue( {
			userCan: () => ( {
				create: false,
				delete: false,
				update: false,
				updateProps: false,
			} ),
		} );

		renderWithStore(
			<QueryClientProvider client={ queryClient }>
				<DefaultStylesTabEmbedded onRequestClose={ jest.fn() } />
			</QueryClientProvider>,
			store
		);

		expect( screen.queryByRole( 'button', { name: 'Save changes' } ) ).not.toBeInTheDocument();
	} );
} );
