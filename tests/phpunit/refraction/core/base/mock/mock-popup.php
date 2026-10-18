<?php
namespace Refraction\Testing\Core\Base\Mock;

use Refraction\Widget_Base;

class Mock_Popup extends Widget_Base {

    public function get_name() {
        return 'popup';
    }

    public function get_title() {
		return esc_html__( 'Popup', 'refraction' );
	}

	public static function on_import_replace_dynamic_content( $config, $map_old_new_post_ids ) {
        if ( isset( $config['settings']['popup'] ) ) {
            $config['settings']['popup'] = $map_old_new_post_ids[ $config['settings']['popup'] ];
        }

        return $config;
    }
}
