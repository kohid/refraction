<?php
namespace Refraction\Modules\ProWidgets\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * A small syntax highlighter (JS, PHP, CSS, HTML, JSON, Bash, Python). Each language is one alternation of
 * possessive patterns scanned in a single pass, so the cost is linear and a hostile snippet cannot cause
 * catastrophic backtracking. The output is escaped HTML: every byte of the source ends up in exactly one token.
 */
class Code_Tokenizer {

	public static function languages(): array {
		return [ 'js', 'php', 'css', 'html', 'json', 'bash', 'python' ];
	}

	public static function normalize_language( string $language ): string {
		$map = [
			'js' => 'js', 'javascript' => 'js', 'jsx' => 'js', 'ts' => 'js', 'typescript' => 'js', 'node' => 'js',
			'php' => 'php',
			'css' => 'css', 'scss' => 'css',
			'html' => 'html', 'htm' => 'html', 'xml' => 'html', 'svg' => 'html',
			'json' => 'json',
			'bash' => 'bash', 'sh' => 'bash', 'shell' => 'bash', 'zsh' => 'bash',
			'python' => 'python', 'py' => 'python',
		];

		return $map[ strtolower( trim( $language ) ) ] ?? 'plain';
	}

	private static function words( string $list ): string {
		return '\b(?:' . $list . ')\b';
	}

	/**
	 * Ordered [type, pattern] rules; earlier rules win at the same position.
	 */
	private static function rules( string $language ): array {
		$block_comment = '/\*(?:[^*]++|\*(?!/))*+(?:\*/)?+';
		$dq = '"(?:[^"\\\\\n]++|\\\\.)*+"?+';
		$sq = "'(?:[^'\\\\\n]++|\\\\.)*+'?+";
		$number = '(?<![\w.$])(?:0[xX][\da-fA-F]++|\d++(?:\.\d++)?(?:[eE][+-]?\d++)?)\b';

		switch ( $language ) {
			case 'js':
				return [
					[ 'comment', '//[^\n]*+' ],
					[ 'comment', $block_comment ],
					[ 'string', '`(?:[^`\\\\]++|\\\\[\s\S])*+`?+' ],
					[ 'string', $dq ],
					[ 'string', $sq ],
					[ 'keyword', self::words( 'const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|this|null|undefined|true|false|super|static|yield|delete|void|interface|type|enum|implements|public|private|protected' ) ],
					[ 'number', $number ],
					[ 'function', '[A-Za-z_$][\w$]*+(?=\s*\()' ],
				];
			case 'php':
				return [
					[ 'comment', '//[^\n]*+' ],
					[ 'comment', '#(?!\[)[^\n]*+' ],
					[ 'comment', $block_comment ],
					[ 'string', $dq ],
					[ 'string', $sq ],
					[ 'keyword', '<\?php|<\?=|\?>' ],
					[ 'keyword', self::words( 'echo|print|function|return|if|elseif|else|foreach|for|while|do|switch|case|break|continue|new|class|extends|implements|interface|trait|namespace|use|public|private|protected|static|final|abstract|const|try|catch|finally|throw|array|isset|empty|unset|null|true|false|and|or|xor|as|global|match|fn|yield|require|require_once|include|include_once|instanceof|self|parent' ) ],
					[ 'variable', '\$[A-Za-z_]\w*+' ],
					[ 'number', $number ],
					[ 'function', '[A-Za-z_][\w]*+(?=\s*\()' ],
				];
			case 'python':
				return [
					[ 'comment', '#[^\n]*+' ],
					[ 'string', '(?:\b[fFrRbBuU]{1,2})?(?:"""(?:[^"\\\\]++|\\\\[\s\S]|"(?!""))*+(?:""")?+|\'\'\'(?:[^\'\\\\]++|\\\\[\s\S]|\'(?!\'\'))*+(?:\'\'\')?+)' ],
					[ 'string', '(?:\b[fFrRbBuU]{1,2})?(?:' . $dq . '|' . $sq . ')' ],
					[ 'keyword', self::words( 'def|class|if|elif|else|for|while|return|import|from|as|with|try|except|finally|raise|lambda|yield|pass|break|continue|in|is|not|and|or|None|True|False|global|nonlocal|async|await|del|assert' ) ],
					[ 'number', $number ],
					[ 'function', '[A-Za-z_]\w*+(?=\s*\()' ],
				];
			case 'bash':
				return [
					[ 'comment', '(?<![\w$])#[^\n]*+' ],
					[ 'string', $dq ],
					[ 'string', "'[^'\n]*+'?+" ],
					[ 'variable', '\$(?:\{[^}\n]*+\}?+|\w++|[@#?$!*])' ],
					[ 'keyword', self::words( 'if|then|else|elif|fi|for|while|until|do|done|case|esac|in|function|echo|cd|export|local|return|exit|source|read|set|unset|sudo|true|false' ) ],
					[ 'number', $number ],
				];
			case 'json':
				return [
					[ 'property', '"(?:[^"\\\\\n]++|\\\\.)*+"(?=\s*:)' ],
					[ 'string', $dq ],
					[ 'keyword', self::words( 'true|false|null' ) ],
					[ 'number', '-?\b\d++(?:\.\d++)?(?:[eE][+-]?\d++)?\b' ],
				];
			case 'css':
				return [
					[ 'comment', $block_comment ],
					[ 'string', $dq ],
					[ 'string', $sq ],
					[ 'keyword', '@[\w-]++' ],
					[ 'selector', '[^\s{};,/\'"@][^{};]{0,200}?(?=\s*\{)' ],
					[ 'property', '-?[A-Za-z][\w-]*+(?=\s*:)' ],
					[ 'number', '#[\da-fA-F]{3,8}\b' ],
					[ 'number', '(?<![\w#-])-?\d++(?:\.\d++)?(?:[a-z%]++)?' ],
					[ 'function', '[A-Za-z-]++(?=\()' ],
				];
		}

		return [];
	}

