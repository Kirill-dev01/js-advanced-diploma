import Character from '../Character';
import Bowman from '../characters/Bowman';

test('should throw error if new Character() is called', () => {
    // Исправили текст ошибки на тот, который у вас в коде
    expect(() => new Character(1)).toThrow('Cannot create an instance of Character directly class');
});

test('should create Bowman instance', () => {
    const char = new Bowman(1);
    expect(char).toEqual({
        level: 1,
        attack: 25,
        defence: 25,
        health: 50,
        type: 'bowman',
    });
});