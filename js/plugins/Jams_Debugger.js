function Jams_DebugManager() {
    this.initialize(...arguments);
}

Jams_DebugManager.prototype.initialize = function () {
    this.metrics = new Array();
    this._boxDiv = null;
    this.x = 0;
    this.y = 0;
    this.par = this.getPluginParameters();

    //change the fpsCounterBox css
    const addCSS = css => document.head.appendChild(document.createElement("style")).innerHTML=css;
    addCSS("#fpsCounterLabel {\
        position: relative;\
        top: 0px;\
        left: 0px;\
        padding: 5px 10px;\
        height: 30px;\
        line-height: 32px;\
        font-size: 12px;\
        font-family: rmmz-numberfont, sans-serif;\
        color: #fff;\
        text-align: left;\
    }\
    #fpsCounterNumber {\
        position: relative;\
        top: 0px;\
        right: 0px;\
        padding: 5px 10px;\
        height: 30px;\
        line-height: 30px;\
        font-size: 24px;\
        font-family: rmmz-numberfont, monospace;\
        color: #fff;\
        text-align: right;\
    }\
    #fpsCounterBox {\
        width: max-content;\
        height: auto;\
        position: relative;\
        background: rgba(0,0,0,.5);\
        opacity: 1;\
        margin: 0;\
        padding: 0;\
        overflow: auto;\
    }\
    #fpsCounterBox div {\
        float: left;\
        position: relative;\
        height: 30px;\
        line-height: 32px;\
        font-size: 12px;\
        font-family: rmmz-numberfont, sans-serif;\
        color: #fff;\
        text-align: left;\
        margin: 5px;\
        padding: 0px;\
    }\
    .vl {\
        border-left: 3px solid rgba(169, 169, 169, 0.5);\
      }");
};

//Checkt to see if _boxDiv has been set.
Jams_DebugManager.prototype.checkDiv = function () {
    if (this._boxDiv !== null) {
        return true;
    }
    return false;
};

//Generic wait function
Jams_DebugManager.prototype.wait = function (b,e) {
    const checkfunc = b.bind(this);
    if (checkfunc()) {
        const func = e.bind(this);
        func();
    }
    else {
        setTimeout(function () { this.wait(b,e) }.bind(this), 2500);
    }
};

//Update the value of each metric
Jams_DebugManager.prototype.update = function (b) {
    this.metrics.forEach(element => {
        if(b == element.page){
            element.labelDiv.hidden = false;
            element.valueDiv.hidden = false;
            element.divider.hidden = false;
            element.valueDiv.textContent = element.value.value;

        }else{
            element.labelDiv.hidden = true;
            element.valueDiv.hidden = true;
            element.divider.hidden = true;
        }
    });
};

Jams_DebugManager.prototype.getPluginParameters = function() {
    var a = document.currentScript || (function() {
        var b = document.getElementsByTagName('script');
        return b[b.length - 1];
    })();
    return PluginManager.parameters(a.src.substring((a.src.lastIndexOf('/') + 1), a.src.indexOf('.js')));
}

Jams_DebugManager.prototype.addMetric = function (label, value, page = 0) {
    if (this.checkDiv()) {
        this.createMetric(label, value, page);
    }
    else {
        setTimeout(function () { this.addMetric(label, value, page) }.bind(this), 2500);
    }
};

//Create metric objects and add them to the fps div.
Jams_DebugManager.prototype.createMetric = function (label, value, page = 0) {
    page = page>0 ? false: true; 

    //general variables
    let id = this.metrics.length;

    //create the label
    let labelDiv = document.createElement("div");
    labelDiv.className = "jams_page"+page;
    labelDiv.id = "JAMS_DebuggerLabel"+id;
    this._boxDiv.appendChild(labelDiv);
    labelDiv.textContent = label;
     
    //create the value
    let valueDiv = document.createElement("div");
    valueDiv.className = "jams_page"+page;
    valueDiv.id = "JAMS_DebuggerValue"+id;
    this._boxDiv.appendChild(valueDiv);

    //Divider
    let vl = document.createElement("div");
    vl.className = "jams_page"+page;
    vl.className = "vl";
    this._boxDiv.appendChild(vl);

    //Push to array of objects
    this.metrics.push({"label": label, "labelDiv": labelDiv, "valueDiv": valueDiv, "value": value, "page": page, "divider": vl});
    
    this.update();
};

  //=============================================================================
