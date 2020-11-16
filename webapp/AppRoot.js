/**
 * @class AppRoot
 * @description App's main entry point and principal handler. Handles navigation and app-wide state management.
 * @extends HTMLElement 
 */
class AppRoot extends HTMLElement {

  constructor() {
    super();

    //
    // App-wide state definition.
    //
    this.state = new StateManager(this, 'AppRoot', {
      // Navigation management
      navigation: {
        defaultScreen: 'screen-input',
        currentScreen: 'screen-input',
        previousScreen: null
      },
      // Lightbox management
      modal: {
        isOpen: false,
        message: '',
        onClose: null,
        onCloseCaption: 'Ok'
      },
      // EEG File reference
      eegFile: null,
      // Seizure data
      seizureData: {
        input: [], // 2D array of EEG data. 1 sequence = 500 samples.
        output: [], // Predictions made by the API. List of booleans, each entry being 1 sequence.
        outputFrozen: [], // Frozen copy of `output`
      },
    });

    //
    // Settings
    //
    this.enforceSingleton = true; 
    // ☝️ If true, will make sure that there is only 1 instance of `<app-root>` in this document

    //
    // Local binding enforcement
    //
    this.changeScreen = this.changeScreen.bind(this);
    this.hashNavigationHandler = this.hashNavigationHandler.bind(this);
  }

  /**
   * Upon injection of <app-root> in the DOM:
   * - Render HTML
   * - Run navigation handler
   */
  connectedCallback() {
    // Enforce singleton pattern if needed
    if( this.enforceSingleton === true ) {
      let appRoots = document.querySelectorAll('app-root');
      
      for( let i = 1; i < appRoots.length; i++ ) {
        appRoots[i].remove();
      }
    }

    // Render on DOM injection
    this.renderInnerHTML();

    // Go to default screen
    this.changeScreen(this.state.data.navigation.defaultScreen);

    // [!] Hash-based navigation is deactivated for now
    // Run navigation handler once
    //this.hashNavigationHandler();

    // Bind hash change to navigation handler
    //window.addEventListener('hashchange', this.hashNavigationHandler);
  }

  disconnectedCallback() {
    // Enforce removal of bindings to window and document.
    window.removeEventListener('hashchange', this.hashNavigationHandler);
  }

  /**
   * Generates and replace inner HTML content
   */
  renderInnerHTML() {
    this.innerHTML = /*html*/`
    <main></main>
    <global-modal></global-modal>
    `;
  }

  /**
   * Basic hash URI-based navigation management.
   * [!] Not in use at the moment.
   * - Example of valid hash for the `screen-inner` element: `#!/inner`
   * - Custom logic needs to be added for parameters handling.
   * 
   * About this URI format: https://www.w3.org/blog/2011/05/hash-uris/
   */
  hashNavigationHandler() {
    let hash = window.location.hash;

    // Extract screen name from URI:
    // - #!/inner = inner = screen-inner
    let screenName = hash.match(/\#\!\/([A-Za-z0-9_\-]+)/);
    
    // If a screen name is found in the hash, prepend `screen-` to it.
    if( screenName && screenName.length > 1 ) {
      screenName = `screen-${screenName[1]}`;
    }
    // If nothing found, redirect to default screen
    else {
      screenName = this.state.data.navigation.defaultScreen;
    }

    // Try to load said screen
    this.changeScreen(screenName);
  }

  /**
   * Tries to replace the content of `app-root > main` by the content of a screen component.
   * - Will update this.state.data.navigation on the fly as needed.
   * 
   * @param {String} newScreenName 
   */
  changeScreen(newScreenName) {
    //
    // Check that the element contains `screen-` and exists.
    //
    if( !newScreenName.includes('screen-') || !customElements.get(newScreenName) ) {
      throw new Error(`<${newScreenName}> is not a valid screen name or does not exist.`);
    }

    //
    // If exists: replace content of app-root > main with this screen
    //
    let newScreen = new (customElements.get(newScreenName));
    let main = this.querySelector('main');

    main.innerHTML = '';
    main.appendChild(newScreen);

    //
    // Update navigation state
    //
    this.state.data.navigation.previousScreen = this.state.data.navigation.currentScreen;
    this.state.data.navigation.currentScreen = newScreenName;
  }

}
// Delay declaration of <app-root> until DOM content is ready to prevent loading race conditions.
window.addEventListener('DOMContentLoaded', () => {
  customElements.define('app-root',  AppRoot);
});

