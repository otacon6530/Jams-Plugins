//=============================================================================
// C47_SeamlessMap.js
// Version: 1.0.0
//=============================================================================

var Imported = Imported || {};
Imported.C47_SeamlessMap = "1.0.0";

var C47 = C47 || {};
C47.SeamlessMap = C47.SeamlessMap || {};

//=============================================================================
/*:
 * @plugindesc 大地图无缝衔接转场，使角色在多张地图间移动时感觉像在一张地图上
 *
 * @author chyj4747
 *
 * @param Preload On Map Load
 * @desc If you want to preload all assets found on a map upon loading the map, set this to true.
 * @default true
 *
 * @help 
 * =~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~
 * 插件说明
 * =~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~
 * 地图属性中备注的格式如下：
 * <cmap 方位1 地图ID X Y 方位2 地图ID X Y 方位3...>
 * 
 * cmap：connect map的缩写，本插件使用的关键词
 * 方位：代表要连接在当前地图的上下左右哪里，上u下d左l右r
 * 地图ID：要连接的目标地图的ID
 * X：当前地图与目标地图相连时，用来对齐的那条边界上的点的X坐标，该值是当前地图上的坐标
 * Y：与X同理，Y坐标
 * （方位 地图ID X Y）为一组数据，要么一起出现，要么就不写，也就是某个方位若没有相连的地图，那就不写
 * 
 * X和Y没看懂的看下面
 * 
 * 案例：
 * 假设地图1大小5x4，地图2大小6x7，地图3大小4x8
 * 当前地图为1，其备注如下
 * <cmap u 2 3 0 r 3 5 2>
 * 首先，地图1只连接了两张地图，分别是上方连接地图2，右边连接地图3
 * 那么地图1怎么跟地图2连接呢？左对齐？右对齐？还是居中？
 * 本插件的方案是，在两张地图相接的边上各取一个坐标点，这两个坐标点对齐地图就对齐了
 * 因此地图1用来跟地图2对齐的点就是（3,0），跟地图3对齐的点就是（5,2）
 * 而地图2和地图3用来对齐的点则分别写在各自的备注内
 * 地图2备注：<cmap d 1 4 7>
 * 地图3备注：<cmap l 1 0 4>
 * 地图2底边的（4,7）就在地图1顶边的（3,0）的正上方
 * 地图3左边的（0,4）就在地图1右边的（5,2）的正右方
 * 
 * 为何要用自定义点对齐呢？因为找点方便啊，鼠标一指，RM下方就会显示坐标，否则的话还要人工计算偏移
 * 
 * 其它注意事项：
 * · 只能额外显示一张地图，所以尽量不要让人物能够走到地图角落，那样只会根据最近的距离显示一张相邻地图，距离相等则按照左下右上的顺序显示
 * · 本插件使用后，相机自动对准主角，即主角永远在屏幕中心
 * · 改写了一部分地图相关的核心代码，不保证其它插件的兼容性
 * · 没有处理远景
 * · 只有当前主角所在地图的事件会生效，相邻地图只是绘制出来而已，不过除了图块，事件也会绘制，虽然不会运作
 * · 本插件不会影响正常的转场，比如从大地图进入室内时切换地图，可以用转场动作常规操作
 * · 有拼接的地图不要设置无限滚动，应该会冲突的，话说都拼接了还无限滚动个啥
 */

var $dataMap2 = null;

C47.POS_NONE  = -1;
C47.POS_LEFT  = 0;
C47.POS_DOWN  = 1;
C47.POS_RIGHT = 2;
C47.POS_UP    = 3;

C47.NOTE_MAP_KEY       = "cmap";
C47.NOTE_MAP_KEY_LEFT  = "l";
C47.NOTE_MAP_KEY_DOWN  = "d";
C47.NOTE_MAP_KEY_RIGHT = "r";
C47.NOTE_MAP_KEY_UP    = "u";
C47.NOTE_PAIR_LEN      = 4; // 指令组长度（方位 地图ID X Y）

