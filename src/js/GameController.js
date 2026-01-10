import themes from './themes';
import { generateTeam } from './generators';
import PositionedCharacter from './PositionedCharacter';
import { getCharacterInfo } from './utils';
import GameState from './GameState';
import cursors from './cursors';

import Bowman from './characters/Bowman';
import Swordsman from './characters/Swordsman';
import Magician from './characters/Magician';
import Vampire from './characters/Vampire';
import Undead from './characters/Undead';
import Daemon from './characters/Daemon';

export default class GameController {
  constructor(gamePlay, stateService) {
    this.gamePlay = gamePlay;
    this.stateService = stateService;
    this.gameState = new GameState();
    this.selectedIndex = null;
    this.level = 1;
    this.score = 0;
    this.themes = [themes.prairie, themes.desert, themes.arctic, themes.mountain];

    // Новое свойство для хранения подсвеченных клеток (ореол)
    this.highlightedCells = [];
  }

  init() {
    // 1. Настраиваем красивые уведомления вместо alert
    this.gamePlay.showError = (message) => {
      const errorEl = document.createElement('div');
      errorEl.textContent = message;
      errorEl.className = 'modal-message';
      errorEl.style.borderColor = 'red';
      document.body.appendChild(errorEl);
      setTimeout(() => errorEl.remove(), 3000);
    };

    this.gamePlay.showMessage = (message) => {
      const msgEl = document.createElement('div');
      msgEl.textContent = message;
      msgEl.className = 'modal-message';
      document.body.appendChild(msgEl);
      setTimeout(() => msgEl.remove(), 3000);
    };

    // 2. Загружаем рекорд
    const maxScore = localStorage.getItem('maxScore');
    this.maxScore = maxScore ? Number(maxScore) : 0;
    console.log('Current Max Score:', this.maxScore);

    // 3. Запускаем игру и вешаем слушатели
    this.newGame();

    this.gamePlay.addCellEnterListener(this.onCellEnter.bind(this));
    this.gamePlay.addCellLeaveListener(this.onCellLeave.bind(this));
    this.gamePlay.addCellClickListener(this.onCellClick.bind(this));
    this.gamePlay.addNewGameListener(this.newGame.bind(this));
    this.gamePlay.addSaveGameListener(this.onSaveGameClick.bind(this));
    this.gamePlay.addLoadGameListener(this.onLoadGameClick.bind(this));
  }

  // --- ЛОГИКА РЕКОРДОВ ---
  checkHighScore() {
    if (this.score > this.maxScore) {
      this.maxScore = this.score;
      localStorage.setItem('maxScore', this.maxScore);
      this.gamePlay.showMessage(`Новый рекорд: ${this.maxScore}!`);
    }
  }

  // --- ЛОГИКА ПОДСВЕТКИ (ОРЕОЛ) ---
  clearHighlights() {
    this.highlightedCells.forEach(index => this.gamePlay.deselectCell(index));
    this.highlightedCells = [];
  }

  highlightPossibleMoves(char) {
    this.clearHighlights(); // Сначала очищаем старое

    for (let i = 0; i < this.gamePlay.boardSize ** 2; i++) {
      if (i === char.position) continue; // Самого себя не подсвечиваем

      // 1. Атака (приоритет) - подсвечиваем только если там ВРАГ
      if (this.canAttack(char, i)) {
        const enemy = this.positions.find(p => p.position === i);
        // Если там враг (не наш)
        if (enemy && !['bowman', 'swordsman', 'magician'].includes(enemy.character.type)) {
          this.gamePlay.selectCell(i, 'red');
          this.highlightedCells.push(i);
          continue;
        }
      }

      // 2. Движение - подсвечиваем только пустые клетки
      const isOccupied = this.positions.some(p => p.position === i);
      if (!isOccupied && this.canMove(char, i)) {
        this.gamePlay.selectCell(i, 'green');
        this.highlightedCells.push(i);
      }
    }
  }

