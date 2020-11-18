/**
 * @class InfoFooter
 * @description Generic footer containing authorship / licence info.
 * - Made for <screen-input>. 
 * - Uses <app-root>'s features (global state, routing).
 * @extends HTMLElement
 */
class InfoFooter extends HTMLElement {

  constructor() {
    super();
  }

  connectedCallback() {
    this.renderInnerHTML();
  }

  renderInnerHTML() {
    this.innerHTML = /*html*/`
    <hr>

    <h3>Made in 2020 by</h3>

    <p>
      <a href="https://github.com/pantelisantonoudiou" title="Pantelis Antonoudiou on GitHub">Pantelis Antonoudiou</a>
      (Data Science)  and 
      <a href="https://github.com/matteocargnelutti" title="Matteo Cargnelutti on GitHub">Matteo Cargnelutti</a>
      (Software Development) with the 
      <a href="https://www.maguirelab.com/">Maguire Lab at Tufts University</a>.
    </p>

    <p>
      This open-source software is distributed under the 
      <a href="https://choosealicense.com/licenses/apache-2.0/">Apache 2.0 License</a>.<br>
      Fork us on
      <a href="https://github.com/matteocargnelutti/maguire-lab-seizure-detection-webapp" title="Fork this project on GitHub">GitHub</a>.
    </p>

    <p>
      <strong>This software was built and made available for research purposes only and is intended for use on rodent data.</strong>
    </p>
    `;

  }
  
}
customElements.define('info-footer', InfoFooter);