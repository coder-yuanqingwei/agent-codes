export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Point {
  x: number;
  y: number;
}

export interface SnakeState {
  width: number;
  height: number;
  snake: Point[];
  direction: Direction;
  pendingDirection: Direction | null;
  food: Point | null;
  score: number;
  status: 'running' | 'game_over';
}

type Rng = () => number;

export const DIRECTIONS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

export const INPUT_TO_DIRECTION: Record<string, Direction> = {
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

interface InitialOptions {
  width?: number;
  height?: number;
  rng?: Rng;
}

function keyOf(point: Point): string {
  return `${point.x},${point.y}`;
}

function isOpposite(a: Direction, b: Direction): boolean {
  return (
    (a === 'up' && b === 'down') ||
    (a === 'down' && b === 'up') ||
    (a === 'left' && b === 'right') ||
    (a === 'right' && b === 'left')
  );
}

export function normalizeDirection(input: string | null | undefined): Direction | null {
  if (!input) {
    return null;
  }

  if (input in DIRECTIONS) {
    return input as Direction;
  }

  return INPUT_TO_DIRECTION[input] ?? null;
}

function getEmptyCells(width: number, height: number, snake: Point[]): Point[] {
  const occupied = new Set(snake.map(keyOf));
  const cells: Point[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!occupied.has(`${x},${y}`)) {
        cells.push({ x, y });
      }
    }
  }

  return cells;
}

export function pickFood(
  width: number,
  height: number,
  snake: Point[],
  rng?: Rng
): Point | null {
  const emptyCells = getEmptyCells(width, height, snake);
  if (emptyCells.length === 0) {
    return null;
  }

  const random = typeof rng === 'function' ? rng : Math.random;
  const index = Math.floor(random() * emptyCells.length);
  return emptyCells[index];
}

export function createInitialState(options?: InitialOptions): SnakeState {
  const width = options?.width ?? 16;
  const height = options?.height ?? 16;
  const startX = Math.floor(width / 2);
  const startY = Math.floor(height / 2);

  const snake: Point[] = [
    { x: startX, y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY }
  ];

  return {
    width,
    height,
    snake,
    direction: 'right',
    pendingDirection: null,
    food: pickFood(width, height, snake, options?.rng),
    score: 0,
    status: 'running'
  };
}

export function queueDirection(state: SnakeState, inputDirection: string): SnakeState {
  const nextDirection = normalizeDirection(inputDirection);
  if (!nextDirection || state.status !== 'running') {
    return state;
  }

  const baseDirection = state.pendingDirection ?? state.direction;
  if (state.snake.length > 1 && isOpposite(nextDirection, baseDirection)) {
    return state;
  }

  return { ...state, pendingDirection: nextDirection };
}

function hasCollision(point: Point, cells: Point[]): boolean {
  const pointKey = keyOf(point);
  for (let i = 0; i < cells.length; i += 1) {
    if (keyOf(cells[i]) === pointKey) {
      return true;
    }
  }
  return false;
}

export function step(state: SnakeState, rng?: Rng): SnakeState {
  if (state.status !== 'running') {
    return state;
  }

  const direction = state.pendingDirection ?? state.direction;
  const delta = DIRECTIONS[direction];
  const head = state.snake[0];
  const nextHead = { x: head.x + delta.x, y: head.y + delta.y };

  const outOfBounds =
    nextHead.x < 0 ||
    nextHead.x >= state.width ||
    nextHead.y < 0 ||
    nextHead.y >= state.height;

  if (outOfBounds) {
    return {
      ...state,
      direction,
      pendingDirection: null,
      status: 'game_over'
    };
  }

  const eatsFood = Boolean(
    state.food && nextHead.x === state.food.x && nextHead.y === state.food.y
  );

  const bodyToCheck = eatsFood
    ? state.snake
    : state.snake.slice(0, state.snake.length - 1);

  if (hasCollision(nextHead, bodyToCheck)) {
    return {
      ...state,
      direction,
      pendingDirection: null,
      status: 'game_over'
    };
  }

  const nextSnake = [nextHead, ...state.snake];
  if (!eatsFood) {
    nextSnake.pop();
  }

  return {
    width: state.width,
    height: state.height,
    snake: nextSnake,
    direction,
    pendingDirection: null,
    food: eatsFood ? pickFood(state.width, state.height, nextSnake, rng) : state.food,
    score: eatsFood ? state.score + 1 : state.score,
    status: 'running'
  };
}

export function restart(state: SnakeState, rng?: Rng): SnakeState {
  return createInitialState({ width: state.width, height: state.height, rng });
}
