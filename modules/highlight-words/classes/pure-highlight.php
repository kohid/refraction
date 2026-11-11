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

	/** Class name parts that mark a title, and a description. */
	const TITLE_PARTS = [ 'title', 'heading', 'headline', 'name' ];
	const DESC_PARTS = [ 'description', 'desc', 'content', 'text', 'subtitle', 'subheading', 'excerpt', 'caption', 'quote', 'editor' ];

	const VOID = [ 'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr' ];

	/** 'title', 'desc' or '' for a class attribute: a part of a class name (split at - and _) that says which. */
	public static function kind( string $classes ): string {
		$desc = false;

		foreach ( preg_split( '/\s+/', trim( $classes ) ) ?: [] as $class ) {
			$parts = preg_split( '/[-_]+/', strtolower( $class ) ) ?: [];

			if ( array_intersect( $parts, self::TITLE_PARTS ) ) {
				return 'title';
			}

			if ( array_intersect( $parts, self::DESC_PARTS ) ) {
				$desc = true;
			}
		}

		return $desc ? 'desc' : '';
	}

	/**
	 * Title words in the title, description words in the description: the innermost element whose class says title or
	 * description decides; text in neither gets both lists.
	 */
	public static function wrap_parts( string $html, string $title_words, string $desc_words, bool $match_case = false ): string {
		$title = self::phrases( $title_words );
		$desc = self::phrases( $desc_words );

		if ( ! $title && ! $desc ) {
			return $html;
		}

		return self::walk( $html, [ self::class, 'kind' ], [
			'title' => self::pattern( $title, $match_case ),
			'desc' => self::pattern( $desc, $match_case ),
			'' => self::pattern( array_values( array_unique( array_merge( $title, $desc ) ) ), $match_case ),
		] );
	}

	/**
	 * Each list only inside its own part, a part being the elements with that class (a whole class name): for widgets
	 * made of several components. The innermost listed part decides; text in no listed part is left alone.
	 *
	 * @param array $lists [ class name => words, one per line ].
	 */
	public static function wrap_classes( string $html, array $lists, bool $match_case = false ): string {
		$patterns = [];

		foreach ( $lists as $class => $words ) {
			$patterns[ (string) $class ] = self::pattern( self::phrases( (string) $words ), $match_case );
		}

		if ( ! array_filter( $patterns ) ) {
			return $html;
		}

		$names = array_keys( $patterns );
		$kind = static function ( string $classes ) use ( $names ): string {
			$found = array_values( array_intersect( preg_split( '/\s+/', trim( $classes ) ) ?: [], $names ) );

			return $found[0] ?? '';
		};

		return self::walk( $html, $kind, $patterns + [ '' => '' ] );
	}

	/**
	 * Walks the HTML, keeping a stack of open elements with the kind $kind_of gives each class attribute; every text
	 * piece gets the pattern of the innermost element with a kind (or of '' when none has one). Script, style, textarea
	 * and parts already highlighted are left alone.
	 */
	private static function walk( string $html, callable $kind_of, array $patterns ): string {
		$parts = '' === $html ? false : preg_split( '/(<[^>]*>)/', $html, -1, PREG_SPLIT_DELIM_CAPTURE );

		if ( false === $parts ) {
			return $html;
		}

		$stack = [];
		$skip = 0;

		foreach ( $parts as $i => $part ) {
			if ( '' === $part ) {
				continue;
			}

			if ( '<' === $part[0] ) {
				if ( preg_match( '#^<\s*/\s*([a-z0-9-]+)#i', $part, $m ) ) {
					$tag = strtolower( $m[1] );

					// Close up to the matching tag (forgiving about tags left open).
					for ( $j = count( $stack ) - 1; $j >= 0; $j-- ) {
						if ( $stack[ $j ]['tag'] === $tag ) {
							$stack = array_slice( $stack, 0, $j );
							break;
						}
					}

					$skip = (int) array_sum( array_column( $stack, 'skip' ) );
				} elseif ( preg_match( '#^<\s*([a-z0-9-]+)#i', $part, $m ) && '!' !== $part[1] ) {
					$tag = strtolower( $m[1] );

					if ( in_array( $tag, self::VOID, true ) || preg_match( '#/\s*>$#', $part ) ) {
						continue;
					}

					$class = preg_match( '#\bclass\s*=\s*("([^"]*)"|\'([^\']*)\')#i', $part, $c ) ? ( '' !== ( $c[2] ?? '' ) ? $c[2] : ( $c[3] ?? '' ) ) : '';
					$no = in_array( $tag, [ 'script', 'style', 'textarea' ], true ) || preg_match( '#\brefraction-heading-dual\b#', $class );
					$stack[] = [ 'tag' => $tag, 'kind' => $kind_of( $class ), 'skip' => $no ? 1 : 0 ];
					$skip = (int) array_sum( array_column( $stack, 'skip' ) );
				}

				continue;
			}

			if ( $skip ) {
				continue;
			}

			$kind = '';

			for ( $j = count( $stack ) - 1; $j >= 0; $j-- ) {
				if ( '' !== $stack[ $j ]['kind'] ) {
					$kind = $stack[ $j ]['kind'];
					break;
				}
			}

			if ( '' !== ( $patterns[ $kind ] ?? '' ) ) {
				$parts[ $i ] = preg_replace( $patterns[ $kind ], self::SPAN . '$1</span>', $part );
			}
		}

		return implode( '', $parts );
	}
}
