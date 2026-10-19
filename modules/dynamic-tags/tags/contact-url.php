<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Data_Tag;
use Refraction\Modules\DynamicTags\Module;
use Refraction\Modules\DynamicTags\Classes\Contact_Url as ContactUrl;
use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Contact_Url extends Data_Tag {

	public function get_name() {
		return 'contact-url';
	}

	public function get_title() {
		return esc_html__( 'Contact URL', 'refraction' );
	}

	public function get_group() {
		return Module::ACTION_GROUP;
	}

	public function get_categories() {
		return [ Module::URL_CATEGORY ];
	}

	protected function register_controls() {
		$this->add_control(
			'link_type',
			[
				'label' => esc_html__( 'Type', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'email',
				'options' => [
					'email' => esc_html__( 'Email', 'refraction' ),
					'tel' => esc_html__( 'Phone call', 'refraction' ),
					'sms' => esc_html__( 'SMS', 'refraction' ),
					'whatsapp' => esc_html__( 'WhatsApp', 'refraction' ),
					'skype' => esc_html__( 'Skype', 'refraction' ),
				],
			]
		);

		$this->add_control( 'email', [ 'label' => esc_html__( 'Email', 'refraction' ), 'condition' => [ 'link_type' => 'email' ] ] );
		$this->add_control( 'subject', [ 'label' => esc_html__( 'Subject', 'refraction' ), 'condition' => [ 'link_type' => 'email' ] ] );
		$this->add_control( 'body', [ 'label' => esc_html__( 'Message', 'refraction' ), 'type' => Controls_Manager::TEXTAREA, 'condition' => [ 'link_type' => [ 'email', 'sms', 'whatsapp' ] ] ] );
		$this->add_control( 'number', [ 'label' => esc_html__( 'Phone number', 'refraction' ), 'description' => esc_html__( 'With the country code, for example +1 555 010 2030', 'refraction' ), 'condition' => [ 'link_type' => [ 'tel', 'sms', 'whatsapp' ] ] ] );
		$this->add_control( 'username', [ 'label' => esc_html__( 'Skype name', 'refraction' ), 'condition' => [ 'link_type' => 'skype' ] ] );
		$this->add_control(
			'skype_action',
			[
				'label' => esc_html__( 'Action', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'chat',
				'options' => [
					'chat' => esc_html__( 'Chat', 'refraction' ),
					'call' => esc_html__( 'Call', 'refraction' ),
					'add' => esc_html__( 'Add contact', 'refraction' ),
				],
				'condition' => [ 'link_type' => 'skype' ],
			]
		);
	}

	public function is_settings_required() {
		return true;
	}


	public function get_value( array $options = [] ) {
		$s = $this->get_settings();

		return ContactUrl::build( (string) ( $s['link_type'] ?? '' ), [
			'to' => $s['email'] ?? '',
			'subject' => $s['subject'] ?? '',
			'body' => $s['body'] ?? '',
			'number' => $s['number'] ?? '',
			'username' => $s['username'] ?? '',
			'action' => $s['skype_action'] ?? 'chat',
		] );
	}
}
