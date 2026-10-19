<?php
namespace Refraction\Modules\ProWidgets\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Image_Size;
use Refraction\Modules\ProWidgets\Base\Pro_Widget;
use Refraction\Repeater;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Price_List extends Pro_Widget {

	public function get_name() {
		return 'refraction-price-list';
	}

	public function get_title() {
		return esc_html__( 'Price List', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-price-list';
	}

	public function get_keywords() {
		return [ 'pricing', 'list', 'menu', 'price', 'restaurant', 'services' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-price-list' ];
	}

	protected function register_controls() {
		$this->content_section( 'section_items', esc_html__( 'List', 'refraction' ) );

		$repeater = new Repeater();

		$repeater->add_control(
			'title',
			[
				'label' => esc_html__( 'Title', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'First item on the list', 'refraction' ),
				'label_block' => true,
				'dynamic' => [ 'active' => true ],
			]
		);

		$repeater->add_control(
			'price',
			[
				'label' => esc_html__( 'Price', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => '$20',
				'dynamic' => [ 'active' => true ],
			]
		);

		$repeater->add_control(
			'description',
			[
				'label' => esc_html__( 'Description', 'refraction' ),
				'type' => Controls_Manager::TEXTAREA,
				'default' => esc_html__( 'A short description of this item.', 'refraction' ),
				'dynamic' => [ 'active' => true ],
			]
		);

		$repeater->add_control(
			'image',
			[
				'label' => esc_html__( 'Image', 'refraction' ),
				'type' => Controls_Manager::MEDIA,
				'dynamic' => [ 'active' => true ],
			]
		);

		$repeater->add_control(
			'link',
			[
				'label' => esc_html__( 'Link', 'refraction' ),
				'type' => Controls_Manager::URL,
				'dynamic' => [ 'active' => true ],
				'placeholder' => esc_html__( 'https://your-link.com', 'refraction' ),
			]
		);

		$this->add_control(
			'items',
			[
				'label' => esc_html__( 'Items', 'refraction' ),
				'type' => Controls_Manager::REPEATER,
				'fields' => $repeater->get_controls(),
				'title_field' => '{{{ title }}} - {{{ price }}}',
				'default' => [
					[ 'title' => esc_html__( 'First item on the list', 'refraction' ), 'price' => '$20', 'description' => esc_html__( 'A short description of this item.', 'refraction' ) ],
					[ 'title' => esc_html__( 'Second item on the list', 'refraction' ), 'price' => '$9', 'description' => esc_html__( 'A short description of this item.', 'refraction' ) ],
					[ 'title' => esc_html__( 'Third item on the list', 'refraction' ), 'price' => '$32', 'description' => esc_html__( 'A short description of this item.', 'refraction' ) ],
				],
			]
		);

		$this->add_control(
			'title_tag',
			[
				'label' => esc_html__( 'Title HTML Tag', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => $this->heading_tag_options(),
				'default' => 'span',
			]
		);

		$this->add_group_control(
			Group_Control_Image_Size::get_type(),
			[
				'name' => 'item_image',
				'default' => 'thumbnail',
				'separator' => 'before',
			]
		);

		$this->add_control(
			'image_position',
			[
				'label' => esc_html__( 'Image Position', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'default' => 'left',
				'options' => [
					'left' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-h-align-left' ],
					'right' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-h-align-right' ],
				],
				'prefix_class' => 'refraction-price-list--image-',
			]
		);

		$this->end_section();

		$this->style_section( 'style_list', esc_html__( 'List', 'refraction' ) );

		$this->add_responsive_control(
			'row_gap',
			[
				'label' => esc_html__( 'Space Between Items', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'max' => 100 ] ],
				'default' => [ 'size' => 20, 'unit' => 'px' ],
				'selectors' => [ '{{WRAPPER}} .refraction-price-list' => 'row-gap: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_control(
			'vertical_align',
			[
				'label' => esc_html__( 'Vertical Align', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'flex-start',
				'options' => [
					'flex-start' => esc_html__( 'Top', 'refraction' ),
					'center' => esc_html__( 'Middle', 'refraction' ),
					'flex-end' => esc_html__( 'Bottom', 'refraction' ),
				],
				'selectors' => [ '{{WRAPPER}} .refraction-price-list__item' => 'align-items: {{VALUE}};' ],
			]
		);

		$this->end_section();

		$this->style_section( 'style_image', esc_html__( 'Image', 'refraction' ) );

		$this->add_responsive_control(
			'image_width',
			[
				'label' => esc_html__( 'Width', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%' ],
				'range' => [ 'px' => [ 'min' => 20, 'max' => 300 ], '%' => [ 'min' => 5, 'max' => 50 ] ],
				'selectors' => [ '{{WRAPPER}} .refraction-price-list__image' => 'width: {{SIZE}}{{UNIT}}; flex-basis: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'image_radius',
			[
				'label' => esc_html__( 'Border Radius', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%' ],
				'selectors' => [ '{{WRAPPER}} .refraction-price-list__image img' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'image_gap',
			[
				'label' => esc_html__( 'Spacing', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'max' => 80 ] ],
				'default' => [ 'size' => 16, 'unit' => 'px' ],
				'selectors' => [ '{{WRAPPER}} .refraction-price-list__item' => 'column-gap: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->end_section();

		$this->style_section( 'style_title', esc_html__( 'Title & Price', 'refraction' ) );

		$this->add_control( 'heading_title', [ 'label' => esc_html__( 'Title', 'refraction' ), 'type' => Controls_Manager::HEADING ] );
		$this->text_style( 'title', '{{WRAPPER}} .refraction-price-list__title' );
		$this->add_control( 'heading_price', [ 'label' => esc_html__( 'Price', 'refraction' ), 'type' => Controls_Manager::HEADING, 'separator' => 'before' ] );
		$this->text_style( 'price', '{{WRAPPER}} .refraction-price-list__price' );
		$this->add_control( 'heading_sep', [ 'label' => esc_html__( 'Separator', 'refraction' ), 'type' => Controls_Manager::HEADING, 'separator' => 'before' ] );

		$this->add_control(
			'separator_style',
			[
				'label' => esc_html__( 'Style', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'dotted',
				'options' => [
					'solid' => esc_html__( 'Solid', 'refraction' ),
					'dotted' => esc_html__( 'Dotted', 'refraction' ),
					'dashed' => esc_html__( 'Dashed', 'refraction' ),
					'double' => esc_html__( 'Double', 'refraction' ),
					'none' => esc_html__( 'None', 'refraction' ),
				],
				'selectors' => [ '{{WRAPPER}} .refraction-price-list__separator' => 'border-bottom-style: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'separator_color',
			[
				'label' => esc_html__( 'Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-price-list__separator' => 'border-bottom-color: {{VALUE}};' ],
				'condition' => [ 'separator_style!' => 'none' ],
			]
		);

		$this->add_control(
			'separator_weight',
			[
				'label' => esc_html__( 'Weight', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 1, 'max' => 10 ] ],
				'default' => [ 'size' => 2, 'unit' => 'px' ],
				'selectors' => [ '{{WRAPPER}} .refraction-price-list__separator' => 'border-bottom-width: {{SIZE}}{{UNIT}};' ],
				'condition' => [ 'separator_style!' => 'none' ],
			]
		);

		$this->add_responsive_control(
			'separator_spacing',
			[
				'label' => esc_html__( 'Spacing', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'max' => 40 ] ],
				'default' => [ 'size' => 10, 'unit' => 'px' ],
				'selectors' => [ '{{WRAPPER}} .refraction-price-list__separator' => 'margin-inline: {{SIZE}}{{UNIT}};' ],
				'condition' => [ 'separator_style!' => 'none' ],
			]
		);

		$this->end_section();

		$this->style_section( 'style_description', esc_html__( 'Description', 'refraction' ) );
		$this->text_style( 'description', '{{WRAPPER}} .refraction-price-list__description' );
		$this->space_control( 'description_space', esc_html__( 'Spacing', 'refraction' ), '{{WRAPPER}} .refraction-price-list__description', 'margin-top' );
		$this->end_section();
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$items = $settings['items'] ?? [];

		if ( empty( $items ) ) {
			$this->render_editor_hint( esc_html__( 'Add items to the list.', 'refraction' ) );
			return;
		}

		$tag = Utils::validate_html_tag( $settings['title_tag'] ?? 'span' );
		?>
		<ul class="refraction-price-list">
			<?php foreach ( $items as $index => $item ) : ?>
				<?php
				$link_key = 'link_' . $index;
				$has_link = ! empty( $item['link']['url'] );
				if ( $has_link ) {
					$this->add_link_attributes( $link_key, $item['link'] );
					$this->add_render_attribute( $link_key, 'class', 'refraction-price-list__link' );
				}
				$has_image = ! empty( $item['image']['url'] );
				?>
				<li class="refraction-price-list__item">
					<?php if ( $has_image ) : ?>
						<div class="refraction-price-list__image">
							<?php
							$image_html = \Refraction\Group_Control_Image_Size::get_attachment_image_html(
								$item + [
									'item_image_size' => $settings['item_image_size'] ?? 'thumbnail',
									'item_image_custom_dimension' => $settings['item_image_custom_dimension'] ?? '',
								],
								'item_image',
								'image'
							);
							echo $image_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped by the image helper.
							?>
						</div>
					<?php endif; ?>
					<div class="refraction-price-list__text">
						<div class="refraction-price-list__header">
							<?php if ( $has_link ) : ?><a <?php $this->print_render_attribute_string( $link_key ); ?>><?php endif; ?>
							<<?php Utils::print_validated_html_tag( $tag ); ?> class="refraction-price-list__title"><?php echo esc_html( $item['title'] ); ?></<?php Utils::print_validated_html_tag( $tag ); ?>>
							<?php if ( $has_link ) : ?></a><?php endif; ?>
							<span class="refraction-price-list__separator" aria-hidden="true"></span>
							<span class="refraction-price-list__price"><?php echo esc_html( $item['price'] ); ?></span>
						</div>
						<?php if ( ! Utils::is_empty( $item['description'] ) ) : ?>
							<p class="refraction-price-list__description"><?php echo wp_kses_post( nl2br( esc_html( $item['description'] ) ) ); ?></p>
						<?php endif; ?>
					</div>
				</li>
			<?php endforeach; ?>
		</ul>
		<?php
	}
}
