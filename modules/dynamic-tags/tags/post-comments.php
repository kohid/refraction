<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Tag;
use Refraction\Modules\DynamicTags\Module;
use Refraction\Modules\DynamicTags\Classes\Context;
use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Post_Comments extends Tag {

	public function get_name() {
		return 'post-comments';
	}

	public function get_title() {
		return esc_html__( 'Comments Number', 'refraction' );
	}

	public function get_group() {
		return Module::POST_GROUP;
	}

	public function get_categories() {
		return [ Module::TEXT_CATEGORY, Module::NUMBER_CATEGORY ];
	}

	protected function register_controls() {
		$this->add_control(
			'format',
			[
				'label' => esc_html__( 'Output', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'number',
				'options' => [
					'number' => esc_html__( 'Number only', 'refraction' ),
					'text' => esc_html__( 'Text', 'refraction' ),
				],
			]
		);

		$this->add_control( 'none', [ 'label' => esc_html__( 'No comments', 'refraction' ), 'default' => esc_html__( 'No comments', 'refraction' ), 'condition' => [ 'format' => 'text' ] ] );
		$this->add_control( 'one', [ 'label' => esc_html__( 'One comment', 'refraction' ), 'default' => esc_html__( 'One comment', 'refraction' ), 'condition' => [ 'format' => 'text' ] ] );
		$this->add_control( 'more', [ 'label' => esc_html__( 'Many comments', 'refraction' ), 'default' => esc_html__( '{count} comments', 'refraction' ), 'condition' => [ 'format' => 'text' ] ] );
	}


	public function render() {
		$post = Context::get_post();

		if ( ! Context::can_read( $post ) ) {
			return;
		}

		$count = (int) get_comments_number( $post );

		if ( 'number' === $this->get_settings( 'format' ) ) {
			echo esc_html( (string) $count );
			return;
		}

		if ( 0 === $count ) {
			echo esc_html( (string) $this->get_settings( 'none' ) );
		} elseif ( 1 === $count ) {
			echo esc_html( (string) $this->get_settings( 'one' ) );
		} else {
			echo esc_html( str_replace( '{count}', (string) $count, (string) $this->get_settings( 'more' ) ) );
		}
	}
}
