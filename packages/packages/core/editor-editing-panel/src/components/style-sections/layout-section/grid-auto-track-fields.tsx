import * as React from 'react';
import { useRef } from 'react';
import { SizeControl } from '@refraction/editor-controls';
import { Stack } from '@elementor/ui';
import { __ } from '@wordpress/i18n';

import { StylesField } from '../../../controls-registry/styles-field';
import { StylesFieldLayout } from '../../styles-field-layout';

const DEFAULT_UNIT = 'fr' as const;

type SizeControlProps = React.ComponentProps< typeof SizeControl >;

const AUTO_ROWS_LABEL = __( 'Auto rows', 'refraction' );
const AUTO_COLUMNS_LABEL = __( 'Auto columns', 'refraction' );
const AUTO_ROWS_TOOLTIP = __(
	'Set the size for new rows created automatically when content exceeds the defined grid.',
	'refraction'
);
const AUTO_COLUMNS_TOOLTIP = __(
	'Set the size for new columns created automatically when content exceeds the defined grid.',
	'refraction'
);

type GridAutoTrackFieldProps = {
	bind: 'grid-auto-rows' | 'grid-auto-columns';
	infoTooltip: string;
	label: string;
	rowRef: React.RefObject< HTMLDivElement >;
};

const GridAutoTrackField = ( { bind, infoTooltip, label, rowRef }: GridAutoTrackFieldProps ) => (
	<StylesField bind={ bind } propDisplayName={ label }>
		<StylesFieldLayout infoTooltip={ infoTooltip } label={ label } ref={ rowRef }>
			<SizeControl
				enablePropTypeUnits
				defaultUnit={ DEFAULT_UNIT as SizeControlProps[ 'defaultUnit' ] }
				anchorRef={ rowRef }
			/>
		</StylesFieldLayout>
	</StylesField>
);

export const GridAutoTrackFields = () => {
	const rowRef = useRef< HTMLDivElement >( null );

	return (
		<Stack gap={ 2 } pt={ 2 } ref={ rowRef }>
			<GridAutoTrackField
				bind="grid-auto-rows"
				infoTooltip={ AUTO_ROWS_TOOLTIP }
				label={ AUTO_ROWS_LABEL }
				rowRef={ rowRef }
			/>
			<GridAutoTrackField
				bind="grid-auto-columns"
				infoTooltip={ AUTO_COLUMNS_TOOLTIP }
				label={ AUTO_COLUMNS_LABEL }
				rowRef={ rowRef }
			/>
		</Stack>
	);
};
