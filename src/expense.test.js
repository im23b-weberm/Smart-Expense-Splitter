import { describe, it, expect } from 'vitest';

// Zugriff über window (weil du es so exportierst)
const {
  createParticipant,
  createExpense,
  calculateBalances,
} = window.SES;

describe('Participant', () => {
  it('should create a valid participant', () => {
    // Arrange
    const name = "Max";

    // Act
    const result = createParticipant(name);

    // Assert
    expect(result).toBeDefined();
    expect(result.name).toBe("Max");
    expect(result.id).toBeTruthy();
    expect(result.active).toBe(true);
  });

  it('should throw error for empty name', () => {
    // Arrange
    const name = "   ";

    // Act & Assert
    expect(() => createParticipant(name)).toThrow();
  });
});

describe('Expense', () => {
  it('should create a valid expense', () => {
    // Arrange
    const params = {
      description: "Dinner",
      amount: 100,
      payerId: "p1",
      participantIds: ["p1", "p2"],
    };

    // Act
    const result = createExpense(params);

    // Assert
    expect(result.description).toBe("Dinner");
    expect(result.amount).toBe(100);
    expect(result.participantIds.length).toBe(2);
  });

  it('should throw error for invalid amount', () => {
    // Arrange
    const params = {
      description: "Dinner",
      amount: -10,
      payerId: "p1",
      participantIds: ["p1"],
    };

    // Act & Assert
    expect(() => createExpense(params)).toThrow();
  });
});

describe('calculateBalances', () => {
  it('should calculate balances correctly', () => {
    // Arrange
    const state = {
      participants: [
        { id: "p1", name: "Max" },
        { id: "p2", name: "Anna" },
      ],
      expenses: [
        {
          id: "e1",
          description: "Dinner",
          amount: 100,
          payerId: "p1",
          participantIds: ["p1", "p2"],
        },
      ],
    };

    // Act
    const result = calculateBalances(state);

    // Assert
    const p1 = result.find(p => p.participantId === "p1");
    const p2 = result.find(p => p.participantId === "p2");

    expect(p1.netBalance).toBe(50);  // paid 100, owes 50
    expect(p2.netBalance).toBe(-50); // paid 0, owes 50
  });
});