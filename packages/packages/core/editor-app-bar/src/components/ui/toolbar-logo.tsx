import * as React from 'react';
import { useState } from 'react';
import { styled, SvgIcon, type SvgIconProps, ToggleButton, type ToggleButtonProps } from '@elementor/ui';
import { __ } from '@wordpress/i18n';

interface StyledRefractionLogoProps extends SvgIconProps {
	showMenuIcon?: boolean;
}

type ToolbarLogoProps = Omit< ToggleButtonProps, 'value' >;

/**
 * The Refraction logo (0.117.0, assets/images/refraction-logo.svg) on a white tile; on hover it fades into the three
 * bars of a menu icon (see StyledRefractionLogo).
 *
 * @param props The icon's props.
 */
const RefractionLogo = ( props: SvgIconProps ) => {
	return (
		<SvgIcon viewBox="0 0 32 32" { ...props }>
			<g className="rf-logo">
				<rect width="32" height="32" rx="7" fill="#ffffff" />
				<g transform="scale(0.064)">
					<polygon points="173.636,500 0,500 0,0 500,0 500,173.636 173.636,173.636 173.636,500" fill="#092351" />
					<polygon points="10,173.636 165,219.654 165,250 10,250 10,173.636" fill="#7fff00" />
					<polygon points="173.636,10 219.654,165 250,165 250,10 173.636,10" fill="#00ffff" />
					<polygon points="10,330 10,270 165,270 165,330 10,330" fill="#ffff00" />
					<polygon points="330,10 270,10 270,165 330,165 330,10" fill="#007fff" />
					<polygon points="10,410 10,350 165,350 165,410 10,410" fill="#ff7f00" />
					<polygon points="410,10 350,10 350,165 410,165 410,10" fill="#0000ff" />
					<polygon points="10,430 10,490 165,490 165,430 10,430" fill="#ff0000" />
					<polygon points="430,10 490,10 490,165 430,165 430,10" fill="#7f00ff" />
					<polygon points="10,152.773 165,198.791 165,179.142 10,24.142 10,152.773" fill="#00ff00" />
					<polygon points="152.773,10 198.791,165 179.142,165 24.142,10 152.773,10" fill="#00ff7f" />
					<circle cx="412.5" cy="412.5" r="77.5" fill="#000000" />
					<circle cx="412.5" cy="412.5" r="76" fill="none" stroke="#ffffff" strokeWidth="3" />
				</g>
			</g>
			<g className="rf-menu">
				<circle cx="16" cy="16" r="16" />
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
	'& .rf-logo, & .rf-menu': {
		transition: 'opacity 0.2s linear, transform 0.2s linear',
		transformBox: 'fill-box',
		transformOrigin: 'center',
	},
	'& .rf-logo': {
		opacity: showMenuIcon ? 0 : 1,
		transform: showMenuIcon ? 'scale(0.8)' : 'none',
	},
	'& .rf-menu': {
		opacity: showMenuIcon ? 1 : 0,
		transform: showMenuIcon ? 'none' : 'scale(0.8)',
		'& path': {
			fill: theme.palette.background.default,
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
