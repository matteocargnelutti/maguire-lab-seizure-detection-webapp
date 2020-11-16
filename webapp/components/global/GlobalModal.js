/**
 * @class GlobalModal
 * @description App-wide lightbox. 
 * - Uses <app-root>'s features (global state, routing).
 * - Edit appRoot.state.modal.isOpen to open / close the modal.
 * - Edit appRoot.state.modal.message for the content.
 * - Pass a callback to appRoot.state.modal.onClose to determine what should happen when closing.
 * - Edit appRoot.state.modal.onCloseCaption to change the close button's caption.
 * @extends HTMLElement 
 */
class GlobalModal extends HTMLElement {

  constructor() {
    super();

    // References to <app-root>.
    this.appRoot = document.querySelector('app-root');
    this.appState = this.appRoot.state;

    // Enforce local bindings
    this.conditionalReRender = this.conditionalReRender.bind(this);
  }

  connectedCallback() {
    // Render once upon DOM injection
    this.renderInnerHTML();

    // On global state update, check if we should re-render
    this.appRoot.addEventListener('StateManagerUpdate', this.conditionalReRender);
  }

  disconnectedCallback() {
    this.appRoot.removeEventListener('StateManagerUpdate', this.conditionalReRender)
  }

  renderInnerHTML() {
    let { isOpen, message, onClose, onCloseCaption } = this.appState.data.modal;

    // Use default "close" function if none were given.
    if( !onClose ) {
      onClose = this.defaultOnClose;
    }

    //
    // Determine if we should render or not
    //
    if ( !isOpen ) {
      this.innerHTML = '';
      this.setAttribute('aria-hidden', 'true');
      this.removeAttribute('role');
      return;
    }
    else {
      this.removeAttribute('aria-hidden');
      this.setAttribute('role', 'dialog');
    }

    //
    // Render inner HTML content
    //
    this.innerHTML = /*html*/`
    <div>
      <p>${message}</p>
      <button>${onCloseCaption}</button>
    </div>
    `;

    //
    // Bind events to rendered elements
    //
    this.querySelector('button').addEventListener('click', onClose.bind(this));
  }

  /**
   * Takes a StateManagerUpdate event and determines if (part of) the component should re-render.
   * @param {CustomEvent} event - StateManagerUpdate event received from StateManager 
   */
  conditionalReRender(event) {
    if(!event.detail) {
      return;
    }

    if(event.detail && 
       event.detail.stateManagerName === 'AppRoot' && 
       event.detail.updatedPropertyPath === 'data.modal') {
      this.renderInnerHTML();
    }
  }

  /**
   * Default "close" function
   */
  defaultOnClose() {
    this.appState.data.modal.isOpen = false;
  }

}
customElements.define('global-modal', GlobalModal);
