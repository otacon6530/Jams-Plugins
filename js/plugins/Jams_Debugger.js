/**
 * @description Standard structure for the event bus and subscribers to use.
 * @param {string} name the name of the event.
 */
function Jams_Event() {
    this.initialize(...arguments);
};

Jams_Event.prototype.initialize = function(name) {
    this.name = name;
    this.debugMsg = "";
};

/**
 * @description publishes the event when the new attributes values don't match the current attribute values.
 * @param {string} name the name of the event.
 */
Jams_Event.prototype.update = function(obj) {

    //only pusblish if different
    let isDiff = false;
    Object.keys(obj).forEach(function(key) {
        if(this[key] !== obj[key]){
            isDiff = true;
            this[key] = obj[key];
        }
    }.bind(this));

    if(isDiff){
        Jams.EventBus.publish(this.name, this);
    }
};

/**
 * @description Returns the x and y position of the player in the following format (xxx,yyy).
 * @param {string} name the name of the event.
 */
 Jams_Event.prototype.toString = function() {
    return this.debugMsg;
};

/**
 * @description the Player position event with a unique toString value.
 * @param {string} name the name of the event.
 */
function Jams_PlayerPosEvent() {
    this.initialize(...arguments);
};

Jams_PlayerPosEvent.prototype = Object.create(Jams_Event.prototype);
Jams_PlayerPosEvent.prototype.constructor = Jams_Event;
Jams_PlayerPosEvent.prototype.initialize = function(name) {
    Jams_Event.prototype.initialize.call(this, name);
    this.x = 0;
    this.y = 0;
};

/**
 * @description Returns the x and y position of the player in the following format (xxx,yyy).
 * @param {string} name the name of the event.
 */
Jams_PlayerPosEvent.prototype.toString = function() {
    return this.x !== null ? "("+this.x.padZero(3)+","+this.y.padZero(3)+")" : "(xxx,yyy)";
};

/**
 * @description An event bus
 */
function Jams_EventBus() {
    this.initialize(...arguments);
};

Jams_EventBus.prototype.initialize = function() {
    this.subscriptions = {};
    this.generateID = this.eventIDGenerator();
};

/**
 * @description Adds an event to the event bus.
 * @param {string} eventType name of the event
 * @param {function} callback call back function when event is triggered
 * @Assumption If an event doesn't exist then it is registered as a blank object.
 */
Jams_EventBus.prototype.subscribe = function(eventType, callback) {
    const id = this.generateID.next().value;

    if (!this.subscriptions[eventType])
        this.subscriptions[eventType] = {}

    this.subscriptions[eventType][id] = callback
    return {
        unsubscribe: () => {
            delete this.subscriptions[eventType][id]
            if (Object.keys(this.subscriptions[eventType]).length === 0)
                delete this.subscriptions[eventType]
        }
    }
};

/**
* @description triggers an event 
 * @param {string} eventType name of the event
 * @param {function} arg event to pass to the subscribers
*/
Jams_EventBus.prototype.publish = function(eventType, arg) {
    if (!this.subscriptions[eventType])
        return
    Object.keys(this.subscriptions[eventType])
        .forEach(id => this.subscriptions[eventType][id](arg))
};

/**
* @description create an auto incrementing identity
* @yields {number} the identity
*/
Jams_EventBus.prototype.eventIDGenerator = function* () {
    var id = 0;
    while(true){
        yield id++;
    } 
};

/**
* @description Adds metrics to the FPS window accessed by pressing F2 during gameplay.
*/
function Jams_FPSManager() {
    this.initialize(...arguments);
};

Jams_FPSManager.prototype.initialize = function() { 
    this.metrics = new Array();
    this._boxDiv = null;
    this.x = 0;
    this.y = 0;
    this.par = this.getPluginParameters();
    this.strArr = new Array();
    this.createStringArray();

    //change the fpsCounterBox css
    const addCSS = css => document.head.appendChild(document.createElement("style")).innerHTML = css;
    addCSS(this.strArr["css"]);

    this.addMetrics();
};

/**
* @description Check to see if _boxDiv has been set.
*/
Jams_FPSManager.prototype.checkDiv = function() {
    if (this._boxDiv !== null) {
        return true;
    }
    return false;
};

/**
* @description generic wait function
*/
Jams_FPSManager.prototype.wait = function(b, e) {
    const checkfunc = b.bind(this);
    if (checkfunc()) {
        const func = e.bind(this);
        func();
    } else {
        setTimeout(function() {
            this.wait(b, e)
        }.bind(this), 2500);
    }
};

/**
* @description update the value of the metric and change pages if needed.
* @param {object} metric the metric object 
*/
Jams_FPSManager.prototype.updateMetric = function(object) {
    let metric = this.metrics[object.name];
    metric.valueDiv.textContent = object.toString();
    Object.keys(this.metrics).forEach(key => {
        if (Graphics._fpsCounter._showFps === this.metrics[key].page) {
            this.metrics[key].labelDiv.hidden = false;
            this.metrics[key].valueDiv.hidden = false;
            this.metrics[key].divider.hidden = false;
        } else {
            this.metrics[key].labelDiv.hidden = true;
            this.metrics[key].valueDiv.hidden = true;
            this.metrics[key].divider.hidden = true;
        }
    });
};

