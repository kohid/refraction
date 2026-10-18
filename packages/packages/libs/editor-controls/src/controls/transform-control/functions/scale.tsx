import * as React from 'react';
import { type RefObject, useRef } from 'react';
import { scaleTransformPropTypeUtil } from '@refraction/editor-props';
import { ArrowDownLeftIcon, ArrowDownSmallIcon, ArrowRightIcon } from '@elementor/icons';
import { Grid } from '@elementor/ui';
import { __ } from '@wordpress/i18n';

import { PropKeyProvider, PropProvider, useBoundProp } from '../../../bound-prop-context';
import { TransformFunctionKeys } from '../initial-values';
import { ScaleAxisRow } from './scale-axis-row';

const scaleAxisControls: { label: string; bind: 'x' | 'y' | 'z'; startIcon: React.ReactNode }[] = [
	{
		label: __( 'Scale X', 'refraction' ),
		bind: 'x',
		startIcon: <ArrowRightIcon fontSize={ 'tiny' } />,
	},
	{
		label: __( 'Scale Y', 'refraction' ),
		bind: 'y',
		startIcon: <ArrowDownSmallIcon fontSize={ 'tiny' } />,
	},
	{
		label: __( 'Scale Z', 'refraction' ),
		bind: 'z',
		startIcon: <ArrowDownLeftIcon fontSize={ 'tiny' } />,
	},
];

export const Scale = () => {
	const context = useBoundProp( scaleTransformPropTypeUtil );
	const rowRefs: RefObject< HTMLDivElement >[] = [ useRef( null ), useRef( null ), useRef( null ) ];

	return (
		<Grid container spacing={ 1.5 }>
			<PropProvider { ...context }>
				<PropKeyProvider bind={ TransformFunctionKeys.scale }>
					{ scaleAxisControls.map( ( control, index ) => (
						<ScaleAxisRow key={ control.bind } { ...control } anchorRef={ rowRefs[ index ] } />
					) ) }
				</PropKeyProvider>
			</PropProvider>
		</Grid>
	);
};
