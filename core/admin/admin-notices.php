<?php
namespace Refraction\Core\Admin;

use Refraction\Core\Admin\UI\Components\Button;
use Refraction\Core\Base\Module;
use Refraction\Utils;
use Refraction\Core\Admin\Notices\Base_Notice;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Admin_Notices extends Module {

	const DEFAULT_EXCLUDED_PAGES = [ 'plugins.php', 'plugin-install.php', 'plugin-editor.php' ];

	const EXIT_EARLY_FOR_BACKWARD_COMPATIBILITY = false;

	private function get_notices() {
		/**
		 * Admin notices.
		 *
		 * Filters Refraction admin notices.
		 *
		 * This hook can be used by external developers to manage existing
		 * admin notice or to add new notices for Refraction add-ons.
		 *
		 * @param array $notices A list of notice classes.
		 */
		$notices = apply_filters( 'refraction/core/admin/notices', [] );

		return $notices;
	}

	public function print_admin_notice( array $options, $exclude_pages = self::DEFAULT_EXCLUDED_PAGES ) {
		global $pagenow;

		if ( in_array( $pagenow, $exclude_pages, true ) ) {
			return;
		}

		$default_options = [
			'id' => null,
			'title' => '',
			'description' => '',
			'classes' => [ 'notice', 'e-notice' ], // We include WP's default notice class so it will be properly handled by WP's js handler
			'type' => '',
			'dismissible' => true,
			'icon' => 'eicon-refraction-circle',
			'button' => [],
			'button_secondary' => [],
		];

		$options = array_replace_recursive( $default_options, $options );

		$notice_classes = $options['classes'];
		$dismiss_button = '';
		$icon = '';

		if ( $options['type'] ) {
			$notice_classes[] = 'e-notice--' . $options['type'];
		}

		$wrapper_attributes = [
			'role' => 'region',
			'aria-label' => esc_html__( 'Refraction notice', 'refraction' ),
		];

		if ( $options['dismissible'] ) {
			$label = esc_html__( 'Dismiss this notice.', 'refraction' );
			$notice_classes[] = 'e-notice--dismissible';
			$dismiss_button = '<i class="e-notice__dismiss" role="button" aria-label="' . $label . '" tabindex="0"></i>';

			$wrapper_attributes['data-nonce'] = wp_create_nonce( 'refraction_set_admin_notice_viewed' );
		}

		if ( $options['icon'] ) {
			$notice_classes[] = 'e-notice--extended';
			$icon = '<div class="e-notice__icon-wrapper"><i class="' . esc_attr( $options['icon'] ) . '" aria-hidden="true"></i></div>';
		}

		$wrapper_attributes['class'] = $notice_classes;

		if ( $options['id'] ) {
			$wrapper_attributes['data-notice_id'] = $options['id'];
		}

		if ( ! empty( $options['source'] ) ) {
			$wrapper_attributes['data-source'] = $options['source'];
		}
		?>
		<div <?php Utils::print_html_attributes( $wrapper_attributes ); ?>>
			<?php echo $dismiss_button; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
			<div class="e-notice__aside">
				<?php echo $icon; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
			</div>
			<div class="e-notice__content">
				<?php if ( $options['title'] ) { ?>
					<h3><?php echo wp_kses_post( $options['title'] ); ?></h3>
				<?php } ?>

				<?php if ( $options['description'] ) { ?>
					<p><?php echo wp_kses_post( $options['description'] ); ?></p>
				<?php } ?>

				<?php if ( ! empty( $options['button']['text'] ) || ! empty( $options['button_secondary']['text'] ) ) { ?>
					<div class="e-notice__actions">
						<?php
						foreach ( [ $options['button'], $options['button_secondary'] ] as $index => $button_settings ) {
							if ( empty( $button_settings['variant'] ) && $index ) {
								$button_settings['variant'] = 'outline';
							}

							if ( empty( $button_settings['text'] ) ) {
								continue;
							}

							$button = new Button( $button_settings );
							$button->print_button();
						} ?>
					</div>
				<?php } ?>
			</div>
		</div>
	<?php }

	public function admin_notices() {
		/** @var Base_Notice $notice_instance */
		foreach ( $this->get_notices() as $notice_instance ) {
			if ( ! $notice_instance->should_print() ) {
				continue;
			}

			$this->print_admin_notice( $notice_instance->get_config() );

			// It exits the method to make sure it prints only one notice.
			return;
		}
	}

	/**
	 * @since 2.9.0
	 * @access public
	 */
	public function __construct() {
		add_action( 'admin_notices', [ $this, 'admin_notices' ], 20 );
	}

	/**
	 * Get module name.
	 *
	 * Retrieve the module name.
	 *
	 * @since  2.9.0
	 * @access public
	 *
	 * @return string Module name.
	 */
	public function get_name() {
		return 'admin-notices';
	}
}
