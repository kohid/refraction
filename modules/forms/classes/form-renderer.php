<?php
namespace Refraction\Modules\Forms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Prints the HTML of a form. Works without JavaScript: a plain POST handles the submit, all steps
 * show one after the other, and the server renders errors and the success message.
 */
final class Form_Renderer {

	private Form_Definition $def;
	private array $s;
	private array $ctx;
	private string $eid;

	/**
	 * @param array $settings Widget settings for display (dynamic tags resolved).
	 * @param array $ctx      element_id, post_id, edit (bool), button_icon_html (string).
	 */
	public function __construct( Form_Definition $def, array $settings, array $ctx ) {
		$this->def = $def;
		$this->s = $settings;
		$this->ctx = $ctx;
		$this->eid = $ctx['element_id'];
	}

	private function on( string $key, bool $default = false ): bool {
		return isset( $this->s[ $key ] ) ? Form_Definition::is_truthy( $this->s[ $key ] ) : $default;
	}

	private function fid( string $field_id ): string {
		return 'rf-' . $this->eid . '-' . $field_id;
	}

	public function render(): void {
		$result = Submit_Handler::get_result( $this->eid );
		$sent = isset( $_GET['rf_sent'] ) && Form_Definition::sanitize_id( wp_unslash( $_GET['rf_sent'] ) ) === $this->eid; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$errors = $result ? $result['errors'] : [];
		$posted = $result ? $result['posted'] : [];
		$form_key = Form_Definition::form_key( $this->ctx['post_id'], $this->eid );
		$steps = $this->def->get_steps();
		$multi = count( $steps ) > 1;
		$settings = Settings::get();
		$captcha = $this->on( 'captcha' ) && Captcha::is_configured( $settings ) && ! $this->ctx['edit'];
		$label_pos = in_array( $this->s['label_position'] ?? 'above', [ 'above', 'inline', 'hidden' ], true ) ? $this->s['label_position'] : 'above';
		$size = in_array( $this->s['input_size'] ?? 'md', [ 'xs', 'sm', 'md', 'lg', 'xl' ], true ) ? $this->s['input_size'] : 'md';

		$classes = [ 'refraction-form', 'refraction-form--label-' . $label_pos, 'refraction-form--size-' . $size ];
		$classes[] = $multi ? 'refraction-form--multistep' : 'refraction-form--single';

		if ( $this->ctx['edit'] ) {
			$classes[] = 'refraction-form--preview';
		}

		echo '<div class="refraction-form-wrap" id="refraction-form-' . esc_attr( $this->eid ) . '">';
		printf(
			'<div class="refraction-form__messages" data-rf-messages role="status" aria-live="polite" tabindex="-1">%s</div>',
			$sent ? '<p class="refraction-form__message refraction-form__message--success">' . esc_html( (string) ( $this->s['success_message'] ?? '' ) ) . '</p>' : ( $result && $result['message'] ? '<p class="refraction-form__message refraction-form__message--error">' . esc_html( $result['message'] ) . '</p>' : '' )
		);

		printf(
			'<form class="%s" method="post" enctype="multipart/form-data" data-rf-form data-rf-ajax="%s" data-rf-steps="%d" data-rf-captcha="%s" data-rf-sitekey="%s" data-rf-sending="%s" data-rf-invalid="%s">',
			esc_attr( implode( ' ', $classes ) ),
			esc_url( admin_url( 'admin-ajax.php?action=' . Submit_Handler::ACTION ) ),
			count( $steps ),
			esc_attr( $captcha ? $settings['captcha_provider'] : '' ),
			esc_attr( $captcha ? $settings['captcha_site_key'] : '' ),
			esc_attr__( 'Sending…', 'refraction' ),
			esc_attr__( 'Please check the highlighted fields.', 'refraction' )
		);

		printf(
			'<input type="hidden" name="rf_form_post" value="%d"><input type="hidden" name="rf_form_id" value="%s"><input type="hidden" name="rf_nonce" value="%s"><input type="hidden" name="rf_ts" value="%s"><input type="hidden" name="rf_page" value="">',
			(int) $this->ctx['post_id'],
			esc_attr( $this->eid ),
			esc_attr( wp_create_nonce( Submit_Handler::NONCE ) ),
			esc_attr( Spam_Guard::time_token( time(), $form_key, Submit_Handler::secret() ) )
		);

		if ( $this->on( 'honeypot', true ) ) {
			echo '<div class="refraction-form__hp" aria-hidden="true"><label>' . esc_html__( 'Leave this field empty', 'refraction' ) . '<input type="text" name="rf_hp_main" value="" tabindex="-1" autocomplete="off"></label></div>';
		}

		if ( $multi ) {
			$this->render_progress( $steps );
		}

		$by_step = [];

		foreach ( $this->def->get_fields() as $field ) {
			$by_step[ $field['step'] ][] = $field;
		}

		foreach ( $steps as $index => $step ) {
			if ( $multi ) {
				printf( '<fieldset class="refraction-form__step" data-rf-step="%d"%s><legend class="refraction-form__step-title">%s</legend>', (int) $index, $index > 0 ? ' data-rf-later' : '', esc_html( $step['title'] ) );
			}

			echo '<div class="refraction-form__fields">';

			foreach ( $by_step[ $index ] ?? [] as $field ) {
				$this->render_field( $field, $errors, $posted );
			}

			if ( $index === count( $steps ) - 1 ) {
				$this->render_extras( $form_key, $errors );
			}

			echo '</div>';

			if ( $multi ) {
				echo '</fieldset>';
			}
		}

		$this->render_actions( $multi, $captcha );

		echo '</form></div>';

		if ( $captcha && ! $this->ctx['edit'] ) {
			$this->enqueue_captcha( $settings );
		}
	}

