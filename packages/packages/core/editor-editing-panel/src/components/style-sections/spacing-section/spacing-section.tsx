import * as React from 'react';
import { LinkedDimensionsControl } from '@refraction/editor-controls';
import { __ } from '@wordpress/i18n';

import { StylesField } from '../../../controls-registry/styles-field';
import { useDirection } from '../../../hooks/use-direction';
import { PanelDivider } from '../../panel-divider';
import { SectionContent } from '../../section-content';

const MARGIN_LABEL = __( 'Margin', 'refraction' );
const PADDING_LABEL = __( 'Padding', 'refraction' );

export const SpacingSection = () => {
	const { isSiteRtl } = useDirection();

	return (
		<SectionContent>
			<StylesField bind={ 'margin' } propDisplayName={ MARGIN_LABEL }>
				<LinkedDimensionsControl
					label={ MARGIN_LABEL }
					isSiteRtl={ isSiteRtl }
					min={ -Number.MAX_SAFE_INTEGER }
				/>
			</StylesField>
			<PanelDivider />
			<StylesField bind={ 'padding' } propDisplayName={ PADDING_LABEL }>
				<LinkedDimensionsControl label={ PADDING_LABEL } isSiteRtl={ isSiteRtl } />
			</StylesField>
		</SectionContent>
	);
};
