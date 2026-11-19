import { formNestedTypes } from './nested-fields';
import { watchDisplayFields } from './display-fields';
import { registerListItems } from './list-items';

export default class Module {
	constructor() {
		formNestedTypes().forEach( ( type ) => refraction.elementsManager.registerElementType( type ) );
		watchDisplayFields();
		registerListItems();
	}
}
