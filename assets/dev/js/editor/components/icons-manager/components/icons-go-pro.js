import { Component } from 'react';

class IconsGoPro extends Component {
	render = () => {
		return (
			<div id="refraction-icons-manager__promotion">
				<i id="refraction-icons-manager__promotion__icon" className="rficon-nerd"></i>
				<div id="refraction-icons-manager__promotion__text">{ __( 'Become a Pro user to upload unlimited font icon folders to your website.', 'refraction' ) }</div>
				<a
					href={ refraction.config.icons.goProURL }
					id="refraction-icons-manager__promotion__link"
					className="refraction-button go-pro"
					target="_blank"
					rel="noopener noreferrer"
				>{ __( 'Upgrade Now', 'refraction' ) }</a>
			</div>
		);
	};
}

export default IconsGoPro;