	private function render_progress( array $steps ): void {
		$type = in_array( $this->s['step_type'] ?? 'number_text', [ 'number', 'text', 'number_text', 'bar', 'none' ], true ) ? $this->s['step_type'] : 'number_text';

		if ( 'none' === $type ) {
			return;
		}

		printf( '<div class="refraction-form__progress refraction-form__progress--%s" data-rf-progress aria-label="%s">', esc_attr( $type ), esc_attr__( 'Form progress', 'refraction' ) );

		if ( 'bar' === $type ) {
			printf(
				'<div class="refraction-form__bar" role="progressbar" aria-valuemin="1" aria-valuemax="%1$d" aria-valuenow="1"><span class="refraction-form__bar-fill" style="width:%2$s%%"></span></div><p class="refraction-form__bar-text" data-rf-bar-text>%3$s</p>',
				count( $steps ),
				esc_attr( (string) round( 100 / count( $steps ) ) ),
				/* translators: 1: current step, 2: number of steps. */
				esc_html( sprintf( __( 'Step %1$d of %2$d', 'refraction' ), 1, count( $steps ) ) )
			);
			echo '</div>';

			return;
		}

		echo '<ol class="refraction-form__progress-list">';

		foreach ( $steps as $i => $step ) {
			printf(
				'<li class="refraction-form__progress-item%s"%s>%s%s</li>',
				0 === $i ? ' is-current' : '',
				0 === $i ? ' aria-current="step"' : '',
				'text' === $type ? '' : '<span class="refraction-form__progress-num">' . (int) ( $i + 1 ) . '</span>',
				'number' === $type ? '<span class="screen-reader-text">' . esc_html( $step['title'] ) . '</span>' : '<span class="refraction-form__progress-title">' . esc_html( $step['title'] ) . '</span>'
			);
		}

		echo '</ol></div>';
	}

	private function render_extras( string $form_key, array $errors ): void {
		if ( $this->on( 'math_question' ) ) {
			$a = random_int( 1, 9 );
			$b = random_int( 1, 9 );
			$c = Spam_Guard::math_challenge( $a, $b, $form_key, Submit_Handler::secret() );
			$id = $this->fid( 'math' );
			printf(
				'<div class="refraction-form__field refraction-form__field--math"><label class="refraction-form__label" for="%1$s">%2$s<span class="refraction-form__required" aria-hidden="true"> *</span></label><input type="text" inputmode="numeric" autocomplete="off" class="refraction-form__input" id="%1$s" name="rf_math" required aria-required="true" aria-describedby="%1$s-error"><input type="hidden" name="rf_math_token" value="%3$s">',
				esc_attr( $id ),
				esc_html( $c['question'] ),
				esc_attr( $c['token'] )
			);
			$this->render_error( $id, $errors['rf_math'] ?? '', 'rf_math' );
			echo '</div>';
		}
	}

	private function render_error( string $id, string $message, string $key ): void {
		printf( '<div class="refraction-form__error" id="%s-error" data-rf-error-for="%s" aria-live="polite">%s</div>', esc_attr( $id ), esc_attr( $key ), esc_html( $message ) );
	}

