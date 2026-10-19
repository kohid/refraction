<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Data_Tag;
use Refraction\Modules\DynamicTags\Module;
use Refraction\Modules\DynamicTags\Classes\Context;
use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Author_Url extends Data_Tag {

	public function get_name() {
		return 'author-url';
	}

	public function get_title() {
		return esc_html__( 'Author URL', 'refraction' );
	}

	public function get_group() {
		return Module::AUTHOR_GROUP;
	}

	public function get_categories() {
		return [ Module::URL_CATEGORY ];
	}

	protected function register_controls() {
		$this->add_control(
			'link_to',
			[
				'label' => esc_html__( 'Link to', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'archive',
				'options' => [
					'archive' => esc_html__( 'Author archive', 'refraction' ),
					'website' => esc_html__( 'Author website', 'refraction' ),
				],
			]
		);
	}


	public function get_value( array $options = [] ) {
		$id = Context::get_author_id();

		if ( ! $id ) {
			return '';
		}

		if ( 'website' === $this->get_settings( 'link_to' ) ) {
			$user = get_userdata( $id );

			return $user ? esc_url_raw( $user->user_url ) : '';
		}

		return get_author_posts_url( $id );
	}
}
