function Jams_Mapper() {
    this.initialize(...arguments);
}

Jams_Mapper.prototype.initialize = function() {
    this._errors = new Array();
    this._loading = 0;
    this._loaded = 0;
    this.worldSets = new Array();
    this.isMapsReady = false;
    this.centerPOS = 0;
    Jams.EventBus.subscribe(
        "$dataMapInfos",
        object => this.loadMaps()
    );
    Jams.EventBus.subscribe(
        "$dataMap",
        object => this.mapAdj()
    );
    Jams.EventBus.subscribe(
        "mapSection",
        object => this.transferCheck(object)
    );
    Jams.EventBus.subscribe(
        "playerPos",
        object => this.checkMapSection(object)
    );
    this.loadMap = this.createWorldSets;
    this.loadComplete = this.build;
    this.csv = "";
    this.xPos = 0;
    this.yPos = 0;
    this.done = true;
    Jams.FPSManager.addMetric("Map Sect: ","mapSection",0);
};
//
Jams_Mapper.prototype.mapAdj = function() {
    let map = JSON.parse(JSON.stringify($dataMap));
    this.mapOffset(map);
};

/**load all maps**/
Jams_Mapper.prototype.loadMaps = function() {
    this._loading = $dataMapInfos.length;
    $dataMapInfos.forEach(map => {
        if (map !== null && map.id > 0) {
            let id = parseInt(map.id).toString();
            let filename = "Map%1.json".format(id.padZero(3));
            let name = map.name;
            this.loadDataFile(name, filename, id);
        } else {
            this._loading--;
        }
    });
};

Jams_Mapper.prototype.loadDataFile = function(name, src, id) {
    let xhr = new XMLHttpRequest();
    let url = "data/" + src;
    xhr.open("GET", url);
    xhr.overrideMimeType("application/json");
    xhr.onload = () => this.onXhrLoad(xhr, name, src, url, id);
    xhr.onerror = () => this.onXhrError(name, src, url);
    xhr.send();
};

Jams_Mapper.prototype.onXhrLoad = function(xhr, name, src, url, id) {
    if (xhr.status < 400) {
        this.onLoad(JSON.parse(xhr.responseText), id);
    } else {
        this.onXhrError(name, src, url);
    }
};

Jams_Mapper.prototype.onXhrError = function(name, src, url) {
    let error = {
        name: name,
        src: src,
        url: url
    };
    this._loaded++; //go ahead and add 1 even if an error occurred.
    if (this._loaded === this._loading) {
        this.loadComplete();
    }

    this._errors.push(error);
};

Jams_Mapper.prototype.onLoad = function(object, id) {
    object.id = id;
    this.loadMap(object);
    this._loaded++;
    if (this._loaded === this._loading) {
        this.loadComplete();
    }
};

Jams_Mapper.prototype.createWorldSets = function(object) {
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
        world.mapSets[object._worldX] = {};
    }
    world.mapSets[object._worldX][object._worldY] = object;
    this.worldSets[world.name] = world;
};

Jams_Mapper.prototype.getWorld = function(name) {
    if (!this.worldSets.hasOwnProperty(name)) {
        this.worldSets[name] = {
            name: name,
            xMin: null,
            xMax: null,
            yMin: null,
            yMax: null,
            mapSets: new Array()
        }
    }
    return this.worldSets[name];
}

Jams_Mapper.prototype.build = function() {
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
    
    this.loadMap = this.mapOffset;
    this.loadComplete = this.loadComplete;

    Graphics._switchFPSCounter();
};


Jams_Mapper.prototype.getMap = function(object) {
    
};

Jams_Mapper.prototype.loadComplete = function() {
   
    
};

