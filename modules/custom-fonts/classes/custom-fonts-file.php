<?php
namespace Refraction\Modules\CustomFonts\Classes;

use Refraction\Core\Files\Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The generated @font-face stylesheet (uploads/refraction/css/custom-fonts.css), written through the files manager
 * so "Regenerate CSS" in the tools rebuilds it like the other generated files.
 */
class Custom_Fonts_File extends Base {

	const FILE_NAME = 'custom-fonts.css';
	const META_KEY = 'refraction_custom_fonts_css_meta';

	protected function parse_content() {
		return Pure_Font_Face_Css::generate( ( new Fonts_Repository() )->all(), Fonts_Repository::base_url() );
	}

	/** Writes the file when it is missing or the fonts changed; returns its URL, or '' when there is nothing to load. */
	public static function url(): string {
		$file = new self( self::FILE_NAME );

		if ( ! file_exists( $file->get_path() ) ) {
			$file->update();
		}

		return file_exists( $file->get_path() ) ? $file->get_url() : '';
	}

	public static function rebuild(): void {
		( new self( self::FILE_NAME ) )->update();
	}
}
