<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Typography;
use Refraction\Modules\FormBuilder\Base\Field_Settings;
use Refraction\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** A small pill of text ("Monthly", "Popular"), for choice cards and anywhere on a form. */
class Badge extends Widget_Base {

	use Field_Settings;

	public function get_name() {
		return 'rfb-badge';
	}

	public function get_title() {
		return esc_html__( 'Badge', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-tags';
	}

	public function get_keywords() {
		return [ 'badge', 'label', 'tag', 'pill' ];
	}

	public function has_widget_inner_wrapper(): bool {
		return false;
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_badge', [ 'label' => esc_html__( 'Badge', 'refraction' ) ] );
		$this->add_control( 'text', [ 'label' => esc_html__( 'Text', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => esc_html__( 'Popular', 'refraction' ) ] );
		$this->add_responsive_control( 'align', [
			'label' => esc_html__( 'Alignment', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'left' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-text-align-left' ],
				'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-text-align-center' ],
				'right' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-text-align-right' ],
			],
			'selectors' => [ '{{WRAPPER}}' => 'text-align: {{VALUE}};' ],
		] );
		$this->end_controls_section();

		$pill = '{{WRAPPER}} .rfb-badge-pill';
		$this->start_controls_section( 'section_badge_style', [ 'label' => esc_html__( 'Badge', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_control( 'color', [ 'label' => esc_html__( 'Text color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $pill => 'color: {{VALUE}};' ] ] );
		$this->add_control( 'bg', [ 'label' => esc_html__( 'Background color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $pill => 'background-color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'typography', 'selector' => $pill ] );
		$this->add_responsive_control( 'padding', [ 'label' => esc_html__( 'Padding', 'refraction' ), 'type' => Controls_Manager::DIMENSIONS, 'size_units' => [ 'px', 'em' ], 'selectors' => [ $pill => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ] ] );
		$this->add_responsive_control( 'radius', [ 'label' => esc_html__( 'Border radius', 'refraction' ), 'type' => Controls_Manager::DIMENSIONS, 'size_units' => [ 'px', '%' ], 'selectors' => [ $pill => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ] ] );
		$this->end_controls_section();
	}

	protected function render() {
		$text = (string) $this->get_settings_for_display( 'text' );

		if ( '' !== trim( $text ) ) {
			echo '<span class="rfb-badge-pill">' . esc_html( $text ) . '</span>';
		}
	}

	protected function content_template() {
		?>
		<# if ( settings.text ) { #><span class="rfb-badge-pill">{{{ settings.text }}}</span><# } #>
		<?php
	}
}
