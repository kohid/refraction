import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import {
	Box,
	Button,
	Checkbox,
	Dialog,
	DialogActions,
	DialogContent,
	FormControlLabel,
	Typography,
} from '@elementor/ui';
import { __ } from '@wordpress/i18n';

import { trackGlobalClasses } from '../../utils/tracking';

const IMAGE_URL = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 160 100%27%3E%3Crect width=%27160%27 height=%27100%27 fill=%27%23f1f3f5%27/%3E%3Cpath d=%27M80 22l22 40H58z%27 fill=%27none%27 stroke=%27%23495057%27 stroke-width=%273%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E';

type StartSyncToV3ModalProps = {
	externalOpen?: boolean;
	classId?: string;
	onExternalClose?: () => void;
	onConfirm?: () => void;
};

export const StartSyncToV3Modal = ( {
	externalOpen,
	classId,
	onExternalClose,
	onConfirm,
}: StartSyncToV3ModalProps = {} ) => {
	const [ shouldShowAgain, setShouldShowAgain ] = useState( true );
	const hasTrackedExposure = useRef( false );

	useEffect( () => {
		if ( externalOpen && classId && ! hasTrackedExposure.current ) {
			hasTrackedExposure.current = true;
			trackGlobalClasses( { event: 'classSyncToV3PopupShown', classId } );
		}

		if ( ! externalOpen ) {
			hasTrackedExposure.current = false;
		}
	}, [ externalOpen, classId ] );

	const handleClose = () => {
		if ( classId ) {
			trackGlobalClasses( { event: 'classSyncToV3PopupClick', classId, action: 'cancel' } );
		}
		onExternalClose?.();
	};

	const handleConfirm = () => {
		if ( classId ) {
			trackGlobalClasses( { event: 'classSyncToV3PopupClick', classId, action: 'sync' } );
		}
		onConfirm?.();
		onExternalClose?.();
	};

	return (
		<Dialog open={ !! externalOpen } onClose={ handleClose } maxWidth="sm" fullWidth>
			<DialogContent sx={ { p: 0 } }>
				<Box component="img" src={ IMAGE_URL } alt="" sx={ { width: '100%', display: 'block' } } />
				<Box sx={ { px: 3, pt: 4, pb: 1 } }>
					<Typography variant="h6">{ __( 'Sync class to Global Fonts', 'refraction' ) }</Typography>
					<Typography variant="body2" color="secondary" sx={ { mb: 2, pt: 1 } }>
						{ __(
							'Only typography settings supported in Global Fonts will be applied, including: font family, responsive font sizes, weight, text transform, decoration, line height, letter spacing, and word spacing. Changes made in the class will automatically apply to Global Fonts.',
							'refraction'
						) }
					</Typography>
				</Box>
			</DialogContent>
			<DialogActions sx={ { justifyContent: 'space-between', px: 3, pb: 2 } }>
				<FormControlLabel
					control={
						<Checkbox
							checked={ ! shouldShowAgain }
							onChange={ ( e: React.ChangeEvent< HTMLInputElement > ) =>
								setShouldShowAgain( ! e.target.checked )
							}
						/>
					}
					label={
						<Typography variant="body2" color="secondary">
							{ __( "Don't show again", 'refraction' ) }
						</Typography>
					}
				/>
				<Box sx={ { display: 'flex', gap: 1 } }>
					<Button onClick={ handleClose } color="secondary" size="small">
						{ __( 'Cancel', 'refraction' ) }
					</Button>
					<Button onClick={ handleConfirm } variant="contained" size="small">
						{ __( 'Sync to Global Fonts', 'refraction' ) }
					</Button>
				</Box>
			</DialogActions>
		</Dialog>
	);
};
