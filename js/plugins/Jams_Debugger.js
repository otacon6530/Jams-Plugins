function Jams_DebugManager() {
    this.initialize(...arguments);
}

Jams_DebugManager.prototype.initialize = function () {
    this.metrics = new Array();
    this._boxDiv = null;
    this.x = 0;
    this.y = 0;
    this.wait(this.checkDiv,this.addMetric)
    //this.addMetric("Test","Hi");
};

Jams_DebugManager.prototype.checkDiv = function () {
    if (this._boxDiv !== null) {
        return true;
    }
    return false;
};

Jams_DebugManager.prototype.wait = function (b,e) {
    if (b) {
        e();
    }
    else {
        setTimeout(function () { this.wait(b,e) }.bind(this), 2500);
    }
};

Jams_DebugManager.prototype.addMetric = function () {
    let label = "Test";
    let value = "value";
    const addCSS = css => document.head.appendChild(document.createElement("style")).innerHTML=css;
    let labelDiv = document.createElement("div");
    let valueDiv = document.createElement("div");
console.log("hi");
    //labelDiv.id = "JAMS_DebuggerLabel"+"1";
    //valueDiv.id = "JAMS_DebuggerValue"+"1";
    //this._boxDiv.appendChild(labelDiv);
    //this._boxDiv.appendChild(valueDiv);
    //this.labelDiv.textContent = label;
    //this.valueDiv.textContent = value();
    //a = [];
    //a.label = label;
    //a.value = value;
    //a.labelDiv = labelDiv;
    //a.valueDiv = valueDiv;
    //this.metrics.push(a);

    addCSS("#"+labelDiv.id+" {position: absolute; \
        top: 75px; \
        left: 0px; \
        padding: 5px 10px;\
        height: 30px;\
        line-height: 32px;\
        font-size: 12px;\
        font-family: rmmz-numberfont, sans-serif;\
        color: #fff;\
        text-align: left;\
    }");

    addCSS("#"+valueDiv.id+"{\
        position: absolute; \
        top: 75px; \
        right: 0px;\
        padding: 5px 10px;\
        height: 30px;\
        line-height: 30px;\
        font-size: 14px;\
        font-family: rmmz-numberfont, monospace;\
        color: #fff;\
        text-align: left;\
    }");
};

  //=============================================================================
// Jams.Debugger.js
//=============================================================================
var Imported = Imported || {};
Imported.Jams_Debugger = "1.0.0";
var Jams_Debugger = Jams_Debugger || {};
/*:
* @plugindesc James_Debugger is a plugin that combines maps together and points to the new maps when the game is ran.// Describe your plugin
* @author Michael Stephens       // your name goes here *
* @param command      //name of a parameter you want the user to edit
* @desc command parameters       //short description of the parameter
* @default na    // set default value for the parameter
 * @help
 *
 * Plugin Command:
 * jms hello  # Say hello world in the console to test the plugin.
 * @command jms
 * @text jms
 * @desc Nothing at this time.
*/

(function () {
    Jams_Debugger.Manager = new Jams_DebugManager();

    var _updateFrameCount = SceneManager.updateFrameCount;
    SceneManager.updateFrameCount = function() {
        if(Graphics.frameCount % 10 == 0){ 
            if($gamePlayer && Jams_Debugger.Manager._posDiv !== null){
            //Jams_Debugger.Manager._posDiv.textContent = "("+$gamePlayer.x.padZero(3)+","+$gamePlayer.y.padZero(3)+")";
            
            }
        }
        _updateFrameCount();  
    };
})();

DataManager.loadMapData = function (mapId) {
    this.waitForComplete(mapId);
};


Graphics.FPSCounter.prototype._update = function() {
    const count = this._showFps ? this.fps : this.duration;
    this._labelDiv.textContent = this._showFps ? "FPS" : "ms";
    this._numberDiv.textContent = count.toFixed(0);
    if($dataMap){
        //this._mapDiv.textContent = $dataMap.displayName;
    }
};

Graphics.FPSCounter.prototype._createElements = function() {
    this._boxDiv = document.createElement("div");
    this._labelDiv = document.createElement("div");
    this._numberDiv = document.createElement("div");
    this._boxDiv.id = "fpsCounterBox";
    this._labelDiv.id = "fpsCounterLabel";
    this._numberDiv.id = "fpsCounterNumber";
    this._boxDiv.style.display = "none";
    this._boxDiv.appendChild(this._labelDiv);
    this._boxDiv.appendChild(this._numberDiv);
    document.body.appendChild(this._boxDiv);
    Jams_Debugger.Manager._boxDiv = this._boxDiv;
};

var realConsoleLog = console.log;
console.log = function () {
    var message = [].join.call(arguments, " ");
    // Display the message somewhere... (jQuery example)
    if(Jams_Debugger.Manager._posDiv !== null){
    //Jams_Debugger.Manager._posDiv.textContent = message;
    }   
    realConsoleLog.apply(console, arguments);
};