/**
 * @class EEGInputForm
 * @description Form system allowing to load a CSV containing EEG data in memory. 
 * - Made for <screen-input>. 
 * - Uses <app-root>'s features (global state, routing).
 * @extends HTMLElement
 */
class EEGInputForm extends HTMLElement {

  constructor() {
    super();

    // References to app-root.
    this.appRoot = document.querySelector('app-root');
    this.appState = this.appRoot.state;
    this.changeScreen = this.appRoot.changeScreen;

    // Enforce local binding
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
    // If a file was picked, grab its name and make the submit button enabled
    let filePicked = false;
    let filename = 'Pick a file (EEG as CSV)';
    let disabled = 'disabled';

    try {
      filePicked = this.appState.data.eegFile.files[0];
      filename = filePicked.name;
      disabled = '';
    }
    catch {
    }

    //
    // Render template
    //
    this.innerHTML = /*html*/`
    <form>
      <input type="file" accept=".csv" name="csv" id="csv">
      <label class="file-label" for="csv">${filename}</label>
      <button type="submit" ${disabled}>Analyze</button>
    </form>
    `;

    //
    // Bind events to rendered elements
    //

    // File is picked
    this.querySelector('input').addEventListener('change', this.handleFilePick.bind(this));

    // Form is submitted
    this.querySelector('form').addEventListener('submit', this.handleSubmit.bind(this));
  }

  /**
   * Takes a StateManagerUpdate event and determines if (part of) the component should re-render.
   * @param {CustomEvent} event - StateManagerUpdate event received from StateManager 
   */
  conditionalReRender(event) {
    if(!event.detail) {
      return;
    }

    // Render if update is from AppRoot's state manager and is about the eegFile
    if(event.detail && 
       event.detail.stateManagerName === 'AppRoot' && 
       event.detail.updatedProperty === 'eegFile') {
      this.renderInnerHTML();
    }
  }

  /**
   * React to file being picked in the form: loads reference to file in global state, resets currently loaded seizure data.
   * @param {Event} event - File input that was changed.
   */
  handleFilePick(event) {
    // Loosely check file type
    let file = event.target;

    try {
      let filename = file.files[0].name; // Will raise an exception if no file was picked.

      if( !filename.includes('.csv') ) {
        throw Error('Provided file is not a CSV.');
      }
    }
    catch(err) {
      file = null;
      console.log(err);
    }

    // Update global state
    this.appState.data.seizureData.input.length = 0;
    this.appState.data.seizureData.output.length = 0;
    this.appState.data.eegFile = file;
  }

  /**
   * Redirects to the loading screen on submit.
   * @param {Event} event
   */
  handleSubmit(event) {
    // Prevent the form from being sent
    event.preventDefault();

    // Make sure a file is available
    if( !this.appState.data.eegFile ) {
      return;
    }

    // Redirect
    this.changeScreen('screen-loading');
  }

}
customElements.define('eeg-input-form', EEGInputForm);