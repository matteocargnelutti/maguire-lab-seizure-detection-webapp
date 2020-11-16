/**
 * @class SeizureDetectionChart
 * @description Displays a chart showing detected seizures from EEG data
 * - Uses <app-root>'s features (global state, routing).
 * @extends HTMLElement
 */
class SeizureDetectionChart extends HTMLElement {

  constructor() {
    super();

    // References to <app-root>.
    this.appRoot = document.querySelector('app-root');
    this.appState = this.appRoot.state;
    this.changeScreen = this.appRoot.changeScreen;

    // Graph controls and data
    this.graph = {
      sliceStart: 0,
      sliceEnd: 36,
      sliceStep: 36,
      eegSlice: [], // Flatten excerpt of seizureData.input matching slice start / end.
      seizureSlice: [], // Excerpt of seizureData.output matching slice start / end.
      seizureZones: [], // Array of start / end points of areas to highlight as seizures in the current slice.
      summary: [], // List of all the detected seizures in seizureData.input
      rendering: null
    };
  }

  connectedCallback() {
    // Populate this.graph.summary
    this.generateSummary();

    // Render inner HTML content
    this.renderInnerHTML();
  }
 
  renderInnerHTML() {
    let { summary } = this.graph;

    //
    // Render inner HTML content
    //
    this.innerHTML = /*html*/`
    <div id="visualization">
      <div id="graph"></div>

      <div id="controls">
        <button class="prev" title="Go 1 sequence to the left">-1</button>
        <button class="next" title="Go 1 sequence to the right">+1</button>
      </div>
    </div>

    <div id="summary">
      <h3>${summary.length + ' seizure(s) detected'}</h3>
      <ol></ol>
      <ul></ul>
    </div>
    `;

    // Add content for #summary ol (list of seizures)
    this.renderSummaryList();

    // Add content for #summary ul (seizure statistics)
    this.renderStatsList();

    // Render graph
    this.renderPlot();

    //
    // Bind events to rendered elements
    //

    // Previous / next
    this.querySelector('.prev').addEventListener('click', () => this.paginate('previous', 1));
    this.querySelector('.next').addEventListener('click', () => this.paginate('next', 1));

    // Summary: quick navigation (delegated)
    // Expects #summary ol elements to have a data-sequence-index attribute.
    this.querySelector('ol').addEventListener('click', (e) => {
      if( e.target.classList.contains('navigate') ) {
        let sequenceIndex = e.target.dataset.sequenceIndex;
        this.navigateToSequence(sequenceIndex);
      }
    });

    // Summary: Confirm / Reject seizure detection
    // Expects #summary ol elements to have a data-sequence-index attribute.
    for( let select of this.querySelectorAll('select.assess') ) {
      select.addEventListener('change', (e) => { 
        let sequenceIndex = e.target.dataset.sequenceIndex;
        this.togglePredictionResult(sequenceIndex);
      });
    }

  }

  /**
   * Plot generation
   * - Generate data slices on the fly
   * - Renders / update the chart
   */
  renderPlot() {
    // Cut slice of data, based on current status of this.graph
    this.generateDataSlice();

    // Detect seizures zones in current slice
    this.generateSeizureZones();

    // Extract data
    let { sliceStart, sliceEnd, eegSlice, seizureZones } = this.graph;

    // Aggregate slice data into a plottable array.
    let plotted = [];

    let sampleIndex = sliceStart * 500; // Each entry in seizureSlice represents 500 entries in eegSlice (1 sequence = 500 samples)
    for( let i = 0; i < eegSlice.length; i++ ) {
      plotted.push([sampleIndex+i, eegSlice[i]]);
    }

    // Render
    requestAnimationFrame( () => {
      this.graph.rendering = new Dygraph(
        this.querySelector("#graph"),
        plotted,
        {
          labels: ['T', 'Voltage'],
          color: 'rgb(20, 62, 77)',
          // Draw seizure areas from this.graph.seizureZones
          underlayCallback: this.drawSeizureZones.bind(this)
        });
    });

  }


  /**
   * Seizure summary list generation
   * - Should be called only once ! This allows to keep the state of <select> without having to listen to them.
   * 
   */
  renderSummaryList() {
    let { summary, sliceStep } = this.graph;
    
    // Generate individual results
    let seizureList = '';
    for( let i = 0; i < summary.length; i++ ) {
      let seizure = summary[i];
      
      seizureList += /*html*/`
      <li>
        <a href="#" 
           class="navigate" 
           data-sequence-index="${seizure.sequenceIndex}"
           title="Click to see this detected seizure">
           ${"#" + Math.floor(seizure.sequenceIndex)}
        </a>
         - ${seizure.durationInSeconds + 's '} 
        <select class="assess" data-sequence-index="${seizure.sequenceIndex}">
          <option value="1">${"Is a seizure ✔️"}</option>
          <option value="0">${"Is not a seizure ❌"}</option>
        </select>
      </li>`;
    }

    // Render
    const summaryList = this.querySelector('#summary ol');
    summaryList.innerHTML = seizureList;
  }

