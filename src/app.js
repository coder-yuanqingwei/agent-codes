(function () {
  var core = window.SnakeCore;
  var GRID_SIZE = 25;
  var TICK_MS = 140;

  var state = core.createInitialState({ width: GRID_SIZE, height: GRID_SIZE });
  var timerId = null;
  var isPaused = false;
  var isAutoPlay = false;

  var scoreEl = document.getElementById('score');
  var statusEl = document.getElementById('status');
  var gridEl = document.getElementById('grid');
  var autoPlayButton = document.getElementById('autoplay-btn');
  var pauseButton = document.getElementById('pause-btn');
  var restartButton = document.getElementById('restart-btn');
  var controlButtons = document.querySelectorAll('[data-direction]');

  function isOppositeDirection(a, b) {
    return (
      (a === 'up' && b === 'down') ||
      (a === 'down' && b === 'up') ||
      (a === 'left' && b === 'right') ||
      (a === 'right' && b === 'left')
    );
  }

  function getNextHead(inputState, direction) {
    var head = inputState.snake[0];
    if (direction === 'up') {
      return { x: head.x, y: head.y - 1 };
    }
    if (direction === 'down') {
      return { x: head.x, y: head.y + 1 };
    }
    if (direction === 'left') {
      return { x: head.x - 1, y: head.y };
    }
    return { x: head.x + 1, y: head.y };
  }

  function isCellInList(cell, list) {
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].x === cell.x && list[i].y === cell.y) {
        return true;
      }
    }
    return false;
  }

  function willCollide(inputState, direction) {
    var nextHead = getNextHead(inputState, direction);
    var outOfBounds =
      nextHead.x < 0 ||
      nextHead.x >= inputState.width ||
      nextHead.y < 0 ||
      nextHead.y >= inputState.height;
    if (outOfBounds) {
      return true;
    }

    var eatsFood =
      inputState.food &&
      nextHead.x === inputState.food.x &&
      nextHead.y === inputState.food.y;
    var bodyToCheck = eatsFood
      ? inputState.snake
      : inputState.snake.slice(0, inputState.snake.length - 1);
    return isCellInList(nextHead, bodyToCheck);
  }

  function distanceToFood(inputState, direction) {
    if (!inputState.food) {
      return 0;
    }
    var nextHead = getNextHead(inputState, direction);
    return (
      Math.abs(nextHead.x - inputState.food.x) +
      Math.abs(nextHead.y - inputState.food.y)
    );
  }

  function pickAutoDirection(inputState) {
    var candidates = ['up', 'down', 'left', 'right'];
    var safe = [];
    for (var i = 0; i < candidates.length; i += 1) {
      var direction = candidates[i];
      if (
        inputState.snake.length > 1 &&
        isOppositeDirection(direction, inputState.direction)
      ) {
        continue;
      }
      if (!willCollide(inputState, direction)) {
        safe.push(direction);
      }
    }

    if (safe.length === 0) {
      return inputState.direction;
    }

    safe.sort(function (a, b) {
      var distanceA = distanceToFood(inputState, a);
      var distanceB = distanceToFood(inputState, b);
      if (distanceA !== distanceB) {
        return distanceA - distanceB;
      }
      if (a === inputState.direction) {
        return -1;
      }
      if (b === inputState.direction) {
        return 1;
      }
      return 0;
    });

    return safe[0];
  }

  function render() {
    scoreEl.textContent = String(state.score);
    if (state.status === 'game_over') {
      statusEl.textContent = '游戏结束，请点击重新开始。';
    } else if (isPaused) {
      statusEl.textContent = '已暂停';
    } else if (isAutoPlay) {
      statusEl.textContent = '自动游玩中';
    } else {
      statusEl.textContent = '进行中';
    }
    autoPlayButton.textContent = isAutoPlay ? '关闭自动' : '自动游玩';
    pauseButton.textContent = isPaused ? '继续' : '暂停';

    var snakeMap = new Map();
    state.snake.forEach(function (segment, index) {
      snakeMap.set(segment.x + ',' + segment.y, index);
    });

    var cells = [];
    for (var y = 0; y < state.height; y += 1) {
      for (var x = 0; x < state.width; x += 1) {
        var key = x + ',' + y;
        var className = 'cell';
        if (snakeMap.has(key)) {
          className += ' snake';
          if (snakeMap.get(key) === 0) {
            className += ' head head-' + state.direction;
          }
        } else if (state.food && state.food.x === x && state.food.y === y) {
          className += ' food';
        }
        cells.push('<div class="' + className + '"></div>');
      }
    }

    gridEl.innerHTML = cells.join('');
  }

  function stopLoop() {
    if (timerId) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  function tick() {
    if (isPaused) {
      return;
    }
    if (isAutoPlay && state.status === 'running') {
      state = core.queueDirection(state, pickAutoDirection(state));
    }
    state = core.step(state);
    if (state.status === 'game_over') {
      stopLoop();
    }
    render();
  }

  function startLoop() {
    stopLoop();
    timerId = window.setInterval(tick, TICK_MS);
  }

  function handleDirection(input) {
    if (state.status !== 'running' || isAutoPlay) {
      return;
    }
    state = core.queueDirection(state, input);
  }

  function handleAutoPlayToggle() {
    if (state.status !== 'running') {
      return;
    }
    isAutoPlay = !isAutoPlay;
    render();
  }

  function handlePauseToggle() {
    if (state.status !== 'running') {
      return;
    }
    isPaused = !isPaused;
    render();
  }

  function handleRestart() {
    state = core.restart(state);
    isPaused = false;
    render();
    startLoop();
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === ' ') {
      event.preventDefault();
      handlePauseToggle();
      return;
    }

    var mappedDirection = core.normalizeDirection(event.key);
    if (!mappedDirection) {
      return;
    }
    event.preventDefault();
    handleDirection(mappedDirection);
  });

  controlButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      handleDirection(button.getAttribute('data-direction'));
    });
  });

  autoPlayButton.addEventListener('click', handleAutoPlayToggle);
  pauseButton.addEventListener('click', handlePauseToggle);
  restartButton.addEventListener('click', handleRestart);

  render();
  startLoop();
})();