	private function render_field( array $field, array $errors, array $posted ): void {
		$type = $field['type'];

		if ( 'step' === $type ) {
			return;
		}

		if ( 'html' === $type ) {
			printf( '<div class="refraction-form__field refraction-form__field--html refraction-repeater-item-%s %s">%s</div>', esc_attr( $field['item_id'] ), esc_attr( $this->width_class( $field ) ), wp_kses_post( $field['html'] ) );

			return;
		}

		if ( 'hidden' === $type ) {
			printf( '<input type="hidden" name="form_fields[%s]" value="%s">', esc_attr( $field['id'] ), esc_attr( $posted[ $field['id'] ] ?? $field['default'] ) );

			return;
		}

		if ( 'honeypot' === $type ) {
			printf( '<div class="refraction-form__hp" aria-hidden="true"><label>%s<input type="text" name="rf_hp_%s" value="" tabindex="-1" autocomplete="off"></label></div>', esc_html( $field['label'] ?: __( 'Leave this field empty', 'refraction' ) ), esc_attr( $field['id'] ) );

			return;
		}

		$id = $this->fid( $field['id'] );
		$error = (string) ( $errors[ $field['id'] ] ?? '' );
		$value = $posted[ $field['id'] ] ?? $field['default'];
		$group = in_array( $type, [ 'radio', 'checkbox' ], true ) && count( $field['options'] ) > 0;

		printf(
			'<div class="refraction-form__field refraction-form__field--%s refraction-repeater-item-%s %s%s" data-rf-field="%s">',
			esc_attr( $type ),
			esc_attr( $field['item_id'] ),
			esc_attr( $this->width_class( $field ) ),
			$error ? ' has-error' : '',
			esc_attr( $field['id'] )
		);

		$show_label = '' !== $field['label'] && 'acceptance' !== $type;
		$mark = $field['required'] && $this->on( 'mark_required', true ) ? '<span class="refraction-form__required" aria-hidden="true"> *</span>' : '';
		$hidden_class = 'hidden' === ( $this->s['label_position'] ?? 'above' ) || ! $this->on( 'show_labels', true ) ? ' screen-reader-text' : '';
		$describe = ' aria-describedby="' . esc_attr( $id ) . '-error"';
		$req = $field['required'] ? ' required aria-required="true"' : '';
		$invalid = $error ? ' aria-invalid="true"' : '';

		if ( $group ) {
			printf( '<fieldset class="refraction-form__group"%s%s><legend class="refraction-form__label%s">%s%s</legend>', $describe, $invalid, esc_attr( $hidden_class ), esc_html( $field['label'] ), $mark ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			$chosen = is_array( $value ) ? $value : ( 'checkbox' === $type ? array_map( 'trim', explode( ',', (string) $value ) ) : [ (string) $value ] );

			foreach ( $field['options'] as $n => $option ) {
				$oid = $id . '-' . $n;
				printf(
					'<label class="refraction-form__option%s" for="%s"><input type="%s" id="%s" name="form_fields[%s]%s" value="%s"%s%s> <span>%s</span></label>',
					$field['inline'] ? ' is-inline' : '',
					esc_attr( $oid ),
					esc_attr( $type ),
					esc_attr( $oid ),
					esc_attr( $field['id'] ),
					'checkbox' === $type ? '[]' : '',
					esc_attr( $option['value'] ),
					in_array( $option['value'], $chosen, true ) ? ' checked' : '',
					'radio' === $type ? $req : '', // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
					esc_html( $option['label'] )
				);
			}

			echo '</fieldset>';
		} elseif ( 'acceptance' === $type ) {
			printf(
				'<label class="refraction-form__option" for="%1$s"><input type="checkbox" id="%1$s" name="form_fields[%2$s]" value="on"%3$s%4$s%5$s%6$s> <span>%7$s%8$s</span></label>',
				esc_attr( $id ),
				esc_attr( $field['id'] ),
				$req, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				$describe, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				$invalid, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				! empty( $posted[ $field['id'] ] ) || Form_Definition::is_truthy( $field['default'] ) ? ' checked' : '',
				wp_kses( $field['label'], [ 'a' => [ 'href' => true, 'target' => true, 'rel' => true ], 'strong' => [], 'em' => [] ] ),
				$mark // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			);
		} else {
			if ( $show_label ) {
				printf( '<label class="refraction-form__label%s" for="%s">%s%s</label>', esc_attr( $hidden_class ), esc_attr( $id ), esc_html( $field['label'] ), $mark ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			}

			$this->render_control( $field, $id, $value, $req . $describe . $invalid );
		}

		$this->render_error( $id, $error, $field['id'] );
		echo '</div>';
	}

	private function render_control( array $field, string $id, $value, string $attrs ): void {
		$type = $field['type'];
		$name = 'form_fields[' . $field['id'] . ']';
		$ph = '' !== $field['placeholder'] ? ' placeholder="' . esc_attr( $field['placeholder'] ) . '"' : '';
		$value = is_array( $value ) ? '' : (string) $value;
		$base = sprintf( ' class="refraction-form__input" id="%s" name="%s"', esc_attr( $id ), esc_attr( $name ) );

		switch ( $type ) {
			case 'textarea':
				printf( '<textarea%s rows="%d"%s%s>%s</textarea>', $base, (int) $field['rows'], $ph, $attrs, esc_textarea( $value ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				break;

			case 'select':
				printf( '<select%s%s>', $base, $attrs ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

				if ( '' !== $field['placeholder'] || ! $field['required'] ) {
					printf( '<option value="">%s</option>', esc_html( '' !== $field['placeholder'] ? $field['placeholder'] : '—' ) );
				}

				foreach ( $field['options'] as $option ) {
					printf( '<option value="%s"%s>%s</option>', esc_attr( $option['value'] ), selected( $value, $option['value'], false ), esc_html( $option['label'] ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				}

				echo '</select>';
				break;

			case 'file':
				$types = Upload_Policy::parse_types( $field['file_types'] );
				printf(
					'<input type="file"%s accept="%s"%s><span class="refraction-form__hint">%s</span>',
					$base, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
					esc_attr( '.' . implode( ',.', $types ) ),
					$attrs, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
					/* translators: 1: allowed file types, 2: maximum size. */
					esc_html( sprintf( __( 'Allowed: %1$s. Maximum size: %2$s MB.', 'refraction' ), implode( ', ', $types ), rtrim( rtrim( number_format( $field['file_max_size'], 2, '.', '' ), '0' ), '.' ) ) )
				);
				break;

			default:
				$html_type = [ 'email' => 'email', 'url' => 'url', 'tel' => 'tel', 'number' => 'number', 'date' => 'date', 'time' => 'time', 'password' => 'password' ][ $type ] ?? 'text';
				$extra = '';

				if ( 'number' === $type ) {
					$extra .= '' !== (string) $field['min'] ? ' min="' . esc_attr( $field['min'] ) . '"' : '';
					$extra .= '' !== (string) $field['max'] ? ' max="' . esc_attr( $field['max'] ) . '"' : '';
					$extra .= ' step="any"';
				}

				if ( 'password' === $type ) {
					$extra .= ' autocomplete="new-password"';
					$value = '';
				} elseif ( 'email' === $type ) {
					$extra .= ' autocomplete="email"';
				}

				printf( '<input type="%s"%s value="%s"%s%s%s>', esc_attr( $html_type ), $base, esc_attr( $value ), $ph, $extra, $attrs ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}
	}

	private function width_class( array $field ): string {
		return 'refraction-form__field--w' . preg_replace( '/[^0-9]/', '', $field['width'] );
	}

	private function render_actions( bool $multi, bool $captcha ): void {
		$text = (string) ( $this->s['button_text'] ?? __( 'Send', 'refraction' ) );
		$icon = $this->ctx['button_icon_html'] ?? '';
		$align = ( $this->s['button_icon_align'] ?? 'left' ) === 'right' ? ' refraction-form__submit--icon-right' : '';

		echo '<div class="refraction-form__actions">';

		if ( $captcha ) {
			$provider = Captcha::PROVIDERS[ Settings::get()['captcha_provider'] ] ?? null;

			if ( $provider && '' !== $provider['class'] ) {
				printf( '<div class="refraction-form__captcha %s" data-sitekey="%s"></div>', esc_attr( $provider['class'] ), esc_attr( Settings::get()['captcha_site_key'] ) );
			}
		}

		if ( $multi ) {
			printf( '<button type="button" class="refraction-form__nav refraction-form__prev" data-rf-prev hidden>%s</button>', esc_html( (string) ( $this->s['step_prev_text'] ?? __( 'Previous', 'refraction' ) ) ) );
			printf( '<button type="button" class="refraction-form__nav refraction-form__next" data-rf-next hidden>%s</button>', esc_html( (string) ( $this->s['step_next_text'] ?? __( 'Next', 'refraction' ) ) ) );
		}

		printf(
			'<button type="submit" class="refraction-form__submit%s"><span class="refraction-form__submit-content">%s<span class="refraction-form__submit-text">%s</span></span></button>',
			esc_attr( $align ),
			$icon, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			esc_html( $text )
		);

		echo '</div>';
	}

	private function enqueue_captcha( array $settings ): void {
		$provider = Captcha::PROVIDERS[ $settings['captcha_provider'] ];
		$src = str_replace( '%s', rawurlencode( $settings['captcha_site_key'] ), $provider['script'] );
		wp_enqueue_script( 'refraction-forms-captcha', $src, [], null, [ 'in_footer' => true, 'strategy' => 'defer' ] ); // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion
	}
}
