<?php
namespace Refraction\Core\RoleManager;

use Refraction\Modules\EditorOne\Classes\Menu_Data_Provider;
use Refraction\Plugin;
use Refraction\Settings;
use Refraction\Settings_Page;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Role_Manager extends Settings_Page {

	const PAGE_ID = 'refraction-role-manager';

	const ROLE_MANAGER_OPTION_NAME = 'exclude_user_roles';

	const ROLE_MANAGER_ADVANCED = 'role-manager';

	private static $advanced_options = [];

	/**
	 * @since 2.0.0
	 * @access public
	 */
	public function get_role_manager_options() {
		return get_option( 'refraction_' . self::ROLE_MANAGER_OPTION_NAME, [] );
	}

	public function get_role_manager_advanced_options() {
		return get_option( 'refraction_' . self::ROLE_MANAGER_ADVANCED, [] );
	}

	public function get_user_advanced_options() {
		if ( ! empty( static::$advanced_options ) ) {
			return static::$advanced_options;
		}

		static::$advanced_options = $this->get_role_manager_advanced_options();
		return static::$advanced_options;
	}

	/**
	 * @since 2.0.0
	 * @access protected
	 */
	protected function get_page_title() {
		return esc_html__( 'Role Manager', 'refraction' );
	}

	/**
	 * @since 2.0.0
	 * @access protected
	 */
	protected function create_tabs() {
		$validation_class = 'Refraction\Settings_Validations';
		return [
			'general' => [
				'label' => esc_html__( 'General', 'refraction' ),
				'sections' => [
					'tools' => [
						'fields' => [
							'exclude_user_roles' => [
								'label' => esc_html__( 'Exclude Roles', 'refraction' ),
								'field_args' => [
									'type' => 'checkbox_list_roles',
									'exclude' => [ 'super_admin', 'administrator' ],
								],
								'setting_args' => [
									'sanitize_callback' => [ $validation_class, 'checkbox_list' ],
								],
							],
							self::ROLE_MANAGER_ADVANCED => [
								'field_args' => [
									'type' => 'raw_html',
									'html' => '',
								],
								'setting_args' => [
									'sanitize_callback' => [ $this, 'save_advanced_options' ],
								],
							],
						],
					],
				],
			],
		];
	}

	public function save_advanced_options( $input ) {
		return $input;
	}

	/**
	 * @since 2.0.0
	 * @access public
	 */
	public function display_settings_page() {
		$this->get_tabs();
		?>
		<div class="wrap">
			<h1 class="wp-heading-inline"><?php echo esc_html( $this->get_page_title() ); ?></h1>

			<div>
				<div id="refraction-role-manager">
					<h2><?php echo esc_html__( 'Manage What Your Users Can Edit In Refraction', 'refraction' ); ?></h2>
					<form id="refraction-settings-form" method="post" action="options.php">
						<?php
						settings_fields( static::PAGE_ID );
						echo '<div class="refraction-settings-form-page refraction-active">';
						foreach ( get_editable_roles() as $role_slug => $role_data ) {
							if ( 'administrator' === $role_slug ) {
								continue;
							}
							$this->display_role_controls( $role_slug, $role_data );
						}
						submit_button( __( 'Save Changes', 'refraction' ), 'primary', 'submit', true, [ 'data-id' => 'refraction-role-manager-button-save-changes' ] );
						?>
					</form>
				</div>
			</div>
		</div><!-- /.wrap -->
		<?php
	}

	/**
	 * @since 2.0.0
	 * @access private
	 *
	 * @param string $role_slug The role slug.
	 * @param array  $role_data An array with role data.
	 */
	private function display_role_controls( $role_slug, $role_data ) {
		static $excluded_options = false;
		if ( false === $excluded_options ) {
			$excluded_options = $this->get_role_manager_options();
		}

		$row_classes = 'refraction-role-row ' . esc_attr( $role_slug ) . ' e-editor-one';

		?>
		<div class="<?php echo esc_attr( $row_classes ); ?>">
			<div class="refraction-role-label">
				<span class="refraction-role-name"><?php echo esc_html( translate_user_role( $role_data['name'] ) ); ?></span>
				<span data-excluded-label="<?php esc_attr_e( 'Role Excluded', 'refraction' ); ?>" class="refraction-role-excluded-indicator"></span>
				<span class="refraction-role-toggle" data-id="<?php echo esc_attr( $role_slug ); ?>-toggle"><span class="dashicons dashicons-arrow-down"></span></span>
			</div>
			<div class="refraction-role-controls hidden">
				<div class="refraction-role-control">
					<label>
						<input type="checkbox" name="refraction_exclude_user_roles[]" value="<?php echo esc_attr( $role_slug ); ?>"<?php checked( in_array( $role_slug, $excluded_options, true ), true ); ?>>
						<?php echo esc_html__( 'No access to editor', 'refraction' ); ?>
					</label>
				</div>
				<div class="refraction-role-controls-advanced">
					<?php
					/**
					 * Role restrictions controls.
					 *
					 * Fires after the role manager checkbox that allows the user to
					 * exclude the role.
					 *
					 * This filter allows developers to add custom controls to the role
					 * manager.
					 *
					 * @since 2.0.0
					 *
					 * @param string $role_slug The role slug.
					 * @param array  $role_data An array with role data.
					 */
					do_action( 'refraction/role/restrictions/controls', $role_slug, $role_data );
					?>
				</div>
			</div>
		</div>
		<?php
	}

	public function add_json_enable_control( $role_slug ) {
		$value = 'json-upload';
		$id = self::ROLE_MANAGER_ADVANCED . '_' . $role_slug . '_' . $value;
		$name = 'refraction_' . self::ROLE_MANAGER_ADVANCED . '[' . $role_slug . '][]';

		$advanced_options = $this->get_user_advanced_options();
		$checked = isset( $advanced_options[ $role_slug ] ) ? $advanced_options[ $role_slug ] : [];
		?>
		<div class="refraction-role-control">
			<label for="<?php echo esc_attr( $id ); ?>">
				<input type="checkbox" name="<?php echo esc_attr( $name ); ?>" id="<?php echo esc_attr( $id ); ?>" value="<?php echo esc_attr( $value ); ?>" <?php checked( in_array( $value, $checked, true ), true ); ?>>
				<?php echo esc_html__( 'Enable the option to upload JSON files', 'refraction' ); ?>
			</label>
			<p class="refraction-role-control-warning"><strong><?php echo esc_html__( 'Heads up', 'refraction' ); ?>:</strong> <?php echo esc_html__( 'Giving broad access to upload JSON files can pose a security risk to your website because such files may contain malicious scripts, etc.', 'refraction' ); ?></p>
		</div>
		<?php
	}

	public function add_custom_html_enable_control( $role_slug ) {
		$value = 'custom-html';
		$id = self::ROLE_MANAGER_ADVANCED . '_' . $role_slug . '_' . $value;
		$name = 'refraction_' . self::ROLE_MANAGER_ADVANCED . '[' . $role_slug . '][]';

		$advanced_options = $this->get_user_advanced_options();
		$checked = isset( $advanced_options[ $role_slug ] ) ? $advanced_options[ $role_slug ] : [];
		?>
		<div class="refraction-role-control">
			<label for="<?php echo esc_attr( $id ); ?>">
				<input type="checkbox" name="<?php echo esc_attr( $name ); ?>" id="<?php echo esc_attr( $id ); ?>" value="<?php echo esc_attr( $value ); ?>" <?php checked( in_array( $value, $checked, true ), true ); ?>>
				<?php echo esc_html__( 'Enable the option to use the HTML widget', 'refraction' ); ?>
			</label>
			<p class="refraction-role-control-warning"><strong><?php echo esc_html__( 'Heads up', 'refraction' ); ?>:</strong> <?php echo esc_html__( 'Giving broad access to edit the HTML widget can pose a security risk to your website because it enables users to run malicious scripts, etc.', 'refraction' ); ?></p>
		</div>
		<?php
	}

	/**
	 * @since 2.0.0
	 * @access public
	 */
	public function get_user_restrictions_array() {
		$user = wp_get_current_user();
		$user_roles = $user->roles;
		$options = $this->get_user_restrictions();
		$restrictions = [];
		if ( empty( $options ) ) {
			return $restrictions;
		}

		foreach ( $user_roles as $role ) {
			if ( ! isset( $options[ $role ] ) ) {
				continue;
			}
			$restrictions = array_merge( $restrictions, $options[ $role ] );
		}
		return array_unique( $restrictions );
	}

	/**
	 * @since 2.0.0
	 * @access private
	 */
	private function get_user_restrictions() {
		static $restrictions = false;
		if ( ! $restrictions ) {
			$restrictions = [];

			/**
			 * Editor user restrictions.
			 *
			 * Filters the user restrictions in the editor.
			 *
			 * @since 2.0.0
			 *
			 * @param array $restrictions User restrictions.
			 */
			$restrictions = apply_filters( 'refraction/editor/user/restrictions', $restrictions );
		}
		return $restrictions;
	}

	/**
	 * @since 2.0.0
	 * @access public
	 *
	 * @param $capability
	 *
	 * @return bool
	 */
	public function user_can( $capability ) {
		$options = $this->get_user_restrictions_array();

		if ( in_array( $capability, $options, true ) ) {
			return false;
		}

		return true;
	}

	private function register_editor_one_menu( Menu_Data_Provider $menu_data_provider ) {
		$menu_data_provider->register_menu( new Editor_One_Role_Manager_Menu() );
	}

	/**
	 * @since 2.0.0
	 * @access public
	 */
	public function __construct() {
		parent::__construct();

		add_action( 'refraction/editor-one/menu/register', function ( Menu_Data_Provider $menu_data_provider ) {
			$this->register_editor_one_menu( $menu_data_provider );
		} );

		add_action( 'refraction/role/restrictions/controls', [ $this, 'add_json_enable_control' ] );
		add_action( 'refraction/role/restrictions/controls', [ $this, 'add_custom_html_enable_control' ] );

		add_filter( 'refraction/editor/user/restrictions', [ $this, 'get_role_manager_advanced_options' ] );
	}
}