  /**
   * Seizure summary stats list generation
   * Called every time this.togglePredictionResult is called, so it's consistent with changes made by the user.
   */
  renderStatsList() {
    let { summary } = this.graph;
    let { output } = this.appState.data.seizureData;

    //
    // Build a local version of the seizures summary:
    // - This version will contain, for each detected sequence, a `rejected` field indicating if the user has confirmed or rejected this prediction.
    //
    let updatedSummary = [...summary];

    // Check the current value of the first sequence of each seizure: if `false`, this prediction has been rejected
    for( let seizure of updatedSummary ) { 
      seizure.rejected = !output[seizure.sequenceIndex]; 
    }

    //
    // Run numbers for each metric
    //

    // Count confirmed / rejected seizures
    let totalConfirmedSeizures = 0;
    let totalRejectedSeizures = 0;

    for( let seizure of updatedSummary ) { 
      seizure.rejected ? totalRejectedSeizures += 1 : totalConfirmedSeizures += 1;
    }

    // Total seizure time
    let totalSeizureTime = 0;
    
    for( let seizure of summary ) {

      // Ignore seizures that were marked as false positives
      if( seizure.rejected ) { 
        continue;
      }

      totalSeizureTime += seizure.durationInSeconds;
    }

    // Average seizure time
    let averageSeizureTime = (totalSeizureTime / totalConfirmedSeizures).toFixed(2);

    if( isNaN(averageSeizureTime) ) {
      averageSeizureTime = 0.00;
    }

    // False positives %
    let falsePositivesPercentage = (totalRejectedSeizures / updatedSummary.length) * 100;
    falsePositivesPercentage = falsePositivesPercentage.toFixed(2);

    if( isNaN(falsePositivesPercentage) ) {
      falsePositivesPercentage = 0.00;
    }

    // Confirmed positives % 
    let confirmedPositives = (totalConfirmedSeizures / updatedSummary.length) * 100;
    confirmedPositives = confirmedPositives.toFixed(2);

    if( isNaN(confirmedPositives) ) {
      confirmedPositives = 0.00;
    }
    
    //
    // Render
    //
    const stats = this.querySelector('#summary ul');

    stats.innerHTML = /*html*/`
      <li>
        <strong>${'Total seizure time: '}</strong>
        <span>${totalSeizureTime}s</span>
      </li>

      <li>
        <strong>${'Average seizure time: '}</strong>
        <span>${averageSeizureTime}s</span>
      </li>

      <li>
        <strong>${'False positives: '}</strong>
        <span>${falsePositivesPercentage}%</span>
      </li>

      <li>
        <strong>${'Confirmed positives: '}</strong>
        <span>${confirmedPositives}%</span>
      </li>
    `;

  }

  /**
   * Cut a slice of data based on this.graph.sliceStart / slideEnd
   * - Will populate this.graph.eegSlice
   * - Will populate this.graph.seizureSlice
   */
  generateDataSlice() {
    let { sliceStart, sliceEnd } = this.graph;
    let { input, output } = this.appState.data.seizureData;

    // EEG data
    this.graph.eegSlice = input.slice(sliceStart, sliceEnd).flat(); // X sequences, flatten.

    // Seizure data
    this.graph.seizureSlice = output.slice(sliceStart, sliceEnd);
  }

  /**
   * Generates this.graph.seizureZones, indicating zones to highlight in the current chart.
   * Based on this.graph.eegSlice and this.graph.seizureSlice.
   * - Uses this.graph.
   * - Populates this.graph.seizureZones.
   */
  generateSeizureZones() {
    let { seizureSlice, sliceStart } = this.graph;
    let sampleIndex = sliceStart * 500; // Each entry in seizureSlice represents 500 entries in eegSlice
    let seizureZones = [];

    for(let i = 0; i < seizureSlice.length; i++) {

      if(seizureSlice[i] !== true) {
        continue;
      }
      
      seizureZones.push({
        start: sampleIndex + (i * 500),
        end: sampleIndex + (i * 500 + 500)
      });

    }

    // Hoist to object state
    this.graph.seizureZones = seizureZones;
  }


