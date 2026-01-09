import { calcTileType, getCharacterInfo } from '../utils';
import Bowman from '../characters/Bowman';

test('should return tooltip info', () => {
    const char = new Bowman(1);
    const expected = '\u{1F396}1 \u{2694}25 \u{1F6E1}25 \u{2764}50';
    const result = getCharacterInfo(char);
    expect(result).toBe(expected);
});

test.each([
    [0, 8, 'top-left'],
    [1, 8, 'top'],
    [7, 8, 'top-right'],
    [8, 8, 'left'],
    [9, 8, 'center'],
    [15, 8, 'right'],
    [56, 8, 'bottom-left'],
    [57, 8, 'bottom'],
    [63, 8, 'bottom-right'],
])('should return %s for index %i on board size %i', (index, boardSize, expected) => {
    const result = calcTileType(index, boardSize);
    expect(result).toBe(expected);
});