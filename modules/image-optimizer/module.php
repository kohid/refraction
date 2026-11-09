<?php
namespace Refraction\Modules\ImageOptimizer;

use Refraction\Core\Base\Module as BaseModule;
use Refraction\Modules\ImageOptimizer\Classes\Pure_Image_Plan;
use Refraction\Settings;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Image uploads (Refraction > Settings > Images): every uploaded image is turned upright (camera orientation), brought
 * down to a longest side (landscape by width, portrait by height; smaller images keep their size) and saved as WebP,
 * and gets its file name as alt text when it has none. Works for every upload: the Media Library, the editor's Insert
 * Media window, drag and drop, and images added from a URL or the command line (sideloads). Done on the server with
 * WordPress's own image editor (GD or Imagick); nothing leaves the site.
 */
class Module extends BaseModule {

	const OPTION_WEBP = 'refraction_image_webp';
	const OPTION_MAX = 'refraction_image_max_size';
	const OPTION_QUALITY = 'refraction_image_quality';
	const OPTION_ALT = 'refraction_image_auto_alt';
	const TAB_ID = 'images';

	public function get_name() {
		return 'image-optimizer';
	}

	public function __construct() {
		parent::__construct();

		add_filter( 'wp_handle_upload', [ $this, 'optimize_upload' ], 10, 2 );
		add_action( 'add_attachment', [ $this, 'add_alt_text' ] );

		// The size limit is this module's (Maximum dimension; 0 keeps every size), so WordPress's own 2560px limit,
		// which would add a "-scaled" copy, is off.
		add_filter( 'big_image_size_threshold', '__return_false' );

		if ( is_admin() ) {
			add_action( 'refraction/admin/after_create_settings/' . Settings::PAGE_ID, [ $this, 'register_settings_tab' ], 30 );
		}
	}

	private static function enabled( string $option ): bool {
		return 'yes' === get_option( $option, 'yes' );
	}

	public static function webp_supported(): bool {
		return function_exists( 'wp_image_editor_supports' ) && wp_image_editor_supports( [ 'mime_type' => 'image/webp' ] );
	}

	/**
	 * The uploaded file, resized and converted. Anything that cannot be read or saved is left as it was.
	 *
	 * @param array $upload  file, url and type of the uploaded file.
	 * @param string $context 'upload' or 'sideload'.
	 */
	public function optimize_upload( $upload, $context = 'upload' ) {
		if ( ! is_array( $upload ) || ! empty( $upload['error'] ) || empty( $upload['file'] ) || ! in_array( $upload['type'] ?? '', Pure_Image_Plan::TYPES, true ) ) {
			return $upload;
		}

		$file = $upload['file'];
		$convert = self::enabled( self::OPTION_WEBP ) && 'image/webp' !== $upload['type'] && self::webp_supported();
		$max = Pure_Image_Plan::max_size( get_option( self::OPTION_MAX, '' ) );

		if ( 'image/gif' === $upload['type'] && Pure_Image_Plan::is_animated_gif( (string) file_get_contents( $file ) ) ) { // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a local upload.
			return $upload;
		}

		if ( ! function_exists( 'wp_get_image_editor' ) ) {
			require_once ABSPATH . 'wp-admin/includes/image.php';
		}

		$source = $convert ? $this->truecolor_copy( $file, $upload['type'] ) : '';
		$editor = wp_get_image_editor( '' !== $source ? $source : $file );

		if ( is_wp_error( $editor ) ) {
			$this->forget( $source );
			return $upload;
		}

		// Upright first (a phone photo's orientation is a tag that the conversion would drop), then measure.
		$rotated = method_exists( $editor, 'maybe_exif_rotate' ) && true === $editor->maybe_exif_rotate();
		$size = $editor->get_size();
		$target = Pure_Image_Plan::target_size( (int) ( $size['width'] ?? 0 ), (int) ( $size['height'] ?? 0 ), $max );

		if ( ! $convert && ! $target && ! $rotated ) {
			$this->forget( $source );
			return $upload;
		}

		if ( $target && is_wp_error( $editor->resize( $target[0], $target[1], false ) ) ) {
			$this->forget( $source );
			return $upload;
		}

		$editor->set_quality( Pure_Image_Plan::quality( get_option( self::OPTION_QUALITY, '' ) ) );

		$dir = dirname( $file );
		$path = $file;
		$mime = $upload['type'];

		if ( $convert ) {
			$mime = 'image/webp';
			$path = $dir . '/' . wp_unique_filename( $dir, pathinfo( $file, PATHINFO_FILENAME ) . '.webp' );
		}

		$saved = $editor->save( $path, $mime );
		$this->forget( $source );

		// A file the library could not write properly (empty or unreadable) is dropped; the upload stays as it was.
		if ( is_wp_error( $saved ) || empty( $saved['path'] ) || ! file_exists( $saved['path'] ) || ! filesize( $saved['path'] ) || ! wp_getimagesize( $saved['path'] ) ) {
			if ( ! is_wp_error( $saved ) && ! empty( $saved['path'] ) && $saved['path'] !== $file ) {
				wp_delete_file( $saved['path'] );
			}

			return $upload;
		}

		if ( $saved['path'] !== $file ) {
			wp_delete_file( $file );
			$upload['url'] = substr( $upload['url'], 0, strrpos( $upload['url'], '/' ) + 1 ) . wp_basename( $saved['path'] );
			$upload['file'] = $saved['path'];
		}

		$upload['type'] = $saved['mime-type'] ?? $mime;

		return $upload;
	}

