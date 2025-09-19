import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';

export const CalculatorDisguiseScreen: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputNumber = (num: string) => {
    if (waitingForOperand) {
      setDisplay(num);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const inputOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue: number, secondValue: number, operation: string): number => {
    switch (operation) {
      case '+':
        return firstValue + secondValue;
      case '-':
        return firstValue - secondValue;
      case '×':
        return firstValue * secondValue;
      case '÷':
        return firstValue / secondValue;
      case '=':
        return secondValue;
      default:
        return secondValue;
    }
  };

  const performCalculation = () => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      setDisplay(String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const Button: React.FC<{
    onPress: () => void;
    title: string;
    type?: 'number' | 'operator' | 'action';
  }> = ({ onPress, title, type = 'number' }) => (
    <TouchableOpacity
      style={[
        styles.button,
        type === 'operator' && styles.operatorButton,
        type === 'action' && styles.actionButton,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.buttonText,
          type === 'operator' && styles.operatorButtonText,
          type === 'action' && styles.actionButtonText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.displayContainer}>
        <Text style={styles.display}>{display}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <View style={styles.row}>
          <Button onPress={clear} title="C" type="action" />
          <Button onPress={() => {}} title="±" type="action" />
          <Button onPress={() => {}} title="%" type="action" />
          <Button onPress={() => inputOperation('÷')} title="÷" type="operator" />
        </View>

        <View style={styles.row}>
          <Button onPress={() => inputNumber('7')} title="7" />
          <Button onPress={() => inputNumber('8')} title="8" />
          <Button onPress={() => inputNumber('9')} title="9" />
          <Button onPress={() => inputOperation('×')} title="×" type="operator" />
        </View>

        <View style={styles.row}>
          <Button onPress={() => inputNumber('4')} title="4" />
          <Button onPress={() => inputNumber('5')} title="5" />
          <Button onPress={() => inputNumber('6')} title="6" />
          <Button onPress={() => inputOperation('-')} title="-" type="operator" />
        </View>

        <View style={styles.row}>
          <Button onPress={() => inputNumber('1')} title="1" />
          <Button onPress={() => inputNumber('2')} title="2" />
          <Button onPress={() => inputNumber('3')} title="3" />
          <Button onPress={() => inputOperation('+')} title="+" type="operator" />
        </View>

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.button, styles.zeroButton]}
            onPress={() => inputNumber('0')}
          >
            <Text style={styles.buttonText}>0</Text>
          </TouchableOpacity>
          <Button onPress={() => inputNumber('.')} title="." />
          <Button onPress={performCalculation} title="=" type="operator" />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  displayContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 20,
  },
  display: {
    fontSize: 64,
    color: '#FFFFFF',
    fontWeight: '200',
  },
  buttonContainer: {
    paddingBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zeroButton: {
    width: 170,
    borderRadius: 40,
  },
  operatorButton: {
    backgroundColor: '#FF9500',
  },
  actionButton: {
    backgroundColor: '#A6A6A6',
  },
  buttonText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  operatorButtonText: {
    color: '#FFFFFF',
  },
  actionButtonText: {
    color: '#000000',
  },
});
