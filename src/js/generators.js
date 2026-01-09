import Team from './Team';

/**
 * Генерирует бесконечно новых персонажей из списка
 */
export function* characterGenerator(allowedTypes, maxLevel) {
  while (true) {
    const typeIndex = Math.floor(Math.random() * allowedTypes.length);
    const CharacterClass = allowedTypes[typeIndex];
    const level = Math.floor(Math.random() * maxLevel) + 1;
    yield new CharacterClass(level);
  }
}

/**
 * Создает команду из characterCount персонажей
 */
export function generateTeam(allowedTypes, maxLevel, characterCount) {
  const team = new Team();
  const generator = characterGenerator(allowedTypes, maxLevel);

  for (let i = 0; i < characterCount; i += 1) {
    team.add(generator.next().value);
  }

  return team;
}