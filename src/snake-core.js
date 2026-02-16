(function (globalFactory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = globalFactory();
  } else if (typeof window !== 'undefined') {
    window.SnakeCore = globalFactory();
  }
})(function () {
  var DIRECTIONS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };

  var INPUT_TO_DIRECTION = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    w: 'up',
    W: 'up',
    s: 'down',
    S: 'down',
    a: 'left',
    A: 'left',
    d: 'right',
    D: 'right'
  };

  function keyOf(point) {
    return point.x + ',' + point.y;
  }

  function isOpposite(a, b) {
    return (
      (a === 'up' && b === 'down') ||
      (a === 'down' && b === 'up') ||
      (a === 'left' && b === 'right') ||
      (a === 'right' && b === 'left')
    );
  }

  function normalizeDirection(input) {
    if (!input) {
      return null;
    }

    if (DIRECTIONS[input]) {
      return input;
    }

    return INPUT_TO_DIRECTION[input] || null;
  }

  function getEmptyCells(width, height, snake) {
    var occupied = new Set(snake.map(keyOf));
    var cells = [];

    for (var y = 0; y < height; y += 1) {
      for (var x = 0; x < width; x += 1) {
        if (!occupied.has(x + ',' + y)) {
          cells.push({ x: x, y: y });
        }
      }
    }

    return cells;
  }

  function pickFood(width, height, snake, rng) {
    var emptyCells = getEmptyCells(width, height, snake);
    if (emptyCells.length === 0) {
      return null;
    }

    var random = typeof rng === 'function' ? rng : Math.random;
    var index = Math.floor(random() * emptyCells.length);
    return emptyCells[index];
  }

  function createInitialState(options) {
    var width = (options && options.width) || 16;
    var height = (options && options.height) || 16;
    var startX = Math.floor(width / 2);
    var startY = Math.floor(height / 2);

    var snake = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY }
    ];

    return {
      width: width,
      height: height,
      snake: snake,
      direction: 'right',
      pendingDirection: null,
      food: pickFood(width, height, snake, options && options.rng),
      score: 0,
      status: 'running'
    };
  }

  function queueDirection(state, inputDirection) {
    var nextDirection = normalizeDirection(inputDirection);
    if (!nextDirection || state.status !== 'running') {
      return state;
    }

    var baseDirection = state.pendingDirection || state.direction;
    if (state.snake.length > 1 && isOpposite(nextDirection, baseDirection)) {
      return state;
    }

    return Object.assign({}, state, { pendingDirection: nextDirection });
  }

  function hasCollision(point, cells) {
    var pointKey = keyOf(point);
    for (var i = 0; i < cells.length; i += 1) {
      if (keyOf(cells[i]) === pointKey) {
        return true;
      }
    }
    return false;
  }

  function step(state, rng) {
    if (state.status !== 'running') {
      return state;
    }

    var direction = state.pendingDirection || state.direction;
    var delta = DIRECTIONS[direction];
    var head = state.snake[0];
    var nextHead = { x: head.x + delta.x, y: head.y + delta.y };

    var outOfBounds =
      nextHead.x < 0 ||
      nextHead.x >= state.width ||
      nextHead.y < 0 ||
      nextHead.y >= state.height;

    if (outOfBounds) {
      return Object.assign({}, state, {
        direction: direction,
        pendingDirection: null,
        status: 'game_over'
      });
    }

    var eatsFood =
      state.food && nextHead.x === state.food.x && nextHead.y === state.food.y;

    var bodyToCheck = eatsFood
      ? state.snake
      : state.snake.slice(0, state.snake.length - 1);

    if (hasCollision(nextHead, bodyToCheck)) {
      return Object.assign({}, state, {
        direction: direction,
        pendingDirection: null,
        status: 'game_over'
      });
    }

    var nextSnake = [nextHead].concat(state.snake);
    if (!eatsFood) {
      nextSnake.pop();
    }

    return {
      width: state.width,
      height: state.height,
      snake: nextSnake,
      direction: direction,
      pendingDirection: null,
      food: eatsFood
        ? pickFood(state.width, state.height, nextSnake, rng)
        : state.food,
      score: eatsFood ? state.score + 1 : state.score,
      status: 'running'
    };
  }

  function restart(state, rng) {
    return createInitialState({ width: state.width, height: state.height, rng: rng });
  }

  return {
    DIRECTIONS: DIRECTIONS,
    INPUT_TO_DIRECTION: INPUT_TO_DIRECTION,
    normalizeDirection: normalizeDirection,
    createInitialState: createInitialState,
    queueDirection: queueDirection,
    step: step,
    restart: restart,
    pickFood: pickFood
  };
});
