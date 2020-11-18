class AppRoot extends HTMLElement{constructor(){super();this.state=new StateManager(this,'AppRoot',{navigation:{defaultScreen:'screen-input',currentScreen:'screen-input',previousScreen:null},modal:{isOpen:false,message:'',onClose:null,onCloseCaption:'Ok'},eegFile:null,seizureData:{input:[],output:[],outputFrozen:[],},});this.enforceSingleton=true;this.changeScreen=this.changeScreen.bind(this);this.hashNavigationHandler=this.hashNavigationHandler.bind(this);}
connectedCallback(){if(this.enforceSingleton===true){let appRoots=document.querySelectorAll('app-root');for(let i=1;i<appRoots.length;i++){appRoots[i].remove();}}
this.renderInnerHTML();this.changeScreen(this.state.data.navigation.defaultScreen);}
disconnectedCallback(){window.removeEventListener('hashchange',this.hashNavigationHandler);}
renderInnerHTML(){this.innerHTML=`
    <main></main>
    <global-modal></global-modal>
    `;}
hashNavigationHandler(){let hash=window.location.hash;let screenName=hash.match(/\#\!\/([A-Za-z0-9_\-]+)/);if(screenName&&screenName.length>1){screenName=`screen-${screenName[1]}`;}
else{screenName=this.state.data.navigation.defaultScreen;}
this.changeScreen(screenName);}
changeScreen(newScreenName){if(!newScreenName.includes('screen-')||!customElements.get(newScreenName)){throw new Error(`<${newScreenName}> is not a valid screen name or does not exist.`);}
let newScreen=new(customElements.get(newScreenName));let main=this.querySelector('main');main.innerHTML='';main.appendChild(newScreen);this.state.data.navigation.previousScreen=this.state.data.navigation.currentScreen;this.state.data.navigation.currentScreen=newScreenName;}}
window.addEventListener('DOMContentLoaded',()=>{customElements.define('app-root',AppRoot);});
class StateManager{constructor(parent,name,data){if(!'dispatchEvent'in parent){throw new Error('`parent` must have a `dispatchEvent` method.');}
this.parent=parent;this.propertyPath='data';this.name=String(name);this.provideStateCopy=false;this.updateEventBubbles=true;this.updateEventIsComposed=true;this.__data=data;this.__dataHandler={get:this.__read.bind(this),set:this.__write.bind(this)};this.data=new Proxy(this.__data,this.__dataHandler);}
__read(object,property){let value=object[property];if(this.__data.hasOwnProperty(property)){this.propertyPath=`data`;}
if(['[object Object]','[object Array]'].includes(Object.prototype.toString.call(value))){this.propertyPath+=`.${property}`;return new Proxy(value,this.__dataHandler);}
return value;}
__write(object,property,newValue){let previousState=null;if(this.provideStateCopy){previousState=this.__deepCopy(this.__data);}
object[property]=newValue;let newState=null;if(this.provideStateCopy){newState=this.__deepCopy(this.__data);}
const event=new CustomEvent('StateManagerUpdate',{bubbles:this.updateEventBubbles,composed:this.updateEventIsComposed,detail:{'stateManagerName':this.name,'updatedProperty':property,'updatedPropertyPath':this.propertyPath,'newValue':newValue}});if(this.provideStateCopy){event.detail.previousState=previousState;event.detail.newState=newState;}
this.parent.dispatchEvent(event);this.propertyPath='data';return true;}
__deepCopy(toCopy){let toCopyType=Object.prototype.toString.call(toCopy);if(!['[object Object]','[object Array]','[object Null]'].includes(toCopyType)){return toCopy;}
let copy={};if(toCopyType==='[object Array]'){copy=[];}
for(let key in toCopy){copy[key]=this.__deepCopy(toCopy[key]);}
return copy;}}
class ScreenLoading extends HTMLElement{constructor(){super();this.appRoot=document.querySelector('app-root');this.appState=this.appRoot.state;this.changeScreen=this.appRoot.changeScreen.bind(this);this.cancel=false;this.state=new StateManager(this,'ScreenLoading',{inputLength:0,outputLength:0});this.updateProgress=this.updateProgress.bind(this);}
connectedCallback(){this.renderInnerHTML();this.updateProgress();this.addEventListener('StateManagerUpdate',this.conditionalReRender);this.load();}
disconnectedCallback(){this.removeEventListener('StateManagerUpdate',this.updateProgress);}
renderInnerHTML(){const{seizureData}=this.appState.data;this.innerHTML=`
    <div>
      <h2>Your data is being processed</h2>
      <img src="/static/img/server.svg" alt="Loading"/>
      <p class="progress">&nbsp;</p>
      <button class="cancel" disabled>Cancel</button>
    </div>`;this.querySelector('button.cancel').addEventListener('click',this.handleCancel.bind(this));}
updateProgress(){const{inputLength,outputLength}=this.state.data;const progress=this.querySelector('.progress');progress.innerText=`${outputLength} out of ${inputLength} sequences processed`;}
conditionalReRender(event){if(!event.detail){return;}
if(event.detail&&event.detail.stateManagerName==='ScreenLoading'){this.updateProgress();}}
load(){let file=null;let seizureDataInput=[];try{file=this.appState.data.eegFile.files[0];}
catch(err){this.changeScreen('screen-input');return;}
Papa.parse(file,{worker:true,dynamicTyping:true,skipEmptyLines:true,step:(results)=>{if(results.data.length>500){return;}
for(const value of results.data){if(isNaN(value)){return;}}
seizureDataInput.push(results.data);this.state.data.inputLength=seizureDataInput.length;},error:(err)=>{this.appState.data.modal.message=`Loading EEG data from CSV failed.<br>Please make sure that its format is valid and try again.`;this.appState.data.modal.onClose=()=>{this.appState.data.modal.isOpen=false;this.changeScreen('screen-input');}
this.appState.data.modal.isOpen=true;},complete:async()=>{if(!seizureDataInput.length){this.appState.data.modal.message=`Provided file does not seem to contain valid EEG data.`;this.appState.data.modal.onClose=()=>{this.appState.data.modal.isOpen=false;this.changeScreen('screen-input');}
this.appState.data.modal.isOpen=true;return;}
await this.process(seizureDataInput);}});}
async process(seizureDataInput){let buffer=[];let input=seizureDataInput;let output=[];this.querySelector('button').removeAttribute('disabled');for(let i=0;i<input.length;i++){buffer.push(input[i]);if((i+1)%36==0||i+1==input.length){if(this.cancel===true){return;}
try{let response=await fetch('/predict',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(buffer)});response=await response.json();for(let prediction of response){output.push(prediction);}
buffer.length=0;}
catch(err){output.push(Array(buffer.length));}
this.state.data.outputLength=output.length;}}
let positiveStreak=[];for(let i=0;i<output.length;i++){if(output[i]===false){if(positiveStreak&&positiveStreak.length<3){for(let sequenceIndex of positiveStreak){output[sequenceIndex]=false;}}
positiveStreak.length=0;continue;}
if(output[i]===true){positiveStreak.push(i);continue;}}
if(this.cancel!==true){this.appState.data.seizureData={input:input,output:output,outputFrozen:Object.assign([],output)};this.changeScreen('screen-visualization');}}
handleCancel(){this.cancel=true;this.changeScreen('screen-input');}}
customElements.define('screen-loading',ScreenLoading);
class ScreenVisualization extends HTMLElement{constructor(){super();this.appRoot=document.querySelector('app-root');this.appState=this.appRoot.state;this.changeScreen=this.appRoot.changeScreen;}
connectedCallback(){this.renderInnerHTML();}
renderInnerHTML(){this.innerHTML=`
    <h1>Analysis results</h1>

    <div id="visualization-menu">
      <button class="export">Export</button>
      <button class="close">Close</button>
    </div>

    <seizure-detection-chart></seizure-detection-chart>
    `;this.querySelector('.export').addEventListener('click',this.export.bind(this));this.querySelector('.close').addEventListener('click',this.close.bind(this));}
export(){let{output,outputFrozen}=this.appState.data.seizureData;let csv='is-seizure,is-seizure-user-corrected\n';for(let i=0;i<output.length;i++){csv+=`${Number(outputFrozen[i])},${Number(output[i])}\n`;}
let blob=new Blob([csv],{type:'text/csv'});let filename='export.csv';let objectURL=window.URL.createObjectURL(blob);const a=document.createElement('a');a.setAttribute('download',filename);a.setAttribute('href',objectURL);a.click();window.URL.revokeObjectURL(objectURL);}
close(event){const closeButton=event.target;if(!closeButton.classList.contains('confirm')){closeButton.innerHTML='Sure?';closeButton.classList.add('confirm');return;}
this.changeScreen('screen-input');}}
customElements.define('screen-visualization',ScreenVisualization);
class ScreenInput extends HTMLElement{constructor(){super();this.appRoot=document.querySelector('app-root');this.appState=this.appRoot.state;this.appState.data.seizureData.input.length=0;this.appState.data.seizureData.output.length=0;this.appState.data.seizureData.outputFrozen.length=0;this.appState.data.eegFile=null;}
connectedCallback(){this.renderInnerHTML();}
renderInnerHTML(){this.innerHTML=`
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
    `;}}
