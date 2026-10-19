<?php
namespace Refraction\Modules\ProWidgets\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Typography;
use Refraction\Icons_Manager;
use Refraction\Modules\ProWidgets\Base\Pro_Widget;
use Refraction\Modules\ProWidgets\Classes\Share_Links;
use Refraction\Repeater;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Share Buttons: plain links only. Nothing is loaded from any network; the visitor's browser goes to
 * the network when (and only when) the visitor follows the link.
 */
class Share_Buttons extends Pro_Widget {

	public function get_name() {
		return 'refraction-share-buttons';
	}

	public function get_title() {
		return esc_html__( 'Share Buttons', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-share';
	}

	public function get_keywords() {
		return [ 'share', 'social', 'facebook', 'twitter', 'x', 'linkedin', 'pinterest', 'whatsapp', 'telegram', 'print', 'copy' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-share-buttons' ];
	}

	private function icon_for( string $network ): array {
		$icons = [
			'facebook' => [ 'fab fa-facebook-f', 'fa-brands' ],
			'x' => [ 'fab fa-x-twitter', 'fa-brands' ],
			'linkedin' => [ 'fab fa-linkedin-in', 'fa-brands' ],
			'pinterest' => [ 'fab fa-pinterest-p', 'fa-brands' ],
			'whatsapp' => [ 'fab fa-whatsapp', 'fa-brands' ],
			'telegram' => [ 'fab fa-telegram', 'fa-brands' ],
			'email' => [ 'fas fa-envelope', 'fa-solid' ],
			'copy' => [ 'fas fa-link', 'fa-solid' ],
			'print' => [ 'fas fa-print', 'fa-solid' ],
		];

		return [
			'value' => $icons[ $network ][0],
			'library' => $icons[ $network ][1],
		];
	}

	private function network_options(): array {
		$out = [];
		foreach ( Share_Links::networks() as $slug => $label ) {
			$out[ $slug ] = $label;
		}
		$out['copy'] = esc_html__( 'Copy link', 'refraction' );
		$out['print'] = esc_html__( 'Print', 'refraction' );

		return $out;
	}

	protected function register_controls() {
		$this->content_section( 'section_buttons', esc_html__( 'Share Buttons', 'refraction' ) );

		$repeater = new Repeater();

		$repeater->add_control(
			'network',
			[
				'label' => esc_html__( 'Network', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => $this->network_options(),
				'default' => 'facebook',
			]
		);

		$repeater->add_control(
			'custom_label',
			[
				'label' => esc_html__( 'Custom Label', 'refraction' ),
				'type' => Controls_Manager::TEXT,
			]
		);

		$this->add_control(
			'networks',
			[
				'label' => esc_html__( 'Networks', 'refraction' ),
				'type' => Controls_Manager::REPEATER,
				'fields' => $repeater->get_controls(),
				'default' => [
					[ 'network' => 'facebook' ],
					[ 'network' => 'x' ],
					[ 'network' => 'linkedin' ],
					[ 'network' => 'email' ],
				],
				'title_field' => '{{{ network.charAt(0).toUpperCase() + network.slice(1) }}}',
			]
		);

		$this->add_control(
			'view',
			[
				'label' => esc_html__( 'View', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'icon-text',
				'options' => [
					'icon-text' => esc_html__( 'Icon & Text', 'refraction' ),
					'icon' => esc_html__( 'Icon', 'refraction' ),
					'text' => esc_html__( 'Text', 'refraction' ),
				],
				'render_type' => 'template',
				'prefix_class' => 'refraction-share--view-',
				'separator' => 'before',
			]
		);

		$this->add_control(
			'skin',
			[
				'label' => esc_html__( 'Skin', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'flat',
				'options' => [
					'flat' => esc_html__( 'Flat', 'refraction' ),
					'minimal' => esc_html__( 'Minimal', 'refraction' ),
					'framed' => esc_html__( 'Framed', 'refraction' ),
					'boxed' => esc_html__( 'Boxed', 'refraction' ),
				],
				'prefix_class' => 'refraction-share--skin-',
			]
		);

		$this->add_control(
			'shape',
			[
				'label' => esc_html__( 'Shape', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'square',
				'options' => [
					'square' => esc_html__( 'Square', 'refraction' ),
					'rounded' => esc_html__( 'Rounded', 'refraction' ),
					'circle' => esc_html__( 'Circle', 'refraction' ),
				],
				'prefix_class' => 'refraction-share--shape-',
			]
		);

		$dictionary = [ '0' => 'display: flex; flex-wrap: wrap; --refraction-share-grow: 0;' ];
		for ( $i = 1; $i <= 6; $i++ ) {
			$dictionary[ (string) $i ] = 'display: grid; grid-template-columns: repeat(' . $i . ', minmax(0, 1fr)); --refraction-share-grow: 1;';
		}

		$this->add_responsive_control(
			'columns',
			[
				'label' => esc_html__( 'Columns', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => '0',
				'options' => [
					'0' => esc_html__( 'Auto', 'refraction' ),
					'1' => '1',
					'2' => '2',
					'3' => '3',
					'4' => '4',
					'5' => '5',
					'6' => '6',
				],
				'selectors_dictionary' => $dictionary,
				'selectors' => [ '{{WRAPPER}} .refraction-share__list' => '{{VALUE}}' ],
			]
		);

		$this->add_responsive_control(
			'align',
			[
				'label' => esc_html__( 'Alignment', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'flex-start' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-h-align-left' ],
					'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-h-align-center' ],
					'flex-end' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-h-align-right' ],
				],
				'selectors' => [ '{{WRAPPER}} .refraction-share__list' => 'justify-content: {{VALUE}};' ],
			]
		);

		$this->end_section();

		$this->content_section( 'section_target', esc_html__( 'What To Share', 'refraction' ) );

		$this->add_control(
			'share_target',
			[
				'label' => esc_html__( 'Link', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'current',
				'options' => [
					'current' => esc_html__( 'Current page', 'refraction' ),
					'custom' => esc_html__( 'Custom URL', 'refraction' ),
				],
			]
		);

		$this->add_control(
			'custom_url',
			[
				'label' => esc_html__( 'URL', 'refraction' ),
				'type' => Controls_Manager::URL,
				'dynamic' => [ 'active' => true ],
				'condition' => [ 'share_target' => 'custom' ],
			]
		);

		$this->add_control(
			'share_title',
			[
				'label' => esc_html__( 'Message / Title', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'placeholder' => esc_html__( 'Defaults to the page title', 'refraction' ),
				'dynamic' => [ 'active' => true ],
				'label_block' => true,
			]
		);

		$this->add_control(
			'pinterest_image',
			[
				'label' => esc_html__( 'Pinterest Image', 'refraction' ),
				'type' => Controls_Manager::MEDIA,
				'description' => esc_html__( 'Defaults to the featured image.', 'refraction' ),
			]
		);

		$this->end_section();

		/* ---------------------------------------------------------------- style */
		$this->style_section( 'style_buttons', esc_html__( 'Buttons', 'refraction' ) );

		$this->add_control(
			'color_mode',
			[
				'label' => esc_html__( 'Color', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'official',
				'options' => [
					'official' => esc_html__( 'Official', 'refraction' ),
					'custom' => esc_html__( 'Custom', 'refraction' ),
				],
				'prefix_class' => 'refraction-share--color-',
			]
		);

		$this->add_control(
			'primary_color',
			[
				'label' => esc_html__( 'Primary Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}}.refraction-share--color-custom .refraction-share__button' => '--refraction-share-color: {{VALUE}};' ],
				'condition' => [ 'color_mode' => 'custom' ],
			]
		);

		$this->add_control(
			'secondary_color',
			[
				'label' => esc_html__( 'Secondary Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}}.refraction-share--color-custom .refraction-share__button' => '--refraction-share-contrast: {{VALUE}};' ],
				'condition' => [ 'color_mode' => 'custom' ],
			]
		);

		$this->add_responsive_control(
			'button_size',
			[
				'label' => esc_html__( 'Size', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em' ],
				'range' => [ 'px' => [ 'min' => 24, 'max' => 120 ] ],
				'selectors' => [ '{{WRAPPER}} .refraction-share__button' => 'min-height: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'icon_size',
			[
				'label' => esc_html__( 'Icon Size', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em' ],
				'range' => [ 'px' => [ 'min' => 10, 'max' => 60 ] ],
				'selectors' => [ '{{WRAPPER}} .refraction-share__icon' => 'font-size: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'gap',
			[
				'label' => esc_html__( 'Space Between', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'max' => 60 ] ],
				'default' => [ 'size' => 8, 'unit' => 'px' ],
				'selectors' => [ '{{WRAPPER}} .refraction-share__list' => 'gap: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'button_typography',
				'selector' => '{{WRAPPER}} .refraction-share__text',
			]
		);

		$this->add_responsive_control(
			'button_radius',
			[
				'label' => esc_html__( 'Border Radius', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%' ],
				'selectors' => [ '{{WRAPPER}} .refraction-share__button' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'button_padding',
			[
				'label' => esc_html__( 'Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em' ],
				'selectors' => [ '{{WRAPPER}} .refraction-share__button' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			]
		);

		$this->end_section();
	}

	/**
	 * URL of the page being viewed (the edited page while in the editor).
	 */
	private function current_url(): string {
		global $wp;

		if ( is_singular() ) {
			$url = get_permalink();
			if ( $url ) {
				return $url;
			}
		}

		$request = isset( $wp->request ) ? (string) $wp->request : '';

		return '' !== $request ? user_trailingslashit( home_url( $request ) ) : home_url( '/' );
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$networks = $settings['networks'] ?? [];

		if ( empty( $networks ) ) {
			$this->render_editor_hint( esc_html__( 'Add at least one network.', 'refraction' ) );
			return;
		}

		$custom = 'custom' === $settings['share_target'] && ! empty( $settings['custom_url']['url'] );
		$url = $custom ? $settings['custom_url']['url'] : $this->current_url();
		$title = '' !== trim( (string) $settings['share_title'] ) ? $settings['share_title'] : wp_strip_all_tags( get_the_title() );
		$image = ! empty( $settings['pinterest_image']['url'] ) ? $settings['pinterest_image']['url'] : (string) get_the_post_thumbnail_url( null, 'large' );
		$view = $settings['view'];
		$labels = $this->network_options();
		?>
		<div class="refraction-share">
			<ul class="refraction-share__list">
				<?php foreach ( $networks as $item ) : ?>
					<?php
					$network = (string) $item['network'];
					if ( ! isset( $labels[ $network ] ) ) {
						continue;
					}
					$name = '' !== trim( (string) $item['custom_label'] ) ? $item['custom_label'] : $labels[ $network ];
					$is_action = in_array( $network, [ 'copy', 'print' ], true );
					$key = 'btn_' . $item['_id'];

					if ( 'copy' === $network ) {
						$aria = __( 'Copy link', 'refraction' );
					} elseif ( 'print' === $network ) {
						$aria = __( 'Print this page', 'refraction' );
					} else {
						/* translators: %s: network name */
						$aria = sprintf( __( 'Share on %s', 'refraction' ), $name );
					}

					$this->add_render_attribute( $key, 'class', [ 'refraction-share__button', 'refraction-share__button--' . $network ] );
					$this->add_render_attribute( $key, 'aria-label', 'icon' === $view ? $aria : '' );

					if ( $is_action ) {
						$this->add_render_attribute( $key, [ 'type' => 'button', 'data-action' => $network, 'data-url' => $url ] );
						$tag = 'button';
					} else {
						$href = Share_Links::build( $network, $url, $title, '', [ 'media' => $image ] );
						$this->add_render_attribute( $key, [ 'href' => esc_url( $href, [ 'http', 'https', 'mailto' ] ), 'target' => '_blank', 'rel' => 'noopener noreferrer nofollow' ] );
						$tag = 'a';
					}

					// Icon-only buttons need their name on the element; with text the visible text names them.
					if ( 'icon' !== $view ) {
						$this->add_render_attribute( $key, 'aria-label', $aria, true );
					}
					?>
					<li class="refraction-share__item">
						<<?php Utils::print_validated_html_tag( $tag ); ?> <?php $this->print_render_attribute_string( $key ); ?>>
							<?php if ( 'text' !== $view ) : ?>
								<span class="refraction-share__icon"><?php Icons_Manager::render_icon( $this->icon_for( $network ), [ 'aria-hidden' => 'true' ] ); ?></span>
							<?php endif; ?>
							<?php if ( 'icon' !== $view ) : ?>
								<span class="refraction-share__text"><?php echo esc_html( $name ); ?></span>
							<?php endif; ?>
						</<?php Utils::print_validated_html_tag( $tag ); ?>>
					</li>
				<?php endforeach; ?>
			</ul>
			<span class="refraction-share__status" role="status" aria-live="polite" data-copied="<?php esc_attr_e( 'Link copied', 'refraction' ); ?>" data-failed="<?php esc_attr_e( 'Copy failed. Press Ctrl+C to copy the address.', 'refraction' ); ?>"></span>
		</div>
		<?php
	}
}
