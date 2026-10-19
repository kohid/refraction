<?php

namespace Refraction\Core\Ui_Theme;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The interface themes a user can pick for Refraction's own screens (admin pages and the editor UI).
 *
 * Pure data and validation, no WordPress calls. The token values live in assets/ui-theme/ui-themes.css.
 * Design adapted from Framify (kohid/Framify).
 */
class Registry {

	const AUTO = 'auto';

	/** Per-user choice. Missing or empty means "not chosen yet", so the site default applies. */
	const USER_META = 'refraction_ui_theme';

	/** Site-wide default for users who have not chosen (manage_options). */
	const SITE_OPTION = 'refraction_ui_theme_default';

	/** @return array<string,array{label:string,blurb:string,scheme:string,icon:string}> */
	public static function themes(): array {
		return [
			'daylight' => [
				'label' => __( 'Daylight', 'refraction' ),
				'blurb' => __( 'Cool paper, indigo accent', 'refraction' ),
				'scheme' => 'light',
				'icon' => 'light-mode',
			],
			'graphite' => [
				'label' => __( 'Graphite', 'refraction' ),
				'blurb' => __( 'Neutral dark, blue accent', 'refraction' ),
				'scheme' => 'dark',
				'icon' => 'dark-mode',
			],
			'ember' => [
				'label' => __( 'Ember', 'refraction' ),
				'blurb' => __( 'Warm dark, amber accent', 'refraction' ),
				'scheme' => 'dark',
				'icon' => 'dark-mode',
			],
			'blueprint' => [
				'label' => __( 'Blueprint', 'refraction' ),
				'blurb' => __( 'Deep navy, cyan accent', 'refraction' ),
				'scheme' => 'dark',
				'icon' => 'dark-mode',
			],
			'contrast' => [
				'label' => __( 'Contrast', 'refraction' ),
				'blurb' => __( 'Maximum legibility', 'refraction' ),
				'scheme' => 'light',
				'icon' => 'contrast',
			],
		];
	}

	/** Every selectable value, Automatic first. @return array<string,string> id => label */
	public static function choices(): array {
		$choices = [ self::AUTO => __( 'Automatic', 'refraction' ) ];

		foreach ( self::themes() as $id => $theme ) {
			$choices[ $id ] = $theme['label'];
		}

		return $choices;
	}

	public static function is_valid_choice( $value ): bool {
		return is_string( $value ) && array_key_exists( $value, self::choices() );
	}

	/** Whitelist a submitted value: a known id (or auto), otherwise an empty string. */
	public static function sanitize( $value ): string {
		if ( ! is_string( $value ) ) {
			return '';
		}

		$value = strtolower( trim( $value ) );

		return self::is_valid_choice( $value ) ? $value : '';
	}

	/** The theme to paint: the user's choice, else the site default, else Automatic. */
	public static function resolve( $user_choice, $site_default ): string {
		$user = self::sanitize( $user_choice );

		if ( '' !== $user ) {
			return $user;
		}

		$site = self::sanitize( $site_default );

		return '' !== $site ? $site : self::AUTO;
	}

	/** The attribute for the <html> tag. Automatic prints nothing, which keeps today's look exactly. */
	public static function html_attribute( string $theme ): string {
		$theme = self::sanitize( $theme );

		if ( '' === $theme || self::AUTO === $theme ) {
			return '';
		}

		return ' data-refraction-theme="' . $theme . '"';
	}
}
