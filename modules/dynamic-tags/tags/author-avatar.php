<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Data_Tag;
use Refraction\Modules\DynamicTags\Module;
use Refraction\Modules\DynamicTags\Classes\Context;
use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Author_Avatar extends Data_Tag {

	public function get_name() {
		return 'author-avatar';
	}

	public function get_title() {
		return esc_html__( 'Author Avatar', 'refraction' );
	}

	public function get_group() {
		return Module::AUTHOR_GROUP;
	}

	public function get_categories() {
		return [ Module::IMAGE_CATEGORY ];
	}

	protected function register_controls() {
		$this->add_control(
			'size',
			[
				'label' => esc_html__( 'Size (px)', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'default' => 256,
				'min' => 16,
				'max' => 1024,
			]
		);
	}


	public function get_value( array $options = [] ) {
		$id = Context::get_author_id();
		$url = $id ? get_avatar_url( $id, [ 'size' => max( 16, min( 1024, (int) $this->get_settings( 'size' ) ) ) ] ) : '';

		return $url ? [ 'id' => 0, 'url' => $url ] : [];
	}
}
