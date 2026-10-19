import * as React from 'react';
import {
	BackgroundLottie,
	ModalFooter,
	ModalHeader,
	ModalShell,
	useAutoplayCarousel,
} from '@refraction/editor-modal-shell';
import { Box, Stack } from '@elementor/ui';
import { __ } from '@wordpress/i18n';

import * as celebrationData from '../assets/celebration.json';
import { FeatureItem } from './feature-item';
import { ModalImage } from './modal-image';

const CONTENT_DELAY_MS = 2500;

const BACKGROUND_COLOR = '#FFDFF9';

const LEARN_MORE_URL = 'https://github.com/kohid/refraction#readme';

const FEATURE_ITEMS = [
	{
		id: 'combineWidgets',
		title: __( 'Use Atomic Elements alongside your existing widgets', 'refraction' ),
		subtitle: __( 'No need to rebuild pages. Combine legacy & new workflows.', 'refraction' ),
		image: 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 160 100%27%3E%3Crect width=%27160%27 height=%27100%27 fill=%27%23f1f3f5%27/%3E%3Cpath d=%27M80 22l22 40H58z%27 fill=%27none%27 stroke=%27%23495057%27 stroke-width=%273%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E',
	},
	{
		id: 'designSystems',
		title: __( 'Build reusable design systems', 'refraction' ),
		subtitle: __( 'Classes, Variables & Components give a clear path for scale.', 'refraction' ),
		image: 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 160 100%27%3E%3Crect width=%27160%27 height=%27100%27 fill=%27%23f1f3f5%27/%3E%3Cpath d=%27M80 22l22 40H58z%27 fill=%27none%27 stroke=%27%23495057%27 stroke-width=%273%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E',
	},
	{
		id: 'consistentStyling',
		title: __( 'Keep styles consistent across your site', 'refraction' ),
		subtitle: __( 'A unified Style tab with full control over responsive design.', 'refraction' ),
		image: 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 160 100%27%3E%3Crect width=%27160%27 height=%27100%27 fill=%27%23f1f3f5%27/%3E%3Cpath d=%27M80 22l22 40H58z%27 fill=%27none%27 stroke=%27%23495057%27 stroke-width=%273%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E',
	},
	{
		id: 'performance',
		title: __( 'Get unparalleled performance', 'refraction' ),
		subtitle: __( 'Clean code and a light CSS footprint with single-div wrappers.', 'refraction' ),
		image: 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 160 100%27%3E%3Crect width=%27160%27 height=%27100%27 fill=%27%23f1f3f5%27/%3E%3Cpath d=%27M80 22l22 40H58z%27 fill=%27none%27 stroke=%27%23495057%27 stroke-width=%273%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E',
	},
];

const FEATURE_IDS = FEATURE_ITEMS.map( ( item ) => item.id );

const LEFT_PANEL_WIDTH = 420;
const MODAL_WIDTH = 955;
const MODAL_HEIGHT = 481;

export function AppContent( { onClose }: { onClose: () => void } ) {
	const { selectedItem, selectItem } = useAutoplayCarousel( FEATURE_IDS );

	return (
		<>
			<BackgroundLottie animationData={ celebrationData } />
			<ModalShell
				onClose={ onClose }
				revealDelay={ CONTENT_DELAY_MS }
				container={ typeof document !== 'undefined' ? document.body : undefined }
				sx={ {
					width: MODAL_WIDTH,
					height: MODAL_HEIGHT,
					display: 'flex',
					flexDirection: 'row',
				} }
				backdropSx={ { backgroundColor: 'transparent' } }
			>
				<Stack
					justifyContent="space-between"
					alignItems="flex-start"
					sx={ {
						width: LEFT_PANEL_WIDTH,
						flexShrink: 0,
						py: 3.75,
						px: 3,
						bgcolor: 'background.paper',
					} }
				>
					<ModalHeader
						title={ __( 'You’re now using the Atomic editor', 'refraction' ) }
						content={ __(
							'Refraction’s new editing experience is now active. Your existing pages stay exactly the same - you can keep working as usual while exploring new Atomic Elements.',
							'refraction'
						) }
					/>
					<Stack gap={ 2 }>
						{ FEATURE_ITEMS.map( ( item ) => (
							<FeatureItem
								key={ item.id }
								title={ item.title }
								subtitle={ item.subtitle }
								selected={ item.id === selectedItem }
								onClick={ () => selectItem( item.id ) }
							/>
						) ) }
					</Stack>
					<ModalFooter
						helpText={ __( 'Need help getting started?', 'refraction' ) }
						link={ { text: __( 'Learn more', 'refraction' ), url: LEARN_MORE_URL } }
					/>
				</Stack>
				<Box
					sx={ {
						flex: 1,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						overflow: 'hidden',
						backgroundColor: BACKGROUND_COLOR,
					} }
				>
					<ModalImage
						id={ selectedItem }
						images={ FEATURE_ITEMS.map( ( { id, image } ) => ( { id, src: image } ) ) }
					/>
				</Box>
			</ModalShell>
		</>
	);
}