  newGame() {
    // 1. Проверяем рекорд перед сбросом
    this.checkHighScore();

    // 2. Если мы уже играли (счет > 0), показываем результат перед сбросом
    if (this.score > 0) {
      this.gamePlay.showMessage(`Новая игра! Прошлый счет: ${this.score}. Рекорд: ${this.maxScore}`);
      console.log(`Game Over. Score: ${this.score}. Max Score: ${this.maxScore}`);
    } else {
      console.log('Starting new game. Max Score:', this.maxScore);
    }

    // 3. Сбрасываем параметры для новой игры
    this.level = 1;
    this.score = 0;
    this.gameState.turn = 'player';
    this.selectedIndex = null;
    this.highlightedCells = [];

    const playerTypes = [Bowman, Swordsman, Magician];
    const enemyTypes = [Vampire, Undead, Daemon];

    this.playerTeam = generateTeam(playerTypes, 1, 2);
    this.enemyTeam = generateTeam(enemyTypes, 1, 2);

    this.initLevel();
  }

  initLevel() {
    this.gameState.turn = 'player';
    this.selectedIndex = null;
    this.clearHighlights(); // Очистка подсветки при смене уровня

    const theme = this.themes[(this.level - 1) % 4];
    this.gamePlay.drawUi(theme);

    const positionedCharacters = [];

    const playerPositions = this.getStartPosition(this.playerTeam.characters.length, 'player');
    this.playerTeam.characters.forEach((character, i) => {
      positionedCharacters.push(new PositionedCharacter(character, playerPositions[i]));
    });

    const enemyPositions = this.getStartPosition(this.enemyTeam.characters.length, 'enemy');
    this.enemyTeam.characters.forEach((character, i) => {
      positionedCharacters.push(new PositionedCharacter(character, enemyPositions[i]));
    });

    this.positions = positionedCharacters;
    this.gamePlay.redrawPositions(positionedCharacters);
  }

  levelUp() {
    this.score += 100; // Очки за прохождение уровня
    this.checkHighScore(); // Проверяем рекорд

    this.level += 1;

    this.playerTeam.characters.forEach(char => {
      char.level += 1;
      char.attack = Math.max(char.attack, char.attack * (80 + char.health) / 100);
      char.defence = Math.max(char.defence, char.defence * (80 + char.health) / 100);
      char.health = Math.min(char.health + 80, 100);
    });

    const enemyTypes = [Vampire, Undead, Daemon];
    this.enemyTeam = generateTeam(enemyTypes, this.level + 1, this.playerTeam.characters.length + 1);

    this.initLevel();
  }

  async attack(index, attacker, target) {
    const damage = Math.max(attacker.character.attack - target.character.defence, attacker.character.attack * 0.1);

    await this.gamePlay.showDamage(index, damage);

    target.character.health -= damage;

    if (target.character.health <= 0) {
      // 1. Начисляем очки за убийство
      this.score += 10;

      // 2. Удаляем персонажа с поля
      this.positions = this.positions.filter(item => item.position !== index);

      // 3. Удаляем из команды
      if (['bowman', 'swordsman', 'magician'].includes(target.character.type)) {
        this.playerTeam.characters = this.playerTeam.characters.filter(c => c !== target.character);
      } else {
        this.enemyTeam.characters = this.enemyTeam.characters.filter(c => c !== target.character);
      }

      // 4. Проверяем победу или поражение
      if (this.enemyTeam.characters.length === 0) {
        this.levelUp();
        return;
      }

      if (this.playerTeam.characters.length === 0) {
        this.checkHighScore(); // Проверка рекорда при проигрыше
        this.gamePlay.showMessage(`Game Over! Ваш счет: ${this.score}. Рекорд: ${this.maxScore}`);
        return;
      }
    }

    this.gamePlay.redrawPositions(this.positions);

    // 5. Переход хода
    if (this.gameState.turn === 'player') {
      this.gameState.turn = 'computer';
      this.clearHighlights(); // Убираем подсветку перед ходом компа
      this.gamePlay.deselectCell(this.selectedIndex);
      this.selectedIndex = null;
      this.enemyAction();
    } else {
      this.gameState.turn = 'player';
    }
  }

