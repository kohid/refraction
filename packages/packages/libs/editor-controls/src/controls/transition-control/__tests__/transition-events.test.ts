import { getSelectedElements } from '@refraction/editor-elements';
import { trackEvent } from '@refraction/events';

import { eventBus } from '../../../services/event-bus';
import { subscribeToTransitionEvent } from '../trainsition-events';

jest.mock( '@refraction/editor-elements', () => ( {
	...jest.requireActual( '@refraction/editor-elements' ),
	getSelectedElements: jest.fn(),
} ) );

jest.mock( '@refraction/events', () => ( {
	...jest.requireActual( '@refraction/events' ),
	trackEvent: jest.fn(),
} ) );

jest.mock( '../../../services/event-bus', () => ( {
	eventBus: {
		subscribe: jest.fn(),
		unsubscribe: jest.fn(),
	},
} ) );

describe( 'Transition Events', () => {
	// Arrange
	const mockGetSelectedElements = getSelectedElements as jest.MockedFunction< typeof getSelectedElements >;
	const mockTrackEvent = trackEvent as jest.MockedFunction< typeof trackEvent >;
	const mockEventBus = eventBus as jest.Mocked< typeof eventBus >;

	beforeEach( () => {
		jest.clearAllMocks();
	} );

	it( 'should subscribe to transition-item-added event', () => {
		// Act
		subscribeToTransitionEvent();

		// Assert
		expect( mockEventBus.subscribe ).toHaveBeenCalledWith( 'transition-item-added', expect.any( Function ) );
	} );

	it( 'should send mixpanel event with transition type when event is triggered', () => {
		// Arrange
		const mockTransitionValue = 'fade';
		const mockWidgetType = 'heading';
		const mockData = {
			itemValue: {
				selection: {
					value: {
						value: {
							value: mockTransitionValue,
						},
					},
				},
			},
		};

		mockGetSelectedElements.mockReturnValue( [
			{
				id: 'test-element',
				type: mockWidgetType,
			},
		] );

		// Act
		subscribeToTransitionEvent();
		const subscribeCallback = mockEventBus.subscribe.mock.calls[ 0 ][ 1 ];
		subscribeCallback( mockData );

		// Assert
		expect( mockTrackEvent ).toHaveBeenCalledWith( {
			transition_type: mockTransitionValue,
			eventName: 'click_added_transition',
			location: 'V4 Style Tab',
			secondaryLocation: 'Transition control',
			trigger: 'click',
			widget_type: mockWidgetType,
		} );
	} );
} );
