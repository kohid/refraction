import { arrayToClassName } from 'refraction-app/utils/utils.js';

import Card from 'refraction-app/ui/card/card';
import Collapse from 'refraction-app/molecules/collapse';

export default function PanelHeader( props ) {
	return (
		<Collapse.Toggle active={ props.toggle } showIcon={ props.showIcon }>
			<Card.Header padding="20" className={ arrayToClassName( [ 'eps-panel__header', props.className ] ) }>
				{ props.children }
			</Card.Header>
		</Collapse.Toggle>
	);
}

PanelHeader.propTypes = {
	className: PropTypes.string,
	padding: PropTypes.string,
	toggle: PropTypes.bool,
	showIcon: PropTypes.bool,
	children: PropTypes.any.isRequired,
};

PanelHeader.defaultProps = {
	className: '',
	padding: '20',
	toggle: true,
	showIcon: true,
};
