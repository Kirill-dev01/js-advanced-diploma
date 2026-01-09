export default class Character {
  constructor(level, type = 'generic') {
    this.level = level;
    this.attack = 0;
    this.defence = 0;
    this.health = 50;
    this.type = type;

    // Важное требование: запрещаем создавать new Character()
    if (new.target === Character) {
      throw new Error('Cannot create an instance of Character directly class');
    }
  }
}