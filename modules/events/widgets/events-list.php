<?php
namespace Refraction\Modules\Events\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Group_Control_Typography;
use Refraction\Modules\Events\Classes\Event_Data;
use Refraction\Modules\Events\Module;
use Refraction\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Events List: the next events (or the past ones) as cards or rows, each with a date badge in its category's color. */
class Events_List extends Widget_Base {

	public function get_name() {
		return 'refraction-events-list';
	}

	public function get_title() {
		return esc_html__( 'Events List', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-post-list';
	}

	public function get_categories() {
		return [ Module::WIDGET_CATEGORY ];
	}

	public function get_keywords() {
		return [ 'events', 'upcoming', 'list', 'cards', 'agenda' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-events' ];
	}

	public function has_widget_inner_wrapper(): bool {
		return false;
	}

	/** "Upcoming" moves with the date: not kept in the element cache. */
	protected function is_dynamic_content(): bool {
		return true;
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_list', [ 'label' => esc_html__( 'Events', 'refraction' ) ] );

		$this->add_control( 'which', [
			'label' => esc_html__( 'Show', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'upcoming',
			'options' => [
				'upcoming' => esc_html__( 'Upcoming (and happening now)', 'refraction' ),
				'past' => esc_html__( 'Past, newest first', 'refraction' ),
			],
		] );

		$this->add_control( 'count', [
			'label' => esc_html__( 'How many', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'default' => 6,
			'min' => 1,
			'max' => 50,
		] );

		$this->add_control( 'event_types', [
			'label' => esc_html__( 'Only these types of event', 'refraction' ),
			'type' => Controls_Manager::SELECT2,
			'multiple' => true,
			'label_block' => true,
			'options' => Event_Calendar::type_options(),
		] );

		$this->add_control( 'categories', [
			'label' => esc_html__( 'Only these categories', 'refraction' ),
			'type' => Controls_Manager::SELECT2,
			'multiple' => true,
			'label_block' => true,
			'options' => Event_Calendar::category_options(),
		] );

		$this->add_control( 'layout', [
			'label' => esc_html__( 'Layout', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'cards',
			'options' => [ 'cards' => esc_html__( 'Cards', 'refraction' ), 'rows' => esc_html__( 'Rows', 'refraction' ) ],
			'separator' => 'before',
		] );

		$this->add_responsive_control( 'columns', [
			'label' => esc_html__( 'Columns', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '3',
			'tablet_default' => '2',
			'mobile_default' => '1',
			'options' => [ '1' => '1', '2' => '2', '3' => '3', '4' => '4' ],
			'selectors' => [ '{{WRAPPER}} .rf-el' => '--rf-el-cols: {{VALUE}};' ],
			'condition' => [ 'layout' => 'cards' ],
		] );

		foreach ( [
			'show_image' => esc_html__( 'Featured image', 'refraction' ),
			'show_time' => esc_html__( 'Time', 'refraction' ),
			'show_venue' => esc_html__( 'Venue', 'refraction' ),
			'show_excerpt' => esc_html__( 'Short text', 'refraction' ),
			'show_category' => esc_html__( 'Category', 'refraction' ),
		] as $key => $label ) {
			$this->add_control( $key, [ 'label' => $label, 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );
		}

		$this->add_control( 'button', [
			'label' => esc_html__( 'Button text', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'View event', 'refraction' ),
			'description' => esc_html__( 'Empty: no button (the card still links to the event).', 'refraction' ),
		] );

		$this->add_control( 'empty', [
			'label' => esc_html__( 'When there are none', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'No events to show yet.', 'refraction' ),
			'label_block' => true,
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_card', [ 'label' => esc_html__( 'Cards', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );

		$this->add_responsive_control( 'gap', [
			'label' => esc_html__( 'Gap', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 60 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-el' => '--rf-el-gap: {{SIZE}}px;' ],
		] );

		$this->add_control( 'card_background', [
			'label' => esc_html__( 'Background', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-el-item' => 'background-color: {{VALUE}};' ],
		] );

		$this->add_control( 'card_radius', [
			'label' => esc_html__( 'Corners', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-el' => '--rf-el-radius: {{SIZE}}px;' ],
		] );

		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [ 'name' => 'card_shadow', 'selector' => '{{WRAPPER}} .rf-el-item' ] );

		$this->add_responsive_control( 'image_height', [
			'label' => esc_html__( 'Image height', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 80, 'max' => 400 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-el' => '--rf-el-img-h: {{SIZE}}px;' ],
			'condition' => [ 'show_image' => 'yes' ],
		] );

		$this->add_control( 'title_color', [
			'label' => esc_html__( 'Title color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-el-title' => 'color: {{VALUE}};' ],
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'title_typography', 'label' => esc_html__( 'Title', 'refraction' ), 'selector' => '{{WRAPPER}} .rf-el-title' ] );

		$this->add_control( 'meta_color', [
			'label' => esc_html__( 'Time and venue color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-el-meta, {{WRAPPER}} .rf-el-excerpt' => 'color: {{VALUE}};' ],
		] );

		$this->add_control( 'badge_color', [
			'label' => esc_html__( 'Date badge (empty: the category color)', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-el-badge' => 'background-color: {{VALUE}};' ],
		] );

		$this->add_control( 'button_color', [
			'label' => esc_html__( 'Button color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-el-button' => 'color: {{VALUE}};' ],
		] );

		$this->end_controls_section();
	}

	protected function render() {
		$s = $this->get_settings_for_display();
		$on = static fn( $key ) => 'yes' === ( $s[ $key ] ?? '' );
		$count = max( 1, min( 50, (int) ( $s['count'] ?? 6 ) ) );
		$today = current_time( 'Y-m-d' );
		$past = 'past' === ( $s['which'] ?? 'upcoming' );
		$categories = (array) ( $s['categories'] ?? [] );
		$types = (array) ( $s['event_types'] ?? [] );
		$ids = $past
			? array_reverse( array_filter( Event_Data::query( '1970-01-01', $today, '', $categories, -1, $types ), static fn( $id ) => Event_Data::get( $id )['end'] < current_time( 'Y-m-d H:i' ) ) )
			// Not ended yet: still to come, or happening now.
			: array_filter( Event_Data::query( $today, '9999-12-31', '', $categories, $count + 20, $types ), static fn( $id ) => Event_Data::get( $id )['end'] >= current_time( 'Y-m-d H:i' ) );
		$ids = array_slice( array_values( $ids ), 0, $count );
		$layout = 'rows' === ( $s['layout'] ?? 'cards' ) ? 'rows' : 'cards';

		if ( ! $ids ) {
			echo '<div class="rf-el rf-el-empty">' . esc_html( (string) ( $s['empty'] ?? '' ) ) . '</div>';
			return;
		}
		?>
		<div class="rf-el rf-el-<?php echo esc_attr( $layout ); ?>">
			<?php foreach ( $ids as $id ) : $card = Event_Data::card( $id ); ?>
				<article class="rf-el-item" style="--ev:<?php echo esc_attr( $card['color'] ); ?>">
					<?php if ( $on( 'show_image' ) && 'cards' === $layout ) : ?>
						<a class="rf-el-image" href="<?php echo esc_url( $card['url'] ); ?>" tabindex="-1" aria-hidden="true"<?php echo '' !== $card['thumb'] ? ' style="background-image:url(\'' . esc_url( $card['thumb'] ) . '\')"' : ''; ?>></a>
					<?php endif; ?>
					<div class="rf-el-body">
						<?php if ( $card['start'] ) : ?>
							<span class="rf-el-badge" aria-hidden="true"><b><?php echo esc_html( gmdate( 'j', $card['start'] ) ); ?></b><?php echo esc_html( date_i18n( 'M', $card['start'] ) ); ?></span>
						<?php endif; ?>
						<div class="rf-el-text">
							<?php if ( $on( 'show_category' ) && '' !== $card['category'] ) : ?>
								<span class="rf-el-cat"><?php echo esc_html( $card['category'] ); ?></span>
							<?php endif; ?>
							<h3 class="rf-el-title"><a href="<?php echo esc_url( $card['url'] ); ?>"><?php echo esc_html( $card['title'] ); ?></a></h3>
							<span class="rf-el-meta">
								<span class="rf-el-date"><?php echo esc_html( $card['date'] ); ?></span>
								<?php if ( $on( 'show_time' ) && '' !== $card['time'] ) : ?>
									<span class="rf-el-time"><?php echo esc_html( $card['time'] ); ?></span>
								<?php endif; ?>
								<?php if ( $on( 'show_venue' ) && '' !== $card['venue'] ) : ?>
									<span class="rf-el-venue"><?php echo esc_html( $card['venue'] ); ?></span>
								<?php endif; ?>
							</span>
							<?php if ( $on( 'show_excerpt' ) && '' !== $card['excerpt'] ) : ?>
								<p class="rf-el-excerpt"><?php echo esc_html( $card['excerpt'] ); ?></p>
							<?php endif; ?>
							<?php if ( '' !== trim( (string) ( $s['button'] ?? '' ) ) ) : ?>
								<a class="rf-el-button" href="<?php echo esc_url( $card['url'] ); ?>" aria-label="<?php echo esc_attr( $s['button'] . ': ' . $card['title'] ); ?>"><?php echo esc_html( $s['button'] ); ?> →</a>
							<?php endif; ?>
						</div>
					</div>
				</article>
			<?php endforeach; ?>
		</div>
		<?php
	}
}
