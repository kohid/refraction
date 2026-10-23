<?php
namespace Refraction\Modules\Popups\Classes;

use Refraction\Core\Utils\Icons;
use Refraction\Modules\Popups\Documents\Popup;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The popup markup, shared by the site (hidden, content kept in a <template> until the first open) and the
 * editor preview (always open, content printed by the editor).
 */
final class Popup_Renderer {

	const CLOSE_ICONS = [ 'close', 'cancel' ];

	/** The close button (the popup box is its positioning parent). Empty when the designer turned it off. */
	public static function close_button( Popup $document ): string {
		if ( 'yes' !== $document->get_settings( 'rp_show_close' ) ) {
			return '';
		}

		$icon = $document->get_settings( 'rp_close_icon' );
		$icon = in_array( $icon, self::CLOSE_ICONS, true ) ? $icon : 'close';

		return '<button type="button" class="refraction-popup__close" data-rp-close aria-label="' . esc_attr__( 'Close', 'refraction' ) . '">' . Icons::svg( $icon, [ 'size' => 22 ] ) . '</button>';
	}

	/**
	 * A popup for the site: hidden, with its widgets inside a <template> so nothing initialises before it opens.
	 *
	 * @param string $content_html The rendered widgets (trusted output of the Refraction renderer).
	 */
	public static function live( Popup $document, array $config, string $content_html ): string {
		$id = $document->get_main_id();
		$title = get_the_title( $id );
		$public = [
			'id' => $id,
			'triggers' => array_filter( $config['triggers'] ),
			'frequency' => $config['frequency'],
			'dismiss' => $config['dismiss'],
			'devices' => $config['devices'],
			'referrer' => $config['referrer'],
			'param' => $config['param'],
			'schedule' => $config['schedule'],
			'priority' => $config['priority'],
			'display' => $config['display'],
		];

		ob_start();
		?>
		<div class="refraction-popup refraction-popup-<?php echo (int) $id; ?>" id="refraction-popup-<?php echo (int) $id; ?>" data-rp="<?php echo (int) $id; ?>" data-rp-config="<?php echo esc_attr( (string) wp_json_encode( $public ) ); ?>" hidden>
			<div class="refraction-popup__overlay" data-rp-overlay></div>
			<div class="refraction-popup__layer" data-rp-layer>
				<div class="refraction-popup__box" role="dialog" aria-modal="true" aria-label="<?php echo esc_attr( $title ); ?>" tabindex="-1">
					<?php echo self::close_button( $document ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from escaped parts and a bundled icon. ?>
					<div class="refraction-popup__content" data-rp-content></div>
					<template data-rp-template><?php echo $content_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- rendered by the Refraction frontend. ?></template>
				</div>
			</div>
		</div>
		<?php

		return (string) ob_get_clean();
	}
}
