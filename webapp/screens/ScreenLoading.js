/**
 * @class ScreenLoading
 * @description Loading screen component.
 * - Processes the file picked in <screen-input>: loads it in memory and processes it against the API
 * - Uses <app-root>'s features (global state, routing).
 * @extends HTMLElement
 */
class ScreenLoading extends HTMLElement {

  constructor() {
    super();

    // References to app-root.
    this.appRoot = document.querySelector('app-root');
    this.appState = this.appRoot.state;
    this.changeScreen = this.appRoot.changeScreen.bind(this);

    // Internal "cancel" flag.
    this.cancel = false;

    // Local state
    this.state = new StateManager(this, 'ScreenLoading', {
      // Used to keep track of progress
      inputLength: 0,
      outputLength: 0
    });

    // Local bindings
    this.updateProgress = this.updateProgress.bind(this);
  }

  connectedCallback() {
    // Render once upon DOM injection
    this.renderInnerHTML();

    // Render progress update on load
    this.updateProgress();

    // On local state update, check if we should re-render
    this.addEventListener('StateManagerUpdate', this.conditionalReRender);

    // Start the loading process
    this.load();
  }

  disconnectedCallback() {
    this.removeEventListener('StateManagerUpdate', this.updateProgress);
  }

  renderInnerHTML() {
    // Render inner HTML content
    const { seizureData } = this.appState.data;

    this.innerHTML = /*html*/`
    <div>
      <h2>Your data is being processed</h2>
      <img src="/static/img/server.svg" alt="Loading"/>
      <p class="progress">&nbsp;</p>
      <button class="cancel" disabled>Cancel</button>
    </div>`;

    // Bind events to rendered elements
    this.querySelector('button.cancel').addEventListener('click', this.handleCancel.bind(this));
  }

  /**
   * Updates progress indicator, using data from local state.
   */
  updateProgress() {
    const { inputLength, outputLength } = this.state.data;
    const progress = this.querySelector('.progress');
    progress.innerText = `${outputLength} out of ${inputLength} sequences processed`;
  }

  /**
   * Takes a StateManagerUpdate event and determines if (part of) the component should re-render.
   * @param {CustomEvent} event - StateManagerUpdate event received from StateManager 
   */
  conditionalReRender(event) {
    if(!event.detail) {
      return;
    }

    // Render if update is from ScreenLoading's state manager
    if(event.detail && 
       event.detail.stateManagerName === 'ScreenLoading') {
      this.updateProgress();
    }
  }

  /**
   * Loads EEG data from the file passed from the user in <screen-input> (appState.data.eegFile).
   * - Upon error, will open a lightbox and redirect to <screen-input>.
   * - Upon completion, passes the data this.process()
   */
   load() {
    let file = null;
    let seizureDataInput = [];

    // Make reference to file
    try {
      file = this.appState.data.eegFile.files[0];
    }
    // We should have a file at this stage. If not, redirect to screen-input.
    catch(err) {
      this.changeScreen('screen-input');
      return;
    }

    // Parse and load EEG data from CSV file
    Papa.parse(file, {
      // Settings
      worker: true, // Try to run in a WebWorker
      dynamicTyping: true, // Numbers will be converted on the fly
      skipEmptyLines: true,

      // For each row
      step: (results) => {
        // Ignore rows that contain more than 500 samples.
        if(results.data.length > 500) {
          return;
        }

        // Ignore rows that contain something else than numbers
        for( const value of results.data ) {
          if( isNaN(value) ) {
            return;
          }
        }

        // Add valid rows to global state
        seizureDataInput.push(results.data);

        // Update local state to keep track of progress
        this.state.data.inputLength = seizureDataInput.length;
      },

      //
      // If loading failed: show a lightbox redirecting to screen-input
      //
      error: (err) => {
        this.appState.data.modal.message = `Loading EEG data from CSV failed.<br>Please make sure that its format is valid and try again.`;

        this.appState.data.modal.onClose = () => { // Modal's callback redirects to screen-input
          this.appState.data.modal.isOpen = false;
          this.changeScreen('screen-input');
        }

        this.appState.data.modal.isOpen = true;
      },

      //
      // Upon completion, start processing data, if any. Otherwise, open a modal.
      //
      complete: async() => {

        // If we don't have data: open a modal and redirect to screen-input
        if( !seizureDataInput.length ) {
          this.appState.data.modal.message = `Provided file does not seem to contain valid EEG data.`;

          this.appState.data.modal.onClose = () => { // Modal's callback redirects to screen-input
            this.appState.data.modal.isOpen = false;
            this.changeScreen('screen-input');
          }
  
          this.appState.data.modal.isOpen = true;
          return;
        }

        // If we have data, process it
        await this.process(seizureDataInput);
      }

    });

  }

  /**
   * Processes data loaded from file by this.load(): sends it by chunks to our API to get predictions.
   * - To be called after this.load().
   * - Upon completion, store results in appState.data.seizureData and redirects to <screen-visualization>
   * - Discards positive results that are not part of a (at least) 6 positive sequences streak
   * 
   * @param {Array} seizureDataInput - Array of input EEG data from this.load(). Rows of 500 numbers.
   */
  async process(seizureDataInput) {
    let buffer = [];
    let input = seizureDataInput;
    let output = []; 

    // Re-activate "cancel" button
    this.querySelector('button').removeAttribute('disabled');

    // Create buffers of up to 36 rows and send them to the API.
    for(let i = 0; i < input.length; i++) {

      // Add data to buffer
      buffer.push(input[i]);

      // Every 36 rows or if we reached the end of the list:
      if( (i+1) % 36 == 0 || i+1 == input.length ) {

        // Make sure the operation has not been canceled.
        if(this.cancel === true) {
          return; // Stop here if so.
        }

        // Try to run predictions for given row
        try {

          // Call the API to detect seizure on given sequences 
          let response = await fetch('/predict', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(buffer)
          });

          response = await response.json();

          // Store predictions
          for(let prediction of response) {
            output.push(prediction);
          }

          // Clear buffer before going to next cycle
          buffer.length = 0;
        }
        // If a prediction fails: add empty data for this sequence
        catch(err) {
          output.push(Array(buffer.length));
        }

        // Update local state to keep track of progress
        this.state.data.outputLength = output.length;
      }

    }

    // Exclude positive results that are not part of a (at least) 3 positive sequences streak
    let positiveStreak = [];
    for( let i = 0; i < output.length; i++ ) {
    
      // If we come across a negative result:
      // - Check if the positiveStreak contains less than 3 elements
      // - If so, change these results to negative on both output and outputFrozen
      if( output[i] === false ) {

        if( positiveStreak && positiveStreak.length < 3 ) {
          for( let sequenceIndex of positiveStreak ) {
            output[sequenceIndex] = false;
          }
        }

        // Since this was a negative result, clear the streak
        positiveStreak.length = 0;
        continue;
      }

      // Add positive results to the streak detector
      if( output[i] === true ) {
        positiveStreak.push(i);
        continue;
      }

    }

    // Upon completion, and unless we canceled, push data to global state and redirect to screen-visualization
    if(this.cancel !== true) {
      this.appState.data.seizureData = {
        input: input,
        output: output,
        outputFrozen: Object.assign([], output)
      };
      this.changeScreen('screen-visualization');
    }
  }

  /**
   * Handle a press on the "cancel button".
   */
  handleCancel() {
    this.cancel = true;
    this.changeScreen('screen-input');
  }

}
customElements.define('screen-loading', ScreenLoading);
