import * as React from 'react';
import { useState } from 'react';
import { styled, SvgIcon, type SvgIconProps, ToggleButton, type ToggleButtonProps } from '@elementor/ui';
import { __ } from '@wordpress/i18n';

interface StyledRefractionLogoProps extends SvgIconProps {
	showMenuIcon?: boolean;
}

type ToolbarLogoProps = Omit< ToggleButtonProps, 'value' >;

/**
 * Refraction mark. The first path is the prism, the other three are the rays. On hover the prism collapses and the
 * rays grow into the three bars of a menu icon (see the transforms in StyledRefractionLogo).
 */
const RefractionLogo = ( props: SvgIconProps ) => {
	return (
		<SvgIcon viewBox="0 0 32 32" { ...props }>
			<g>
				<circle cx="16" cy="16" r="16" />
				<path fillRule="evenodd" d="M10.2 8.2 L15.4 22.4 L5.0 22.4 Z M10.2 14.0 L7.9 20.4 L12.5 20.4 Z" />
				<path d="M22.4 9H9V11.7H22.4V9Z" />
				<path d="M22.4 14.4004H9V17.1004H22.4V14.4004Z" />
				<path d="M22.4 19.6992H9V22.3992H22.4V19.6992Z" />
			</g>
		</SvgIcon>
	);
};

const StyledToggleButton = styled( ToggleButton )( ( { theme } ) => ( {
	padding: 0,
	border: 0,
	color: theme.palette.text.primary,
	'&.MuiToggleButton-root:hover': {
		backgroundColor: 'initial',
	},
	'&.MuiToggleButton-root.Mui-selected': {
		backgroundColor: 'initial',
	},
} ) );

const StyledRefractionLogo = styled( RefractionLogo, {
	shouldForwardProp: ( prop ) => prop !== 'showMenuIcon',
} )< StyledRefractionLogoProps >( ( { theme, showMenuIcon } ) => ( {
	'& path': {
		fill: theme.palette.background.default,
		transition: 'all 0.2s linear',
		transformOrigin: 'bottom left',
		'&:first-of-type': {
			transitionDelay: ! showMenuIcon && '0.2s',
			transform: showMenuIcon && 'translateY(-9px) scaleY(0)',
		},
		'&:not(:first-of-type)': {
			// Emotion automatically change 4 to -4 in RTL mode.
			transform: ! showMenuIcon && `translateX(${ theme.direction === 'rtl' ? '4' : '9' }px) scaleX(0.6)`,
		},
		'&:nth-of-type(2)': {
			transitionDelay: showMenuIcon ? '0' : '0.2s',
		},
		'&:nth-of-type(3)': {
			transitionDelay: '0.1s',
		},
		'&:nth-of-type(4)': {
			transitionDelay: showMenuIcon ? '0.2s' : '0',
		},
	},
} ) );

export default function ToolbarLogo( props: ToolbarLogoProps ) {
	const [ isHoverState, setIsHoverState ] = useState( false );
	const showMenuIcon = props.selected || isHoverState;

	return (
		<StyledToggleButton
			{ ...props }
			value="selected"
			size="large"
			onMouseEnter={ () => setIsHoverState( true ) }
			onMouseLeave={ () => setIsHoverState( false ) }
		>
			<StyledRefractionLogo
				fontSize="large"
				showMenuIcon={ showMenuIcon }
				titleAccess={ __( 'Refraction Logo', 'refraction' ) }
			/>
		</StyledToggleButton>
	);
}
