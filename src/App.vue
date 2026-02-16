<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  createInitialState,
  normalizeDirection,
  queueDirection,
  restart,
  step,
  type Direction,
  type SnakeState
} from './snake-core.ts';

const GRID_SIZE = 25;
const TICK_MS = 140;

const state = ref<SnakeState>(
  createInitialState({ width: GRID_SIZE, height: GRID_SIZE })
);
const isPaused = ref(false);
const isAutoPlay = ref(false);
let timerId: number | null = null;

function isOppositeDirection(a: Direction, b: Direction): boolean {
  return (
    (a === 'up' && b === 'down') ||
    (a === 'down' && b === 'up') ||
    (a === 'left' && b === 'right') ||
    (a === 'right' && b === 'left')
  );
}

function getNextHead(inputState: SnakeState, direction: Direction) {
  const head = inputState.snake[0];
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

function isCellInList(cell: { x: number; y: number }, list: { x: number; y: number }[]) {
  for (let i = 0; i < list.length; i += 1) {
    if (list[i].x === cell.x && list[i].y === cell.y) {
      return true;
    }
  }
  return false;
}

function willCollide(inputState: SnakeState, direction: Direction): boolean {
  const nextHead = getNextHead(inputState, direction);
  const outOfBounds =
    nextHead.x < 0 ||
    nextHead.x >= inputState.width ||
    nextHead.y < 0 ||
    nextHead.y >= inputState.height;
  if (outOfBounds) {
    return true;
  }

  const eatsFood =
    inputState.food !== null &&
    nextHead.x === inputState.food.x &&
    nextHead.y === inputState.food.y;
  const bodyToCheck = eatsFood
    ? inputState.snake
    : inputState.snake.slice(0, inputState.snake.length - 1);
  return isCellInList(nextHead, bodyToCheck);
}

function distanceToFood(inputState: SnakeState, direction: Direction): number {
  if (!inputState.food) {
    return 0;
  }
  const nextHead = getNextHead(inputState, direction);
  return (
    Math.abs(nextHead.x - inputState.food.x) +
    Math.abs(nextHead.y - inputState.food.y)
  );
}

function pickAutoDirection(inputState: SnakeState): Direction {
  const candidates: Direction[] = ['up', 'down', 'left', 'right'];
  const safe: Direction[] = [];

  for (let i = 0; i < candidates.length; i += 1) {
    const direction = candidates[i];
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

  safe.sort((a, b) => {
    const distanceA = distanceToFood(inputState, a);
    const distanceB = distanceToFood(inputState, b);
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

const statusText = computed(() => {
  if (state.value.status === 'game_over') {
    return '游戏结束，请点击重新开始。';
  }
  if (isPaused.value) {
    return '已暂停';
  }
  if (isAutoPlay.value) {
    return '自动游玩中';
  }
  return '进行中';
});

const autoPlayButtonText = computed(() =>
  isAutoPlay.value ? '关闭自动' : '自动游玩'
);
const pauseButtonText = computed(() => (isPaused.value ? '继续' : '暂停'));

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${state.value.width}, 1fr)`,
  gridTemplateRows: `repeat(${state.value.height}, 1fr)`
}));

const cellClassList = computed(() => {
  const snakeMap = new Map<string, number>();
  state.value.snake.forEach((segment, index) => {
    snakeMap.set(`${segment.x},${segment.y}`, index);
  });

  const classes: string[] = [];
  for (let y = 0; y < state.value.height; y += 1) {
    for (let x = 0; x < state.value.width; x += 1) {
      const key = `${x},${y}`;
      let className = 'cell';
      if (snakeMap.has(key)) {
        className += ' snake';
        if (snakeMap.get(key) === 0) {
          className += ` head head-${state.value.direction}`;
        }
      } else if (state.value.food && state.value.food.x === x && state.value.food.y === y) {
        className += ' food';
      }
      classes.push(className);
    }
  }
  return classes;
});

function stopLoop() {
  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

function tick() {
  if (isPaused.value) {
    return;
  }
  if (isAutoPlay.value && state.value.status === 'running') {
    state.value = queueDirection(state.value, pickAutoDirection(state.value));
  }
  state.value = step(state.value);
  if (state.value.status === 'game_over') {
    stopLoop();
  }
}

function startLoop() {
  stopLoop();
  timerId = window.setInterval(tick, TICK_MS);
}

function handleDirection(input: string) {
  if (state.value.status !== 'running' || isAutoPlay.value) {
    return;
  }
  state.value = queueDirection(state.value, input);
}

function handleAutoPlayToggle() {
  if (state.value.status !== 'running') {
    return;
  }
  isAutoPlay.value = !isAutoPlay.value;
}

function handlePauseToggle() {
  if (state.value.status !== 'running') {
    return;
  }
  isPaused.value = !isPaused.value;
}

function handleRestart() {
  state.value = restart(state.value);
  isPaused.value = false;
  startLoop();
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === ' ') {
    event.preventDefault();
    handlePauseToggle();
    return;
  }

  const mappedDirection = normalizeDirection(event.key);
  if (!mappedDirection) {
    return;
  }
  event.preventDefault();
  handleDirection(mappedDirection);
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  startLoop();
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
  stopLoop();
});
</script>

<template>
  <main class="container">
    <h1>贪吃蛇</h1>
    <section class="panel">
      <p>分数：<span>{{ state.score }}</span></p>
      <p>{{ statusText }}</p>
      <button type="button" @click="handleAutoPlayToggle">{{ autoPlayButtonText }}</button>
      <button type="button" @click="handlePauseToggle">{{ pauseButtonText }}</button>
      <button type="button" @click="handleRestart">重新开始</button>
    </section>

    <section class="grid" aria-label="贪吃蛇网格" :style="gridStyle">
      <div
        v-for="(className, index) in cellClassList"
        :key="index"
        :class="className"
      />
    </section>

    <section class="controls" aria-label="方向控制">
      <button type="button" @click="handleDirection('up')">上</button>
      <div class="controls-row">
        <button type="button" @click="handleDirection('left')">左</button>
        <button type="button" @click="handleDirection('down')">下</button>
        <button type="button" @click="handleDirection('right')">右</button>
      </div>
    </section>

    <p class="hint">使用方向键或 WASD 控制，空格键可暂停，也可开启自动游玩。</p>
  </main>
</template>
