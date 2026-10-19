import * as React from 'react';
import { useState } from 'react';
import { useSuppressedMessage } from '@refraction/editor-current-user';
import { IntroductionModal } from '@refraction/editor-ui';
import { Box, Image, Typography } from '@elementor/ui';
import { __ } from '@wordpress/i18n';

const MESSAGE_KEY = 'global-class-manager';

export const ClassManagerIntroduction = () => {
	const [ isMessageSuppressed, suppressMessage ] = useSuppressedMessage( MESSAGE_KEY );
	const [ shouldShowIntroduction, setShouldShowIntroduction ] = useState( ! isMessageSuppressed );

	return (
		<IntroductionModal
			open={ shouldShowIntroduction }
			title={ __( 'Class Manager', 'refraction' ) }
			handleClose={ ( shouldShowAgain ) => {
				if ( ! shouldShowAgain ) {
					suppressMessage();
				}

				setShouldShowIntroduction( false );
			} }
		>
			<Image
				sx={ { width: '100%', aspectRatio: '16 / 9' } }
				src={ 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 160 100%27%3E%3Crect width=%27160%27 height=%27100%27 fill=%27%23f1f3f5%27/%3E%3Cpath d=%27M80 22l22 40H58z%27 fill=%27none%27 stroke=%27%23495057%27 stroke-width=%273%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E' }
				alt={ '' }
			/>
			<IntroductionContent />
		</IntroductionModal>
	);
};

const IntroductionContent = () => {
	return (
		<Box p={ 3 }>
			<Typography variant={ 'body2' }>
				{ __(
					"The Class Manager lets you see all the classes you've created, plus adjust their priority, rename them, and delete unused classes to keep your CSS structured.",
					'refraction'
				) }
			</Typography>
			<br />
			<Typography variant={ 'body2' }>
				{ __(
					'Remember, when editing an item within a specific class, any changes you make will apply across all elements in that class.',
					'refraction'
				) }
			</Typography>
		</Box>
	);
};