(function() {
    //=============================================================================
    // 插件变量
    //=============================================================================
    C47.SeamlessMap._isMap2Needed = false;

    //=============================================================================
    // 插件方法
    //=============================================================================
    C47.SeamlessMap.NeedMap2 = function(isNeeded) {
        this._isMap2Needed = isNeeded;
    }

    C47.SeamlessMap.IsMap2Needed = function() {
        return this._isMap2Needed;
    }

    // 读取主地图备注
    C47.SeamlessMap.ReadNote = function() {
        if (!$gameMap || !$dataMap || !$dataMap.meta) return;

        let note = $dataMap.meta;
        if (!note.cmap) return;

        let settings = note.cmap.trim().split(" ");
        if (settings.length % C47.NOTE_PAIR_LEN != 0) return;

        let count = parseInt(settings.length / C47.NOTE_PAIR_LEN);
        for (var i = 0; i < count; i++)
        {
            let dir = settings[i * C47.NOTE_PAIR_LEN];
            let mapId = parseInt(settings[i * C47.NOTE_PAIR_LEN + 1]);
            let x = parseInt(settings[i * C47.NOTE_PAIR_LEN + 2]);
            let y = parseInt(settings[i * C47.NOTE_PAIR_LEN + 3]);
            if (dir == C47.NOTE_MAP_KEY_LEFT) dir = C47.POS_LEFT;
            else if (dir == C47.NOTE_MAP_KEY_DOWN) dir = C47.POS_DOWN;
            else if (dir == C47.NOTE_MAP_KEY_RIGHT) dir = C47.POS_RIGHT;
            else if (dir == C47.NOTE_MAP_KEY_UP) dir = C47.POS_UP;
            $gameMap.setConnectMap(dir, mapId, x, y);
        }
    }

    // 读取相连地图备注
    C47.SeamlessMap.ReadNote2 = function() {
        if (!C47.SeamlessMap.IsMap2Needed() || !$dataMap2 || !$dataMap.meta) return;

        let note = $dataMap2.meta;
        if (!note.cmap) return;

        if ($gameMap._map2Pos == C47.POS_NONE) return;

        let settings = note.cmap.trim().split(" ");
        if (settings.length % C47.NOTE_PAIR_LEN != 0) return;

        let map1Dir = ($gameMap._map2Pos + 2) % 4; // 主地图对于相连地图的方位
        let count = parseInt(settings.length / C47.NOTE_PAIR_LEN);
        for (var i = 0; i < count; i++)
        {
            let dir = settings[i * C47.NOTE_PAIR_LEN];
            let mapId = parseInt(settings[i * C47.NOTE_PAIR_LEN + 1]);
            let x = parseInt(settings[i * C47.NOTE_PAIR_LEN + 2]);
            let y = parseInt(settings[i * C47.NOTE_PAIR_LEN + 3]);
            if (dir == C47.NOTE_MAP_KEY_LEFT) dir = C47.POS_LEFT;
            else if (dir == C47.NOTE_MAP_KEY_DOWN) dir = C47.POS_DOWN;
            else if (dir == C47.NOTE_MAP_KEY_RIGHT) dir = C47.POS_RIGHT;
            else if (dir == C47.NOTE_MAP_KEY_UP) dir = C47.POS_UP;
            if (dir == map1Dir && mapId == $gameMap.mapId()) {
                $gameMap.setMap2ConnectXY(x, y);
                break;
            }
        }
    }

    //=============================================================================
    // Game_Map 重载
    //=============================================================================
    var _Game_Map_prototype_initialize = Game_Map.prototype.initialize;
    Game_Map.prototype.initialize = function() {
        this._tileset2Id = 0;
        this._map2Pos = C47.POS_NONE;
        this._displayX2 = 0; // 相连地图显示坐标X
        this._displayY2 = 0; // 相连地图显示坐标Y
        this._map2ConnectX = 0; // 相连地图对齐坐标X
        this._map2ConnectY = 0; // 相连地图对齐坐标Y
        this._conenctMapIds = [0,0,0,0]; // 连接地图的ID，顺序：左下右上
        this._connectX = [-1,-1,-1,-1]; // 与相连地图对齐的坐标X（当前地图的点）
        this._connectY = [-1,-1,-1,-1]; // 与相连地图对齐的坐标Y（当前地图的点）
        _Game_Map_prototype_initialize.call(this);
    };

    var _Game_Map_prototype_setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function(mapId) {
        /*if (mapId == this._map2Id) { // 若是两张拼接的地图，交换地图信息
            this._tileset2Id = this._tilesetId;
        }*/
        C47.SeamlessMap.ReadNote();
        _Game_Map_prototype_setup.apply(this, arguments);
    };

    Game_Map.prototype.setDisplayPos = function(x, y) {
        this._displayX = x;
        this._parallaxX = x;
        this._displayY = y;
        this._parallaxY = y;
    };

    Game_Map.prototype.scrollDown = function(distance) {
        this._displayY += distance;
        this._displayY2 += distance;
        this._parallaxY += distance;
    };
    
    Game_Map.prototype.scrollLeft = function(distance) {
        this._displayX -= distance;
        this._displayX2 -= distance;
        this._parallaxX -= distance;
    };
    
    Game_Map.prototype.scrollRight = function(distance) {
        this._displayX += distance;
        this._displayX2 += distance;
        this._parallaxX += distance;
    };
    
    Game_Map.prototype.scrollUp = function(distance) {
        this._displayY -= distance;
        this._displayY2 -= distance;
        this._parallaxY -= distance;
    };

    //=============================================================================
    // Game_Map 新增
    //=============================================================================
    Game_Map.prototype.map2Id = function() {
        return this._map2Id;
    };

    Game_Map.prototype.setTileset2Id = function(tid) {
        this._tileset2Id = tid;
    }
    
    Game_Map.prototype.tileset2Id = function() {
        return this._tileset2Id;
    };

    Game_Map.prototype.tileset2 = function() {
        return $dataTilesets[this._tileset2Id];
    };

    Game_Map.prototype.tileset2Flags = function() {
        var tileset = this.tileset2();
        if (tileset) {
            return tileset.flags;
        } else {
            return [];
        }
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

    Game_Map.prototype.setMap2ConnectXY = function(x, y) {
        this._map2ConnectX = x;
        this._map2ConnectY = y;
        this.initMap2XY();
    }

    Game_Map.prototype.initMap2XY = function() {
        this._displayX2 = this._displayX + this._map2ConnectX - this._connectX[this._map2Pos];
        this._displayY2 = this._displayY + this._map2ConnectY - this._connectY[this._map2Pos] + 1;
    }

    // 参数：方位，地图ID，对齐坐标X，对齐坐标Y
    Game_Map.prototype.setConnectMap = function(dir, mapId, x, y) {
        if (dir == C47.POS_NONE) return;
        this._conenctMapIds[dir] = mapId;
        this._connectX[dir] = x;
        this._connectY[dir] = y;
    }

    // 检测是否需要加载衔接地图，需要的话返回衔接地图的方位
    Game_Map.prototype.checkMap2Dir = function() {
        if (this._displayX < 0 && this._conenctMapIds[C47.POS_LEFT] > 0) {
            C47.SeamlessMap.NeedMap2(true);
            return C47.POS_LEFT;
        }
        if (this._displayY > this.height() && this._conenctMapIds[C47.POS_DOWN] > 0) {
            C47.SeamlessMap.NeedMap2(true);
            return C47.POS_DOWN;
        }
        if (this._displayX > this.width() && this._conenctMapIds[C47.POS_RIGHT] > 0) {
            C47.SeamlessMap.NeedMap2(true);
            return C47.POS_RIGHT;
        }
        if (this._displayY < 0 && this._conenctMapIds[C47.POS_UP] > 0) {
            C47.SeamlessMap.NeedMap2(true);
            return C47.POS_UP;
        }
        C47.SeamlessMap.NeedMap2(false);
        return C47.POS_NONE;
    }

    // 显示指定方位的衔接地图
    Game_Map.prototype.showMap2 = function(dir) {
        //if (!C47.SeamlessMap.IsMap2Needed()) return;
        //if (this._conenctMapIds[dir] == 0) return;
        if (this._map2Pos != dir)
        {
            this._map2Pos = dir;
            DataManager.loadMap2Data(this._conenctMapIds[dir]);
        }
    }

    //=============================================================================
    // Game_CharacterBase 重载
    //=============================================================================
    Game_CharacterBase.prototype.canPass = function(x, y, d) {
        var x2 = $gameMap.roundXWithDirection(x, d);
        var y2 = $gameMap.roundYWithDirection(y, d);
        if (!$gameMap.isValid(x2, y2)) {
            return false;
        }
        if (this.isThrough() || this.isDebugThrough()) {
            return true;
        }
        if (!this.isMapPassable(x, y, d)) {
            return false;
        }
        if (this.isCollidedWithCharacters(x2, y2)) {
            return false;
        }
        return true;
    };

    Game_CharacterBase.prototype.isMapPassable = function(x, y, d) {
        var x2 = $gameMap.roundXWithDirection(x, d);
        var y2 = $gameMap.roundYWithDirection(y, d);
        var d2 = this.reverseDir(d);
        return $gameMap.isPassable(x, y, d) && $gameMap.isPassable(x2, y2, d2);
    };

    //=============================================================================
    // Game_Player 重载
    //=============================================================================
    Game_Player.prototype.performTransfer = function() {
        if (this.isTransferring()) {
            this.setDirection(this._newDirection);
            if (this._newMapId !== $gameMap.mapId() || this._needsMapReload) {
                $gameMap.setup(this._newMapId);
                this._needsMapReload = false;
            }
            this.locate(this._newX, this._newY);
            this.refresh();
            this.clearTransferInfo();
        }
    };

    Game_Player.prototype.updateScroll = function(lastScrolledX, lastScrolledY) {
        var x1 = lastScrolledX;
        var y1 = lastScrolledY;
        var x2 = this.scrolledX();
        var y2 = this.scrolledY();
        if (y2 > y1 && y2 > this.centerY()) {
            $gameMap.scrollDown(y2 - y1);
        }
        if (x2 < x1 && x2 < this.centerX()) {
            $gameMap.scrollLeft(x1 - x2);
        }
        if (x2 > x1 && x2 > this.centerX()) {
            $gameMap.scrollRight(x2 - x1);
        }
        if (y2 < y1 && y2 < this.centerY()) {
            $gameMap.scrollUp(y1 - y2);
        }

        let map2Dir = $gameMap.checkMap2Dir();
        if (map2Dir != C47.POS_NONE) {
            $gameMap.showMap2(map2Dir);
        }
    };

    //=============================================================================
    // Game_Vehicle 重载
    //=============================================================================
    Game_Vehicle.prototype.isMapPassable = function(x, y, d) {
        var x2 = $gameMap.roundXWithDirection(x, d);
        var y2 = $gameMap.roundYWithDirection(y, d);
        if (this.isBoat()) {
            return $gameMap.isBoatPassable(x2, y2);
        } else if (this.isShip()) {
            return $gameMap.isShipPassable(x2, y2);
        } else if (this.isAirship()) {
            return true;
        } else {
            return false;
        }
    };

    //=============================================================================
    // Spriteset_Map 重载
    //=============================================================================
    var _Spriteset_Map_prototype_updateTileset = Spriteset_Map.prototype.updateTileset;
    Spriteset_Map.prototype.updateTileset = function() {
        _Spriteset_Map_prototype_updateTileset.call(this);
        if (C47.SeamlessMap.IsMap2Needed() && this._tileset2 !== $gameMap.tileset2()) {
            this.loadTileset2();
        }
    };

    var _Spriteset_Map_prototype_updateTilemap = Spriteset_Map.prototype.updateTilemap;
    Spriteset_Map.prototype.updateTilemap = function() {
        _Spriteset_Map_prototype_updateTilemap.call(this);
        
        if (C47.SeamlessMap.IsMap2Needed() && !!this._tilemap2) {
            this._tilemap2.origin.x = $gameMap.displayX2() * $gameMap.tileWidth();
            this._tilemap2.origin.y = $gameMap.displayY2() * $gameMap.tileHeight();
        }
    };

    //=============================================================================
    // Spriteset_Map 新增
    //=============================================================================
    Spriteset_Map.prototype.createTilemap2 = function() {
        if (!C47.SeamlessMap.IsMap2Needed() || !$dataMap2) return;

        if (Graphics.isWebGL()) {
            this._tilemap2 = new ShaderTilemap();
        } else {
            this._tilemap2 = new Tilemap();
        }
        this._tilemap2.tileWidth = $gameMap.tileWidth();
        this._tilemap2.tileHeight = $gameMap.tileHeight();
        this._tilemap2.setData($dataMap2.width, $dataMap2.height, $dataMap2.data);
        this._tilemap2.horizontalWrap = false;
        this._tilemap2.verticalWrap = false;
        this.loadTileset2();

        // 将衔接地图添加到主地图前面（万一重叠会被主地图遮挡）
        for (var i = 0; i < this._baseSprite.children.length; i++)
        {
            if (this._baseSprite.children[i] == this._tilemap) {
                this._baseSprite.addChildAt(this._tilemap2, i);
                break;
            }
        }
    };

    Spriteset_Map.prototype.loadTileset2 = function() {
        this._tileset2 = $gameMap.tileset2();
        if (this._tileset2) {
            var tilesetNames = this._tileset2.tilesetNames;
            for (var i = 0; i < tilesetNames.length; i++) {
                this._tilemap2.bitmaps[i] = ImageManager.loadTileset(tilesetNames[i]);
            }
            var newTilesetFlags = $gameMap.tileset2Flags();
            this._tilemap2.refreshTileset();
            if (!this._tilemap2.flags.equals(newTilesetFlags)) {
                this._tilemap2.refresh();
            }
            this._tilemap2.flags = newTilesetFlags;
        }
    };

    Spriteset_Map.prototype.removeMap2 = function() {
        if (!this._tilemap2) return;
        this._baseSprite.remove(this._tilemap2);
        this._tilemap2 = null;
    }

    //=============================================================================
    // DataManager 重载
    //=============================================================================
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

            C47.SeamlessMap.ReadNote2();
            $gameMap.setTileset2Id(object.tilesetId);
            SceneManager.createMap2();
        }
        else {
            _DataManager_onLoad.call(this, object);
        }
    };

    //=============================================================================
    // DataManager 新增
    //=============================================================================
    DataManager.loadMap2Data = function(mapId) {
        if (mapId > 0) {
            var filename = 'Map%1.json'.format(mapId.padZero(3));
            this._mapLoader = ResourceHandler.createLoader('data/' + filename, this.loadDataFile.bind(this, '$dataMap2', filename));
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

    //=============================================================================
    // SceneManager 新增
    //=============================================================================
    SceneManager.createMap2 = function() {
        if (!this._scene._spriteset) return;

        this._scene._spriteset.removeMap2();
        this._scene._spriteset.createTilemap2();
    }

    //=============================================================================
    // Scene_Map 重载
    //=============================================================================
    /*var _Scene_Map_prototype_create = Scene_Map.prototype.create;
    Scene_Map.prototype.create = function() {
        _Scene_Map_prototype_create.call(this);
        DataManager.loadMap2Data(0);
    };*/

    //=============================================================================
    // Scene_Load 重载
    //=============================================================================
    /*Scene_Load.prototype.reloadMapIfUpdated = function() {
        if ($gameSystem.versionId() !== $dataSystem.versionId) {
            $gamePlayer.reserveTransfer($gameMap.mapId(), $gamePlayer.x, $gamePlayer.y);
            $gamePlayer.requestMapReload();
        }
    };*/
})();