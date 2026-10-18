<?php
namespace Refraction\Core\Page_Assets\Data_Managers\Font_Icon_Svg;

use Refraction\Core\Page_Assets\Data_Managers\Base as Data_Managers_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction Font Icon Svg Base.
 *
 * @since 3.4.0
 */
class Base extends Data_Managers_Base {
	protected $content_type = 'svg';

	protected $assets_category = 'font-icon';

	protected function get_asset_content() {}
}
