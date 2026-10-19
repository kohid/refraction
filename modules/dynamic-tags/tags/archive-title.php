<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Tag;
use Refraction\Modules\DynamicTags\Module;
use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Archive_Title extends Tag {

	public function get_name() {
		return 'archive-title';
	}

	public function get_title() {
		return esc_html__( 'Archive Title', 'refraction' );
	}

	public function get_group() {
		return Module::ARCHIVE_GROUP;
	}

	public function get_categories() {
		return [ Module::TEXT_CATEGORY ];
	}

	protected function register_controls() {
		$this->add_control(
			'prefix',
			[
				'label' => esc_html__( 'Include the prefix (Category:)', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => '',
			]
		);
	}


	public function render() {
		$prefix = 'yes' === $this->get_settings( 'prefix' );

		if ( ! $prefix ) {
			add_filter( 'get_the_archive_title_prefix', '__return_empty_string' );
		}

		$title = is_search() ? sprintf( /* translators: %s: search query. */ __( 'Search results for: %s', 'refraction' ), get_search_query() ) : get_the_archive_title();

		if ( ! $prefix ) {
			remove_filter( 'get_the_archive_title_prefix', '__return_empty_string' );
		}

		echo wp_kses_post( $title );
	}
}
