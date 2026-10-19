<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Tag;
use Refraction\Modules\DynamicTags\Module;
use Refraction\Modules\DynamicTags\Classes\Context;
use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Post_Terms extends Tag {

	public function get_name() {
		return 'post-terms';
	}

	public function get_title() {
		return esc_html__( 'Post Terms', 'refraction' );
	}

	public function get_group() {
		return Module::POST_GROUP;
	}

	public function get_categories() {
		return [ Module::TEXT_CATEGORY ];
	}

	protected function register_controls() {
		$options = [];

		foreach ( get_taxonomies( [ 'public' => true ], 'objects' ) as $taxonomy ) {
			$options[ $taxonomy->name ] = $taxonomy->label;
		}

		$this->add_control(
			'taxonomy',
			[
				'label' => esc_html__( 'Taxonomy', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => $options,
				'default' => 'category',
			]
		);

		$this->add_control(
			'separator',
			[
				'label' => esc_html__( 'Separator', 'refraction' ),
				'default' => ', ',
			]
		);

		$this->add_control(
			'link',
			[
				'label' => esc_html__( 'Link to the term archive', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
			]
		);

		$this->add_control(
			'limit',
			[
				'label' => esc_html__( 'Maximum terms (0 = all)', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'default' => 0,
				'min' => 0,
			]
		);
	}


	public function render() {
		$post = Context::get_post();
		$taxonomy = sanitize_key( (string) $this->get_settings( 'taxonomy' ) );

		if ( ! Context::can_read( $post ) || ! taxonomy_exists( $taxonomy ) ) {
			return;
		}

		$terms = get_the_terms( $post, $taxonomy );

		if ( ! is_array( $terms ) ) {
			return;
		}

		$limit = max( 0, (int) $this->get_settings( 'limit' ) );
		$link = 'yes' === $this->get_settings( 'link' );
		$items = [];

		foreach ( $terms as $term ) {
			$link_url = $link ? get_term_link( $term ) : '';
			$items[] = is_string( $link_url ) && '' !== $link_url ? '<a href="' . esc_url( $link_url ) . '">' . esc_html( $term->name ) . '</a>' : esc_html( $term->name );
		}

		if ( $limit ) {
			$items = array_slice( $items, 0, $limit );
		}

		echo wp_kses_post( implode( esc_html( (string) $this->get_settings( 'separator' ) ), $items ) );
	}
}
