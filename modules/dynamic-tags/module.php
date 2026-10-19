<?php
namespace Refraction\Modules\DynamicTags;

use Refraction\Core\Base\Module as BaseModule;
use Refraction\Core\DynamicTags\Base_Tag;
use Refraction\Core\DynamicTags\Manager;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction dynamic tags module.
 *
 * Refraction dynamic tags module handler class is responsible for registering
 * and managing Refraction dynamic tags modules.
 *
 * @since 2.0.0
 */
class Module extends BaseModule {

	/**
	 * Base dynamic tag group.
	 */
	const BASE_GROUP = 'base';

	/**
	 * Dynamic tags text category.
	 */
	const TEXT_CATEGORY = 'text';

	/**
	 * Dynamic tags URL category.
	 */
	const URL_CATEGORY = 'url';

	/**
	 * Dynamic tags image category.
	 */
	const IMAGE_CATEGORY = 'image';

	/**
	 * Dynamic tags media category.
	 */
	const MEDIA_CATEGORY = 'media';

	/**
	 * Dynamic tags post meta category.
	 */
	const POST_META_CATEGORY = 'post_meta';

	/**
	 * Dynamic tags gallery category.
	 */
	const GALLERY_CATEGORY = 'gallery';

	/**
	 * Dynamic tags number category.
	 */
	const NUMBER_CATEGORY = 'number';

	/**
	 * Dynamic tags number category.
	 */
	const COLOR_CATEGORY = 'color';

	/**
	 * Dynamic tags datetime category.
	 */
	const DATETIME_CATEGORY = 'datetime';

	/**
	 * Dynamic tags SVG category.
	 */
	const SVG_CATEGORY = 'svg';

	const POST_GROUP = 'post';
	const SITE_GROUP = 'site';
	const ARCHIVE_GROUP = 'archive';
	const AUTHOR_GROUP = 'author';
	const ACTION_GROUP = 'action';
	const ACF_GROUP = 'acf';

	/**
	 * Dynamic tags module constructor.
	 *
	 * Initializing Refraction dynamic tags module.
	 *
	 * @since 2.0.0
	 * @access public
	 */
	public function __construct() {
		$this->register_groups();

		add_action( 'refraction/dynamic_tags/register', [ $this, 'register_tags' ] );
	}

	/**
	 * Get module name.
	 *
	 * Retrieve the dynamic tags module name.
	 *
	 * @since 2.0.0
	 * @access public
	 *
	 * @return string Module name.
	 */
	public function get_name() {
		return 'dynamic_tags';
	}

	/**
	 * Get classes names.
	 *
	 * Retrieve the dynamic tag classes names.
	 *
	 * @since 2.0.0
	 * @access public
	 *
	 * @return array Tag dynamic tag classes names.
	 */
	public function get_tag_classes_names() {
		$tags = [
			// Post.
			'Post_Title',
			'Post_Excerpt',
			'Post_Content',
			'Post_Date',
			'Post_Modified_Date',
			'Post_Time',
			'Post_Featured_Image',
			'Post_Url',
			'Post_Id',
			'Post_Terms',
			'Post_Comments',
			'Post_Custom_Field',
			'Post_Custom_Field_Url',
			'Post_Custom_Field_Color',
			'Post_Custom_Field_Image',
			'Post_Custom_Field_Gallery',
			// Author.
			'Author_Name',
			'Author_Bio',
			'Author_Avatar',
			'Author_Meta',
			'Author_Url',
			// Site.
			'Site_Title',
			'Site_Tagline',
			'Site_Url',
			'Site_Logo',
			'Current_Date_Time',
			'Request_Parameter',
			'Shortcode',
			'Page_Title',
			'User_Info',
			// Archive.
			'Archive_Title',
			'Archive_Description',
			'Archive_Url',
			'Archive_Meta',
			// Actions and URLs.
			'Contact_Url',
			'Internal_Url',
			'Lightbox',
			'Popup',
		];

		// Advanced Custom Fields is optional: its tags exist only while the plugin is active.
		if ( function_exists( 'get_field' ) ) {
			$tags = array_merge( $tags, [ 'Acf_Text', 'Acf_Number', 'Acf_Url', 'Acf_Image', 'Acf_Gallery', 'Acf_Color', 'Acf_Date' ] );
		}

		return $tags;
	}

	/**
	 * Get groups.
	 *
	 * Retrieve the dynamic tag groups.
	 *
	 * @since 2.0.0
	 * @access public
	 *
	 * @return array Tag dynamic tag groups.
	 */
	public function get_groups() {
		return [
			self::BASE_GROUP => [
				'title' => esc_html__( 'Base Tags', 'refraction' ),
			],
			self::POST_GROUP => [
				'title' => esc_html__( 'Post', 'refraction' ),
			],
			self::AUTHOR_GROUP => [
				'title' => esc_html__( 'Author', 'refraction' ),
			],
			self::ARCHIVE_GROUP => [
				'title' => esc_html__( 'Archive', 'refraction' ),
			],
			self::SITE_GROUP => [
				'title' => esc_html__( 'Site', 'refraction' ),
			],
			self::ACTION_GROUP => [
				'title' => esc_html__( 'Actions and URLs', 'refraction' ),
			],
			self::ACF_GROUP => [
				'title' => esc_html__( 'Advanced Custom Fields', 'refraction' ),
			],
		];
	}

	/**
	 * Register groups.
	 *
	 * Add all the available tag groups.
	 *
	 * @since 2.0.0
	 * @access private
	 */
	private function register_groups() {
		foreach ( $this->get_groups() as $group_name => $group_settings ) {
			Plugin::$instance->dynamic_tags->register_group( $group_name, $group_settings );
		}
	}

	/**
	 * Register tags.
	 *
	 * Add all the available dynamic tags.
	 *
	 * @since 2.0.0
	 * @access public
	 *
	 * @param Manager $dynamic_tags
	 */
	public function register_tags( $dynamic_tags ) {
		foreach ( $this->get_tag_classes_names() as $tag_class ) {
			/** @var Base_Tag $class_name */
			$class_name = $this->get_reflection()->getNamespaceName() . '\Tags\\' . $tag_class;

			$dynamic_tags->register( new $class_name() );
		}
	}
}
