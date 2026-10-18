import Base from '../types/base/element-base';
import Model from 'refraction-elements/models/document';

export default class Document extends Base {
	getType() {
		return 'document';
	}

	getModel() {
		return Model;
	}
}
