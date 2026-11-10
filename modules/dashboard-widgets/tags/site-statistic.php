<?php
namespace Refraction\Modules\DashboardWidgets\Tags;

use Refraction\Controls_Manager;
use Refraction\Core\DynamicTags\Tag;
use Refraction\Modules\DynamicTags\Module as Tags;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Site Statistic (dynamic tag, Site group): a count from this site for dashboards: published posts of a type,
 * approved comments, users (of a role), or form submissions; all time or the last 7, 30 or 365 days.
 */
class Site_Statistic extends Tag {

	public function get_name() {
		return 'site-statistic';
	}

	public function get_title() {
		return esc_html__( 'Site Statistic', 'refraction' );
	}

	public function get_group() {
		return Tags::SITE_GROUP;
	}

	public function get_categories() {
		return [ Tags::TEXT_CATEGORY, Tags::NUMBER_CATEGORY ];
	}

	protected function register_controls() {
		$this->add_control( 'stat', [
			'label' => esc_html__( 'Count', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'posts',
			'options' => [
				'posts' => esc_html__( 'Published posts (of a type)', 'refraction' ),
				'comments' => esc_html__( 'Approved comments', 'refraction' ),
				'users' => esc_html__( 'Users', 'refraction' ),
				'submissions' => esc_html__( 'Form submissions', 'refraction' ),
			],
		] );

		$types = [];

		foreach ( get_post_types( [ 'public' => true ], 'objects' ) as $name => $type ) {
			$types[ $name ] = $type->labels->name;
		}

		$this->add_control( 'post_type', [
			'label' => esc_html__( 'Post Type', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'post',
			'options' => $types,
			'condition' => [ 'stat' => 'posts' ],
		] );

		$roles = [ '' => esc_html__( 'Everyone', 'refraction' ) ];

		foreach ( wp_roles()->get_names() as $role => $label ) {
			$roles[ $role ] = translate_user_role( $label );
		}

		$this->add_control( 'role', [
			'label' => esc_html__( 'Role', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => $roles,
			'condition' => [ 'stat' => 'users' ],
		] );

		$this->add_control( 'period', [
			'label' => esc_html__( 'Period', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => [
				'' => esc_html__( 'All time', 'refraction' ),
				'7' => esc_html__( 'Last 7 days', 'refraction' ),
				'30' => esc_html__( 'Last 30 days', 'refraction' ),
				'365' => esc_html__( 'Last 12 months', 'refraction' ),
			],
		] );
	}

	public function render() {
		echo esc_html( (string) self::count( (array) $this->get_settings() ) );
	}

	/** The count for the tag's settings (also used by the Chart widget's WordPress data). */
	public static function count( array $settings ): int {
		global $wpdb;

		$days = (int) ( $settings['period'] ?? 0 );
		$since = $days > 0 ? gmdate( 'Y-m-d H:i:s', time() - ( $days * DAY_IN_SECONDS ) ) : '';

		switch ( $settings['stat'] ?? 'posts' ) {
			case 'comments':
				return (int) ( '' === $since
					? $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->comments} WHERE comment_approved = '1'" )
					: $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->comments} WHERE comment_approved = '1' AND comment_date_gmt >= %s", $since ) ) );

			case 'users':
				$role = (string) ( $settings['role'] ?? '' );
				$args = [ 'fields' => 'ID', 'number' => 1, 'count_total' => true ];

				if ( '' !== $role ) {
					$args['role'] = $role;
				}

				if ( '' !== $since ) {
					$args['date_query'] = [ [ 'after' => $since, 'column' => 'user_registered' ] ];
				}

				return (int) ( new \WP_User_Query( $args ) )->get_total();

			case 'submissions':
				$table = $wpdb->prefix . 'refraction_submissions';

				if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) ) !== $table ) {
					return 0;
				}

				return (int) ( '' === $since
					? $wpdb->get_var( "SELECT COUNT(*) FROM {$table}" ) // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Our own table name.
					: $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE created_gmt >= %s", $since ) ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Our own table name.

			default:
				$type = sanitize_key( (string) ( $settings['post_type'] ?? 'post' ) );

				return (int) ( '' === $since
					? $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = %s AND post_status = 'publish'", $type ) )
					: $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = %s AND post_status = 'publish' AND post_date_gmt >= %s", $type, $since ) ) );
		}
	}
}
