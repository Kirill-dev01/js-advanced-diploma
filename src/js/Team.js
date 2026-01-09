export default class Team {
  constructor() {
    this.characters = [];
  }

  add(character) {
    this.characters.push(character);
  }

  addAll(...characters) {
    this.characters.push(...characters);
  }

  toArray() {
    return this.characters;
  }
}