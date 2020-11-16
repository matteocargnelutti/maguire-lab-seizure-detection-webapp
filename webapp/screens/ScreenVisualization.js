/**
 * @class ScreenVisualization
 * @description Visualization screen component.
 * - Uses <app-root>'s features (global state, routing).
 */
class ScreenVisualization extends HTMLElement {

  constructor() {
    super();

    // References to <app-root>.
    this.appRoot = document.querySelector('app-root');
    this.appState = this.appRoot.state;
    this.changeScreen = this.appRoot.changeScreen;
  }

  connectedCallback() {
    this.renderInnerHTML();
  }

  renderInnerHTML() {
    //
    // Render inner HTML content
    //
    this.innerHTML = /*html*/`
    <h1>Analysis results</h1>

    <div id="visualization-menu">
      <button class="export">Export</button>
      <button class="close">Close</button>
    </div>

    <seizure-detection-chart></seizure-detection-chart>
    `;

    //
    // Bind events to rendered elements
    //
    this.querySelector('.export').addEventListener('click', this.export.bind(this)); // Export feature
    this.querySelector('.close').addEventListener('click', this.close.bind(this)); // Close visualization
  }


  /**
   * Generates an export of predictions (frozen and edited) as CSV and downloads it.
   * - Uses global state's seizureData object.
   */
  export() {
    let { output, outputFrozen } = this.appState.data.seizureData;

    // Generate CSV
    let csv = 'is-seizure,is-seizure-user-corrected\n';

    for( let i = 0; i < output.length; i++ ) {
      csv += `${Number(outputFrozen[i])},${Number(output[i])}\n`;
    }

    // Generate data URI and associated link
    let blob = new Blob([csv], {type: 'text/csv'});
    let filename = 'export.csv';
    let objectURL = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.setAttribute('download', filename);
    a.setAttribute('href', objectURL);

    // Trigger download
    a.click();

    // Clear blob from memory
    window.URL.revokeObjectURL(objectURL);
  }

  /**
   * Closes the visualization screens and navigates to "home": 
   * - On fist click, changes copy of the close button to "Sure?"
   * - On second click redirects to home
   * 
   * @param {Event} event
   */
  close(event) {
    const closeButton = event.target;

    // If the button has no `confirm` class to it: first click
    if( !closeButton.classList.contains('confirm') ) {
      closeButton.innerHTML = 'Sure?';
      closeButton.classList.add('confirm');
      return;
    }

    // Second click: redirect
    this.changeScreen('screen-input');
  }

}
customElements.define('screen-visualization', ScreenVisualization);