customElements.define('screen-input',ScreenInput);
class HowItWorks extends HTMLElement{connectedCallback(){this.renderInnerHTML();}
renderInnerHTML(){this.innerHTML=`
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
    `;}}
customElements.define('how-it-works',HowItWorks);
class EEGInputForm extends HTMLElement{constructor(){super();this.appRoot=document.querySelector('app-root');this.appState=this.appRoot.state;this.changeScreen=this.appRoot.changeScreen;this.conditionalReRender=this.conditionalReRender.bind(this);}
connectedCallback(){this.renderInnerHTML();this.appRoot.addEventListener('StateManagerUpdate',this.conditionalReRender);}
disconnectedCallback(){this.appRoot.removeEventListener('StateManagerUpdate',this.conditionalReRender)}
renderInnerHTML(){let filePicked=false;let filename='Pick a file (EEG as CSV)';let disabled='disabled';try{filePicked=this.appState.data.eegFile.files[0];filename=filePicked.name;disabled='';}
catch{}
this.innerHTML=`
    <form>
      <input type="file" accept=".csv" name="csv" id="csv">
      <label class="file-label" for="csv">${filename}</label>
      <button type="submit" ${disabled}>Analyze</button>
    </form>
    `;this.querySelector('input').addEventListener('change',this.handleFilePick.bind(this));this.querySelector('form').addEventListener('submit',this.handleSubmit.bind(this));}
conditionalReRender(event){if(!event.detail){return;}
if(event.detail&&event.detail.stateManagerName==='AppRoot'&&event.detail.updatedProperty==='eegFile'){this.renderInnerHTML();}}
handleFilePick(event){let file=event.target;try{let filename=file.files[0].name;if(!filename.includes('.csv')){throw Error('Provided file is not a CSV.');}}
catch(err){file=null;console.log(err);}
this.appState.data.seizureData.input.length=0;this.appState.data.seizureData.output.length=0;this.appState.data.eegFile=file;}
handleSubmit(event){event.preventDefault();if(!this.appState.data.eegFile){return;}
this.changeScreen('screen-loading');}}
customElements.define('eeg-input-form',EEGInputForm);
class SeizureDetectionChart extends HTMLElement{constructor(){super();this.appRoot=document.querySelector('app-root');this.appState=this.appRoot.state;this.changeScreen=this.appRoot.changeScreen;this.graph={sliceStart:0,sliceEnd:36,sliceStep:36,eegSlice:[],seizureSlice:[],seizureZones:[],summary:[],rendering:null};}
connectedCallback(){this.generateSummary();this.renderInnerHTML();}
renderInnerHTML(){let{summary}=this.graph;this.innerHTML=`
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
    `;this.renderSummaryList();this.renderStatsList();this.renderPlot();this.querySelector('.prev').addEventListener('click',()=>this.paginate('previous',1));this.querySelector('.next').addEventListener('click',()=>this.paginate('next',1));this.querySelector('ol').addEventListener('click',(e)=>{if(e.target.classList.contains('navigate')){let sequenceIndex=e.target.dataset.sequenceIndex;this.navigateToSequence(sequenceIndex);}});for(let select of this.querySelectorAll('select.assess')){select.addEventListener('change',(e)=>{let sequenceIndex=e.target.dataset.sequenceIndex;this.togglePredictionResult(sequenceIndex);});}}
renderPlot(){this.generateDataSlice();this.generateSeizureZones();let{sliceStart,sliceEnd,eegSlice,seizureZones}=this.graph;let plotted=[];let sampleIndex=sliceStart*500;for(let i=0;i<eegSlice.length;i++){plotted.push([sampleIndex+i,eegSlice[i]]);}
requestAnimationFrame(()=>{this.graph.rendering=new Dygraph(this.querySelector("#graph"),plotted,{labels:['T','Voltage'],color:'rgb(20, 62, 77)',underlayCallback:this.drawSeizureZones.bind(this)});});}
renderSummaryList(){let{summary,sliceStep}=this.graph;let seizureList='';for(let i=0;i<summary.length;i++){let seizure=summary[i];seizureList+=`
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
      </li>`;}
const summaryList=this.querySelector('#summary ol');summaryList.innerHTML=seizureList;}
renderStatsList(){let{summary}=this.graph;let{output}=this.appState.data.seizureData;let updatedSummary=[...summary];for(let seizure of updatedSummary){seizure.rejected=!output[seizure.sequenceIndex];}
let totalConfirmedSeizures=0;let totalRejectedSeizures=0;for(let seizure of updatedSummary){seizure.rejected?totalRejectedSeizures+=1:totalConfirmedSeizures+=1;}
let totalSeizureTime=0;for(let seizure of summary){if(seizure.rejected){continue;}
totalSeizureTime+=seizure.durationInSeconds;}
let averageSeizureTime=(totalSeizureTime/totalConfirmedSeizures).toFixed(2);if(isNaN(averageSeizureTime)){averageSeizureTime=0.00;}
let falsePositivesPercentage=(totalRejectedSeizures/updatedSummary.length)*100;falsePositivesPercentage=falsePositivesPercentage.toFixed(2);if(isNaN(falsePositivesPercentage)){falsePositivesPercentage=0.00;}
let confirmedPositives=(totalConfirmedSeizures/updatedSummary.length)*100;confirmedPositives=confirmedPositives.toFixed(2);if(isNaN(confirmedPositives)){confirmedPositives=0.00;}
const stats=this.querySelector('#summary ul');stats.innerHTML=`
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
    `;}
generateDataSlice(){let{sliceStart,sliceEnd}=this.graph;let{input,output}=this.appState.data.seizureData;this.graph.eegSlice=input.slice(sliceStart,sliceEnd).flat();this.graph.seizureSlice=output.slice(sliceStart,sliceEnd);}
generateSeizureZones(){let{seizureSlice,sliceStart}=this.graph;let sampleIndex=sliceStart*500;let seizureZones=[];for(let i=0;i<seizureSlice.length;i++){if(seizureSlice[i]!==true){continue;}
seizureZones.push({start:sampleIndex+(i*500),end:sampleIndex+(i*500+500)});}
this.graph.seizureZones=seizureZones;}
generateSummary(){let{output}=this.appState.data.seizureData;let summary=[];let lastSequenceWasSeizure=false;for(let i=0;i<output.length;i++){if(output[i]!==true){lastSequenceWasSeizure=false;continue;}
if(output[i]===true&&lastSequenceWasSeizure===true){continue;}
if(output[i]===false&&lastSequenceWasSeizure===true){lastSequenceWasSeizure=false;continue;}
summary.push({sequenceIndex:i,sampleIndex:i*500,durationInSequences:0,durationInSeconds:0});lastSequenceWasSeizure=true;}
for(let seizure of summary){let streak=0;let sequenceIndex=seizure.sequenceIndex;while(true){if(output[sequenceIndex]==true){streak+=1;sequenceIndex+=1;}
else{break;}}
seizure.durationInSequences=streak;seizure.durationInSeconds=streak*5;}
this.graph.summary=summary;}
drawSeizureZones(canvas,area,graph){for(let seizureZone of this.graph.seizureZones){let{start,end}=seizureZone;let bottomLeft=graph.toDomCoords(start,-20);let topRight=graph.toDomCoords(end,+20);let left=bottomLeft[0];let right=topRight[0];canvas.fillStyle="rgb(158, 255, 239)";canvas.fillRect(left,area.y,right-left,area.h);}}
paginate(direction,customSliceStep){let{sliceStart,sliceEnd,sliceStep}=this.graph;let{input,output}=this.appState.data.seizureData;let step=sliceStep;if(customSliceStep&&!isNaN(customSliceStep)){step=customSliceStep;}
if(direction!=='previous'){sliceStart=sliceStart+step;sliceEnd=sliceEnd+step;}
else{sliceStart=sliceStart-step;sliceEnd=sliceEnd-step;}
if(input.slice(sliceStart,sliceEnd).length<1){return;}
this.graph.sliceStart=sliceStart;this.graph.sliceEnd=sliceEnd;this.renderPlot();}
navigateToSequence(sequenceIndex){let{sliceStep}=this.graph;this.graph.sliceStart=Math.round(sequenceIndex/10)*10;this.graph.sliceEnd=this.graph.sliceStart+this.graph.sliceStep;this.renderPlot();}
togglePredictionResult(sequenceIndex){if(this.appState.data.seizureData.output[sequenceIndex]===undefined){return;}
let sequenceIndexes=[];for(let i=sequenceIndex;i<this.appState.data.seizureData.outputFrozen.length;i++){if(this.appState.data.seizureData.outputFrozen[i]===true){sequenceIndexes.push(i);}
else{break;}}
for(let sequenceIndex of sequenceIndexes){this.appState.data.seizureData.output[sequenceIndex]=!this.appState.data.seizureData.output[sequenceIndex];}
this.renderPlot();this.renderStatsList();}}
customElements.define('seizure-detection-chart',SeizureDetectionChart);
class InfoFooter extends HTMLElement{constructor(){super();}
connectedCallback(){this.renderInnerHTML();}
renderInnerHTML(){this.innerHTML=`
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
    `;}}
