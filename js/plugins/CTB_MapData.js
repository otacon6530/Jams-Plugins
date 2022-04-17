/*=============================================================================
 * CTB MapData
 * By CT_Bolt
 * CTB_MapData.js
 * Version: 2.1
 * Terms of Use:
 *   Must purchase a licence to use.
 *   No filesharing permited unless prior agreement made with author.
 *
 *  Copyright [2020] [N. Giem] (Aka. CT_Bolt)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 *
/*=============================================================================*/

var CTB = CTB || {}; CTB.MapData  = CTB.MapData || {};
var Imported = Imported || {}; Imported["CT_Bolt Map Data"] = 2.1;

//=============================================================================
/*:
 * @plugindesc CT_Bolt's Map Data v2.1
 * @author CT_Bolt
 *
 * @param ---Main---
 * @text Main Settings
 *
 * @param ---Commands---
 * @text Plugin Commands
 *
 * @param Map FileName
 * @text Default Map FileName
 * @parent ---Main---
 * @desc Map FileName (Leave Blank For Default)
 * Default: Map
 * @default
 *
 * @param Map Path
 * @text Default Map Path
 * @parent ---Main---
 * @desc Map Path (Leave Blank For Default)
 * Default: data
 * @default
 *
 * @param Reload Map Command
 * @text Reload Map Command
 * @parent ---Commands---
 * @desc Command used to reload the map.
 * Default:
 * @default
 *
 * @help
 *
 * CT_Bolt's Map Data Plugin
 * Version 2.1
 * CT_Bolt
 *
 * ***************** Description **********************
 * Allows custom maps to be loaded.
 *
 * ****************** How to Use ***********************
 * **** Map Notetags:
 *       Example #1:
 *          <MapPath: 'custom data'/>
 *          <MapFile: 'WorldMap'/>
 *          <MapId: 1/>
 *
 *          The above would load the following map file: './custom data/WorldMap001.json'
 *
 *       Example #2:
 *          <MapId: $gameVariables ? ($gameVariables.value(1) > 0) ? $gameVariables.value(1) : 4 : 4/>
 *
 *          The above uses GameVariable #1. This would load the following map file:
 *          If the gamevariable is not set or less then 1: './data/Map004.json'
 *          If the gamevariable is set is will use GameVariable #1: './data/Map***.json'
 *             ("***" is the value of GameVariable #1)
 *             Example GameVariable #1 is set to 92: './data/Map092.json'
 *
 *
 * **** Plugin Command(s):
 *       "loadMapEx" or "Reload Map" (no quotes)
 *
 *       Notes: This is default command, can be changed via plugin parameters)
 *              Plugin Command for reloading a Map is can be changed in the plugin parameters via plugin manager.
 *
 * See demo for more information.
 *
 * History Log:
 *    v1.0 Initial Build
 *    v1.1 Custom Paths Added (1/7/20)
 *    v2.0 Major Feature Updates (1/8/20)
 *         Loading Custom Maps Features and Notetages
 *    v2.1 Cleaned up code, added new features (1/8/20)
 *
 */


//-----------------------------------------------------------------------------

var $mapDataEx = null;
var $mapDataInfoEx = {};

