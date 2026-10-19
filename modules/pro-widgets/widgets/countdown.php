<?php
namespace Refraction\Modules\ProWidgets\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Typography;
use Refraction\Modules\ProWidgets\Base\Pro_Widget;
use Refraction\Modules\ProWidgets\Classes\Countdown_Logic;
use Refraction\Plugin;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Countdown extends Pro_Widget {

	const UNITS = [ 'days', 'hours', 'minutes', 'seconds' ];

	public function get_name() {
		return 'refraction-countdown';
	}

	public function get_title() {
		return esc_html__( 'Countdown', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-countdown';
	}

	public function get_keywords() {
		return [ 'countdown', 'timer', 'evergreen', 'offer', 'deadline', 'clock' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-countdown' ];
	}

	private function unit_labels(): array {
		return [
			'days' => esc_html__( 'Days', 'refraction' ),
			'hours' => esc_html__( 'Hours', 'refraction' ),
			'minutes' => esc_html__( 'Minutes', 'refraction' ),
			'seconds' => esc_html__( 'Seconds', 'refraction' ),
		];
	}

	protected function register_controls() {
		$this->content_section( 'section_timer', esc_html__( 'Countdown', 'refraction' ) );

		$this->add_control(
			'countdown_type',
			[
				'label' => esc_html__( 'Type', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'due_date',
				'options' => [
					'due_date' => esc_html__( 'Due Date', 'refraction' ),
					'evergreen' => esc_html__( 'Evergreen Timer', 'refraction' ),
				],
				'render_type' => 'template',
				'frontend_available' => true,
			]
		);

		$this->add_control(
			'due_date',
			[
				'label' => esc_html__( 'Due Date', 'refraction' ),
				'type' => Controls_Manager::DATE_TIME,
				'default' => gmdate( 'Y-m-d H:i', strtotime( '+1 month' ) ),
				'description' => sprintf(
					/* translators: %s: timezone name */
					esc_html__( 'Set in the site timezone (%s).', 'refraction' ),
					esc_html( Utils::get_timezone_string() )
				),
				'condition' => [ 'countdown_type' => 'due_date' ],
			]
		);

		foreach ( [
			'evergreen_days' => [ esc_html__( 'Days', 'refraction' ), 1 ],
			'evergreen_hours' => [ esc_html__( 'Hours', 'refraction' ), 0 ],
			'evergreen_minutes' => [ esc_html__( 'Minutes', 'refraction' ), 0 ],
			'evergreen_seconds' => [ esc_html__( 'Seconds', 'refraction' ), 0 ],
		] as $name => $info ) {
			$this->add_control(
				$name,
				[
					'label' => $info[0],
					'type' => Controls_Manager::NUMBER,
					'default' => $info[1],
					'min' => 0,
					'condition' => [ 'countdown_type' => 'evergreen' ],
				]
			);
		}

		$this->add_control(
			'evergreen_id',
			[
				'label' => esc_html__( 'Timer ID', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'description' => esc_html__( 'Each visitor gets their own timer, remembered in a cookie under this ID. Change it to start a fresh timer for everyone.', 'refraction' ),
				'condition' => [ 'countdown_type' => 'evergreen' ],
			]
		);

		$this->add_control(
			'view',
			[
				'label' => esc_html__( 'Layout', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'block',
				'options' => [
					'block' => esc_html__( 'Blocks', 'refraction' ),
					'inline' => esc_html__( 'Inline', 'refraction' ),
				],
				'prefix_class' => 'refraction-countdown--view-',
				'separator' => 'before',
			]
		);

		foreach ( $this->unit_labels() as $unit => $label ) {
			$this->add_control(
				'show_' . $unit,
				[
					'label' => sprintf(
						/* translators: %s: unit name */
						esc_html__( 'Show %s', 'refraction' ),
						$label
					),
					'type' => Controls_Manager::SWITCHER,
					'default' => 'yes',
					'return_value' => 'yes',
				]
			);

			$this->add_control(
				'label_' . $unit,
				[
					'label' => sprintf(
						/* translators: %s: unit name */
						esc_html__( '%s Label', 'refraction' ),
						$label
					),
					'type' => Controls_Manager::TEXT,
					'default' => $label,
					'condition' => [ 'show_' . $unit => 'yes' ],
				]
			);
		}

		$this->add_control(
			'show_separator',
			[
				'label' => esc_html__( 'Show Separator', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
				'prefix_class' => 'refraction-countdown--separator-',
			]
		);

		$this->end_section();

		$this->content_section( 'section_expire', esc_html__( 'When It Ends', 'refraction' ) );

		$this->add_control(
			'expire_action',
			[
				'label' => esc_html__( 'Action', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'none',
				'options' => [
					'none' => esc_html__( 'Keep showing zeros', 'refraction' ),
					'hide' => esc_html__( 'Hide the timer', 'refraction' ),
					'message' => esc_html__( 'Show a message', 'refraction' ),
					'redirect' => esc_html__( 'Redirect', 'refraction' ),
				],
			]
		);

		$this->add_control(
			'expire_message',
			[
				'label' => esc_html__( 'Message', 'refraction' ),
				'type' => Controls_Manager::TEXTAREA,
				'default' => esc_html__( 'This offer has ended.', 'refraction' ),
				'condition' => [ 'expire_action' => 'message' ],
				'dynamic' => [ 'active' => true ],
			]
		);

		$this->add_control(
			'redirect_url',
			[
				'label' => esc_html__( 'Redirect To', 'refraction' ),
				'type' => Controls_Manager::URL,
				'placeholder' => esc_html__( 'https://your-link.com', 'refraction' ),
				'condition' => [ 'expire_action' => 'redirect' ],
				'description' => esc_html__( 'Redirects happen on the live page only, never inside the editor.', 'refraction' ),
			]
		);

		$this->end_section();

		/* ---------------------------------------------------------------- style */
		$this->style_section( 'style_box', esc_html__( 'Boxes', 'refraction' ) );

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
				'default' => 'center',
				'selectors' => [ '{{WRAPPER}} .refraction-countdown__units' => 'justify-content: {{VALUE}};' ],
			]
		);

		$this->add_responsive_control(
			'gap',
			[
				'label' => esc_html__( 'Space Between', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'max' => 80 ] ],
				'default' => [ 'size' => 12, 'unit' => 'px' ],
				'selectors' => [ '{{WRAPPER}} .refraction-countdown__units' => 'gap: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'unit_min_width',
			[
				'label' => esc_html__( 'Minimum Width', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em' ],
				'range' => [ 'px' => [ 'min' => 20, 'max' => 300 ] ],
				'selectors' => [ '{{WRAPPER}} .refraction-countdown__unit' => 'min-width: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->box_style( 'unit', '{{WRAPPER}} .refraction-countdown__unit' );
		$this->end_section();

		$this->style_section( 'style_digits', esc_html__( 'Digits', 'refraction' ) );
		$this->text_style( 'digits', '{{WRAPPER}} .refraction-countdown__digits' );
		$this->end_section();

		$this->style_section( 'style_label', esc_html__( 'Labels', 'refraction' ) );
		$this->text_style( 'label', '{{WRAPPER}} .refraction-countdown__label' );
		$this->end_section();

		$this->style_section( 'style_message', esc_html__( 'Expired Message', 'refraction' ), [ 'expire_action' => 'message' ] );
		$this->text_style( 'message', '{{WRAPPER}} .refraction-countdown__message' );
		$this->align_control( 'message_align', '{{WRAPPER}} .refraction-countdown__message', [] );
		$this->end_section();
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$is_edit = Plugin::$instance->editor->is_edit_mode();
		$evergreen = 'evergreen' === $settings['countdown_type'];
		$now = time();
		$due = null;
		$total = 0;
		$key = '';

		if ( $evergreen ) {
			$total = Countdown_Logic::evergreen_seconds(
				(int) $settings['evergreen_days'],
				(int) $settings['evergreen_hours'],
				(int) $settings['evergreen_minutes'],
				(int) $settings['evergreen_seconds']
			);
			$id = '' !== trim( (string) $settings['evergreen_id'] ) ? $settings['evergreen_id'] : $this->get_id();
			$key = Countdown_Logic::cookie_key( (string) $id );
			$remaining = $total;
		} else {
			$due = Countdown_Logic::parse_due( (string) $settings['due_date'], wp_timezone() );
			$remaining = null === $due ? 0 : $due - $now;
		}

		$expired = ! $evergreen && ( null === $due || Countdown_Logic::is_expired( $due, $now ) );
		$action = $settings['expire_action'];
		$parts = Countdown_Logic::split( $expired ? 0 : (int) $remaining );

		// Days roll into hours when the Days unit is off, and so on up the chain, so no time is lost.
		$show = [];
		foreach ( self::UNITS as $unit ) {
			$show[ $unit ] = 'yes' === $settings[ 'show_' . $unit ];
		}
		$seconds_left = $expired ? 0 : (int) $remaining;
		$sizes = [ 'days' => 86400, 'hours' => 3600, 'minutes' => 60, 'seconds' => 1 ];
		$values = [];
		foreach ( self::UNITS as $unit ) {
			if ( ! $show[ $unit ] ) {
				continue;
			}
			$values[ $unit ] = intdiv( $seconds_left, $sizes[ $unit ] );
			$seconds_left -= $values[ $unit ] * $sizes[ $unit ];
		}

		$redirect = '';
		if ( 'redirect' === $action && ! empty( $settings['redirect_url']['url'] ) ) {
			$redirect = esc_url_raw( $settings['redirect_url']['url'], [ 'http', 'https' ] );
		}

		$classes = [ 'refraction-countdown' ];
		if ( $expired ) {
			$classes[] = 'is-expired';
		}
		if ( 'hide' === $action ) {
			$classes[] = 'refraction-countdown--hide';
		}
		if ( $is_edit ) {
			$classes[] = 'is-editor';
		}

		$this->add_render_attribute( 'countdown', [
			'class' => $classes,
			'role' => 'timer',
			'aria-label' => esc_attr__( 'Countdown', 'refraction' ),
			'data-type' => $evergreen ? 'evergreen' : 'date',
			'data-due' => null === $due ? '' : (string) $due,
			'data-total' => (string) $total,
			'data-key' => $key,
			'data-action' => $action,
			'data-redirect' => $redirect,
			'data-units' => implode( ',', array_keys( $values ) ),
		] );
		?>
		<div <?php $this->print_render_attribute_string( 'countdown' ); ?>>
			<div class="refraction-countdown__units"<?php echo ( $expired && 'message' === $action ) ? ' hidden' : ''; ?>>
				<?php foreach ( $values as $unit => $value ) : ?>
					<div class="refraction-countdown__unit refraction-countdown__unit--<?php echo esc_attr( $unit ); ?>">
						<span class="refraction-countdown__digits" data-unit="<?php echo esc_attr( $unit ); ?>"><?php echo esc_html( Countdown_Logic::pad( $value ) ); ?></span>
						<span class="refraction-countdown__label"><?php echo esc_html( $settings[ 'label_' . $unit ] ); ?></span>
					</div>
				<?php endforeach; ?>
			</div>
			<?php if ( 'message' === $action ) : ?>
				<div class="refraction-countdown__message" role="status"<?php echo $expired ? '' : ' hidden'; ?>><?php echo esc_html( $settings['expire_message'] ); ?></div>
			<?php endif; ?>
		</div>
		<?php
	}
}
