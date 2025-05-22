// tests/frontend/app.test.js
const getGreeting = require('../../js/app.js');

describe('App Tests', () => {
  test('getGreeting should return a friendly message', () => {
    expect(getGreeting()).toBe("Hello from app.js!");
  });
});