Jams_Mapper.prototype.createSector = function(map, world) {
    let mapClone = JSON.parse(JSON.stringify(map)); //I need the original data in place for the other maps.
    let xMin = parseInt(map._worldX) - 1;
    let yMin = parseInt(map._worldY) - 1;
    let xMax = parseInt(map._worldX) + 1;
    let yMax = parseInt(map._worldY) + 1;
    let centerMapX = map._worldX;
    let centerMapY = map._worldY;
    mapClone.scrollType = 3;
    mapClone._xMin;
    mapClone._yMin;
    mapClone._xMax;
    mapClone._yMax;
    mapClone.mapSets = {};
    for (let y = yMax; y >= yMin; y--) { //loop top to bottom sectors
        for (let x = xMin; x <= xMax; x++) { //loop left to right sectors
                if (x in world.mapSets) { //verify the map exists on the x axis.
                    if (y in world.mapSets[x]) { //verify the map exists on the y axis.

                        if(mapClone._xMin == null || x<mapClone._xMin){
                            mapClone._xMin = x;
                        }
                        if(mapClone._xMax == null || x>mapClone._xMax){
                            mapClone._xMax = x;
                        }
                        if(mapClone._yMin == null || y<mapClone._yMin){
                            mapClone._yMin = y;
                        }
                        if(mapClone._yMax == null || y>mapClone._yMin){
                            mapClone._yMax = y;
                        }

                        let neighborMap = world.mapSets[x][y];
                        let relXAxis = x - centerMapX;
                        let relYAxis = y - centerMapY;
                        if (!mapClone.mapSets.hasOwnProperty(x)) {
                            mapClone.mapSets[x] = {};
                        }
                        mapClone.mapSets[x][y] = neighborMap;
                        
                        
                        if (relXAxis === -1 && relYAxis === 0) {
                            mapClone.leftMapID = neighborMap.id;
                        }else if (relXAxis === -1 && relYAxis === 1) {
                            mapClone.upperLeftMapID = neighborMap.id;
                        }else if (relXAxis === -1 && relYAxis === -1) {
                            mapClone.bottomLeftMapID = neighborMap.id;
                        } else if (relXAxis === 1 && relYAxis === 0) {
                            mapClone.rightMapID = neighborMap.id;
                        } else if (relXAxis === 1 && relYAxis === 1) {
                            mapClone.upperRightMapID = neighborMap.id;
                        } else if (relXAxis === 1 && relYAxis === -1) {
                            mapClone.bottomRightMapID = neighborMap.id;
                        } else if (relXAxis === 0 && relYAxis === 1) {
                            mapClone.upperMapID = neighborMap.id;
                        } else if (relXAxis === 0 && relYAxis === -1) {
                            mapClone.bottomMapID = neighborMap.id;
                        }
                }
            }
        }
    }

    let fs = require("fs");
    let id = parseInt(map.id).toString();
    let filename = "Map%1".format(id.padZero(3));
    fs.writeFileSync("data/combined/" + filename + ".json", JSON.stringify(mapClone));
};

Jams_Mapper.prototype.transferCheck = function(object) {
    x = this.getRelativeMapPosition(object.x,this.xPos);
    y = this.getRelativeMapPosition(object.y,this.yPos);
    if (this.isMapsReady && $dataMap) {
        if ($dataMap?.rightMapID !== null && x === 1 && y === 0) {
                this.loading++;
                let id = parseInt($dataMap.rightMapID).toString();
                let filename = "combined/" + "Map%1.json".format(id.padZero(3));
                this.loadDataFile(id, filename, id);
        } 
        else if ($dataMap?.leftMapID !== null && x === -1 && y === 0) {
            this.loading++;
            let id = parseInt($dataMap.leftMapID).toString();
            let filename = "combined/" + "Map%1.json".format(id.padZero(3));
            this.loadDataFile(id, filename, id);
        } else 
        if ($dataMap?.upperMapID !== null && x === 0 && y === 1) {
            this.loading++;
            let id = parseInt($dataMap.upperMapID).toString();
            let filename = "combined/" + "Map%1.json".format(id.padZero(3));
            this.loadDataFile(id, filename, id);
        }
        else if ($dataMap?.bottomMapID !== null && x === 0 && y === -1) {
            this.loading++;
            let id = parseInt($dataMap.bottomMapID).toString();
            let filename = "combined/" + "Map%1.json".format(id.padZero(3));
            this.loadDataFile(id, filename, id);
        }
        this.xPos = object.x;
        this.yPos = object.y;
    }
};

Jams_Mapper.prototype.getRelativeMapPosition = function(pos,prevPos) {
    if(Math.abs(pos-prevPos) === 2){
        if (pos>prevPos){
            return -1;
        }else{
            return 1;
        }
    }else{
        return pos-prevPos;
    }
};

