const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let cellSize = 20;
let grid: number[][] = [];
let intervalId: number | null = null;
let running = false;
let isDragging = false;
let dragMode: 0 | 1 | null = null;
let lastMouseX = 0;
let lastMouseY = 0;

let viewOffsetX = 0;
let viewOffsetY = 0;

const MIN_CELL_SIZE = 4;
const MAX_CELL_SIZE = 80;

// 최초 초기 격자 생성
function ensureGridSize(rows: number, cols: number) {
  const currentRows = grid.length;
  const currentCols = grid[0]?.length || 0;

  while (grid.length < rows) {
    grid.push(Array(currentCols).fill(0));
  }
  for (let row of grid) {
    while (row.length < cols) {
      row.push(0);
    }
  }
}

// 격자 확장 (끝에 닿으면 확장)
function extendGridIfNeeded() {
  const buffer = 5; // 여유공간
  const maxY = viewOffsetY + Math.ceil(canvas.height / cellSize);
  const maxX = viewOffsetX + Math.ceil(canvas.width / cellSize);
  ensureGridSize(maxY + buffer, maxX + buffer);
}

// 화면이 왼쪽/위로 나가면 앞쪽으로 확장
function expandGridBeforeViewport() {
  if (viewOffsetX < 0) {
    const amount = -viewOffsetX;
    for (let row of grid) {
      for (let i = 0; i < amount; i++) {
        row.unshift(0);
      }
    }
    viewOffsetX = 0;
  }

  if (viewOffsetY < 0) {
    const width = grid[0]?.length || 0;
    const amount = -viewOffsetY;
    for (let i = 0; i < amount; i++) {
      grid.unshift(Array(width).fill(0));
    }
    viewOffsetY = 0;
  }
}

// 격자 그리기 (viewport만)
function drawGrid(grid: number[][]) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#444';

  const visibleCols = Math.floor(canvas.width / cellSize);
  const visibleRows = Math.floor(canvas.height / cellSize);

  for (let y = 0; y < visibleRows; y++) {
    for (let x = 0; x < visibleCols; x++) {
      const gx = x + viewOffsetX;
      const gy = y + viewOffsetY;

      if (grid[gy]?.[gx] === 1) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }

      ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }
}

// 드래그 → 오프셋 포함 좌표로 셀 토글
document.addEventListener('keydown', (e) => {
  const step = 1;
  switch (e.key) {
    case 'ArrowUp':
      viewOffsetY -= step;
      break;
    case 'ArrowDown':
      viewOffsetY += step;
      break;
    case 'ArrowLeft':
      viewOffsetX -= step;
      break;
    case 'ArrowRight':
      viewOffsetX += step;
      break;
  }
  drawGrid(grid);
});

// 드래그 시작
canvas.addEventListener('mousedown', (e) => {
  isDragging = true;
  canvas.style.cursor = 'grabbing';

  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / cellSize) + viewOffsetX;
  const y = Math.floor((e.clientY - rect.top) / cellSize) + viewOffsetY;

  ensureGridSize(y + 1, x + 1);

  // 셀 토글처럼 작동 + 드래그 기준값 설정
  dragMode = grid[y][x] === 1 ? 0 : 1;
  grid[y][x] = dragMode;
  drawGrid(grid);
});

// 드래그 중
canvas.addEventListener('mousemove', (e) => {
  if (!isDragging || dragMode === null) return;

  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / cellSize) + viewOffsetX;
  const y = Math.floor((e.clientY - rect.top) / cellSize) + viewOffsetY;

  ensureGridSize(y + 1, x + 1);
  if (grid[y][x] !== dragMode) {
    grid[y][x] = dragMode;
    drawGrid(grid);
  }
});

// 드래그 종료
canvas.addEventListener('mouseup', () => {
  isDragging = false;
  dragMode = null;
  canvas.style.cursor = 'default';
});

// 드래그 중 마우스 나가면 종료
canvas.addEventListener('mouseleave', () => {
  isDragging = false;
  dragMode = null;
  canvas.style.cursor = 'default';
});

// zoom (휠)
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -1 : 1;
  const newCellSize = cellSize + delta;

  if (newCellSize >= MIN_CELL_SIZE && newCellSize <= MAX_CELL_SIZE) {
    cellSize = newCellSize;

    expandGridBeforeViewport(); // 위/왼쪽 확장
    extendGridIfNeeded(); // 아래/오른쪽 확장

    drawGrid(grid);
  }
});
// 이웃 셀 계산
function countAliveNeighbors(grid: number[][], x: number, y: number): number {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (grid[ny]?.[nx] === 1) {
        count++;
      }
    }
  }
  return count;
}

// 다음 세대 계산
function nextGeneration(grid: number[][]): number[][] {
  const newGrid = grid.map((row, y) =>
    row.map((cell, x) => {
      const neighbors = countAliveNeighbors(grid, x, y);
      if (cell === 1 && (neighbors < 2 || neighbors > 3)) return 0;
      if (cell === 0 && neighbors === 3) return 1;
      return cell;
    })
  );
  return newGrid;
}

// 시뮬레이션 1틱
function tick() {
  expandGridBeforeViewport();
  extendGridIfNeeded();
  grid = nextGeneration(grid);
  drawGrid(grid);
}

// 실행 컨트롤
function startSimulation() {
  if (running) return;
  running = true;
  intervalId = setInterval(tick, 100);
}

function stopSimulation() {
  running = false;
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

// 리사이즈
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  drawGrid(grid);
});

// 버튼
document.getElementById('startBtn')?.addEventListener('click', startSimulation);
document.getElementById('stopBtn')?.addEventListener('click', stopSimulation);
document.getElementById('resetBtn')?.addEventListener('click', () => {
  stopSimulation();
  grid = [];
  drawGrid(grid);
});

// 초기 실행
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
ensureGridSize(50, 50); // 최초 최소 사이즈
drawGrid(grid);
