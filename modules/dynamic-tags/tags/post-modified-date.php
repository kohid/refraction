<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Tag;
use Refraction\Modules\DynamicTags\Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Post_Modified_Date extends Post_Date {

	public function get_name() {
		return 'post-modified-date';
	}

	public function get_title() {
		return esc_html__( 'Post Modified Date', 'refraction' );
	}

	protected function get_field(): string {
		return 'post_modified';
	}
}
