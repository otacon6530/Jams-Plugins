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
        object => console.log("load")
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
    Jams.FPSManager.addMetric("Map Sect: ","mapSection",0);
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
    console.log("loading %s", id);
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
        world.mapSets[object._worldX] = new Array();
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
    console.log("Mapper: Maps have been merged.");
    
    this.loadMap = this.mapOffset;
    this.loadComplete = this.loadComplete;

    Graphics._switchFPSCounter();
};


Jams_Mapper.prototype.getMap = function(object) {
    console.log(object);
};

Jams_Mapper.prototype.loadComplete = function() {
   
    console.log("Map loaded");
};

Jams_Mapper.prototype.createSector = function(map, world) {
    let mapClone = JSON.parse(JSON.stringify(map)); //I need the original data in place for the other maps.
    let xMin = parseInt(map._worldX) - 1;
    let yMin = parseInt(map._worldY) - 1;
    let xMax = parseInt(map._worldX) + 1;
    let yMax = parseInt(map._worldY) + 1;
    let w = map.width;
    let h = map.height;
    let centerMapX = map._worldX;
    let centerMapY = map._worldY;
    let renDistance = 1;
    let renWW = 2 * renDistance + 1;
    let mapWidth = w * renWW;
    let renWH = renWW;
    let mapHeight = h * renWH;
    let mapW = mapWidth / renWW;
    let mapH = mapHeight / renWH;
    let fill = new Array(w * 3 * h * 3 * 6).fill(0); //fill for blank sectors
    let e = new Array();

    for (let y = yMax; y >= yMin; y--) { //loop top to bottom sectors
        for (let x = xMin; x <= xMax; x++) { //loop left to right sectors
            for (let k = 0; k < w * h * 6; k++) { //loop through the data array.
                if (x in world.mapSets) { //verify the map exists on the x axis.
                    if (y in world.mapSets[x]) { //verify the map exists on the y axis.
                        let neighborMap = world.mapSets[x][y];
                        let sIndex = k;
                        let xAxis = x;
                        let yAxis = y;
                        let Layers = (sIndex - (sIndex % (mapW * mapH))) / (mapW * mapH);
                        let AdjsIndex = (sIndex - (Layers * mapH * mapW));
                        let relXAxis = xAxis - centerMapX;
                        let relYAxis = yAxis - centerMapY;
                        let Round = (AdjsIndex - (AdjsIndex % (mapWidth / renWW))) / (mapWidth / renWW)
                        let Rows = relXAxis + 1;
                        let Columns = -relYAxis + 1;
                        let finalIndex = AdjsIndex + ((renWW - 1) * (mapWidth / renWW) * Round) + (mapWidth / renWW) * Rows + (mapWidth * mapHeight / renWH) * Columns + (mapHeight * mapWidth) * Layers;
                        fill[finalIndex] = neighborMap.data[k];
                        if (relXAxis === -1 && relYAxis === 0) {
                            mapClone.leftMapID = neighborMap.id;
                        } else if (relXAxis === 1 && relYAxis === 0) {
                            mapClone.rightMapID = neighborMap.id;
                        } else if (relXAxis === 0 && relYAxis === 1) {
                            mapClone.upMapID = neighborMap.id;
                        } else if (relXAxis === 0 && relYAxis === -1) {
                            mapClone.downMapID = neighborMap.id;
                        }

                    }
                }
            }
        }
    }
    mapClone.data = fill;
    mapClone._parallaxLoopX = true;
    mapClone._parallaxLoopY = true;

    //Primay Map event shifting
    mapClone.events.forEach(e => {
        if (e !== null) {
            e.x += mapW;
            e.y += mapH;
        }
    });

    //Offset start location
    if (map.id == $dataSystem.startMapId) {
        $dataSystem.startX += mapW;
        $dataSystem.startY += mapH;
        $gamePlayer?.reserveTransfer(map.id, $dataSystem.startX, $dataSystem.startY, 0, 2);
    }

    //get the corners
    mapClone.mintX = w;
    mapClone.maxtX = w * 2 - 1;
    mapClone.mintY = h;
    mapClone.maxtY = h * 2 - 1;

    mapClone.width = mapWidth;
    mapClone.height = mapHeight;
    let fs = require("fs");
    let id = parseInt(map.id).toString();
    let filename = "Map%1".format(id.padZero(3));
    fs.writeFileSync("data/combined/" + filename + ".json", JSON.stringify(mapClone));
};

Jams_Mapper.prototype.transferCheck = function(object) {
    x = this.getRelativeMapPosition(object.x,this.xPos);
    y = this.getRelativeMapPosition(object.y,this.yPos);
    //if (this.isMapsReady && $dataMap) {
        if ($dataMap?.rightMapID !== null && x === 1 && y === 0) {
                this.loading++;
                let id = parseInt($dataMap.rightMapID).toString();
                console.log("pre loading %s",id);
                let filename = "combined/" + "Map%1.json".format(id.padZero(3));
                this.loadDataFile(id, filename, id);    
        } 
        else if ($dataMap?.leftMapID !== null && x === -1 && y === 0) {
            this.loading++;
            let id = parseInt($dataMap.leftMapID).toString();
            let filename = "combined/" + "Map%1.json".format(id.padZero(3));
            this.loadDataFile(id, filename, id);  
        } else if ($dataMap?.upMapID !== null && x === 0 && y === 1) {
            this.loading++;
            let id = parseInt($dataMap.upMapID).toString();
            let filename = "combined/" + "Map%1.json".format(id.padZero(3));
            this.loadDataFile(id, filename, id);  
        } else if ($dataMap?.downMapID !== null && x === 0 && y === -1) {
            this.loading++;
            let id = parseInt($dataMap.downMapID).toString();
            let filename = "combined/" + "Map%1.json".format(id.padZero(3));
            this.loadDataFile(id, filename, id);  
        }
        this.xPos = object.x;
        this.yPos = object.y;
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
Jams_Mapper.prototype.mapOffset = function(map) {
    xPos = this.xPos;
    yPos = this.yPos;
    for (let k = 0; k < map.width * map.height * 6; k++) { //loop through the data array.
                let segment = map.width/3 //three maps wide.
                let rows = (k - k%map.width)/map.width;
                let rowsOffset = (k - k%map.width)/map.width;
                let maps = ((k - k%segment)/segment) - rows*3;
                let mapReset = maps+xPos;
                
                if (maps+xPos>=3){
                    mapReset = maps+xPos-3;
                }else if (maps+xPos<0){
                    mapReset = maps+xPos+3;
                }
                let kReset =k-maps*segment-rows*map.width;
                let f = kReset+mapReset*segment+rows*map.width;

                this.csv +=k+","+segment+","+rows+","+maps+","+mapReset+","+kReset+","+f+"\n"; 
                $dataMap.data[f] = map.data[k];
        }
    $dataMap.rightMapID = map.rightMapID;
    $dataMap.upMapID = map.upMapID;
    $dataMap.leftMapID = map.leftMapID;
    $dataMap.downMapID = map.downMapID;
    //console.log(this.csv);
    this.csv = "";
};

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