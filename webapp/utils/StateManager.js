/**
 * @class StateManager 
 * @description State Manager utility for custom HTML elements. Holds data, uses a proxy to fire events on update, allowing components to react to changes by reacting to a `StateManagerUpdate` event.
 * 
 * @property {HTMLElement} parent - Element using this state, or any object with a dispatchEvent method. State update events will be fired from this context.
 * @property {String} name - Name of this state manager instance. Used for identifying events.
 * @property {any} data - Current set of data held by the state manager (proxied).
 * @property {Boolean} provideStateCopy - If true, each StateManagerUpdate event will provide a copy of the previous and new state. De-activated by default.
 * @property {Boolean} updateEventBubbles - Determines if the event fired on update should bubble up. Defaults to true.
 * @property {Boolean} updateEventIsComposed - Determined if the event fired on update should be composed. Defaults to true.
 * 
 * @author Matteo Cargnelutti (@matteocargnelutti)
 */
class StateManager {
  /**
   * @param {HTMLElement} parent - Custom element using this state.
   * @param {String} name - Name of this state manager instance. Used for identifying events.
   * @param {any} data - Original data held by the state manager. 
   */
  constructor(parent, name, data) {
    // Parent must have "dispatchEvent" as a property
    if( !'dispatchEvent' in parent ) {
      throw new Error('`parent` must have a `dispatchEvent` method.');
    }

    // Keep track of parent element: events will be fired from there.
    this.parent = parent;

    // Keep track of nested property access path.
    this.propertyPath = 'data';

    // Settings and identification related properties
    this.name = String(name);
    this.provideStateCopy = false;
    this.updateEventBubbles = true;
    this.updateEventIsComposed = true;

    // Grab original state and proxy it so access / edits can be observed.
    this.__data = data;

    this.__dataHandler = {
      get: this.__read.bind(this), // Will be called on every property access on this.data
      set: this.__write.bind(this) // Will be called on every property edit on this.data
    };

    this.data = new Proxy(this.__data, this.__dataHandler);

  }


  /**
   * Proxied object getter.
   * Called by this.data's proxy to access properties. Recursive.
   * 
   * @param {any} object - Proxied object (this.state)
   * @param {String} property - The name of the property to access.
   * @returns {any} - Either the value we are looking for, or a new Proxy if said value is an array or object.
   * 
   * Notes:
   * The recursive creation of Proxies is needed here as nested fields are not covered by the proxy, 
   * we would therefore not be able to call this.__stateUpdateHandler() on nested fields edits.
   * Inspired by Chris Ferdinandi's article on nested arrays and proxies: 
   * - https://gomakethings.com/how-to-detect-changes-to-nested-arrays-and-objects-inside-a-proxy/
   */
  __read(object, property) {
    let value = object[property];

    // If we are at root level of this.__data, reset the nested property access tracker.
    if( this.__data.hasOwnProperty(property) ) {
      this.propertyPath = `data`;
    }

    // If the current value is an array or an object, return a new proxy for it, with the same handler.
    if( ['[object Object]', '[object Array]'].includes(Object.prototype.toString.call(value)) ) {
      this.propertyPath += `.${property}`; // We are headed into some nested object / array, update nested property access tracker.
      return new Proxy(value, this.__dataHandler);
    }

    // Otherwise, simply return the value.
    return value;
  }

  /**
   * Proxied object setter.
   * Called by this.data's proxy to edit properties.
   * 
   * @param {any} object - Proxied object (this.state)
   * @param {String} property - The name of the property to access
   * @param {any} newValue - The value to replace the property with.
   * @fires StateManagerUpdate - Upon state update. `event.detail` contains what was updated, and copies of new/past state.
   * @returns {Boolean}
   * 
   * Notes:
   * StateManagerUpdate is fired from this.parent, likely an HTMLElement.
   * 
   * Structure of the StateManagerUpdate.detail: 
   * - stateManagerName: string
   * - updatedProperty: string
   * - newValue: any
   * - previousState: any, likely object
   * - newState: any, likely object
   */
  __write(object, property, newValue) {

    // If requested, keep a copy of the soon-to-be previous state
    let previousState = null;
    if( this.provideStateCopy ) {
      previousState = this.__deepCopy(this.__data);
    }

    // Update wanted property in state
    object[property] = newValue;

    // If requested, keep a copy of the new state
    let newState = null;
    if( this.provideStateCopy ) {
      newState = this.__deepCopy(this.__data);
    }

    // Fire an event so the rest of the app can be informed and observe changes in state.
    // Provides a copy of both the previous and new state.
    const event = new CustomEvent('StateManagerUpdate', {
      bubbles: this.updateEventBubbles,
      composed: this.updateEventIsComposed,
      detail: {
        'stateManagerName': this.name,
        'updatedProperty': property,
        'updatedPropertyPath': this.propertyPath,
        'newValue': newValue
      }
    });

    // Add previousState / newState if those were requested.
    if( this.provideStateCopy ) {
      event.detail.previousState = previousState;
      event.detail.newState = newState;
    }

    this.parent.dispatchEvent(event);

    // Reset nested property access tracker
    this.propertyPath = 'data';

    return true;
  }

  /**
   * Deep copy helper for state duplication.
   * Recursive.
   * 
   * Inspired from: 
   * - https://medium.com/javascript-in-plain-english/how-to-deep-copy-objects-and-arrays-in-javascript-7c911359b089
   * 
   * @param {Any} toCopy
   * @return {Object} 
   */
  __deepCopy(toCopy) {
    let toCopyType = Object.prototype.toString.call(toCopy);

    // Return self if immutable
    if( !['[object Object]', '[object Array]', '[object Null]'].includes(toCopyType) ) {
      return toCopy;
    }

    // Otherwise, crawl down and copy
    let copy = {};

    if( toCopyType === '[object Array]') {
      copy = [];
    }

    for( let key in toCopy ) {
      copy[key] = this.__deepCopy(toCopy[key]);
    }

    return copy;
  }

}
