<?php
namespace Refraction\Modules\HighlightWords\Classes;

/**
 * Highlight Words without WordPress: the phrases from the setting, and the HTML with each phrase wrapped in the
 * highlighted part's span. Only text is changed, never tags or attributes, nor the text of script, style, textarea or
 * a part that is already highlighted. A phrase matches whole words, longest first. Mirrored in
 * assets/js/highlight-preview.js for the editor's preview.
 */
class Pure_Highlight {

	const SPAN = '<span class="refraction-heading-dual rf-hl">';

	/** @return string[] The phrases, one per line, longest first, without duplicates. */
	public static function phrases( string $words ): array {
		$list = array_filter( array_map( 'trim', preg_split( '/[\r\n]+/', $words ) ?: [] ), static fn( $w ) => '' !== $w );
		$list = array_values( array_unique( array_slice( $list, 0, 30 ) ) );
		usort( $list, static fn( $a, $b ) => mb_strlen( $b ) - mb_strlen( $a ) );

		return $list;
	}

	/** The regular expression that finds the phrases in escaped HTML text, or '' without phrases. */
	public static function pattern( array $phrases, bool $match_case ): string {
		if ( ! $phrases ) {
			return '';
		}

		$quoted = array_map( static fn( $p ) => preg_quote( htmlspecialchars( $p, ENT_QUOTES | ENT_HTML5, 'UTF-8', false ), '/' ), $phrases );

		return '/(?<![\p{L}\p{N}])(' . implode( '|', $quoted ) . ')(?![\p{L}\p{N}])/u' . ( $match_case ? '' : 'i' );
	}

	public static function wrap( string $html, string $words, bool $match_case = false ): string {
		$pattern = self::pattern( self::phrases( $words ), $match_case );

		if ( '' === $pattern || '' === $html ) {
			return $html;
		}

		$parts = preg_split( '/(<[^>]*>)/', $html, -1, PREG_SPLIT_DELIM_CAPTURE );

		if ( false === $parts ) {
			return $html;
		}

		$skip = 0;
		$skip_tag = '';
		$depth = 0;

		foreach ( $parts as $i => $part ) {
			if ( '' === $part ) {
				continue;
			}

			if ( '<' === $part[0] ) {
				// Inside script, style, textarea or a highlighted part, the text is left alone.
				if ( $skip ) {
					if ( preg_match( '#^<\s*/\s*' . preg_quote( $skip_tag, '#' ) . '\b#i', $part ) ) {
						$depth--;

						if ( 0 === $depth ) {
							$skip = 0;
						}
					} elseif ( preg_match( '#^<\s*' . preg_quote( $skip_tag, '#' ) . '\b(?![^>]*/>)#i', $part ) ) {
						$depth++;
					}
				} elseif ( preg_match( '#^<\s*(script|style|textarea)\b#i', $part, $m ) ) {
					$skip = 1;
					$skip_tag = strtolower( $m[1] );
					$depth = 1;
				} elseif ( preg_match( '#^<\s*span\b[^>]*\brefraction-heading-dual\b#i', $part ) ) {
					$skip = 1;
					$skip_tag = 'span';
					$depth = 1;
				}

				continue;
			}

			if ( ! $skip ) {
				$parts[ $i ] = preg_replace( $pattern, self::SPAN . '$1</span>', $part );
			}
		}

		return implode( '', $parts );
	}
}