/**
* @description Shuffle map sections depending on what position the map's center should be in.
* @param map Map object
*/
Jams_Mapper.prototype.mapOffset = function(inputMap) {
    let map = JSON.parse(JSON.stringify(inputMap)); //I need the original data in place for the other maps.
    let xMin = parseInt(map._xMin);
    let yMin = parseInt(map._yMin);
    let xMax = parseInt(map._xMax);
    let yMax = parseInt(map._yMax);
    let w = map.width;
    let h = map.height;
    let centerMapX = parseInt(map._worldX);
    let centerMapY = parseInt(map._worldY);
    let renDistance = 1;
    let renWW = 2 * renDistance + 1;
    let mapWidth = w * renWW;
    let renWH = renWW;
    let mapHeight = h * renWH;
    let mapW = mapWidth / renWW;
    let mapH = mapHeight / renWH;

    Object.keys(map).forEach(function(key) {
        if($dataMap[key] !== map[key] && key !=="data"){
            $dataMap[key] = map[key];
        }
    });

    //$dataMap.data = new Array(w * 3 * h * 3 * 6).fill(0); //fill for blank sectors
    for (let k = 0; k < w * 3 * h * 3 * 6; k++) { //loop through the data array.    
       $dataMap.data[k] = 0;
    }


    for (let y = yMax; y >= yMin; y--) { //loop top to bottom sectors
        for (let x = xMin; x <= xMax; x++) { //loop left to right sectors
            
            if (x in map.mapSets) { //verify the map exists on the x axis.
            if (y in map.mapSets[x]) { //verify the map exists on the y axis.
                let neighborMap = map.mapSets[x][y];
            for (let k = 0; k < w * h * 6; k++) { //loop through the data array.
                    
                        let sIndex = k;
                        let xAxis = x;
                        let yAxis = y;
                        let Layers = (sIndex - (sIndex % (mapW * mapH))) / (mapW * mapH);
                        let AdjsIndex = (sIndex - (Layers * mapH * mapW));
                        let relXAxis = xAxis - centerMapX + this.xPos;
                        if(relXAxis>=2){
                            relXAxis -=3;
                        }
                        if(relXAxis<=-2){
                            relXAxis +=3;
                        }

                        let relYAxis = yAxis - centerMapY  + this.yPos;
                        if(relYAxis>=2){
                            relYAxis -=3;
                        }
                        if(relYAxis<=-2){
                            relYAxis +=3;
                        }

                        let Round = (AdjsIndex - (AdjsIndex % (mapWidth / renWW))) / (mapWidth / renWW)
                        let Rows = relXAxis + 1;
                        let Columns = -relYAxis + 1;
                        let finalIndex = AdjsIndex + ((renWW - 1) * (mapWidth / renWW) * Round) + (mapWidth / renWW) * Rows + (mapWidth * mapHeight / renWH) * Columns + (mapHeight * mapWidth) * Layers;
                        $dataMap.data[finalIndex] = neighborMap.data[k];
                        this.csv += centerMapX+","+centerMapY+","+sIndex+","+xAxis+","+yAxis+","+Layers+","+AdjsIndex+","+relXAxis+","+relYAxis+","+Round+","+Rows+","+Columns+","+finalIndex+"\n";
                    }
                }
            }
        }
    }
    this.csv = "";
    $dataMap.width = $dataMap.width*3;
    $dataMap.height = $dataMap.height*3;

    //Primay Map event shifting
    $dataMap.events.forEach(e => {
        if (e !== null) {
            e.x += mapW;
            e.y += mapH;
        }
    });

     //Offset start location
     if (map.id == $dataSystem.startMapId && this.done ) {
        $dataSystem.startX += mapW;
        $dataSystem.startY += mapH;
        $gamePlayer?.reserveTransfer(map.id, $dataSystem.startX, $dataSystem.startY, 0, 2);
        this.done = false;
    }

}

/**
* @description Calculate the map section the player is currently standing in.
* @param obeject Map section event
*/
Jams_Mapper.prototype.checkMapSection = function(object) {
    if(this._mapSectionEvent == undefined){
        this._mapSectionEvent = new Jams_PlayerPosEvent("mapSection");
        this._mapSectionEvent.update ({"x": "", "y": ""});
    };
        if($dataMap){
            const mapSectionWidth = $dataMap.width/3;
            const mapSectionHeight = $dataMap.height/3;
            const x = $gamePlayer?.x;
            const y = $gamePlayer?.y;
            const xSection = (x - x % mapSectionWidth)/mapSectionWidth-1;
            const ySection = -(y - y % mapSectionHeight)/mapSectionHeight+1;
            this._mapSectionEvent.update ({"x": xSection, "y": ySection});
        }
};


//=============================================================================
// Hooks
//=============================================================================

/**Override loadMapData, so that the game reads the altered maps instead of the originals**/
DataManager.loadMapData = function(mapId) {
    this._Jams_waitForComplete(mapId);
};

//Need to wait for map creation to complete before letting the game engine load the maps.
DataManager._Jams_waitForComplete = function(mapId) {
    if (Jams.Mapper !== undefined && Jams.Mapper.isMapsReady) {
        if (mapId > 0) {
            const filename = "combined/Map%1.json".format(mapId.padZero(3));
            this.loadDataFile("$dataMap", filename);
        } else {
            this.makeEmptyMap();
        }
    } else {
        setTimeout(function() {
            this._Jams_waitForComplete(mapId)
        }.bind(this), 250);
    }
};

//=============================================================================
// Mapper.js
//=============================================================================

var Imported = Imported || {};
Imported.Jams = "1.0.0";
var Jams = Jams || {};
Jams.Mapper = Jams.Mapper || new Jams_Mapper();

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