  /**Define Objects**/
function Mapper_EventManager() {
    this.initialize(...arguments);
}

Mapper_EventManager.prototype.initialize = function () {
    this.mapId = null;
    
};

function Mapper_DataManager() {
    this.initialize(...arguments);
}

Mapper_DataManager.prototype.initialize = function () {
    this.dataSets = new Array();
    this._errors = new Array();
    this._loading = 0;
    this._loaded = 0;
    this.worldSets = new Array();
    this.isMapsReady = false;
    this.csv = "map,sIndex,renDistance,xAxis,yAxis,centerMapX,centerMapY,mapWidth,AdjsIndex,relXAxis,relYAxis,renWW,renWH,mapHeight,Round,Rows,Columns,mapH,mapW,Layers,finalIndex\n";
    this._posDiv = null;
    this.loadMaps();
};

/**load all maps**/
Mapper_DataManager.prototype.loadMaps = function () {
    this._loading = $dataMapInfos.length;
    $dataMapInfos.forEach(map => {
        if (map !== null && map.id !== "0") {
            let id = parseInt(map.id).toString();
            let filename = "Map%1.json".format(id.padZero(3));
            let name = map.name;
            this.loadDataFile(name, filename, id);
        } else {
            this._loading--;
        }
    });
    this.waitForMaps();
};

Mapper_DataManager.prototype.loadDataFile = function (name, src, id) {
    let xhr = new XMLHttpRequest();
    let url = "data/" + src;
    xhr.open("GET", url);
    xhr.overrideMimeType("application/json");
    xhr.onload = () => this.onXhrLoad(xhr, name, src, url, id);
    xhr.onerror = () => this.onXhrError(name, src, url);
    xhr.send();
};

Mapper_DataManager.prototype.onXhrLoad = function (xhr, name, src, url, id) {
    if (xhr.status < 400) {
        this.onLoad(JSON.parse(xhr.responseText), id);
    } else {
        this.onXhrError(name, src, url);
    }
};

Mapper_DataManager.prototype.onXhrError = function (name, src, url) {
    let error = { name: name, src: src, url: url };
    this._loaded++; //go ahead and add 1 even if an error occurred.
    this._errors.push(error);
};

Mapper_DataManager.prototype.onLoad = function (object, id) {
    this._loaded++;
    object.id = id;
    this.createWorldSets(object);
};

Mapper_DataManager.prototype.createWorldSets = function (object) {
    //split note by line
    let result = object.note.split(/\r?\n/);
    //if note line is for world position information then 
    //create a world entry and store world specific maps 
    //in the world object
    result.forEach(str => {
        if (str.substring(0, 8) == 'worldpos') {
            let arr = str.substring(9).split(" ");

            /**Set the world attribute in each map**/
            object._world = arr[0];
            object._worldX = arr[1];
            object._worldY = arr[2];
        }
    });

    let world = this.getWorld(object._world);

    //get world boundaries.
    if (world.xMin > object._worldX || world.xMin == null) {
        world.xMin = object._worldX
    }
    if (world.yMin > object._worldY || world.yMin == null) {
        world.yMin = object._worldY;
    }
    if (world.xMax < object._worldX || world.xMax == null) {
        world.xMax = object._worldX;
    }
    if (world.yMax < object._worldY || world.yMax == null) {
        world.yMax = object._worldY;
    }
    if (!world.mapSets.hasOwnProperty(object._worldX)) {
        world.mapSets[object._worldX] = new Array();
    }
    world.mapSets[object._worldX][object._worldY] = object;
    this.worldSets[world.name] = world;
};

Mapper_DataManager.prototype.getWorld = function (name) {
    if (!this.worldSets.hasOwnProperty(name)) {
        this.worldSets[name] = { name: name, xMin: null, xMax: null, yMin: null, yMax: null, mapSets: new Array() }
    }
    return this.worldSets[name];
}

Mapper_DataManager.prototype.waitForMaps = function () {
    if (this._loaded === this._loading) {
        this.build();
    }
    else {
        setTimeout(function () { this.waitForMaps() }.bind(this), 2500);
    }
};