"use strict";
(function ($) {
  function getPluginParameters() {var a = document.currentScript || (function() { var b = document.getElementsByTagName('script'); return b[b.length - 1]; })(); return PluginManager.parameters(a.src.substring((a.src.lastIndexOf('/') + 1), a.src.indexOf('.js')));} $.Param = getPluginParameters();

  //-----------------------------------------------------------------------------
  // Core Functions
  //-----------------------------------------------------------------------------
  function readMapData(id, filename, p){
    var getData = new XMLHttpRequest();
    p = p || $.Param["Map Path"] || 'data';; var v = filename || $.Param["Map FileName"] || 'Map';
    var f = v + '%1.json'.format(id.padZero(3));
    getData.open("GET", p+'/'+f, false);
    getData.send(null);
    return JSON.parse(getData.responseText);
  }
  
  //-----------------------------------------------------------------------------
  
  //-----------------------------------------------------------------------------
  // Main Code
  //-----------------------------------------------------------------------------
  // New
  Game_System.prototype.readMapData = function(id, filename, p){return readMapData(id, filename, p)};
  
  // New
  DataManager.getMapCommandValue = function(a, d) {var v=null, z='/>', c=d+':'; var i = [a.indexOf(c)]; if (i[0] > -1){i[1] = i[0]+c.length; i[2] = a.indexOf(z, i[1]); if (i[2] === -1) {i[2] = null}; i[3] = i[2] ? i[2]-i[1]: null; v = a.substr(i[1], i[3]).trim();} return v;}
  
  // Overwrite
  DataManager.loadMapData = function(i, f, p) {
    $mapDataEx = $gameSystem.readMapData(i, null, p);
    p = p || $.Param["Map Path"] || 'data';
    if ($mapDataEx){
      var v = this.getMapCommandValue($mapDataEx.note, 'MapFile'); if (v) f = eval(v);
          v = this.getMapCommandValue($mapDataEx.note, 'MapId');   if (v) i = eval(v);
          v = this.getMapCommandValue($mapDataEx.note, 'MapPath'); if (v) p = eval(v);
    }
    if (i > 0){
      v = f || $.Param["Map FileName"] || 'Map';
      var filename = i ? v + '%1.json'.format(i.padZero(3)) : v + '.json';
      this._mapLoader = ResourceHandler.createLoader(p+'/' + filename, this.loadDataFile.bind(this, '$dataMap', filename));
      this.loadDataFile('$dataMap', filename, p);
   }else{
      this.makeEmptyMap();
    }
  };

  // Overwrite
  DataManager.loadDataFile = function(name, src, p) {
    p = p || $.Param["Map Path"] || 'data';
    var xhr = new XMLHttpRequest(), url = p+'/' + src;
    xhr.open('GET', url); xhr.overrideMimeType('application/json');
    xhr.onload = function() {if (xhr.status < 400) {window[name] = JSON.parse(xhr.responseText); DataManager.onLoad(window[name]);}};
    xhr.onerror = this._mapLoader || function() {DataManager._errorUrl = DataManager._errorUrl || url;};
    window[name] = null; xhr.send();
  };

  // New
  Game_Player.prototype.loadMapEx = function(i,x,y,d,f) {
    i = i || $gameMap.mapId();
    x = x || $gamePlayer.x
    y = y || $gamePlayer.y
    d = d || $gamePlayer._direction;
    if (String(f) === 'null' || String(f) === 'undefined' || String(f) === '') f = 2;
    $gamePlayer.reserveTransfer(i, x, y, d, f);
    $gamePlayer.requestMapReload();
  };

  // Alias
  if (!CTB.MapData.hasPluginCommands){
    var _gi_pc_ctb_mapData = Game_Interpreter.prototype.pluginCommand; Game_Interpreter.prototype.pluginCommand = function (command, args) {_gi_pc_ctb_mapData.call(this, command, args);
      var v = {}, a = command;
      var i,x,y,d,f = null;
      v['loadMapEx'] = ($.Param["Reload Map Command"] || "loadmap").toLowerCase();
      a = a.toLowerCase();
      if (a.includes(v['loadMapEx'])){
          if (args[0]){i = eval(args[0]);}
          if (args[1]){x = eval(args[1]);}
          if (args[2]){y = eval(args[2]);}
          if (args[3]){d = eval(args[3]);}
          f = eval(args[4]);
          $gamePlayer.loadMapEx(i,x,y,d,f);
      }else if (a.includes('load') && args[0]){
        if (args[0].toLowerCase().includes('map')){
          if (args[1]){i = eval(args[1]);}
          if (args[2]){x = eval(args[2]);}
          if (args[3]){y = eval(args[3]);}
          if (args[4]){d = eval(args[4]);}
          f = eval(args[5]);
          $gamePlayer.loadMapEx(i,x,y,d,f);
        }
      }
      CTB.MapData.hasPluginCommands = true;
    };
  }
//-----------------------------------------------------------------------------

})(CTB.MapData);