customElements.define('info-footer',InfoFooter);
class GlobalModal extends HTMLElement{constructor(){super();this.appRoot=document.querySelector('app-root');this.appState=this.appRoot.state;this.conditionalReRender=this.conditionalReRender.bind(this);}
connectedCallback(){this.renderInnerHTML();this.appRoot.addEventListener('StateManagerUpdate',this.conditionalReRender);}
disconnectedCallback(){this.appRoot.removeEventListener('StateManagerUpdate',this.conditionalReRender)}
renderInnerHTML(){let{isOpen,message,onClose,onCloseCaption}=this.appState.data.modal;if(!onClose){onClose=this.defaultOnClose;}
if(!isOpen){this.innerHTML='';this.setAttribute('aria-hidden','true');this.removeAttribute('role');return;}
else{this.removeAttribute('aria-hidden');this.setAttribute('role','dialog');}
this.innerHTML=`
    <div>
      <p>${message}</p>
      <button>${onCloseCaption}</button>
    </div>
    `;this.querySelector('button').addEventListener('click',onClose.bind(this));}
conditionalReRender(event){if(!event.detail){return;}
if(event.detail&&event.detail.stateManagerName==='AppRoot'&&event.detail.updatedPropertyPath==='data.modal'){this.renderInnerHTML();}}
defaultOnClose(){this.appState.data.modal.isOpen=false;}}
customElements.define('global-modal',GlobalModal);
