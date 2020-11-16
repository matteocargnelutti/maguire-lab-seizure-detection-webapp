/**
 * @class ScreenInput
 * @description Input screen component. 
 * - Uses <app-root>'s features (global state, routing).
 * @extends HTMLElement
 */
class ScreenInput extends HTMLElement {

  constructor() {
    super();

    // References to <app-root>.
    this.appRoot = document.querySelector('app-root');
    this.appState = this.appRoot.state;

    // Wipe currently loaded seizure data
    this.appState.data.seizureData.input.length = 0;
    this.appState.data.seizureData.output.length = 0;
    this.appState.data.seizureData.outputFrozen.length = 0;
    this.appState.data.eegFile = null;
  }

  connectedCallback() {
    this.renderInnerHTML();
  }

  renderInnerHTML() {
    this.innerHTML = /*html*/`
    <h1>
      <a href="https://www.maguirelab.com/">Maguire Lab&apos;s</a>
      <p>
        Deep Learning<br>
        <span>seizure</span> detection.
      </p>
    </h1>

    <eeg-input-form></eeg-input-form>
    <how-it-works></how-it-works>
    <info-footer role="contentinfo"></info-footer>
    `;
  }

}
customElements.define('screen-input', ScreenInput);