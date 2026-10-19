import * as React from 'react';
import { SvgIcon } from '@elementor/ui';

const RefractionLogoIcon = React.forwardRef< SVGSVGElement, React.ComponentProps< typeof SvgIcon > >( ( props, ref ) => {
	return (
		<SvgIcon viewBox="0 0 44 44" { ...props } ref={ ref }>
			<circle cx="22" cy="22" r="22" fill="#ffffff" />
			<g fill="none" stroke="#515962" strokeOpacity="0.38" strokeLinecap="round" strokeLinejoin="round">
				<polygon points="19,10 28,26 10,26" strokeWidth="3" />
				<line x1="6" y1="24" x2="14" y2="20" strokeWidth="2.4" />
				<line x1="23" y1="16" x2="38" y2="10" strokeWidth="2.4" />
				<line x1="25" y1="20" x2="39" y2="20" strokeWidth="2.4" />
				<line x1="27" y1="24" x2="38" y2="31" strokeWidth="2.4" />
			</g>
		</SvgIcon>
	);
} );

export default RefractionLogoIcon;