Mapper_DataManager.prototype.wait = function (b,e) {
    if (b) {
        e();
    }
    else {
        setTimeout(function () { this.wait(b,e) }.bind(this), 2500);
    }
};

Mapper_DataManager.prototype.build = function () {
    //Loop through all worlds
    Object.values(this.worldSets).forEach(world => {
        //Loop through all maps
        for (let i = world.xMin; i <= world.xMax; i++) {
            for (let j = world.yMin; j <= world.yMax; j++) {
                map = world.mapSets[i][j];
                if (map !== undefined) {
                    this.createSector(map, world);
                }
            }
        }

    });
    this.isMapsReady = true;
};

Mapper_DataManager.prototype.createSector = function (map, world) {
    let mapClone = JSON.parse(JSON.stringify(map));//I need the original data in place for the other maps.
    let xMin = parseInt(map._worldX) - 1;
    let yMin = parseInt(map._worldY) - 1;
    let xMax = parseInt(map._worldX) + 1;
    let yMax = parseInt(map._worldY) + 1;
    let w = map.width;
    let h = map.height;
    let centerMapX = map._worldX;
    let centerMapY	= map._worldY;
    let renDistance = 1; 
    let renWW	 =2*renDistance+1;
    let mapWidth	 = w*renWW;
    let renWH	 = renWW;
    let mapHeight	 = h*renWH;
    let mapW = mapWidth/renWW;
    let mapH = mapHeight/renWH;
    let fill = new Array(w * 3 * h * 3 * 6).fill(0);//fill for blank sectors
    let e = new Array();

    for (let y = yMax; y >= yMin; y--) {//loop top to bottom sectors
        for (let x = xMin; x <= xMax; x++) {//loop left to right sectors
            for (let k = 0; k < w * h *6; k++) {//loop through the data array.
                if (x in world.mapSets) { //verify the map exists on the x axis.
                    if (y in world.mapSets[x]) { //verify the map exists on the y axis.
                        let neighborMap = world.mapSets[x][y];
                        let sIndex = k;
                        let xAxis = x; 
                        let yAxis = y; 
                        let Layers	 = (sIndex - (sIndex % (mapW*mapH)))/(mapW*mapH);
                        let AdjsIndex	 = (sIndex-(Layers*mapH*mapW));
                        let relXAxis	 = xAxis-centerMapX;
                        let relYAxis	 = yAxis-centerMapY;
                        let Round	 =(AdjsIndex - (AdjsIndex % (mapWidth/renWW)))/(mapWidth/renWW)
                        let Rows	 = relXAxis+1;
                        let Columns	 =-relYAxis+1;
                        let finalIndex =AdjsIndex + ((renWW-1)*(mapWidth/renWW)*Round) + (mapWidth/renWW)*Rows +(mapWidth*mapHeight/renWH)*Columns + (mapHeight*mapWidth)*Layers;
                        this.csv += map.id+","+sIndex+","+renDistance+","+xAxis+","+yAxis+","+centerMapX+","+centerMapY+","+mapWidth+","+AdjsIndex+","+relXAxis+","+relYAxis+","+renWW+","+renWH+","+mapHeight+","+Round+","+Rows+","+Columns+","+mapH+","+mapW+","+Layers+","+finalIndex+"\n";
                        fill[finalIndex] = neighborMap.data[k];
                        
                    }
                }
            }
        }
    }
    mapClone.data = fill;

    //Primay Map event shifting
    mapClone.events.forEach(e => {
        if(e !== null){
            e.x += mapW;
            e.y += mapH;
        }
    });
    
    //Offset start location
    if (map.id == $dataSystem.startMapId){
        $dataSystem.startX += mapW;
        $dataSystem.startY += mapH;
        $gamePlayer.reserveTransfer(map.id, $dataSystem.startX, $dataSystem.startY, 0, 0);
    }

    mapClone.width = mapWidth;
    mapClone.height = mapHeight;
    let fs = require("fs");
    let id = parseInt(map.id).toString();
    let filename = "Map%1".format(id.padZero(3));
    fs.writeFileSync("data/" + filename + "_combined.json", JSON.stringify(mapClone));
};

