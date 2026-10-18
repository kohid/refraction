import ContainerFactory from '../../../container-factory';
import { MediaParser } from '../base';

export class Widget extends MediaParser {
	/**
	 * @inheritDoc
	 */
	static getName() {
		return 'widget';
	}

	/**
	 * @inheritDoc
	 */
	static getReaders() {
		return [ 'image' ];
	}

	/**
	 * @inheritDoc
	 */
	async parse() {
		const file = this.reader.getFile(),
			container = ContainerFactory.createElementContainer( {
				widgetType: 'image',
				settings: {
					image: {
						url: await this.reader.getDataUrl(),
						alt: file.name.split( '.' )[ 0 ],
						source: 'library',
					},
				},
			} );

		this.upload( file ).then( ( { data } ) => {
			$e.internal( 'document/elements/set-settings', {
				// The reason we use the container id and not the container instance itself is that the container
				// created above is just a placeholder, which later recreated using the same id.
				container: refraction.getContainer( container.id ),
				settings: {
					image: {
						url: data.source_url,
						id: data.id,
					},
				},
			} );
		} ).catch( () => {
			refraction.documents.getCurrent().history.setActive( false );

			$e.run( 'document/elements/reset-settings', {
				container: refraction.getContainer( container.id ),
				options: { external: true },
			} );

			refraction.documents.getCurrent().history.setActive( true );
		} );

		return container;
	}

	/**
	 * @inheritDoc
	 */
	static async validate() {
		return true;
	}
}