// Jams.Debugger.js
//=============================================================================
var Imported = Imported || {};
Imported.Jams_Debugger = "1.0.0";
var Jams_Debugger = Jams_Debugger || {};
/*:
* @plugindesc Debugger that adds more metrics to the FPS window when you press f2.
* @author Michael Stephens
* @param enablePos
* @text enablePos
* @default true
*
* @param posPage
* @text posPage
* @default 0
*
* @param enableConsolePeek
* @text enableConsolePeek
* @default true
*
* @param consolePeekPage
* @text consolePeekPage
* @default both
*
*/

(function () {

    Jams_Debugger.Manager = new Jams_DebugManager();
    var _updateFrameCount = SceneManager.updateFrameCount;
    const pos = {value: "(XXX,YYY)"};
    console.log(Jams_Debugger.Manager.par);
    if(Jams_Debugger.Manager.par["enablePos"]=="true"){
        if(Jams_Debugger.Manager.par["posPage"]=="0"){
            Jams_Debugger.Manager.addMetric("Pos: ",pos,0);
        }else if(Jams_Debugger.Manager.par["posPage"]=="1"){
            Jams_Debugger.Manager.addMetric("Pos: ",pos,1);
        }else if(Jams_Debugger.Manager.par["posPage"]=="both"){
            
            Jams_Debugger.Manager.addMetric("Pos: ",pos,0);
            Jams_Debugger.Manager.addMetric("Pos: ",pos,1);
        }
    }
    SceneManager.updateFrameCount = function() {
        if(Graphics.frameCount % 10 == 0 && $gamePlayer){ 
            pos.value = "("+$gamePlayer.x.padZero(3)+","+$gamePlayer.y.padZero(3)+")";
        }
        _updateFrameCount();  
    };

    var realConsoleLog = console.log;
    let consolePeek = {value: " "};
    
    console.log(Jams_Debugger.Manager.par);
    console.log = function () {
        var message = [].join.call(arguments, " ");
        consolePeek = {value: message};
        if(Jams_Debugger.Manager.par['enableConsolePeek'] == "true"){
            if(Jams_Debugger.Manager.par["consolePeekPage"] == "0"){
                Jams_Debugger.Manager.addMetric("Console Peek: ",consolePeek,0);
            }else if(Jams_Debugger.Manager.par["consolePeekPage"] == "1"){
                Jams_Debugger.Manager.addMetric("Console Peek: ",consolePeek,1);
            }else if(Jams_Debugger.Manager.par["consolePeekPage"] == "both"){
                Jams_Debugger.Manager.addMetric("Console Peek: ",consolePeek,0);
                Jams_Debugger.Manager.addMetric("Console Peek: ",consolePeek,1);
            }
        }   
        realConsoleLog.apply(console, arguments);
    };
})();

    Graphics.FPSCounter.prototype._jamsCreateElements = Graphics.FPSCounter.prototype._createElements;
    Graphics.FPSCounter.prototype._createElements = function() {
        this._jamsCreateElements();
        let vl = document.createElement("div");
        vl.className = "vl";
        this._boxDiv.appendChild(vl);
        Jams_Debugger.Manager._boxDiv = this._boxDiv;
    };

    Graphics.FPSCounter.prototype._update = function() {
        const count = this._showFps ? this.fps : this.duration;
        this._labelDiv.textContent = this._showFps ? "FPS" : "ms";
        this._numberDiv.textContent = count.toFixed(0);
        if($dataMap){
            Jams_Debugger.Manager.update(this._showFps);
        }
    };