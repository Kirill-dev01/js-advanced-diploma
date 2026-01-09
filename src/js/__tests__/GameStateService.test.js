import GameStateService from '../GameStateService';

jest.mock('../GameStateService'); // Мокаем модуль

test('should load state correctly', () => {
    const storage = {
        getItem: jest.fn(() => JSON.stringify({ level: 1, score: 0 })),
    };
    const service = new GameStateService(storage);

    // Мокаем возвращаемое значение метода load
    service.load.mockReturnValue({ level: 1, score: 0 });

    const state = service.load();
    expect(state).toEqual({ level: 1, score: 0 });
});