  /**
   * Generate summary of detected seizures in this.graph.summary.
   * For consecutive sequences containing a seizure, only capture the first one.
   */
  generateSummary() {
    let { output } = this.appState.data.seizureData;
    let summary = [];

    // Iterate over sequences in output and put into `summary` sequences that are positive.
    let lastSequenceWasSeizure = false; // Allows to group consecutive sequences of seizures

    for( let i = 0; i < output.length; i++ ) {
      // Ignore negative results
      if( output[i] !== true ) {
        lastSequenceWasSeizure = false;
        continue;
      }

      // Ignore if previous sequence was a seizure and current result is positive: ignore (grouping)
      if( output[i] === true && lastSequenceWasSeizure === true ) {
        continue;
      }

      // Ignore if previous sequence was a seizure and current result is negative:
      // Remove `lastSequenceWasSeizure` flag.
      if( output[i] === false && lastSequenceWasSeizure === true ) {
        lastSequenceWasSeizure = false;
        continue;
      }

      // Add sequence to summary
      summary.push({sequenceIndex: i, sampleIndex: i * 500, durationInSequences: 0, durationInSeconds: 0});
      lastSequenceWasSeizure = true;
    }

    // Calculate length of each sequence
    for( let seizure of summary ) {
    
      let streak = 0;
      let sequenceIndex = seizure.sequenceIndex;

      // Iterate over next sequences to check continuity
      while( true ) {
        if( output[sequenceIndex] == true ) {
          streak += 1;
          sequenceIndex += 1;
        }
        else {
          break;
        }

      }

      // Update duration in summary
      seizure.durationInSequences = streak;
      seizure.durationInSeconds = streak * 5;

    }

    // Hoist summary to object state
    this.graph.summary = summary;
  }

  /**
   * Called by Dygraph's underlayCallback hook to draw backgrounds where seizures were detected.
   * - Uses this.graph.
   * 
   * @param {Element} canvas 
   * @param {*} area 
   * @param {*} graph - Dygraph instance
   */
  drawSeizureZones(canvas, area, graph) {
    for( let seizureZone of this.graph.seizureZones ) {
      let { start, end } = seizureZone;

      let bottomLeft = graph.toDomCoords(start, -20);
      let topRight = graph.toDomCoords(end, +20);

      let left = bottomLeft[0];
      let right = topRight[0];

      canvas.fillStyle = "rgb(158, 255, 239)";
      canvas.fillRect(left, area.y, right - left, area.h);
    }
  }

  /**
   * Goes to previous or next "page" of the graph.
   * - Uses this.graph.
   * - Will call this.renderPlot()
   * 
   * @param {String} direction - Can be "next" or "previous"
   * @param {Number} customSliceStep - By how much should the goalposts move? If not set, will default to this.graph.sliceStep
   */
  paginate(direction, customSliceStep) {
    let { sliceStart, sliceEnd, sliceStep } = this.graph;
    let { input, output } = this.appState.data.seizureData;

    // Determine which step to use. If none was provided, use the default one
    let step = sliceStep;

    if( customSliceStep && !isNaN(customSliceStep) ) {
      step = customSliceStep;
    }

    // Set new boundaries
    if( direction !== 'previous' ) {
      sliceStart = sliceStart + step;
      sliceEnd = sliceEnd + step;
    }
    else {
      sliceStart = sliceStart - step;
      sliceEnd = sliceEnd - step;
    }

    // Check if new boundaries work
    if(input.slice(sliceStart, sliceEnd).length < 1) {
      return;
    }

    // Hoist new boundaries to object state
    this.graph.sliceStart = sliceStart;
    this.graph.sliceEnd = sliceEnd;

    // Generate plot
    this.renderPlot();
  }

  /**
   * Navigate to sequence.
   * - Uses this.graph.
   * - Will call this.renderPlot()
   * 
   * @param {Int} sequenceIndex - Index of the sequence to navigate to
   */
  navigateToSequence(sequenceIndex) {
    let { sliceStep } = this.graph;

    // Set pagination limits
    this.graph.sliceStart = Math.round(sequenceIndex / 10) * 10;
    this.graph.sliceEnd = this.graph.sliceStart + this.graph.sliceStep;
    
    // Update graph
    this.renderPlot();
  }

  /**
   * Toggles prediction for a given sequence.
   * - Uses this.graph.
   * - Will call this.renderPlot()
   * 
   * @param {Int} sequenceIndex - Index of the sequence to toggle
   */
  togglePredictionResult(sequenceIndex) {
    // Check that sequence exists in output
    if( this.appState.data.seizureData.output[sequenceIndex] === undefined ) {
      return;
    }

    // Pry into outputFrozen (untouched predictions) to check if next sequences were part of the seizure.
    // Build a list of consecutive sequences part of the seizure.
    let sequenceIndexes = [];

    for( let i = sequenceIndex; i < this.appState.data.seizureData.outputFrozen.length; i++ ) {

      if( this.appState.data.seizureData.outputFrozen[i] === true ) {
        sequenceIndexes.push(i);
      }
      else {
        break;
      }

    }

    // Change prediction status for the whole sequence
    for( let sequenceIndex of sequenceIndexes ) {
      this.appState.data.seizureData.output[sequenceIndex] = !this.appState.data.seizureData.output[sequenceIndex];
    }

    // Update graph
    this.renderPlot();

    // Update seizure stats
    this.renderStatsList();
  }

}
customElements.define('seizure-detection-chart', SeizureDetectionChart);