  async enemyAction() {
    if (this.gameState.turn !== 'computer') return;

    const enemyTeamPos = this.positions.filter(char => ['vampire', 'undead', 'daemon'].includes(char.character.type));
    const playerTeamPos = this.positions.filter(char => ['bowman', 'swordsman', 'magician'].includes(char.character.type));

    if (enemyTeamPos.length === 0 || playerTeamPos.length === 0) return;

    for (const enemy of enemyTeamPos) {
      const target = playerTeamPos.find(hero => this.canAttack(enemy, hero.position));
      if (target) {
        await this.attack(target.position, enemy, target);
        return;
      }
    }

    const randomIndex = Math.floor(Math.random() * enemyTeamPos.length);
    const enemy = enemyTeamPos[randomIndex];

    let target = null;
    let minDiff = Infinity;

    for (const hero of playerTeamPos) {
      const diff = Math.abs(enemy.position - hero.position);
      if (diff < minDiff) {
        minDiff = diff;
        target = hero;
      }
    }

    if (target) {
      const targetCoords = this.indexToCoords(target.position);
      let bestMove = null;
      let minDistance = Infinity;

      for (let i = 0; i < this.gamePlay.boardSize ** 2; i++) {
        const isOccupied = this.positions.some(item => item.position === i);
        if (!isOccupied && this.canMove(enemy, i)) {
          const moveCoords = this.indexToCoords(i);
          const distance = Math.abs(moveCoords.row - targetCoords.row) + Math.abs(moveCoords.col - targetCoords.col);
          if (distance < minDistance) {
            minDistance = distance;
            bestMove = i;
          }
        }
      }

      if (bestMove !== null) {
        enemy.position = bestMove;
        this.gamePlay.redrawPositions(this.positions);
        this.gameState.turn = 'player';
      }
    }
  }

  onCellClick(index) {
    if (this.gameState.turn === 'computer') return;
    const found = this.positions.find(item => item.position === index);

    if (found) {
      if (['bowman', 'swordsman', 'magician'].includes(found.character.type)) {
        // КЛИК ПО СВОЕМУ
        if (this.selectedIndex !== null) {
          this.gamePlay.deselectCell(this.selectedIndex);
          this.clearHighlights();
        }

        this.gamePlay.selectCell(index);
        this.selectedIndex = index;

        const selectedChar = this.positions.find(item => item.position === this.selectedIndex);
        this.highlightPossibleMoves(selectedChar);

      } else {
        // КЛИК ПО ВРАГУ
        if (this.selectedIndex !== null) {
          const selectedChar = this.positions.find(item => item.position === this.selectedIndex);
          if (this.canAttack(selectedChar, index)) {
            this.clearHighlights();
            this.attack(index, selectedChar, found);
          } else {
            // ОШИБКА: Слишком далеко для атаки
            this.gamePlay.showError('Слишком далеко для атаки!');
          }
        } else {
          // ОШИБКА: Попытка атаковать без выбранного героя
          this.gamePlay.showError('Сначала выберите своего персонажа!');
        }
      }
    } else {
      // КЛИК ПО ПУСТОЙ КЛЕТКЕ
      if (this.selectedIndex !== null) {
        const selectedChar = this.positions.find(item => item.position === this.selectedIndex);
        if (this.canMove(selectedChar, index)) {
          this.gamePlay.deselectCell(this.selectedIndex);
          this.clearHighlights();

          selectedChar.position = index;
          this.gamePlay.redrawPositions(this.positions);
          this.selectedIndex = null;
          this.gameState.turn = 'computer';
          this.enemyAction();
        } else {
          // ОШИБКА: Слишком далеко для хода (ДОБАВЛЕНО)
          this.gamePlay.showError('Слишком далеко для хода!');
        }
      } else {
        // ОШИБКА: Клик в пустоту без персонажа (ДОБАВЛЕНО, если хотите реакцию)
        // this.gamePlay.showError('Выберите персонажа для хода'); // Раскомментируйте, если нужно
      }
    }
  }

