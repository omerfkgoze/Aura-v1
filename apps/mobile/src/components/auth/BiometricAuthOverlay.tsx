import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, Alert } from 'react-native';
import { YStack, XStack } from '@tamagui/stacks';
import { Text, Button } from '../ui';

interface BiometricAuthOverlayProps {
  visible: boolean;
  onAuthenticated: () => void;
  onCancel: () => void;
}

export const BiometricAuthOverlay: React.FC<BiometricAuthOverlayProps> = ({
  visible,
  onAuthenticated,
  onCancel,
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [authMethod, setAuthMethod] = useState<'biometric' | 'pin'>('biometric');

  useEffect(() => {
    if (visible && authMethod === 'biometric') {
      attemptBiometricAuth();
    }
  }, [visible, authMethod]);

  const attemptBiometricAuth = async () => {
    setIsAuthenticating(true);

    try {
      // TODO: Implement actual biometric authentication
      // For now, simulate biometric authentication
      setTimeout(() => {
        setIsAuthenticating(false);
        // Simulate success for demo purposes
        onAuthenticated();
      }, 2000);
    } catch (error) {
      setIsAuthenticating(false);
      Alert.alert('Biometric Authentication Failed', 'Please use PIN instead.', [
        { text: 'OK', onPress: () => setAuthMethod('pin') },
      ]);
    }
  };

  const handlePinSubmit = () => {
    // TODO: Implement actual PIN verification
    // For now, accept any 4-digit PIN
    if (pinInput.length === 4) {
      onAuthenticated();
      setPinInput('');
    } else {
      Alert.alert('Invalid PIN', 'Please enter a 4-digit PIN');
    }
  };

  const addPinDigit = (digit: string) => {
    if (pinInput.length < 4) {
      setPinInput(pinInput + digit);
    }
  };

  const removePinDigit = () => {
    setPinInput(pinInput.slice(0, -1));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <YStack
          backgroundColor="$background"
          padding="$6"
          borderRadius="$4"
          space="$4"
          minWidth={300}
          alignItems="center"
        >
          {authMethod === 'biometric' ? (
            <>
              <Text variant="heading" size="lg">
                🔐
              </Text>
              <Text variant="subheading" textAlign="center">
                {isAuthenticating ? 'Authenticating...' : 'Touch ID / Face ID'}
              </Text>
              <Text variant="caption" textAlign="center" color="secondary">
                Use your biometric to access Aura
              </Text>

              <XStack space="$3" marginTop="$4">
                <Button
                  variant="outline"
                  onPress={() => setAuthMethod('pin')}
                  disabled={isAuthenticating}
                >
                  Use PIN
                </Button>
                <Button variant="ghost" onPress={onCancel} disabled={isAuthenticating}>
                  Cancel
                </Button>
              </XStack>
            </>
          ) : (
            <>
              <Text variant="heading" size="lg">
                🔢
              </Text>
              <Text variant="subheading" textAlign="center">
                Enter PIN
              </Text>

              <XStack space="$2" marginVertical="$4">
                {[0, 1, 2, 3].map(index => (
                  <View
                    key={index}
                    style={[styles.pinDot, pinInput.length > index && styles.pinDotFilled]}
                  />
                ))}
              </XStack>

              <YStack space="$3" width="100%">
                <XStack space="$3" justifyContent="center">
                  {['1', '2', '3'].map(digit => (
                    <Button
                      key={digit}
                      variant="outline"
                      size="large"
                      width={60}
                      onPress={() => addPinDigit(digit)}
                    >
                      {digit}
                    </Button>
                  ))}
                </XStack>
                <XStack space="$3" justifyContent="center">
                  {['4', '5', '6'].map(digit => (
                    <Button
                      key={digit}
                      variant="outline"
                      size="large"
                      width={60}
                      onPress={() => addPinDigit(digit)}
                    >
                      {digit}
                    </Button>
                  ))}
                </XStack>
                <XStack space="$3" justifyContent="center">
                  {['7', '8', '9'].map(digit => (
                    <Button
                      key={digit}
                      variant="outline"
                      size="large"
                      width={60}
                      onPress={() => addPinDigit(digit)}
                    >
                      {digit}
                    </Button>
                  ))}
                </XStack>
                <XStack space="$3" justifyContent="center">
                  <Button
                    variant="ghost"
                    size="large"
                    width={60}
                    onPress={() => setAuthMethod('biometric')}
                  >
                    👆
                  </Button>
                  <Button
                    variant="outline"
                    size="large"
                    width={60}
                    onPress={() => addPinDigit('0')}
                  >
                    0
                  </Button>
                  <Button variant="ghost" size="large" width={60} onPress={removePinDigit}>
                    ⌫
                  </Button>
                </XStack>
              </YStack>

              <XStack space="$3" marginTop="$4">
                <Button
                  variant="primary"
                  onPress={handlePinSubmit}
                  disabled={pinInput.length !== 4}
                >
                  Enter
                </Button>
                <Button variant="ghost" onPress={onCancel}>
                  Cancel
                </Button>
              </XStack>
            </>
          )}
        </YStack>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CED4DA',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
});
