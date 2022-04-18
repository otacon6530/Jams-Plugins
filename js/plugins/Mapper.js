  /**Define Objects**/
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
        }
    });
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
    const mapClone = JSON.parse(JSON.stringify(map));//I need the original data in place for the other maps.
    let xMin = parseInt(mapClone._worldX) - 1;
    let yMin = parseInt(mapClone._worldY) - 1;
    let xMax = parseInt(mapClone._worldX) + 1;
    let yMax = parseInt(mapClone._worldY) + 1;
    let w = mapClone.width;
    let h = mapClone.height;
    let fill = new Array(w * 3 * h * 3 * 6).fill(0);//fill for blank sectors
    let i = 0;
    for (let y = yMax; y >= yMin; y--) {//loop top to bottom sectors
        for (let x = xMin; x <= xMax; x++) {//loop left to right sectors
            for (let k = 0; k < w * h * 6; k++) {//loop through the data array.
                if (x in world.mapSets) { //verify the map exists on the x axis.
                    if (y in world.mapSets[x]) { //verify the map exists on the y axis.
                        let round = Math.floor(k / w); //Divide values by the width to know which map to hit.
                        let xAxis = x - xMax + 1;//Get relational distance of x.
                        let yAxis = y - yMax + 1;//Get relational distance of y.
                        let relYMin = yMin - yMax + 1;//Get relational y minimum.
                        let relYMax = yMax - yMin - 1;//Get relational y maximum.
                        let mapRound = ((k+1) - (k+1) % (w * h))/(w * h); //Divide values by the width to know which map to hit.
                        let fillPos = k /*- (mapRound * 81)*/ + w * (xAxis + 1) + (round * 2 * (relYMax - relYMin + 1)) + ((relYMax - yAxis) * w * h * (relYMax - relYMin + 1));
                        let LayerRound =  ((fillPos+1) - (fillPos+1) % 81)/81; //Divide values by the width to know which map to hit.
                        let f = fillPos;// + (LayerRound*81);
                        console.log("%s %s id %s xMin %s xMax %s yMin %s yMax %s Position %s Round %s, xAxis %s, yAxis %s, relYMin %s, relYMax %s, fillpos %s",mapRound,LayerRound,map.id, xMin, xMax, yMin, yMax, k, round, xAxis, yAxis, relYMin, relYMax, fillPos);
                        fill[f] = world.mapSets[x][y].data[k];
                    }
                }
            }
        }
    }
    mapClone.data = fill;
    mapClone.width = 9;
    mapClone.height = 9;
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
})();

PluginManager.registerCommand("MyPlugin", "jms", args => {
    //todo
});



/**Override loadMapData, so that the game reads the altered maps instead of the originals**/
DataManager.loadMapData = function (mapId) {
    this.waitForComplete(mapId);
};

//Need to wait for map creation to complete before letting the game engine load the maps.
DataManager.waitForComplete = function (mapId) {
    if (Mapper.DataManager !== undefined && Mapper.DataManager.isMapsReady) {
        console.log("Mapper: Maps have been merged.");
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




