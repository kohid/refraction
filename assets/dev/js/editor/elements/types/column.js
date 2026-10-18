import Base from '../types/base/element-base';
import Model from 'refraction-elements/models/column';
import { default as View } from 'refraction-elements/views/column';

export default class Column extends Base {
	getType() {
		return 'column';
	}

	getView() {
		return View;
	}

	getModel() {
		return Model;
	}
}