  onCellEnter(index) {
    const found = this.positions.find(item => item.position === index);
    if (found) {
      const message = getCharacterInfo(found.character);
      this.gamePlay.showCellTooltip(message, index);
    }

    // Курсоры оставляем, но выделение (selectCell) в Enter убираем,
    // чтобы не портить "Ореол", который мы нарисовали в onCellClick
    if (this.selectedIndex !== null) {
      const selectedChar = this.positions.find(i => i.position === this.selectedIndex);
      if (index === this.selectedIndex) return;

      if (found) {
        if (['bowman', 'swordsman', 'magician'].includes(found.character.type)) {
          this.gamePlay.setCursor(cursors.pointer);
        } else {
          if (this.canAttack(selectedChar, index)) {
            this.gamePlay.setCursor(cursors.crosshair);
            // Убрали selectCell('red') отсюда, так как оно уже есть в ореоле
            // Но курсор прицела оставляем
          } else {
            this.gamePlay.setCursor(cursors.notallowed);
          }
        }
      } else {
        if (this.canMove(selectedChar, index)) {
          this.gamePlay.setCursor(cursors.pointer);
          // Убрали selectCell('green') отсюда, оно есть в ореоле
        } else {
          this.gamePlay.setCursor(cursors.notallowed);
        }
      }
    }
  }

  onCellLeave(index) {
    this.gamePlay.hideCellTooltip(index);
    this.gamePlay.setCursor(cursors.auto);
    // Убираем логику deselectCell отсюда, так как очисткой теперь управляет clearHighlights
  }

  onSaveGameClick() {
    const state = {
      level: this.level,
      turn: this.gameState.turn,
      score: this.score,
      maxScore: this.maxScore, // Сохраняем и рекорд
      playerTeam: this.playerTeam,
      enemyTeam: this.enemyTeam,
      positions: this.positions
    };
    this.stateService.save(state);
    this.gamePlay.showMessage('Игра сохранена!');
  }

  onLoadGameClick() {
    try {
      const state = this.stateService.load();
      if (!state) return;

      this.level = state.level;
      this.score = state.score;
      this.maxScore = state.maxScore || 0; // Загружаем рекорд
      this.gameState.turn = state.turn;
      this.playerTeam = state.playerTeam;
      this.enemyTeam = state.enemyTeam;
      this.positions = state.positions;
      this.highlightedCells = [];

      const theme = this.themes[(this.level - 1) % 4];
      this.gamePlay.drawUi(theme);
      this.gamePlay.redrawPositions(this.positions);

      this.gamePlay.showMessage('Игра загружена!');
    } catch (e) {
      this.gamePlay.showError('Не удалось загрузить игру');
    }
  }

  getStartPosition(count, side) {
    const boardSize = this.gamePlay.boardSize;
    const possiblePositions = [];
    for (let i = 0; i < boardSize * boardSize; i++) {
      const col = i % boardSize;
      if (side === 'player') {
        if (col === 0 || col === 1) possiblePositions.push(i);
      } else {
        if (col === boardSize - 2 || col === boardSize - 1) possiblePositions.push(i);
      }
    }
    const positions = [];
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * possiblePositions.length);
      positions.push(possiblePositions[randomIndex]);
      possiblePositions.splice(randomIndex, 1);
    }
    return positions;
  }

  canMove(positionedChar, targetIndex) {
    const range = this.getRange(positionedChar.character.type, 'move');
    const { row: r1, col: c1 } = this.indexToCoords(positionedChar.position);
    const { row: r2, col: c2 } = this.indexToCoords(targetIndex);
    const diffRow = Math.abs(r1 - r2);
    const diffCol = Math.abs(c1 - c2);
    const isStraight = diffRow === 0 || diffCol === 0;
    const isDiagonal = diffRow === diffCol;
    if (!isStraight && !isDiagonal) return false;
    return Math.max(diffRow, diffCol) <= range;
  }

  canAttack(positionedChar, targetIndex) {
    const range = this.getRange(positionedChar.character.type, 'attack');
    const { row: r1, col: c1 } = this.indexToCoords(positionedChar.position);
    const { row: r2, col: c2 } = this.indexToCoords(targetIndex);
    const diffRow = Math.abs(r1 - r2);
    const diffCol = Math.abs(c1 - c2);
    return Math.max(diffRow, diffCol) <= range;
  }

  getRange(type, action) {
    const ranges = {
      swordsman: { move: 4, attack: 1 },
      undead: { move: 4, attack: 1 },
      bowman: { move: 2, attack: 2 },
      vampire: { move: 2, attack: 2 },
      magician: { move: 1, attack: 4 },
      daemon: { move: 1, attack: 4 },
    };
    return ranges[type][action];
  }

  indexToCoords(index) {
    const boardSize = this.gamePlay.boardSize;
    return {
      row: Math.floor(index / boardSize),
      col: index % boardSize,
    };
  }
}