waitForMap = function () {
    if (!!$dataMapInfos) {
        Mapper.DataManager = new Mapper_DataManager();
    }
    else {
        setTimeout(waitForMap, 2500);
    }
};
//=============================================================================
// Mapper.js
//=============================================================================
var Imported = Imported || {};
Imported.Mapper = "1.0.0";
var Mapper = Mapper || {};
/*:
* @plugindesc Mapper is a plugin that combines maps together and points to the new maps when the game is ran.// Describe your plugin
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
    waitForMap();

    var _updateFrameCount = SceneManager.updateFrameCount;                   // <-- Reference
    SceneManager.updateFrameCount = function() {
        if(Graphics.frameCount % 10 == 0){ 
            if($gamePlayer){
            //Mapper._posDiv.textContent = "("+$gamePlayer.x.padZero(3)+","+$gamePlayer.y.padZero(3)+")";
            
            }
        }
        _updateFrameCount();  
    };
    Mapper.positionListener = function(){


    }
})();

PluginManager.registerCommand("Mapper", "jms", args => {
    console.log($gamePlayer.x);
});

/**Override loadMapData, so that the game reads the altered maps instead of the originals**/
DataManager.loadMapData = function (mapId) {
    this.waitForComplete(mapId);
};

//Need to wait for map creation to complete before letting the game engine load the maps.
DataManager.waitForComplete = function (mapId) {
    if (Mapper.DataManager !== undefined && Mapper.DataManager.isMapsReady) {
        console.log("Mapper: Maps have been merged.");
        //console.log(Mapper.DataManager.csv);
        if (mapId > 0) {
            const filename = "Map%1_combined.json".format(mapId.padZero(3));
            this.loadDataFile("$dataMap", filename);
        } else {
            this.makeEmptyMap();
        }
    }
    else {
        setTimeout(function () { this.waitForComplete(mapId) }.bind(this), 2500);
    }
};

var _FPSCounter = Graphics.FPSCounter; 
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

    this._poslabelDiv = document.createElement("div");
    this._posDiv = document.createElement("div");
    this._mapLabelDiv = document.createElement("div");
    this._mapDiv = document.createElement("div");
    this._poslabelDiv.id = "posCounterLabel";
    this._posDiv.id = "fpsCounterPos";
    this._mapLabelDiv.id = "mapLabel";
    this._mapDiv.id = "map";
    this._boxDiv.appendChild(this._poslabelDiv);
    this._boxDiv.appendChild(this._posDiv);
    this._boxDiv.appendChild(this._mapDiv);
    this._boxDiv.appendChild(this._mapLabelDiv);
    this._posDiv.textContent = "(###,###)";
    this._poslabelDiv.textContent = "Pos";
    this._mapLabelDiv.textContent = "Map";

    Mapper._posDiv = this._posDiv;

    const addCSS = css => document.head.appendChild(document.createElement("style")).innerHTML=css;
    addCSS("#fpsCounterBox{ height: 120px; width: 120px; }");
    addCSS("#posCounterLabel {position: absolute; \
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

    addCSS("#fpsCounterPos {\
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
    addCSS("#mapLabel {position: absolute; \
        top: 35px; \
        left: 0px; \
        padding: 5px 10px;\
        height: 30px;\
        line-height: 32px;\
        font-size: 12px;\
        font-family: rmmz-numberfont, sans-serif;\
        color: #fff;\
        text-align: left;\
    }");

    addCSS("#map {\
        position: absolute; \
        top: 35px; \
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

Graphics.FPSCounter.prototype._update = function() {
    const count = this._showFps ? this.fps : this.duration;
    this._labelDiv.textContent = this._showFps ? "FPS" : "ms";
    this._numberDiv.textContent = count.toFixed(0);
    if($dataMap){
        this._mapDiv.textContent = $dataMap.displayName;
    }
};

var realConsoleLog = console.log;
console.log = function () {
    var message = [].join.call(arguments, " ");
    // Display the message somewhere... (jQuery example)
    Mapper._posDiv.textContent = message;
    realConsoleLog.apply(console, arguments);
};