const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/snake-core.js');

function stateWith(overrides) {
  return {
    width: 6,
    height: 6,
    snake: [
      { x: 2, y: 2 },
      { x: 1, y: 2 },
      { x: 0, y: 2 }
    ],
    direction: 'right',
    pendingDirection: null,
    food: { x: 5, y: 5 },
    score: 0,
    status: 'running',
    ...overrides
  };
}

test('step moves snake one cell in current direction', () => {
  const next = core.step(stateWith());
  assert.deepEqual(next.snake, [
    { x: 3, y: 2 },
    { x: 2, y: 2 },
    { x: 1, y: 2 }
  ]);
  assert.equal(next.score, 0);
});

test('queueDirection blocks immediate reversal', () => {
  const next = core.queueDirection(stateWith(), 'left');
  assert.equal(next.pendingDirection, null);
});

test('snake grows and score increments when food is eaten', () => {
  const rng = () => 0;
  const start = stateWith({ food: { x: 3, y: 2 } });
  const next = core.step(start, rng);

  assert.equal(next.score, 1);
  assert.equal(next.snake.length, 4);
  assert.deepEqual(next.snake[0], { x: 3, y: 2 });
  assert.notDeepEqual(next.food, { x: 3, y: 2 });
});

test('step ends game on wall collision', () => {
  const start = stateWith({
    snake: [
      { x: 5, y: 2 },
      { x: 4, y: 2 },
      { x: 3, y: 2 }
    ]
  });
  const next = core.step(start);
  assert.equal(next.status, 'game_over');
});

test('step ends game on self collision', () => {
  const start = stateWith({
    snake: [
      { x: 2, y: 2 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 3, y: 2 },
      { x: 3, y: 3 },
      { x: 2, y: 3 },
      { x: 1, y: 3 },
      { x: 1, y: 2 }
    ],
    direction: 'up',
    food: { x: 0, y: 0 }
  });
  const turned = core.queueDirection(start, 'right');
  const next = core.step(turned);

  assert.equal(next.status, 'game_over');
});

test('pickFood returns null when no empty cells', () => {
  const food = core.pickFood(2, 2, [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 }
  ]);
  assert.equal(food, null);
});