	/**
	 * A full-colour PNG copy of a palette image (GIF, 8-bit PNG), which GD cannot write as WebP; '' when not needed
	 * or not possible. Transparency is kept.
	 */
	private function truecolor_copy( string $file, string $mime ): string {
		$head = (string) file_get_contents( $file, false, null, 0, 32 ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a local upload.

		if ( ! Pure_Image_Plan::is_palette( $mime, $head ) || ! function_exists( 'imagepalettetotruecolor' ) || ! function_exists( 'imagecreatefromstring' ) ) {
			return '';
		}

		$image = @imagecreatefromstring( (string) file_get_contents( $file ) ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged, WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a broken file is left to WordPress.

		if ( ! $image ) {
			return '';
		}

		imagepalettetotruecolor( $image );
		imagealphablending( $image, false );
		imagesavealpha( $image, true );

		$temp = wp_tempnam( 'refraction-image' );
		wp_delete_file( $temp );
		$copy = $temp . '.png';
		$done = imagepng( $image, $copy );
		imagedestroy( $image );

		return $done ? $copy : '';
	}

	private function forget( string $temp_file ): void {
		if ( '' !== $temp_file && file_exists( $temp_file ) ) {
			wp_delete_file( $temp_file );
		}
	}

	/** Alt text from the file name, for an image uploaded without one. */
	public function add_alt_text( $post_id ) {
		if ( ! self::enabled( self::OPTION_ALT ) || ! wp_attachment_is_image( $post_id ) || '' !== (string) get_post_meta( $post_id, '_wp_attachment_image_alt', true ) ) {
			return;
		}

		// The title is the uploaded file's own name (without the -1 WordPress adds to keep names unique), unless
		// the photo carried a title of its own.
		$name = (string) get_the_title( $post_id );
		$name = '' !== trim( $name ) ? $name : wp_basename( (string) get_attached_file( $post_id ) );
		$alt = Pure_Image_Plan::alt_from_filename( $name );

		if ( '' !== $alt ) {
			update_post_meta( $post_id, '_wp_attachment_image_alt', sanitize_text_field( $alt ) );
		}
	}

	public function register_settings_tab( Settings $settings ) {
		$checkbox = static fn( string $label, string $desc ) => [
			'label' => $label,
			'field_args' => [
				'type' => 'checkbox',
				'value' => 'yes',
				'std' => 'yes',
				'sub_desc' => esc_html__( 'On', 'refraction' ),
				'desc' => $desc,
			],
			'setting_args' => [
				'sanitize_callback' => static fn( $v ) => 'yes' === $v ? 'yes' : '',
			],
		];

		$settings->add_tab(
			self::TAB_ID,
			[
				'label' => esc_html__( 'Images', 'refraction' ),
				'sections' => [
					'image_uploads' => [
						'label' => esc_html__( 'Image uploads', 'refraction' ),
						'callback' => [ $this, 'render_section_intro' ],
						'fields' => [
							'image_webp' => $checkbox(
								esc_html__( 'Convert to WebP', 'refraction' ),
								esc_html__( 'JPG, PNG, BMP and still GIF uploads are saved as WebP, which is usually much smaller. Animated GIFs and SVGs stay as they are. Images already in the library are not changed.', 'refraction' )
							),
							'image_max_size' => [
								'label' => esc_html__( 'Maximum dimension (px)', 'refraction' ),
								'field_args' => [
									'type' => 'number',
									'std' => (string) Pure_Image_Plan::DEFAULT_MAX,
									'attributes' => [ 'min' => '0', 'max' => '10000', 'step' => '1', 'class' => 'small-text' ],
									'desc' => esc_html__( 'Auto-detects orientation. Landscape images resize by width, portrait images resize by height. Images smaller than this value remain unchanged. 0 keeps every size.', 'refraction' ),
								],
								'setting_args' => [
									'sanitize_callback' => static fn( $v ) => (string) Pure_Image_Plan::max_size( $v ),
								],
							],
							'image_quality' => [
								'label' => esc_html__( 'Image quality (%)', 'refraction' ),
								'field_args' => [
									'type' => 'number',
									'std' => (string) Pure_Image_Plan::DEFAULT_QUALITY,
									'attributes' => [ 'min' => '1', 'max' => '100', 'step' => '1', 'class' => 'small-text' ],
									'desc' => esc_html__( '80 is a good balance of size and sharpness.', 'refraction' ),
								],
								'setting_args' => [
									'sanitize_callback' => static fn( $v ) => (string) Pure_Image_Plan::quality( $v ),
								],
							],
							'image_auto_alt' => $checkbox(
								esc_html__( 'Alt text from the file name', 'refraction' ),
								esc_html__( 'An image uploaded without alt text gets its file name: "inverness-airport-van.jpg" becomes "Inverness airport van". Name files the way you would describe them.', 'refraction' )
							),
						],
					],
				],
			]
		);
	}

	public function render_section_intro() {
		echo '<p>' . esc_html__( 'Applied to every image uploaded from now on: in the Media Library, the editor\'s Insert Media window, drag and drop, and images added from a URL.', 'refraction' ) . '</p>';

		if ( ! self::webp_supported() ) {
			echo '<div class="notice notice-warning inline"><p>' . esc_html__( 'This server\'s image library cannot write WebP, so images are resized but keep their format. Ask your host to enable WebP in GD or Imagick.', 'refraction' ) . '</p></div>';
		}
	}
}
