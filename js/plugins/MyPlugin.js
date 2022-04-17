//=============================================================================
// Myplugin.js
//=============================================================================
var Imported = Imported || {};
Imported.JMS = "1.0.0";

var JMS = JMS || {};
JMS.Mapper = JMS.Mapper || {};
/*:
* @plugindesc Game Plugin  // Describe your plugin
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
 * @desc loads map 1
*/   
var $dataMap2 = null;

PluginManager.registerCommand("MyPlugin", "jms", args => {
    $gameMap.showMap2("2");
});

(function() {   

        var $dataList = null;
        DataManager._databaseFiles.push({name: '$dataList', src: 'List.json'});
    
        var _Game_Map_prototype_initialize = Game_Map.prototype.initialize;
        Game_Map.prototype.initialize = function() {
            this._map2Id = null;
            _Game_Map_prototype_initialize.call(this);
        };

        Game_Map.prototype.map2Id = function() {
            return this._map2Id;
        };

        Game_Map.prototype.width2 = function() {
            return $dataMap2.width;
        };
        
        Game_Map.prototype.height2 = function() {
            return $dataMap2.height;
        };

        Game_Map.prototype.displayX2 = function() {
            return this._displayX2;
        }

        Game_Map.prototype.displayY2 = function() {
            return this._displayY2;
        }
        
        Game_Map.prototype.data2 = function() {
            return $dataMap2.data;
        };

        Game_Map.prototype.showMap2 = function(dir) {
            if (this._map2Pos != dir)
            {
                this._map2Pos = dir;
                DataManager.loadMap2Data("2");//this._conenctMapIds[dir]); temporary
            }
        }

        DataManager.loadMap2Data = function(mapId) {
            if (mapId > 0) {
                var filename = 'Map%1.json'.format(mapId.padZero(3));
                //this._mapLoader = ResourceHandler.createLoader('data/' + filename, this.loadDataFile.bind(this, '$dataMap2', filename));
                this.loadDataFile('$dataMap2', filename);
            } else {
                this.makeEmptyMap2();
            }
        };

        DataManager.makeEmptyMap2 = function() {
            $dataMap2 = {};
            $dataMap2.data = [];
            $dataMap2.events = [];
            $dataMap2.width = 100;
            $dataMap2.height = 100;
            $dataMap2.scrollType = 3;
        };

        var _DataManager_onLoad = DataManager.onLoad;
        DataManager.onLoad = function(object) {
            var array;
            if (object === $dataMap2) {
                this.extractMetadata(object);
                array = object.events;

                if (Array.isArray(array)) {
                    for (var i = 0; i < array.length; i++) {
                        var data = array[i];
                        if (data && data.note !== undefined) {
                            this.extractMetadata(data);
                        }
                    }
                }
            }
            else {
                _DataManager_onLoad.call(this, object);
            }
        };

})(); 