	/**
	 * @return array<int, array{0:string,1:string}> [type, text] pairs that concatenate back to $code.
	 */
	public static function tokenize( string $code, string $language ): array {
		if ( '' === $code ) {
			return [];
		}

		$language = self::normalize_language( $language );

		if ( 'html' === $language ) {
			return self::tokenize_html( $code );
		}

		$rules = self::rules( $language );

		if ( ! $rules ) {
			return [ [ 'plain', $code ] ];
		}

		return self::scan( $code, $rules );
	}

	private static function scan( string $code, array $rules ): array {
		$parts = [];
		foreach ( $rules as $rule ) {
			$parts[] = '(?:' . $rule[1] . ')(*MARK:' . $rule[0] . ')';
		}
		$regex = '~' . str_replace( '~', '\~', implode( '|', $parts ) ) . '~';

		$found = @preg_match_all( $regex, $code, $matches, PREG_SET_ORDER | PREG_OFFSET_CAPTURE );

		if ( false === $found ) {
			return [ [ 'plain', $code ] ];
		}

		$tokens = [];
		$pos = 0;

		foreach ( $matches as $match ) {
			$text = $match[0][0];
			$offset = $match[0][1];

			if ( '' === $text ) {
				continue;
			}
			if ( $offset > $pos ) {
				$tokens[] = [ 'plain', substr( $code, $pos, $offset - $pos ) ];
			}
			$tokens[] = [ $match['MARK'], $text ];
			$pos = $offset + strlen( $text );
		}

		if ( $pos < strlen( $code ) ) {
			$tokens[] = [ 'plain', substr( $code, $pos ) ];
		}

		return $tokens;
	}

	private static function tokenize_html( string $code ): array {
		$rules = [
			[ 'comment', '<!--(?:[^-]++|-(?!->))*+(?:-->)?+' ],
			[ 'tag', '</[A-Za-z][\w:-]*+\s*+>?+' ],
			[ 'tagopen', '<[A-Za-z][\w:-]*+(?:"[^"]*+"?+|\'[^\']*+\'?+|[^\'">]++)*+>?+' ],
			[ 'entity', '&#?\w{1,10};' ],
		];
		$tokens = [];

		foreach ( self::scan( $code, $rules ) as $token ) {
			if ( 'tagopen' !== $token[0] ) {
				$tokens[] = 'entity' === $token[0] ? [ 'number', $token[1] ] : $token;
				continue;
			}

			$text = $token[1];
			preg_match( '/^<[A-Za-z][\w:-]*+/', $text, $name );
			$tokens[] = [ 'tag', $name[0] ];
			$rest = substr( $text, strlen( $name[0] ) );

			foreach ( self::scan( $rest, [
				[ 'string', '"[^"]*+"?+' ],
				[ 'string', "'[^']*+'?+" ],
				[ 'attr', '[A-Za-z_:@][\w:.@-]*+' ],
				[ 'tag', '/?>' ],
			] ) as $inner ) {
				$tokens[] = $inner;
			}
		}

		return $tokens;
	}

	/**
	 * Escaped HTML with `<span class="rf-tok rf-tok--type">` around every highlighted token.
	 */
	public static function highlight( string $code, string $language ): string {
		$html = '';

		foreach ( self::tokenize( $code, $language ) as $token ) {
			$text = htmlspecialchars( $token[1], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8' );
			$html .= 'plain' === $token[0] ? $text : '<span class="rf-tok rf-tok--' . $token[0] . '">' . $text . '</span>';
		}

		return $html;
	}
}
