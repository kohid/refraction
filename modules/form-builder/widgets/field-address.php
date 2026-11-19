<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Group_Control_Typography;
use Refraction\Modules\FormBuilder\Base\Field_Widget;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The Form Builder "address" field as an editor widget (0.123.0): a box that suggests addresses as the visitor types,
 * from the site owner's own list (typed in, or a .txt / .csv file in the Media Library). The form stays offline: no
 * outside address service is asked (see Classes\Address).
 */
class Field_Address extends Field_Widget {

	protected function field_type(): string {
		return 'address';
	}

	public function get_icon() {
		return 'rficon-map-pin';
	}

	public function get_keywords() {
		return [ 'form', 'field', 'address', 'postcode', 'location', 'pickup', 'autocomplete', 'suggest' ];
	}

	protected function features(): array {
		return [ 'placeholder', 'default', 'required' ];
	}

	protected function register_extra_controls(): void {
		$this->add_control( 'address_heading', [ 'label' => esc_html__( 'Suggested addresses', 'refraction' ), 'type' => Controls_Manager::HEADING, 'separator' => 'before', 'classes' => 'rf-panel-category' ] );
		$this->add_control( 'address_list', [
			'label' => esc_html__( 'Addresses', 'refraction' ),
			'type' => Controls_Manager::TEXTAREA,
			'rows' => 8,
			'default' => "Inverness, Highland, IV1 1AN\nInverness Airport, Old Military Road, Ardersier, Highland\nInvergordon, Highland, IV18 0DT\nInverarnie, Highland, IV2 6XA\nNairn, Highland, IV12 4AU",
			'description' => esc_html__( 'One per line: addresses, places, postcodes, hotels. Visitors see the ones that match what they type, and can still type their own.', 'refraction' ),
		] );
		$this->add_control( 'address_file', [
			'label' => esc_html__( 'Or a list file', 'refraction' ),
			'type' => Controls_Manager::MEDIA,
			'media_types' => [ 'text/plain', 'text/csv' ],
			'description' => esc_html__( 'A .txt or .csv file from the Media Library with one address per line, for long lists (up to 50,000). Added to the addresses above. Your own site searches it: no outside service.', 'refraction' ),
		] );
		$this->add_control( 'address_strict', [
			'label' => esc_html__( 'Only addresses from the list', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'description' => esc_html__( 'Visitors must pick one of the suggestions.', 'refraction' ),
		] );
		$this->add_control( 'address_min', [ 'label' => esc_html__( 'Letters before suggesting', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 1, 'max' => 5, 'default' => 2 ] );
		$this->add_control( 'address_max', [ 'label' => esc_html__( 'Suggestions shown', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 3, 'max' => 20, 'default' => 8 ] );
	}

	protected function register_style_controls(): void {
		parent::register_style_controls();

		$list = '{{WRAPPER}} .rfb-address-list';
		$var = static function ( string $name ): array {
			return [ '{{WRAPPER}}' => $name . ': {{VALUE}};' ];
		};

		$this->start_controls_section( 'section_style_address', [ 'label' => esc_html__( 'Suggestions', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_control( 'address_preview', [
			'label' => esc_html__( 'Show the list in the editor', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'description' => esc_html__( 'Editor only: keeps the list open under the box while you style it.', 'refraction' ),
		] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'address_typography', 'selector' => '{{WRAPPER}} .rfb-address-option' ] );
		$this->add_control( 'address_color', [ 'label' => esc_html__( 'Text color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => $var( '--rfb-addr-color' ) ] );
		$this->add_control( 'address_bg', [ 'label' => esc_html__( 'Background color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => $var( '--rfb-addr-bg' ) ] );
		$this->add_control( 'address_hover_color', [ 'label' => esc_html__( 'Highlighted text color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => $var( '--rfb-addr-hover-color' ) ] );
		$this->add_control( 'address_hover_bg', [ 'label' => esc_html__( 'Highlighted background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => $var( '--rfb-addr-hover-bg' ), 'description' => esc_html__( 'Under the pointer, and the one picked with the arrow keys.', 'refraction' ) ] );
		$this->add_control( 'address_border', [ 'label' => esc_html__( 'Border color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => $var( '--rfb-addr-border' ) ] );
		$this->add_responsive_control( 'address_max_h', [
			'label' => esc_html__( 'Tallest', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 120, 'max' => 600 ] ],
			'selectors' => [ '{{WRAPPER}}' => '--rfb-addr-max-h: {{SIZE}}px;' ],
			'description' => esc_html__( 'Past it, the list scrolls.', 'refraction' ),
		] );
		$this->add_responsive_control( 'address_pad_y', [ 'label' => esc_html__( 'Space above and below each', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 2, 'max' => 24 ] ], 'selectors' => [ '{{WRAPPER}}' => '--rfb-addr-pad-y: {{SIZE}}px;' ] ] );
		$this->add_responsive_control( 'address_pad_x', [ 'label' => esc_html__( 'Space at the sides', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 4, 'max' => 40 ] ], 'selectors' => [ '{{WRAPPER}}' => '--rfb-addr-pad-x: {{SIZE}}px;' ] ] );
		$this->add_responsive_control( 'address_radius', [ 'label' => esc_html__( 'Rounded corners', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0, 'max' => 24 ] ], 'selectors' => [ '{{WRAPPER}}' => '--rfb-addr-radius: {{SIZE}}px;' ] ] );
		$this->add_responsive_control( 'address_offset', [ 'label' => esc_html__( 'Space below the box', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0, 'max' => 24 ] ], 'selectors' => [ '{{WRAPPER}}' => '--rfb-addr-offset: {{SIZE}}px;' ] ] );
		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [ 'name' => 'address_shadow', 'selector' => $list ] );
		$this->end_controls_section();
	}

	public function raw_field(): array {
		$s = $this->get_settings_for_display();

		return [
			'address_list' => (string) ( $s['address_list'] ?? '' ),
			'address_file' => $s['address_file'] ?? 0,
			'address_strict' => 'yes' === ( $s['address_strict'] ?? '' ),
			'address_min' => $s['address_min'] ?? 2,
			'address_max' => $s['address_max'] ?? 8,
		] + parent::raw_field();
	}

	protected function render() {
		$preview = \Refraction\Plugin::$instance->editor->is_edit_mode() && 'yes' === $this->get_settings( 'address_preview' );

		echo $preview ? '<div class="rfb-address-preview">' : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		parent::render();
		echo $preview ? '</div>' : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}
}
