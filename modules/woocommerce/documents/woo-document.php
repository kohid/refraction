<?php
namespace Refraction\Modules\Woocommerce\Documents;

use Refraction\Modules\ThemeBuilder\Documents\Theme_Document;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * A Theme Builder template for a WooCommerce page. The document type is also its location.
 */
abstract class Woo_Document extends Theme_Document {

	public function get_location(): string {
		return static::get_type();
	}
}
