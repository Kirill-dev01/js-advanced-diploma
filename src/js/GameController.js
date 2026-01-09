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
    this.level = 1; // Текущий уровень
    this.score = 0; // Очки
    this.themes = [themes.prairie, themes.desert, themes.arctic, themes.mountain];
  }

  init() {
    // При старте запускаем новую игру
    this.newGame();

    // Подписки на события
    this.gamePlay.addCellEnterListener(this.onCellEnter.bind(this));
    this.gamePlay.addCellLeaveListener(this.onCellLeave.bind(this));
    this.gamePlay.addCellClickListener(this.onCellClick.bind(this));
    this.gamePlay.addNewGameListener(this.newGame.bind(this));
    this.gamePlay.addSaveGameListener(this.onSaveGameClick.bind(this));
    this.gamePlay.addLoadGameListener(this.onLoadGameClick.bind(this));
  }

  newGame() {
    this.level = 1;
    this.score = 0;
    this.gameState.turn = 'player';
    this.selectedIndex = null;

    // Создаем стартовую команду игрока
    const playerTypes = [Bowman, Swordsman, Magician];
    const enemyTypes = [Vampire, Undead, Daemon];

    this.playerTeam = generateTeam(playerTypes, 1, 2);
    this.enemyTeam = generateTeam(enemyTypes, 1, 2);

    this.initLevel();
  }

  initLevel() {
    this.gameState.turn = 'player'; // <-- Гарантируем, что ход игрока
    this.selectedIndex = null;      // <-- ВАЖНО: Сбрасываем выделение при смене уровня

    // 1. Выбираем тему уровня
    const theme = this.themes[(this.level - 1) % 4];
    this.gamePlay.drawUi(theme);

    // 2. Расставляем персонажей
    const positionedCharacters = [];

    // Игрок (слева)
    const playerPositions = this.getStartPosition(this.playerTeam.characters.length, 'player');
    this.playerTeam.characters.forEach((character, i) => {
      positionedCharacters.push(new PositionedCharacter(character, playerPositions[i]));
    });

    // Враг (справа)
    const enemyPositions = this.getStartPosition(this.enemyTeam.characters.length, 'enemy');
    this.enemyTeam.characters.forEach((character, i) => {
      positionedCharacters.push(new PositionedCharacter(character, enemyPositions[i]));
    });

    this.positions = positionedCharacters;
    this.gamePlay.redrawPositions(positionedCharacters);
  }

  levelUp() {
    this.level += 1;

    // 1. Повышаем уровень выживших героев игрока
    this.playerTeam.characters.forEach(char => {
      char.level += 1;
      char.attack = Math.max(char.attack, char.attack * (80 + char.health) / 100);
      char.defence = Math.max(char.defence, char.defence * (80 + char.health) / 100);
      char.health = Math.min(char.health + 80, 100);
    });

    // 2. ДОБАВЛЯЕМ НОВЫХ ПОМОЩНИКОВ 
    // Генерируем 1 или 2 новых героев (зависит от сложности, добавим 1)
    // Уровень новых героев = текущий уровень - 1 (чтобы не были совсем слабыми)
    // generateTeam возвращает объект Team, нам нужен массив .characters
    const playerTypes = [Bowman, Swordsman, Magician];
    const newHelpers = generateTeam(playerTypes, this.level - 1 || 1, 1);

    newHelpers.characters.forEach(char => {
      this.playerTeam.characters.push(char);
    });

    // 3. Создаем новых врагов
    const enemyTypes = [Vampire, Undead, Daemon];
    this.enemyTeam = generateTeam(enemyTypes, this.level + 1, this.playerTeam.characters.length + 1);

    this.initLevel();
  }

  async attack(index, attacker, target) {
    const damage = Math.max(attacker.character.attack - target.character.defence, attacker.character.attack * 0.1);

    await this.gamePlay.showDamage(index, damage);

    target.character.health -= damage;

    if (target.character.health <= 0) {
      // Убираем убитого из массива позиций
      this.positions = this.positions.filter(item => item.position !== index);

      // Обновляем команды 
      if (['bowman', 'swordsman', 'magician'].includes(target.character.type)) {
        this.playerTeam.characters = this.playerTeam.characters.filter(c => c !== target.character);
      } else {
        this.enemyTeam.characters = this.enemyTeam.characters.filter(c => c !== target.character);
      }

      // ПРОВЕРКА ПОБЕДЫ ИЛИ ПОРАЖЕНИЯ
      if (this.enemyTeam.characters.length === 0) {
        this.levelUp();
        return;
      }

      if (this.playerTeam.characters.length === 0) {
        this.gamePlay.showMessage('Game Over!');

        return;
      }
    }

    this.gamePlay.redrawPositions(this.positions);

    // Смена хода
    if (this.gameState.turn === 'player') {
      this.gameState.turn = 'computer';
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

    // 1. Атака
    for (const enemy of enemyTeamPos) {
      const target = playerTeamPos.find(hero => this.canAttack(enemy, hero.position));
      if (target) {
        await this.attack(target.position, enemy, target);
        return;
      }
    }

    // 2. Движение
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

  onCellClick(index) {
    if (this.gameState.turn === 'computer') return;
    const found = this.positions.find(item => item.position === index);
    if (found) {
      if (['bowman', 'swordsman', 'magician'].includes(found.character.type)) {
        if (this.selectedIndex !== null) this.gamePlay.deselectCell(this.selectedIndex);
        this.gamePlay.selectCell(index);
        this.selectedIndex = index;
      } else {
        if (this.selectedIndex !== null) {
          const selectedChar = this.positions.find(item => item.position === this.selectedIndex);
          if (this.canAttack(selectedChar, index)) {
            this.attack(index, selectedChar, found);
          } else {
            this.gamePlay.showError('Слишком далеко для атаки!');
          }
        }
      }
    } else {
      if (this.selectedIndex !== null) {
        const selectedChar = this.positions.find(item => item.position === this.selectedIndex);
        if (this.canMove(selectedChar, index)) {
          this.gamePlay.deselectCell(this.selectedIndex);
          selectedChar.position = index;
          this.gamePlay.redrawPositions(this.positions);
          this.selectedIndex = null;
          this.gameState.turn = 'computer';
          this.enemyAction();
        }
      }
    }
  }

  onCellEnter(index) {
    const found = this.positions.find(item => item.position === index);
    if (found) {
      const message = getCharacterInfo(found.character);
      this.gamePlay.showCellTooltip(message, index);
    }
    if (this.selectedIndex !== null) {
      const selectedChar = this.positions.find(i => i.position === this.selectedIndex);
      if (index === this.selectedIndex) return;
      if (found) {
        if (['bowman', 'swordsman', 'magician'].includes(found.character.type)) {
          this.gamePlay.setCursor(cursors.pointer);
        } else {
          if (this.canAttack(selectedChar, index)) {
            this.gamePlay.setCursor(cursors.crosshair);
            this.gamePlay.selectCell(index, 'red');
          } else {
            this.gamePlay.setCursor(cursors.notallowed);
          }
        }
      } else {
        if (this.canMove(selectedChar, index)) {
          this.gamePlay.setCursor(cursors.pointer);
          this.gamePlay.selectCell(index, 'green');
        } else {
          this.gamePlay.setCursor(cursors.notallowed);
        }
      }
    }
  }

  onCellLeave(index) {
    this.gamePlay.hideCellTooltip(index);
    this.gamePlay.setCursor(cursors.auto);
    if (this.selectedIndex !== index) this.gamePlay.deselectCell(index);
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

  onSaveGameClick() {
    const state = {
      level: this.level,
      turn: this.gameState.turn,
      score: this.score,
      playerTeam: this.playerTeam, // Сохраняем команду игрока
      enemyTeam: this.enemyTeam,   // Сохраняем команду врага
      positions: this.positions    // Сохраняем текущие позиции
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
      this.gameState.turn = state.turn;

      this.playerTeam = state.playerTeam;
      this.enemyTeam = state.enemyTeam;
      this.positions = state.positions;

      // Отрисовываем то, что загрузили
      const theme = this.themes[(this.level - 1) % 4];
      this.gamePlay.drawUi(theme);
      this.gamePlay.redrawPositions(this.positions);

      this.gamePlay.showMessage('Игра загружена!');
    } catch (e) {
      this.gamePlay.showError('Не удалось загрузить игру');
    }
  }

  indexToCoords(index) {
    const boardSize = this.gamePlay.boardSize;
    return {
      row: Math.floor(index / boardSize),
      col: index % boardSize,
    };


  }
}