/**
* @description Get the plugin parameters
*/
Jams_FPSManager.prototype.getPluginParameters = function() {
    var a = document.currentScript || (function() {
        var b = document.getElementsByTagName('script');
        return b[b.length - 1];
    })();
    return PluginManager.parameters(a.src.substring((a.src.lastIndexOf('/') + 1), a.src.indexOf('.js')));
};

Jams_FPSManager.prototype.addMetric = function(label, subscription, page = 0) {
    if (this.checkDiv()) {
        this.createMetric(label, subscription, page);
    } else {
        setTimeout(function() {
            this.addMetric(label, subscription, page);
        }.bind(this), 2500);
    }
};

/**
* @description Create metric objects and add them to the fps div.
*/
Jams_FPSManager.prototype.createMetric = function(label, subscription, page = 0) {
    page = page > 0 ? false : true;

    //general variables
    let id = this.metrics.length;

    //create the label
    let labelDiv = document.createElement("div");
    labelDiv.className = this.strArr["pagePrefix"] + page;
    labelDiv.id = "JAMS_DebuggerLabel" + id;
    this._boxDiv.appendChild(labelDiv);
    labelDiv.textContent = label;

    //create the value
    let valueDiv = document.createElement("div");
    valueDiv.className = this.strArr["pagePrefix"] + page;
    valueDiv.id = "JAMS_DebuggerValue" + id;
    this._boxDiv.appendChild(valueDiv);

    //divider
    let vl = document.createElement("div");
    vl.className = "vl";
    this._boxDiv.appendChild(vl);
   
    this.metrics[subscription] = {
        "label": label,
        "labelDiv": labelDiv,
        "valueDiv": valueDiv,
        "value": "",
        "page": page,
        "divider": vl
    };

    Jams.EventBus.subscribe(
        subscription,
        object => Jams.FPSManager.updateMetric(object)
        );
};

Jams_FPSManager.prototype.addMetrics = function() {
    if(this.par["enablePos"] === "true"){
        this.addMetric("Pos: ","playerPos", parseInt(this.par["posPage"]));
    }
    if(this.par["enableConsolePeek"] === "true"){
        this.addMetric("Console Peek: ","consolePeek", parseInt(this.par["consolePeekPage"]));
    }
};

//=============================================================================
// Hooks
//=============================================================================

//Get FPS div
Graphics.FPSCounter.prototype._jamsCreateElements = Graphics.FPSCounter.prototype._createElements;
Graphics.FPSCounter.prototype._createElements = function() {
    this._jamsCreateElements();
    let vl = document.createElement("div");
    vl.className = "vl";
    this._boxDiv.appendChild(vl);
    Jams.FPSManager._boxDiv = this._boxDiv;
};

//Get player position
var _updateFrameCount = SceneManager.updateFrameCount;
SceneManager.updateFrameCount = function() {   
        if(this._PosEvent == undefined){this._PosEvent = new Jams_PlayerPosEvent("playerPos")};
        this._PosEvent.update ({"x": $gamePlayer?.x, "y": $gamePlayer?.y});
    _updateFrameCount();
};

//hi-jack the console
var realConsoleLog = console.log;
console.log = function() {
    var message = [].join.call(arguments, " ");
    if(this._ConPeekEvent === undefined){this._ConPeekEvent = new Jams_Event("consolePeek")};
        this._ConPeekEvent.update({"debugMsg": message});
    realConsoleLog.apply(console, arguments);
};

//$dataMapInfos has been loaded and one for $DataMap
DataManager._Jams_onXhrLoad = DataManager.onXhrLoad;
DataManager.onXhrLoad = function(xhr, name, src, url) {
    this._Jams_onXhrLoad(xhr, name, src, url);
    if (name === "$dataMapInfos") {
        if(this._$dataMapInfosEvent === undefined){this._$dataMapInfosEvent = new Jams_Event(name)};
        this._$dataMapInfosEvent.update({"debugMsg": name});
    }
    if (name === "$dataMap") {
        if(this._$dataMapEvent === undefined){this._$dataMapEvent = new Jams_Event(name)};
        this._$dataMapEvent.update({"debugMsg": name});
    }
};

//=============================================================================
// Strings - throw strings at the bottom of the code, so I don't have to look at them.
//=============================================================================
Jams_FPSManager.prototype.createStringArray = function() {
    this.strArr["pagePrefix"] = "jams_page";
    this.strArr["css"] = "#fpsCounterLabel {\
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
      }";
};

var Imported = Imported || {};
Imported.Jams = "1.0.0";
var Jams = Jams || {};
Jams.EventBus = Jams.EventBus || new Jams_EventBus();
Jams.FPSManager = Jams.FPSManager || new Jams_FPSManager();
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
 * @default 0
 */