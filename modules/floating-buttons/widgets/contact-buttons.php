<?php

namespace Refraction\Modules\FloatingButtons\Widgets;

use Refraction\Modules\FloatingButtons\Base\Widget_Contact_Button_Base;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction Contact Buttons widget.
 *
 * Refraction widget that displays contact buttons and a chat-like prompt message.
 *
 * @since 3.23.0
 */
class Contact_Buttons extends Widget_Contact_Button_Base {

	public function get_name(): string {
		return 'contact-buttons';
	}

	public function get_title(): string {
		return esc_html__( 'Single Chat', 'refraction' );
	}
}
