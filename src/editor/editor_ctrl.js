GameEditor.controllers.controller('EditorCtrl', ['$scope', '$http', function ($scope, $http) {
  $scope.level_data = {};
  $scope.game_objects = [];
  $scope.cells = [];
  //
  $scope.tile_size = 40;
  $scope.rows = 12;
  $scope.cols = 20;
  $scope.width = $scope.tile_size * $scope.cols;
  $scope.height = $scope.tile_size * $scope.rows;
  $scope.canvas_ele = null;
  //
  $scope.Tool = {
    Paint: 'paint',
    Delete: 'delete',
    Inspect: 'inspect',
    SetWaypoint: 'set_waypoint'
  };
  $scope.current_tool = $scope.Tool.Paint;
  $scope.current_selected_entity = null;
  $scope.current_inspect_cell = null;
  $scope.current_inspect_entity = null;
  //
  var game = null;
  var render_layer_0 = null;
  var render_layer_floor = null;
  var render_layer_1 = null;
  var render_layer_top = null;
  var grid = null;

  var render = function() {
    game.render_engine.render();
  };

  var clearTopLayer = function() {
    render_layer_top.clear();
    render();
  };

  $scope.togglePlay = function() {
    if (!game.is_running) {
      grid.hide();
      game.start();
    } else {
      grid.show();
      game.stop();
      render();
    }
  };

  $scope.setTool = function(tool) {
    if (tool === $scope.Tool.Paint || tool === $scope.Tool.Remove) {
      $scope.current_inspect_cell = null;
      $scope.current_inspect_entity = null;
      clearTopLayer();
    }
    $scope.current_tool = tool;
  };

  $scope.setWorldSize = function(rows, cols) {
    $scope.rows = parseInt(rows, 10);
    $scope.cols = parseInt(cols, 10);
    $scope.width = $scope.tile_size * $scope.cols;
    $scope.height = $scope.tile_size * $scope.rows;
    game.render_engine.resize($scope.width, $scope.height);
  };

  var initGameObjects = function() {
    var objects = [
      {
        class_name: 'WallTile',
        opts: {
          graphic_data: {
            type: Graphic.Type.Rect,
            fill_color: 0x34495e
          }
        },
        is_unique: true
      },
      {
        class_name: 'FloorTile',
        opts: {
          graphic_data: {
            type: Graphic.Type.Rect,
            fill_color: 0xecf0f1
          }
        },
        is_unique: true
      },
      {
        class_name: 'SpawnTile',
        opts: {
          graphic_data: {
            type: Graphic.Type.Rect,
            fill_color: 0x16a085
          }
        },
        is_unique: true
      },
      {
        class_name: 'EndTile',
        is_unique: true,
        opts: {
          graphic_data: {
            type: Graphic.Type.Rect,
            fill_color: 0x2ecc71
          }
        }
      },
      {
        class_name: 'MoveWaypointTile',
        opts: {
          graphic_data: {
            type: Graphic.Type.Rect,
            fill_color: 0xe74c3c
          }
        },
        tools: {
          set_waypoint: true
        }
      }
    ];
    $scope.game_objects = objects;
  };

  $scope.resetEntities = function() {
    if (game.is_running) {
      grid.show();
      game.stop();
    }
    game.loopEntities(function(entity) {
      entity.reset();
    });
    render();
  };

  var buildGrid = function() {
    grid.clear();
    grid.createLines($scope.rows, $scope.cols, $scope.tile_size);
    render();

    $scope.cells = [];
    for (var c = 0; c < $scope.cols; c++) {
      $scope.cells[c] = [];
      for (var r = 0; r < $scope.rows; r++) {
        $scope.cells[c][r] = [];
      }
    }
    game.prebuildCells($scope.cols, $scope.rows);
  };

  var scaleCanvas = function() {
    var level_overflow_container = document.getElementById('level_overflow_container');
    var level_container = document.getElementById('level_container');

    var max_width = level_overflow_container.clientWidth;
    var max_height = window.innerHeight;

    var width = level_container.clientWidth;
    var height = level_container.clientHeight;

    var scale = Math.min(max_width / width, max_height / height, 1);
    var new_height = Math.min(scale * height, max_height);
    var new_width = Math.min(scale * width, max_width);
    level_container.style.webkitTransform = "scale(" + scale + ", " + scale + ")";
    level_container.style.transform = "scale(" + scale + ", " + scale + ")";
  };

  var getPointOnCanvas = function(e) {
    var c = game.render_engine.container_ele.getBoundingClientRect();
    var x = e.pageX - c.left;
    var y = e.pageY - c.top;
    return {
      x: x,
      y: y
    };
  };

  var pointToCell = function(point) {
    return {
      col: (Math.floor(point.x / $scope.tile_size)),
      row: (Math.floor(point.y / $scope.tile_size))
    };
  };

  var cellHasTile = function(col, row, type) {
    var entities = $scope.cells[col][row];
    var has = false;
    for (var i = 0; i < entities.length; i++) {
      if (entities[i].class_name === type) {
        has = true;
        break;
      }
    }
    return has;
  };

  var clearCell = function(col, row) {
    game.loopEntities(function(entity) {
      if (entity && entity.row === row && entity.col == col) {
        entity.remove();
      }
    });
    $scope.cells[col][row] = [];
    render();
  };

  var addEntityToCells = function(entity) {
    var col = entity.col;
    var row = entity.row;
    $scope.cells[col][row].push(entity);
  };

  var getNormPoint = function(point) {
    var cell = pointToCell(point);
    return {
      x: cell.col * $scope.tile_size,
      y: cell.row * $scope.tile_size
    };
  };

  var renderWaypoints = function(entity) {
    clearTopLayer();
    var waypoints = entity.waypoint_queue;
    if (!waypoints.length) return;
    var w = $scope.tile_size / 2;
    var h = $scope.tile_size / 2;
    var graphic = new PIXI.Graphics();
    graphic.lineStyle(1, 0x00FF00, 1);
    for (var i = 0; i < waypoints.length; i++) {
      var prev = i === 0 ? 0 : i - 1;
      graphic.moveTo(waypoints[prev].x + w, waypoints[prev].y + h);
      graphic.lineTo(waypoints[i].x + w, waypoints[i].y + h);
      graphic.drawCircle(waypoints[i].x + w, waypoints[i].y + h, 5);
    }
    render_layer_top.addGraphic(graphic);
    render();
  };

  $scope.selectEntity = function(entity) {
    clearTopLayer();
    if ($scope.current_tool === $scope.Tool.Paint) {
      $scope.current_selected_entity = entity;
    } else if ($scope.current_tool === $scope.Tool.Inspect) {
      $scope.current_inspect_entity = entity;
      renderWaypoints(entity);
    }
  };

  $scope.createEntity = function(point) {
    var obj = $scope.current_selected_entity;
    if (!obj) return;
    var cell = pointToCell(point);
    var class_name = obj.class_name;
    var col = cell.col;
    var row = cell.row;
    var x = cell.col * $scope.tile_size;
    var y = cell.row * $scope.tile_size;
    var cell_entities = $scope.cells[col][row];

    var render_layer = class_name === "FloorTile" ? render_layer_floor : render_layer_1;
    // Entity that are unique can not be multiple times on a cell
    if (obj.is_unique && cellHasTile(col, row, class_name)) {
      return;
    }
    // Remove all cell entities if that entity is unique
    if (obj.is_unique && cell_entities.length) {
      clearCell(col, row);
    }
    //
    obj.opts.position = {
      x: x,
      y: y
    };
    obj.opts.size = {
      width: $scope.tile_size,
      height: $scope.tile_size
    };
    obj.opts.row = row;
    obj.opts.col = col;
    //
    var entity = new window[obj.class_name](obj.opts);
    entity.createGraphic();

    render_layer.addGraphic(entity.graphic.getGraphicObj());
    // Trigger on-remove-event
    entity.on('moved', function() {
      game.swapTile(entity);
    }, this);

    game.addEntity(render_layer, entity);

    if (!game.is_running) {
      render();
    } else {
      entity.ready();
    }
    addEntityToCells(entity);
  };

  $scope.onCanvasMousedown = function(e) {
    if ($scope.is_drawing) return;
    var point = getPointOnCanvas(e);
    if ($scope.current_tool === $scope.Tool.Paint) {
      $scope.is_drawing = true;
      $scope.createEntity(point);
    } else if ($scope.current_tool === $scope.Tool.Delete) {
      var cell = pointToCell(point);
      clearCell(cell.col, cell.row);
    } else if ($scope.current_tool === $scope.Tool.Inspect) {
      clearTopLayer();
      $scope.current_inspect_entity = null;
      var cell = pointToCell(point);
      $scope.current_inspect_cell = $scope.cells[cell.col][cell.row];
    // Set a waypoint
    } else if ($scope.current_tool === $scope.Tool.SetWaypoint) {
      var norm_point = getNormPoint(point);
      var entity = $scope.current_inspect_entity;
      if (entity.waypoint_queue.length === 0) {
        entity.addWaypoint({
          x: entity.position.x,
          y: entity.position.y
        });
      }
      entity.addWaypoint(norm_point);
      renderWaypoints(entity);
    }
  };

  $scope.onCanvasMouseup = function() {
    $scope.is_drawing = false;
  };

  $scope.onCanvasMouseenter = function(e) {
  };

  $scope.changeSize = function(rows, cols) {
    $scope.setWorldSize(rows, cols);
    setTimeout(function() {
      buildGrid();
    }, 1000);
  };

  $scope.changeTileSize = function(size) {
    $scope.tile_size = size;
    $scope.setWorldSize($scope.rows, $scope.cols);
    buildGrid();
  };

  $scope.init = function() {
    $scope.canvas_ele = angular.element(document.getElementById('canvas'));
    //
    game = new PixiTileGame('canvas_container', $scope.width, $scope.height);
    render_layer_0 = game.addRenderLayer();
    render_layer_floor = game.addRenderLayer();
    render_layer_1 = game.addRenderLayer();
    render_layer_top = game.addRenderLayer();
    game.render_engine.addLayersToMainStage();

    grid = new Grid($scope.cols, $scope.rows, $scope.tile_size);
    buildGrid();
    render_layer_0.addGraphic(grid.getContainer());
    render();

    initGameObjects();
  };

  $scope.resetWaypoints = function(entity) {
    entity.clearWaypoints();
    entity.reset();
    render_layer_top.clear();
    render();
  };

}]);
