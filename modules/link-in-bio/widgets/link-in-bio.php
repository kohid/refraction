<?php

namespace Refraction\Modules\LinkInBio\Widgets;

use Refraction\Modules\LinkInBio\Base\Widget_Link_In_Bio_Base;
use Refraction\Modules\LinkInBio\Classes\Render\Core_Render;
use Refraction\Modules\LinkInBio\Module as ConversionCenterModule;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction Link in Bio widget.
 *
 * Refraction widget that displays an image, a bio, up to 4 CTA links and up to 5 icons.
 *
 * @since 3.23.0
 */
class Link_In_Bio extends Widget_Link_In_Bio_Base {

	public function get_name(): string {
		return 'link-in-bio';
	}

	public function get_title(): string {
		return esc_html__( 'Minimalist', 'refraction' );
	}
}
