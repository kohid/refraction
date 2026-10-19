<?php
namespace Refraction\Modules\ProWidgets\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Typography;
use Refraction\Modules\ProWidgets\Base\Pro_Widget;
use Refraction\Repeater;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Price_Table extends Pro_Widget {

	public function get_name() {
		return 'refraction-price-table';
	}

	public function get_title() {
		return esc_html__( 'Price Table', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-price-table';
	}

	public function get_keywords() {
		return [ 'pricing', 'table', 'plan', 'product', 'package', 'ribbon' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-price-table' ];
	}

	protected function register_controls() {
		$this->content_section( 'section_header', esc_html__( 'Header', 'refraction' ) );

		$this->add_control(
			'heading',
			[
				'label' => esc_html__( 'Title', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Enter your title', 'refraction' ),
				'label_block' => true,
				'dynamic' => [ 'active' => true ],
			]
		);

		$this->add_control(
			'sub_heading',
			[
				'label' => esc_html__( 'Description', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Enter your description', 'refraction' ),
				'label_block' => true,
				'dynamic' => [ 'active' => true ],
			]
		);

		$this->add_control(
			'heading_tag',
			[
				'label' => esc_html__( 'Title HTML Tag', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => $this->heading_tag_options(),
				'default' => 'h3',
			]
		);

		$this->end_section();

		$this->content_section( 'section_pricing', esc_html__( 'Pricing', 'refraction' ) );

		$this->add_control(
			'currency_symbol',
			[
				'label' => esc_html__( 'Currency Symbol', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'' => esc_html__( 'None', 'refraction' ),
					'dollar' => '&#36; ' . esc_html__( 'Dollar', 'refraction' ),
					'euro' => '&#128; ' . esc_html__( 'Euro', 'refraction' ),
					'baht' => '&#3647; ' . esc_html__( 'Baht', 'refraction' ),
					'franc' => '&#8355; ' . esc_html__( 'Franc', 'refraction' ),
					'guilder' => '&fnof; ' . esc_html__( 'Guilder', 'refraction' ),
					'krona' => 'kr ' . esc_html__( 'Krona', 'refraction' ),
					'lira' => '&#8356; ' . esc_html__( 'Lira', 'refraction' ),
					'peseta' => '&#8359 ' . esc_html__( 'Peseta', 'refraction' ),
					'peso' => '&#8369; ' . esc_html__( 'Peso', 'refraction' ),
					'pound' => '&#163; ' . esc_html__( 'Pound Sterling', 'refraction' ),
					'real' => 'R$ ' . esc_html__( 'Real', 'refraction' ),
					'ruble' => '&#8381; ' . esc_html__( 'Ruble', 'refraction' ),
					'rupee' => '&#8360; ' . esc_html__( 'Rupee', 'refraction' ),
					'indian_rupee' => '&#8377; ' . esc_html__( 'Rupee (Indian)', 'refraction' ),
					'shekel' => '&#8362; ' . esc_html__( 'Shekel', 'refraction' ),
					'yen' => '&#165; ' . esc_html__( 'Yen/Yuan', 'refraction' ),
					'won' => '&#8361; ' . esc_html__( 'Won', 'refraction' ),
					'custom' => esc_html__( 'Custom', 'refraction' ),
				],
				'default' => 'dollar',
			]
		);

		$this->add_control(
			'currency_symbol_custom',
			[
				'label' => esc_html__( 'Custom Symbol', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'condition' => [ 'currency_symbol' => 'custom' ],
			]
		);

		$this->add_control(
			'price',
			[
				'label' => esc_html__( 'Price', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => '39.99',
				'dynamic' => [ 'active' => true ],
			]
		);

		$this->add_control(
			'sale',
			[
				'label' => esc_html__( 'Sale', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'label_on' => esc_html__( 'On', 'refraction' ),
				'label_off' => esc_html__( 'Off', 'refraction' ),
				'return_value' => 'yes',
			]
		);

		$this->add_control(
			'original_price',
			[
				'label' => esc_html__( 'Original Price', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'default' => '59',
				'condition' => [ 'sale' => 'yes' ],
				'dynamic' => [ 'active' => true ],
			]
		);

		$this->add_control(
			'period',
			[
				'label' => esc_html__( 'Period', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Per Month', 'refraction' ),
			]
		);

		$this->add_control(
			'period_position',
			[
				'label' => esc_html__( 'Period Position', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'below' => esc_html__( 'Below', 'refraction' ),
					'beside' => esc_html__( 'Beside', 'refraction' ),
				],
				'default' => 'below',
				'prefix_class' => 'refraction-price-table--period-',
			]
		);

		$this->end_section();

		$this->content_section( 'section_features', esc_html__( 'Features', 'refraction' ) );

		$repeater = new Repeater();

		$repeater->add_control(
			'item_text',
			[
				'label' => esc_html__( 'Text', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'List Item', 'refraction' ),
				'dynamic' => [ 'active' => true ],
			]
		);

		$repeater->add_control(
			'item_included',
			[
				'label' => esc_html__( 'Included', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'return_value' => 'yes',
			]
		);

		$repeater->add_control(
			'item_color',
			[
				'label' => esc_html__( 'Text Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} {{CURRENT_ITEM}}' => 'color: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'features_list',
			[
				'label' => esc_html__( 'Features', 'refraction' ),
				'type' => Controls_Manager::REPEATER,
				'fields' => $repeater->get_controls(),
				'default' => [
					[ 'item_text' => esc_html__( 'Standard Feature', 'refraction' ), 'item_included' => 'yes' ],
					[ 'item_text' => esc_html__( 'Another Great Feature', 'refraction' ), 'item_included' => 'yes' ],
					[ 'item_text' => esc_html__( 'Obsolete Feature', 'refraction' ), 'item_included' => '' ],
					[ 'item_text' => esc_html__( 'Exciting Feature', 'refraction' ), 'item_included' => 'yes' ],
				],
				'title_field' => '{{{ item_text }}}',
			]
		);

		$this->end_section();

		$this->content_section( 'section_footer', esc_html__( 'Footer', 'refraction' ) );
		$this->button_content_controls( 'btn', esc_html__( 'Choose Plan', 'refraction' ) );

		$this->add_control(
			'footer_additional_info',
			[
				'label' => esc_html__( 'Additional Info', 'refraction' ),
				'type' => Controls_Manager::TEXTAREA,
				'default' => esc_html__( 'This is a text element', 'refraction' ),
				'separator' => 'before',
			]
		);

		$this->end_section();

		$this->content_section( 'section_ribbon', esc_html__( 'Ribbon', 'refraction' ) );

		$this->add_control(
			'show_ribbon',
			[
				'label' => esc_html__( 'Show', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
			]
		);

		$this->add_control(
			'ribbon_title',
			[
				'label' => esc_html__( 'Title', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Popular', 'refraction' ),
				'condition' => [ 'show_ribbon' => 'yes' ],
			]
		);

		$this->add_control(
			'ribbon_horizontal_position',
			[
				'label' => esc_html__( 'Position', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'left' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-h-align-left' ],
					'right' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-h-align-right' ],
				],
				'default' => 'right',
				'prefix_class' => 'refraction-price-table--ribbon-',
				'condition' => [ 'show_ribbon' => 'yes' ],
			]
		);

		$this->end_section();

		/* ---------------------------------------------------------------- style */
		$this->style_section( 'style_box', esc_html__( 'Box', 'refraction' ) );
		$this->box_style( 'box', '{{WRAPPER}} .refraction-price-table' );
		$this->align_control( 'box_align', '{{WRAPPER}} .refraction-price-table', [] );
		$this->end_section();

		$this->style_section( 'style_header', esc_html__( 'Header', 'refraction' ) );
		$this->add_control(
			'header_bg',
			[
				'label' => esc_html__( 'Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-price-table__header' => 'background-color: {{VALUE}};' ],
			]
		);
		$this->add_responsive_control(
			'header_padding',
			[
				'label' => esc_html__( 'Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', '%' ],
				'selectors' => [ '{{WRAPPER}} .refraction-price-table__header' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			]
		);
		$this->add_control( 'heading_h', [ 'label' => esc_html__( 'Title', 'refraction' ), 'type' => Controls_Manager::HEADING, 'separator' => 'before' ] );
		$this->text_style( 'heading', '{{WRAPPER}} .refraction-price-table__heading' );
		$this->add_control( 'heading_sub', [ 'label' => esc_html__( 'Description', 'refraction' ), 'type' => Controls_Manager::HEADING, 'separator' => 'before' ] );
		$this->text_style( 'sub_heading', '{{WRAPPER}} .refraction-price-table__subheading' );
		$this->end_section();

		$this->style_section( 'style_pricing', esc_html__( 'Pricing', 'refraction' ) );
		$this->add_control(
			'pricing_bg',
			[
				'label' => esc_html__( 'Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-price-table__price-wrap' => 'background-color: {{VALUE}};' ],
			]
		);
		$this->text_style( 'price', '{{WRAPPER}} .refraction-price-table__price' );
		$this->add_control(
			'currency_position',
			[
				'label' => esc_html__( 'Currency Position', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [ 'before' => esc_html__( 'Before', 'refraction' ), 'after' => esc_html__( 'After', 'refraction' ) ],
				'default' => 'before',
			]
		);
		$this->add_control(
			'currency_size',
			[
				'label' => esc_html__( 'Currency Size', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'em', 'px' ],
				'range' => [ 'em' => [ 'min' => 0.3, 'max' => 3, 'step' => 0.1 ] ],
				'default' => [ 'size' => 0.5, 'unit' => 'em' ],
				'selectors' => [ '{{WRAPPER}} .refraction-price-table__currency' => 'font-size: {{SIZE}}{{UNIT}};' ],
			]
		);
		$this->add_control( 'heading_orig', [ 'label' => esc_html__( 'Original Price', 'refraction' ), 'type' => Controls_Manager::HEADING, 'separator' => 'before', 'condition' => [ 'sale' => 'yes' ] ] );
		$this->text_style( 'original', '{{WRAPPER}} .refraction-price-table__original', [ 'sale' => 'yes' ] );
		$this->add_control( 'heading_period', [ 'label' => esc_html__( 'Period', 'refraction' ), 'type' => Controls_Manager::HEADING, 'separator' => 'before' ] );
		$this->text_style( 'period', '{{WRAPPER}} .refraction-price-table__period' );
		$this->add_responsive_control(
			'pricing_padding',
			[
				'label' => esc_html__( 'Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', '%' ],
				'selectors' => [ '{{WRAPPER}} .refraction-price-table__price-wrap' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			]
		);
		$this->end_section();

		$this->style_section( 'style_features', esc_html__( 'Features', 'refraction' ) );
		$this->add_control(
			'features_bg',
			[
				'label' => esc_html__( 'Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-price-table__features' => 'background-color: {{VALUE}};' ],
			]
		);
		$this->text_style( 'features', '{{WRAPPER}} .refraction-price-table__feature' );
		$this->add_control(
			'excluded_color',
			[
				'label' => esc_html__( 'Not Included Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => '#8a8f98',
				'selectors' => [ '{{WRAPPER}} .refraction-price-table__feature--excluded' => 'color: {{VALUE}};' ],
			]
		);
		$this->add_responsive_control(
			'features_padding',
			[
				'label' => esc_html__( 'Item Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em' ],
				'selectors' => [ '{{WRAPPER}} .refraction-price-table__feature' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			]
		);
		$this->add_control(
			'divider_color',
			[
				'label' => esc_html__( 'Divider Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-price-table__feature + .refraction-price-table__feature' => 'border-top: 1px solid {{VALUE}};' ],
			]
		);
		$this->end_section();

		$this->style_section( 'style_footer', esc_html__( 'Footer', 'refraction' ) );
		$this->add_control(
			'footer_bg',
			[
				'label' => esc_html__( 'Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-price-table__footer' => 'background-color: {{VALUE}};' ],
			]
		);
		$this->add_responsive_control(
			'footer_padding',
			[
				'label' => esc_html__( 'Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', '%' ],
				'selectors' => [ '{{WRAPPER}} .refraction-price-table__footer' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			]
		);
		$this->add_control( 'heading_btn', [ 'label' => esc_html__( 'Button', 'refraction' ), 'type' => Controls_Manager::HEADING, 'separator' => 'before' ] );
		$this->button_style_controls( 'button', '{{WRAPPER}} .refraction-price-table__footer .refraction-pro-button' );
		$this->add_control( 'heading_info', [ 'label' => esc_html__( 'Additional Info', 'refraction' ), 'type' => Controls_Manager::HEADING, 'separator' => 'before' ] );
		$this->text_style( 'info', '{{WRAPPER}} .refraction-price-table__additional' );
		$this->end_section();

		$this->style_section( 'style_ribbon', esc_html__( 'Ribbon', 'refraction' ), [ 'show_ribbon' => 'yes' ] );
		$this->add_control(
			'ribbon_bg',
			[
				'label' => esc_html__( 'Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => '#c2410c',
				'selectors' => [ '{{WRAPPER}} .refraction-price-table__ribbon-inner' => 'background-color: {{VALUE}};' ],
			]
		);
		$this->add_control(
			'ribbon_color',
			[
				'label' => esc_html__( 'Text Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => '#ffffff',
				'selectors' => [ '{{WRAPPER}} .refraction-price-table__ribbon-inner' => 'color: {{VALUE}};' ],
			]
		);
		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'ribbon_typography',
				'selector' => '{{WRAPPER}} .refraction-price-table__ribbon-inner',
			]
		);
		$this->add_responsive_control(
			'ribbon_distance',
			[
				'label' => esc_html__( 'Distance', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 0, 'max' => 100 ] ],
				'selectors' => [ '{{WRAPPER}} .refraction-price-table__ribbon-inner' => 'margin-top: {{SIZE}}{{UNIT}};' ],
			]
		);
		$this->end_section();
	}

	private function currency_symbol( string $key, string $custom ): string {
		$symbols = [
			'dollar' => '&#36;', 'euro' => '&#128;', 'franc' => '&#8355;', 'pound' => '&#163;', 'ruble' => '&#8381;',
			'shekel' => '&#8362;', 'baht' => '&#3647;', 'yen' => '&#165;', 'won' => '&#8361;', 'guilder' => '&fnof;',
			'peso' => '&#8369;', 'peseta' => '&#8359', 'lira' => '&#8356;', 'rupee' => '&#8360;', 'indian_rupee' => '&#8377;',
			'real' => 'R$', 'krona' => 'kr',
		];

		if ( 'custom' === $key ) {
			return esc_html( $custom );
		}

		return $symbols[ $key ] ?? ''; // Static HTML entities from the table above.
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$symbol = $this->currency_symbol( (string) $settings['currency_symbol'], (string) ( $settings['currency_symbol_custom'] ?? '' ) );
		$after = 'after' === ( $settings['currency_position'] ?? 'before' );
		$tag = Utils::validate_html_tag( $settings['heading_tag'] ?? 'h3' );
		$currency_html = '' !== $symbol ? '<span class="refraction-price-table__currency">' . $symbol . '</span>' : ''; // phpcs:ignore -- entity table or escaped custom symbol.
		?>
		<div class="refraction-price-table">
			<?php if ( ! Utils::is_empty( $settings['heading'] ) || ! Utils::is_empty( $settings['sub_heading'] ) ) : ?>
				<div class="refraction-price-table__header">
					<?php if ( ! Utils::is_empty( $settings['heading'] ) ) : ?>
						<<?php Utils::print_validated_html_tag( $tag ); ?> class="refraction-price-table__heading"><?php echo esc_html( $settings['heading'] ); ?></<?php Utils::print_validated_html_tag( $tag ); ?>>
					<?php endif; ?>
					<?php if ( ! Utils::is_empty( $settings['sub_heading'] ) ) : ?>
						<p class="refraction-price-table__subheading"><?php echo esc_html( $settings['sub_heading'] ); ?></p>
					<?php endif; ?>
				</div>
			<?php endif; ?>

			<div class="refraction-price-table__price-wrap">
				<?php if ( 'yes' === $settings['sale'] && ! Utils::is_empty( $settings['original_price'] ) ) : ?>
					<del class="refraction-price-table__original"><?php echo $after ? '' : $currency_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?><?php echo esc_html( $settings['original_price'] ); ?><?php echo $after ? $currency_html : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></del>
				<?php endif; ?>
				<span class="refraction-price-table__price">
					<?php echo $after ? '' : $currency_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?><span class="refraction-price-table__amount"><?php echo esc_html( $settings['price'] ); ?></span><?php echo $after ? $currency_html : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				</span>
				<?php if ( ! Utils::is_empty( $settings['period'] ) ) : ?>
					<span class="refraction-price-table__period"><?php echo esc_html( $settings['period'] ); ?></span>
				<?php endif; ?>
			</div>

			<?php if ( ! empty( $settings['features_list'] ) ) : ?>
				<ul class="refraction-price-table__features">
					<?php foreach ( $settings['features_list'] as $item ) : ?>
						<?php $included = 'yes' === ( $item['item_included'] ?? '' ); ?>
						<li class="refraction-price-table__feature refraction-repeater-item-<?php echo esc_attr( $item['_id'] ); ?><?php echo $included ? '' : ' refraction-price-table__feature--excluded'; ?>">
							<span class="refraction-price-table__mark" aria-hidden="true"><?php echo $included ? '&#10003;' : '&#10005;'; ?></span>
							<?php echo esc_html( $item['item_text'] ); ?>
							<?php if ( ! $included ) : ?>
								<span class="refraction-visually-hidden"><?php esc_html_e( '(not included)', 'refraction' ); ?></span>
							<?php endif; ?>
						</li>
					<?php endforeach; ?>
				</ul>
			<?php endif; ?>

			<?php if ( ! Utils::is_empty( $settings['btn_text'] ) || ! Utils::is_empty( $settings['footer_additional_info'] ) ) : ?>
				<div class="refraction-price-table__footer">
					<?php $this->render_button( $settings, 'btn' ); ?>
					<?php if ( ! Utils::is_empty( $settings['footer_additional_info'] ) ) : ?>
						<p class="refraction-price-table__additional"><?php echo esc_html( $settings['footer_additional_info'] ); ?></p>
					<?php endif; ?>
				</div>
			<?php endif; ?>

			<?php if ( 'yes' === $settings['show_ribbon'] && ! Utils::is_empty( $settings['ribbon_title'] ) ) : ?>
				<div class="refraction-price-table__ribbon"><div class="refraction-price-table__ribbon-inner"><?php echo esc_html( $settings['ribbon_title'] ); ?></div></div>
			<?php endif; ?>
		</div>
		<?php
	}
}
