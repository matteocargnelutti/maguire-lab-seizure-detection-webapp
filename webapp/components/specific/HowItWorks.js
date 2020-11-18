/**
 * @class HowItWorks
 * @description App features explainer. 
 * - Made for <screen-input>. 
 * @extends HTMLElement
 */
class HowItWorks extends HTMLElement {

  connectedCallback() {
    this.renderInnerHTML();
  }

  renderInnerHTML() {
    this.innerHTML = /*html*/`
    <h2>How does it work?</h2>

    <ol>
      <li>
        <img src="/static/img/lightning.svg" 
             alt="Lightning bolt" 
             aria-hidden="true"/>
        <p>
          Provide a <strong>CSV</strong> file containing <strong>rodent EEG data</strong>, where each row is a sequence of <a href="/static/img/data-format.png" title="More information on the Expected data format">500 samples at 100 Hz</a>.
          Try the app with a <a href="/static/samples/sample_149_sequences_with_seizures.csv" title="Get a sample EEG file">sample CSV file</a>.
        </p>
      </li>

      <li>
        <img src="/static/img/server.svg" 
             alt="Server" 
             aria-hidden="true"/>
        <p>
          The app will read the file and send it by chunks to our server, where our <strong>machine learning algorithm</strong> runs. Nothing is stored on our end.
        </p>
      </li>

      <li>
        <img src="/static/img/graph.svg" 
             alt="Chart" 
             aria-hidden="true"/>
        <p>
          Once the whole file has been processed, the app generates a <strong>dynamic visualization</strong> allowing <strong>verification, editing and export of the results</strong>.
        </p>
      </li>
    </ol>
    `;
  }

}
customElements.define('how-it-works', HowItWorks);