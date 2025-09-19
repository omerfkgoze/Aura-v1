import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CalculatorDisguiseScreen } from '../CalculatorDisguiseScreen';

describe('CalculatorDisguiseScreen', () => {
  describe('Accessibility & Authenticity', () => {
    it('renders with proper accessibility structure', () => {
      const { getByText } = render(<CalculatorDisguiseScreen />);

      // Essential calculator elements should be present
      expect(getByText('0')).toBeDefined(); // Display
      expect(getByText('C')).toBeDefined(); // Clear button
      expect(getByText('=')).toBeDefined(); // Equals button

      // All number buttons should be present
      for (let i = 0; i <= 9; i++) {
        expect(getByText(i.toString())).toBeDefined();
      }

      // All operator buttons should be present
      expect(getByText('+')).toBeDefined();
      expect(getByText('-')).toBeDefined();
      expect(getByText('×')).toBeDefined();
      expect(getByText('÷')).toBeDefined();
    });

    it('has authentic calculator visual appearance', () => {
      const { getByText } = render(<CalculatorDisguiseScreen />);

      const display = getByText('0');
      const clearButton = getByText('C');
      const numberButton = getByText('1');
      const operatorButton = getByText('+');

      // Display should exist and be visible
      expect(display).toBeDefined();

      // Buttons should exist
      expect(clearButton).toBeDefined();
      expect(numberButton).toBeDefined();
      expect(operatorButton).toBeDefined();
    });

    it('provides functional calculator operations for authenticity', () => {
      const { getByText } = render(<CalculatorDisguiseScreen />);

      // Test basic addition: 2 + 3 = 5
      fireEvent.press(getByText('2'));
      expect(getByText('2')).toBeDefined();

      fireEvent.press(getByText('+'));
      fireEvent.press(getByText('3'));
      expect(getByText('3')).toBeDefined();

      fireEvent.press(getByText('='));
      expect(getByText('5')).toBeDefined();
    });

    it('handles clear functionality correctly', () => {
      const { getByText } = render(<CalculatorDisguiseScreen />);

      // Enter some numbers
      fireEvent.press(getByText('1'));
      fireEvent.press(getByText('2'));
      fireEvent.press(getByText('3'));
      expect(getByText('123')).toBeDefined();

      // Clear should reset to 0
      fireEvent.press(getByText('C'));
      expect(getByText('0')).toBeDefined();
    });

    it('supports multiple consecutive operations', () => {
      const { getByText } = render(<CalculatorDisguiseScreen />);

      // Test: 5 + 3 - 2 = 6
      fireEvent.press(getByText('5'));
      fireEvent.press(getByText('+'));
      fireEvent.press(getByText('3'));
      fireEvent.press(getByText('-'));
      fireEvent.press(getByText('2'));
      fireEvent.press(getByText('='));

      expect(getByText('6')).toBeDefined();
    });

    it('handles decimal point operations', () => {
      const { getByText } = render(<CalculatorDisguiseScreen />);

      // Test decimal input
      fireEvent.press(getByText('1'));
      fireEvent.press(getByText('.'));
      fireEvent.press(getByText('5'));

      expect(getByText('1.5')).toBeDefined();
    });
  });

  describe('Stealth Mode Security', () => {
    it('appears as legitimate calculator app', () => {
      const { getByText, queryByText } = render(<CalculatorDisguiseScreen />);

      // Should have typical calculator interface
      expect(getByText('0')).toBeDefined();
      expect(getByText('C')).toBeDefined();

      // Should NOT have any menstrual tracking indicators
      expect(queryByText('Cycle')).toBeNull();
      expect(queryByText('Period')).toBeNull();
      expect(queryByText('Menstrual')).toBeNull();
      expect(queryByText('Tracking')).toBeNull();
      expect(queryByText('Aura')).toBeNull();
    });

    it('provides complete calculator functionality for scrutiny', () => {
      const { getByText } = render(<CalculatorDisguiseScreen />);

      // Test all basic operations work correctly
      const operations = [
        { sequence: ['8', '÷', '2', '='], expected: '4' },
        { sequence: ['C', '3', '×', '4', '='], expected: '12' },
        { sequence: ['C', '1', '0', '-', '7', '='], expected: '3' },
        { sequence: ['C', '6', '+', '4', '='], expected: '10' },
      ];

      operations.forEach(({ sequence, expected }) => {
        sequence.forEach(button => {
          fireEvent.press(getByText(button));
        });
        expect(getByText(expected)).toBeDefined();
      });
    });

    it('handles complex calculations naturally', () => {
      const { getByText } = render(<CalculatorDisguiseScreen />);

      // Test: 15 ÷ 3 × 2 + 1 = 11
      fireEvent.press(getByText('1'));
      fireEvent.press(getByText('5'));
      fireEvent.press(getByText('÷'));
      fireEvent.press(getByText('3'));
      fireEvent.press(getByText('×'));
      fireEvent.press(getByText('2'));
      fireEvent.press(getByText('+'));
      fireEvent.press(getByText('1'));
      fireEvent.press(getByText('='));

      expect(getByText('11')).toBeDefined();
    });

    it('behaves consistently under rapid interactions', () => {
      const { getByText } = render(<CalculatorDisguiseScreen />);

      // Rapid button pressing should not break functionality
      const rapidSequence = ['1', '2', '3', '+', '4', '5', '6', '='];

      rapidSequence.forEach(button => {
        fireEvent.press(getByText(button));
      });

      expect(getByText('579')).toBeDefined(); // 123 + 456 = 579
    });

    it('maintains visual consistency throughout interactions', () => {
      const { getByText } = render(<CalculatorDisguiseScreen />);

      // Multiple operations should maintain calculator appearance
      fireEvent.press(getByText('9'));
      fireEvent.press(getByText('9'));
      fireEvent.press(getByText('9'));
      expect(getByText('999')).toBeDefined();

      fireEvent.press(getByText('C'));
      expect(getByText('0')).toBeDefined();

      // Should still look like calculator after operations
      expect(getByText('1')).toBeDefined();
      expect(getByText('+')).toBeDefined();
      expect(getByText('=')).toBeDefined();
    });
  });

  describe('Cultural Authenticity', () => {
    it('uses universally recognizable calculator symbols', () => {
      const { getByText } = render(<CalculatorDisguiseScreen />);

      // Mathematical symbols that are culturally universal
      expect(getByText('+')).toBeDefined(); // Addition
      expect(getByText('-')).toBeDefined(); // Subtraction
      expect(getByText('×')).toBeDefined(); // Multiplication
      expect(getByText('÷')).toBeDefined(); // Division
      expect(getByText('=')).toBeDefined(); // Equals
      expect(getByText('.')).toBeDefined(); // Decimal point
      expect(getByText('C')).toBeDefined(); // Clear
    });

    it('follows standard calculator layout conventions', () => {
      const { getByText } = render(<CalculatorDisguiseScreen />);

      // Standard calculator layout elements should be present
      // Numbers 0-9, operators, clear, equals
      const standardElements = [
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '+',
        '-',
        '×',
        '÷',
        '=',
        'C',
        '.',
      ];

      standardElements.forEach(element => {
        expect(getByText(element)).toBeDefined();
      });
    });

    it('provides expected calculator user experience', () => {
      const { getByText } = render(<CalculatorDisguiseScreen />);

      // User should be able to perform typical calculations
      // that someone might naturally do on a calculator

      // Calculate a tip: 50 × 0.15 = 7.5 (15% tip on $50)
      fireEvent.press(getByText('5'));
      fireEvent.press(getByText('0'));
      fireEvent.press(getByText('×'));
      fireEvent.press(getByText('0'));
      fireEvent.press(getByText('.'));
      fireEvent.press(getByText('1'));
      fireEvent.press(getByText('5'));
      fireEvent.press(getByText('='));

      expect(getByText('7.5')).toBeDefined();
    });
  });
});
