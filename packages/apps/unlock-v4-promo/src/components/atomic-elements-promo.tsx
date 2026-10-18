import * as React from 'react';
import { useCallback } from 'react';
import { getCurrentUser } from '@refraction/editor-current-user';
import { notify } from '@refraction/editor-notifications';
import { ThemeProvider } from '@refraction/editor-ui';
import { httpService } from '@refraction/http-client';
import { Box, Button, Chip, CloseButton, Divider, Typography } from '@elementor/ui';
import { __ } from '@wordpress/i18n';

import { usePromoSuppressedMessage } from '../hooks/use-promo-suppressed-message';

const PROMO_IMAGE = 'https://assets.elementor.com/v4-promotion/v1/images/atomic_elements_section_260.png';
const LEARN_MORE_URL = 'https://go.elementor.com/wp-dash-opt-in-v4-help-center/';

export function AtomicElementsPromo() {
	const [ suppressed, toggleSuppressMessage ] = usePromoSuppressedMessage();
	const isAdmin = getCurrentUser()?.capabilities?.includes( 'manage_options' );

	const activateAtomicElements = useCallback( async () => {
		try {
			const response = await httpService().post( 'refraction/v1/operations/opt-in-v4' );
			if ( response.data.success ) {
				window.location.reload();
			}
		} catch {
			notify( {
				type: 'error',
				message: __( 'Failed to activate Atomic elements', 'refraction' ),
				id: 'atomic-elements-promo-error',
			} );
		}
	}, [] );

	if ( suppressed || ! isAdmin ) {
		return null;
	}

	return (
		<ThemeProvider>
			<Divider />
			<Box
				sx={ {
					bgcolor: 'background.default',
					display: 'flex',
					flexDirection: 'column',
				} }
			>
				<Box
					sx={ {
						display: 'flex',
						alignItems: 'center',
						gap: 1,
						pl: 2.5,
						pr: 1,
						py: 1,
					} }
				>
					<Typography
						variant="subtitle2"
						sx={ { flexGrow: 1, gap: 1, display: 'flex', alignItems: 'center' } }
					>
						{ __( 'Atomic Elements', 'refraction' ) }
						<Chip label={ __( 'New', 'refraction' ) } size="tiny" variant="standard" color="secondary" />
					</Typography>
					<CloseButton slotProps={ { icon: { fontSize: 'small' } } } onClick={ toggleSuppressMessage } />
				</Box>

				<Box
					sx={ {
						maxHeight: 205,
						mx: 2,
						overflow: 'hidden',
					} }
				>
					<Box
						component="img"
						src={ PROMO_IMAGE }
						alt=""
						sx={ {
							width: '100%',
							objectFit: 'cover',
							objectPosition: 'center',
							display: 'block',
						} }
					/>
				</Box>

				<Box sx={ { pl: 2.5, pr: 4, pt: 2 } }>
					<Typography variant="caption" color="text.tertiary">
						{ __(
							'Build with modern, flexible elements designed for reusable styles and cleaner layouts. Your existing site and content stay exactly the same.',
							'refraction'
						) }
					</Typography>
				</Box>

				<Box
					sx={ {
						display: 'flex',
						justifyContent: 'flex-end',
						gap: 1,
						pb: 1.5,
						pl: 2,
						pr: 2.5,
						pt: 1,
					} }
				>
					<Button variant="text" size="small" color="secondary" href={ LEARN_MORE_URL } target="_blank">
						{ __( 'Learn more', 'refraction' ) }
					</Button>
					<Button
						variant="contained"
						size="small"
						color="inherit"
						sx={ {
							bgcolor: 'text.primary',
							color: 'background.paper',
							'&:hover': { bgcolor: 'text.secondary', color: 'background.paper' },
						} }
						onClick={ activateAtomicElements }
					>
						{ __( 'Activate now', 'refraction' ) }
					</Button>
				</Box>
			</Box>
			<Divider />
		</ThemeProvider>
	);
}
