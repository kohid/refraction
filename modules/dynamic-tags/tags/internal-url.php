<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Data_Tag;
use Refraction\Modules\DynamicTags\Module;
use Refraction\Modules\DynamicTags\Classes\Context;
use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Internal_Url extends Data_Tag {

	public function get_name() {
		return 'internal-url';
	}

	public function get_title() {
		return esc_html__( 'Internal URL', 'refraction' );
	}

	public function get_group() {
		return Module::ACTION_GROUP;
	}

	public function get_categories() {
		return [ Module::URL_CATEGORY ];
	}

	protected function register_controls() {
		$this->add_control(
			'type',
			[
				'label' => esc_html__( 'Link to', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'post',
				'options' => [
					'post' => esc_html__( 'Content (post, page, ...)', 'refraction' ),
					'taxonomy' => esc_html__( 'Taxonomy archive', 'refraction' ),
					'author' => esc_html__( 'Author archive', 'refraction' ),
				],
			]
		);

		$this->add_control(
			'post_id',
			[
				'label' => esc_html__( 'Search content', 'refraction' ),
				'type' => 'refraction_autocomplete',
				'query' => [ 'kind' => 'post', 'subtype' => 'any' ],
				'multiple' => false,
				'condition' => [ 'type' => 'post' ],
			]
		);

		$this->add_control(
			'term_id',
			[
				'label' => esc_html__( 'Search terms', 'refraction' ),
				'type' => 'refraction_autocomplete',
				'query' => [ 'kind' => 'term', 'subtype' => 'any' ],
				'multiple' => false,
				'condition' => [ 'type' => 'taxonomy' ],
			]
		);

		$this->add_control(
			'user_id',
			[
				'label' => esc_html__( 'Search authors', 'refraction' ),
				'type' => 'refraction_autocomplete',
				'query' => [ 'kind' => 'user' ],
				'multiple' => false,
				'condition' => [ 'type' => 'author' ],
			]
		);
	}


	public function get_value( array $options = [] ) {
		$type = (string) $this->get_settings( 'type' );

		if ( 'post' === $type ) {
			$id = $this->first_id( $this->get_settings( 'post_id' ) );
			$post = $id ? get_post( $id ) : null;

			return $post && Context::can_read( $post ) ? (string) get_permalink( $post ) : '';
		}

		if ( 'taxonomy' === $type ) {
			$term = get_term( $this->first_id( $this->get_settings( 'term_id' ) ) );
			$link = $term instanceof \WP_Term ? get_term_link( $term ) : '';

			return is_string( $link ) ? $link : '';
		}

		if ( 'author' === $type ) {
			$id = $this->first_id( $this->get_settings( 'user_id' ) );

			return $id ? get_author_posts_url( $id ) : '';
		}

		return '';
	}

	/** The autocomplete control gives an ID, or a list holding one. */
	private function first_id( $value ): int {
		return (int) ( is_array( $value ) ? reset( $value ) : $value );
	}

	public function is_settings_required() {
		return true;
	}
}
