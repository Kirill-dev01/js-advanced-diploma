export function calcTileType(index, boardSize) {
  const topLeft = 0;
  const topRight = boardSize - 1;
  const bottomLeft = boardSize * (boardSize - 1);
  const bottomRight = boardSize * boardSize - 1;

  // Углы
  if (index === topLeft) return 'top-left';
  if (index === topRight) return 'top-right';
  if (index === bottomLeft) return 'bottom-left';
  if (index === bottomRight) return 'bottom-right';

  // Границы
  if (index > topLeft && index < topRight) return 'top';
  if (index > bottomLeft && index < bottomRight) return 'bottom';
  if (index % boardSize === 0) return 'left';
  if ((index + 1) % boardSize === 0) return 'right';

  return 'center';
}

export function calcHealthLevel(health) {
  if (health < 15) {
    return 'critical';
  }

  if (health < 50) {
    return 'normal';
  }

  return 'high';
}

export function getCharacterInfo(character) {
  return `\u{1F396}${character.level} \u{2694}${character.attack} \u{1F6E1}${character.defence} \u{2764}${character.health}`;
}