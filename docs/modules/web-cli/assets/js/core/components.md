# API - `$e.components`
The new Components API (since 2.7.0), provides a simple and convenient way to bind all route and commands, and keyboard shortcuts that belong to a UI component – into one controller.
The full list of components, including custom & 3rd routes, is available via: `$e.components.getAll();`
Each component have unique namespace, that have commands and routes, they are nested under him, ( `component-name/command-name )`.

On route, to a one of component routes, when the component becomes “active”, it allows binding of keyboard shortcuts for each component.
The components are extensible, so a 3rd party plugin can add some routes, command and shortcuts to an existing component.

*  **Description**: `$e.components` API is a manager for whole **api** components.
*  **Location**: *core/common/assets/js/api/core/components.js*
*  **Parent**: `refractionModules.Module`
*  **Methods**:

	| Method                       | Parameters                     | Returns                                       | Description
	|------------------------------|--------------------------------|-----------------------------------------------|------------------------------|
	| `$e.components.getAll()`     |                                | `{array.<string>}`                            | Receive all components.
	| `$e.components.register()`   | `{ComponentBase}` *component*  | `{ComponentBase}` *component*                 | Register a component.
	| `$e.components.get()`        | `{String}` *id*                | `{ComponentBase}` *component*                 | Get component instance by id.
	| `$e.components.getActive()`  |                                | `{Object.<ComponentBase>}` *activeComponents* | Get active components.
	| `$e.components.activate()`   | `{String}` *namespace*         |                                               | Activate component.
	| `$e.components.inactivate()` | `{String}` *namespace*         |                                               | Deactivate component.
	| `$e.components.isActive()`   | `{String}` *namespace*         | `{Boolean}` *isActive*                        | Is component active.

* ## **Examples**:
    ```javascript
     // Example of creating and registering a new component, available to run in the console and does not depend on anything else.
     class CustomComponent extends $e.modules.ComponentBase {
        getNamespace() {
            return 'custom-component';
        }
     
        defaultCommands() {
            // Object of all the component commands.
            return {
              // 'example' command.   
              example: ( args ) => {
                  // Output command args to console.
                  console.log( 'ExampleCommand: ', args );
           
                  // Return object as example.
                  return {
                      example: 'result from ExampleCommand',
                  };
              },
            };
        }
     }
     
     // Register the new component.
     $e.components.register( new CustomComponent() );
     
     // Runs 'example' command from 'custom-component'.
     result = $e.run( 'custom-component/example', {
        property: 'value',
     } );
     
     // Output command run result.
     console.log( 'e-components-eg-1-result: ', result );
    
    ```
## Guidelines, conventions & file's structure
  * You can view your component as a namespace that holds your [commands](../core/commands.md#guidelines-conventions--files-structure), [hooks](../core/hooks.md#guidelines-conventions--files-structure), [routes](#UPDATE_WHEN_READY), [tabs](#UPDATE_WHEN_READY), [shortcuts](#UPDATE_WHEN_READY) & [utils](#UPDATE_WHEN_READY).
  * Component class file should be named `component.js`
  * Component folder name should be named as a component namespace or a sub-component namespace.
  * Components and sub-components convention example, described in next scenario:
  Assuming you create a `Document` component which creates a sub-component `Elements`
    ```html class:"lineNo"
    1  📦 document
    2  │   📜 component.js
    3  │   📜 index.js           ( has all sub-components exported )
    4  │
    5  └───📂 elements
    6  │   │   📜 component.js
    7  │   │   |   ...
    ```
    
    `document/index.js` file at line *3*:
    ```javascript
    export { default as ElementsComponent } from './elements/component.js';
    ```    
    `document/component.js` file at line *2*:
    ```javascript
    import * as components from './';
    
    export default class Component extends $e.modules.ComponentBase {
        getNamespace() {
            return 'document';
        }
        
        registerAPI() {
            // Register sub components.
            Object.values( components ).forEach( ( ComponentClass ) =>
                $e.components.register( new ComponentClass )
            );
        
            super.registerAPI();
        }
    }
    
    export default class Component;
    ```
    
    `document/elements/component.js` file at line *6*:
    ```javascript
    export default class Component extends $e.modules.ComponentBase {
        getNamespace() {
            return 'elements';
        }
    }
    
    export default class Component;
    ```

### [Back](../index.md) 
