<?php
namespace Refraction\Modules\Forms\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Typography;
use Refraction\Modules\Forms\Classes\Login_Handler;
use Refraction\Plugin;
use Refraction\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Login widget: username and password, remember me, lost password link, redirect, logged-in state.
 */
class Login extends Widget_Base {

	public function get_name() {
		return 'refraction-login';
	}

	public function get_title() {
		return esc_html__( 'Login', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-lock-user';
	}

	public function get_categories() {
		return [ 'general' ];
	}

	public function get_keywords() {
		return [ 'login', 'sign in', 'user', 'account', 'password' ];
	}

	public function get_script_depends() {
		return [ 'refraction-forms' ];
	}

	public function get_style_depends() {
		return [ 'refraction-forms' ];
	}

	protected function is_dynamic_content(): bool {
		return true;
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_login', [ 'label' => esc_html__( 'Login Form', 'refraction' ) ] );

		$this->add_control( 'user_label', [ 'label' => esc_html__( 'Username Label', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => esc_html__( 'Username or Email Address', 'refraction' ) ] );
		$this->add_control( 'user_placeholder', [ 'label' => esc_html__( 'Username Placeholder', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => '' ] );
		$this->add_control( 'pass_label', [ 'label' => esc_html__( 'Password Label', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => esc_html__( 'Password', 'refraction' ) ] );
		$this->add_control( 'pass_placeholder', [ 'label' => esc_html__( 'Password Placeholder', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => '' ] );
		$this->add_control( 'show_labels', [ 'label' => esc_html__( 'Labels', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'return_value' => 'true', 'default' => 'true' ] );
		$this->add_control( 'button_text', [ 'label' => esc_html__( 'Button Text', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => esc_html__( 'Log In', 'refraction' ) ] );
		$this->add_control( 'remember_me', [ 'label' => esc_html__( 'Remember Me', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'return_value' => 'true', 'default' => 'true' ] );
		$this->add_control( 'remember_label', [ 'label' => esc_html__( 'Remember Me Label', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => esc_html__( 'Remember Me', 'refraction' ), 'condition' => [ 'remember_me!' => '' ] ] );
		$this->add_control( 'lost_password', [ 'label' => esc_html__( 'Lost Password Link', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'return_value' => 'true', 'default' => 'true' ] );
		$this->add_control( 'lost_password_text', [ 'label' => esc_html__( 'Lost Password Text', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => esc_html__( 'Lost your password?', 'refraction' ), 'condition' => [ 'lost_password!' => '' ] ] );
		$this->add_control( 'register_link', [ 'label' => esc_html__( 'Register Link', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'return_value' => 'true', 'default' => '', 'description' => esc_html__( 'Shown only when "Anyone can register" is on in Settings > General. Refraction does not provide its own registration form.', 'refraction' ) ] );
		$this->add_control( 'register_text', [ 'label' => esc_html__( 'Register Text', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => esc_html__( 'Register', 'refraction' ), 'condition' => [ 'register_link!' => '' ] ] );
		$this->add_control( 'redirect_url', [ 'label' => esc_html__( 'Redirect After Login', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => '/my-account/', 'description' => esc_html__( 'A path or an address on this site. Empty: stay on the same page.', 'refraction' ) ] );
		$this->add_control( 'error_message', [ 'label' => esc_html__( 'Error Message', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => esc_html__( 'Invalid username or password.', 'refraction' ) ] );
		$this->add_control( 'show_logged_in', [ 'label' => esc_html__( 'Show Logged-in State', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'return_value' => 'true', 'default' => 'true', 'description' => esc_html__( 'When off, logged-in visitors see nothing.', 'refraction' ) ] );
		$this->add_control( 'logged_in_text', [ 'label' => esc_html__( 'Logged-in Text', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => esc_html__( 'You are logged in as %s.', 'refraction' ), 'description' => esc_html__( '%s becomes the display name.', 'refraction' ), 'condition' => [ 'show_logged_in!' => '' ] ] );
		$this->add_control( 'logout_text', [ 'label' => esc_html__( 'Log Out Text', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => esc_html__( 'Log out', 'refraction' ), 'condition' => [ 'show_logged_in!' => '' ] ] );

		$this->end_controls_section();

		$wrap = '{{WRAPPER}} .refraction-login';
		$input = '{{WRAPPER}} .refraction-form__input';
		$btn = '{{WRAPPER}} .refraction-form__submit';

		$this->start_controls_section( 'section_login_style', [ 'label' => esc_html__( 'Form', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_responsive_control( 'row_gap', [ 'label' => esc_html__( 'Rows Gap', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'max' => 80 ] ], 'selectors' => [ $wrap => '--rf-row-gap: {{SIZE}}{{UNIT}};' ] ] );
		$this->add_control( 'label_color', [ 'label' => esc_html__( 'Label Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .refraction-form__label, {{WRAPPER}} .refraction-form__option' => 'color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'label_typography', 'selector' => '{{WRAPPER}} .refraction-form__label, {{WRAPPER}} .refraction-form__option' ] );
		$this->add_control( 'link_color', [ 'label' => esc_html__( 'Link Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .refraction-login__links a' => 'color: {{VALUE}};' ] ] );
		$this->add_control( 'error_color', [ 'label' => esc_html__( 'Error Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .refraction-form__message--error' => 'color: {{VALUE}}; border-color: {{VALUE}};' ] ] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_login_fields', [ 'label' => esc_html__( 'Fields', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'field_typography', 'selector' => $input ] );
		$this->add_control( 'field_text_color', [ 'label' => esc_html__( 'Text Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $input => 'color: {{VALUE}};' ] ] );
		$this->add_control( 'field_bg_color', [ 'label' => esc_html__( 'Background Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $input => 'background-color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Border::get_type(), [ 'name' => 'field_border', 'selector' => $input ] );
		$this->add_responsive_control( 'field_radius', [ 'label' => esc_html__( 'Border Radius', 'refraction' ), 'type' => Controls_Manager::DIMENSIONS, 'size_units' => [ 'px', '%' ], 'selectors' => [ $input => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ] ] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_login_button', [ 'label' => esc_html__( 'Button', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'button_typography', 'selector' => $btn ] );
		$this->add_control( 'button_text_color', [ 'label' => esc_html__( 'Text Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $btn => 'color: {{VALUE}};' ] ] );
		$this->add_control( 'button_bg_color', [ 'label' => esc_html__( 'Background Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $btn => 'background-color: {{VALUE}};' ] ] );
		$this->add_control( 'button_hover_bg', [ 'label' => esc_html__( 'Hover Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $btn . ':hover, ' . $btn . ':focus' => 'background-color: {{VALUE}};' ] ] );
		$this->add_responsive_control( 'button_radius', [ 'label' => esc_html__( 'Border Radius', 'refraction' ), 'type' => Controls_Manager::DIMENSIONS, 'size_units' => [ 'px', '%' ], 'selectors' => [ $btn => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ] ] );
		$this->add_responsive_control( 'button_full', [ 'label' => esc_html__( 'Full Width', 'refraction' ), 'type' => Controls_Manager::SELECT, 'options' => [ '' => esc_html__( 'Auto', 'refraction' ), '100%' => esc_html__( 'Full width', 'refraction' ) ], 'selectors' => [ $btn => 'width: {{VALUE}};' ] ] );
		$this->end_controls_section();
	}

	protected function render() {
		$s = $this->get_settings_for_display();
		$edit = Plugin::$instance->editor->is_edit_mode() || Plugin::$instance->preview->is_preview_mode();
		$eid = $this->get_id();
		$on = fn( $key ) => ! empty( $s[ $key ] );

		if ( is_user_logged_in() && ! $edit ) {
			if ( ! $on( 'show_logged_in' ) ) {
				return;
			}

			$user = wp_get_current_user();
			$text = (string) ( $s['logged_in_text'] ?? '%s' );
			$text = false !== strpos( $text, '%s' ) ? sprintf( $text, $user->display_name ) : $text;
			echo '<div class="refraction-login refraction-login--logged-in"><p class="refraction-login__status">' . esc_html( $text ) . ' <a href="' . esc_url( wp_logout_url( get_permalink() ?: home_url( '/' ) ) ) . '">' . esc_html( (string) ( $s['logout_text'] ?? __( 'Log out', 'refraction' ) ) ) . '</a></p></div>';

			return;
		}

		$document = Plugin::$instance->documents->get_current();
		$post_id = $document ? (int) $document->get_main_id() : (int) get_the_ID();
		$error = Login_Handler::get_error( $eid );
		$label_class = $on( 'show_labels' ) ? '' : ' screen-reader-text';
		$uid = 'rf-login-' . $eid;

		echo '<div class="refraction-login refraction-form-wrap">';
		echo '<div class="refraction-form__messages" role="status" aria-live="polite" tabindex="-1">' . ( $error ? '<p class="refraction-form__message refraction-form__message--error" role="alert">' . esc_html( $error ) . '</p>' : '' ) . '</div>';
		echo '<form class="refraction-form refraction-form--login" method="post" data-rf-login>';
		printf(
			'<input type="hidden" name="rf_login_id" value="%s"><input type="hidden" name="rf_login_post" value="%d"><input type="hidden" name="rf_login_nonce" value="%s">',
			esc_attr( $eid ),
			(int) $post_id,
			esc_attr( wp_create_nonce( Login_Handler::NONCE ) )
		);
		echo '<div class="refraction-form__fields">';
		printf(
			'<div class="refraction-form__field"><label class="refraction-form__label%1$s" for="%2$s-user">%3$s</label><input class="refraction-form__input" type="text" id="%2$s-user" name="rf_login_user" autocomplete="username" required aria-required="true" placeholder="%4$s"></div>',
			esc_attr( $label_class ),
			esc_attr( $uid ),
			esc_html( (string) $s['user_label'] ),
			esc_attr( (string) $s['user_placeholder'] )
		);
		printf(
			'<div class="refraction-form__field"><label class="refraction-form__label%1$s" for="%2$s-pass">%3$s</label><input class="refraction-form__input" type="password" id="%2$s-pass" name="rf_login_pass" autocomplete="current-password" required aria-required="true" placeholder="%4$s"></div>',
			esc_attr( $label_class ),
			esc_attr( $uid ),
			esc_html( (string) $s['pass_label'] ),
			esc_attr( (string) $s['pass_placeholder'] )
		);

		if ( $on( 'remember_me' ) ) {
			printf( '<div class="refraction-form__field"><label class="refraction-form__option" for="%1$s-remember"><input type="checkbox" id="%1$s-remember" name="rf_login_remember" value="1"> <span>%2$s</span></label></div>', esc_attr( $uid ), esc_html( (string) $s['remember_label'] ) );
		}

		echo '</div>';
		echo '<div class="refraction-form__actions"><button type="submit" class="refraction-form__submit"><span class="refraction-form__submit-content"><span class="refraction-form__submit-text">' . esc_html( (string) $s['button_text'] ) . '</span></span></button></div>';
		echo '</form>';

		$links = [];

		if ( $on( 'lost_password' ) ) {
			$links[] = '<a href="' . esc_url( wp_lostpassword_url() ) . '">' . esc_html( (string) $s['lost_password_text'] ) . '</a>';
		}

		if ( $on( 'register_link' ) && get_option( 'users_can_register' ) ) {
			$links[] = '<a href="' . esc_url( wp_registration_url() ) . '">' . esc_html( (string) $s['register_text'] ) . '</a>';
		}

		if ( $links ) {
			echo '<p class="refraction-login__links">' . implode( ' <span aria-hidden="true">·</span> ', $links ) . '</p>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}

		echo '</div>';
	}
}
