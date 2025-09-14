import React, { useState, useMemo } from 'react';
import { ScrollView, FlatList } from 'react-native';
import {
  YStack,
  XStack,
  Text,
  Input,
  Button,
  Card,
  Checkbox,
  Select,
  Adapt,
  Sheet,
  LinearGradient,
} from '@tamagui/core';
import { ChevronDown, Search, Plus, X } from '@tamagui/lucide-icons';
import type { Symptom, SymptomCategory } from '@aura/shared-types';
import { useAccessibility } from '../../utils/accessibility';

interface SymptomSelectorProps {
  selectedSymptoms: Symptom[];
  onSymptomsChange: (symptoms: Symptom[]) => void;
  stealthMode?: boolean;
  readonly?: boolean;
  testID?: string;
}

const PREDEFINED_SYMPTOMS: Record<SymptomCategory, Omit<Symptom, 'id' | 'severity'>[]> = {
  mood: [
    { name: 'Anxiety', category: 'mood' },
    { name: 'Irritability', category: 'mood' },
    { name: 'Mood swings', category: 'mood' },
    { name: 'Depression', category: 'mood' },
    { name: 'Happy', category: 'mood' },
    { name: 'Emotional', category: 'mood' },
  ],
  physical: [
    { name: 'Cramps', category: 'physical' },
    { name: 'Headache', category: 'physical' },
    { name: 'Back pain', category: 'physical' },
    { name: 'Breast tenderness', category: 'physical' },
    { name: 'Bloating', category: 'physical' },
    { name: 'Nausea', category: 'physical' },
  ],
  energy: [
    { name: 'Fatigue', category: 'energy' },
    { name: 'Low energy', category: 'energy' },
    { name: 'High energy', category: 'energy' },
    { name: 'Restless', category: 'energy' },
  ],
  sleep: [
    { name: 'Insomnia', category: 'sleep' },
    { name: 'Poor sleep', category: 'sleep' },
    { name: 'Oversleeping', category: 'sleep' },
    { name: 'Vivid dreams', category: 'sleep' },
  ],
  skin: [
    { name: 'Acne', category: 'skin' },
    { name: 'Dry skin', category: 'skin' },
    { name: 'Oily skin', category: 'skin' },
    { name: 'Sensitive skin', category: 'skin' },
  ],
  digestive: [
    { name: 'Constipation', category: 'digestive' },
    { name: 'Diarrhea', category: 'digestive' },
    { name: 'Food cravings', category: 'digestive' },
    { name: 'Appetite changes', category: 'digestive' },
  ],
  custom: [],
};

export const SymptomSelector: React.FC<SymptomSelectorProps> = ({
  selectedSymptoms,
  onSymptomsChange,
  stealthMode = false,
  readonly = false,
  testID = 'symptom-selector',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SymptomCategory | 'all'>('all');
  const [customSymptomName, setCustomSymptomName] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customSymptoms, setCustomSymptoms] = useState<Symptom[]>([]);

  const { getAccessibilityLabel, getAccessibilityHint } = useAccessibility();

  const allSymptoms = useMemo(() => {
    const predefined = Object.entries(PREDEFINED_SYMPTOMS)
      .filter(([category]) => category !== 'custom')
      .flatMap(([category, symptoms]) =>
        symptoms.map(symptom => ({
          ...symptom,
          id: `predefined-${category}-${symptom.name.toLowerCase().replace(/\s+/g, '-')}`,
          category: category as SymptomCategory,
        }))
      );

    return [...predefined, ...customSymptoms];
  }, [customSymptoms]);

  const filteredSymptoms = useMemo(() => {
    let symptoms = allSymptoms;

    if (selectedCategory !== 'all') {
      symptoms = symptoms.filter(s => s.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      symptoms = symptoms.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    return symptoms;
  }, [allSymptoms, selectedCategory, searchQuery]);

  const handleSymptomToggle = (symptom: Omit<Symptom, 'severity'>) => {
    if (readonly) return;

    const existingIndex = selectedSymptoms.findIndex(s => s.id === symptom.id);

    if (existingIndex >= 0) {
      const updated = selectedSymptoms.filter((_, index) => index !== existingIndex);
      onSymptomsChange(updated);
    } else {
      const newSymptom: Symptom = {
        ...symptom,
        severity: 3, // Default severity
      };
      onSymptomsChange([...selectedSymptoms, newSymptom]);
    }
  };

  const handleSeverityChange = (symptomId: string, severity: 1 | 2 | 3 | 4 | 5) => {
    if (readonly) return;

    const updated = selectedSymptoms.map(s => (s.id === symptomId ? { ...s, severity } : s));
    onSymptomsChange(updated);
  };

  const addCustomSymptom = () => {
    if (!customSymptomName.trim() || readonly) return;

    const customSymptom: Symptom = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: customSymptomName.trim(),
      category: 'custom',
      severity: 3,
    };

    setCustomSymptoms(prev => [...prev, customSymptom]);
    setSelectedSymptoms(prev => [...prev, customSymptom]);
    setCustomSymptomName('');
    setShowCustomForm(false);
  };

  const removeCustomSymptom = (symptomId: string) => {
    if (readonly) return;

    setCustomSymptoms(prev => prev.filter(s => s.id !== symptomId));
    onSymptomsChange(selectedSymptoms.filter(s => s.id !== symptomId));
  };

  const categoryColors = {
    mood: stealthMode ? '#6B7280' : '#EC4899',
    physical: stealthMode ? '#6B7280' : '#EF4444',
    energy: stealthMode ? '#6B7280' : '#F59E0B',
    sleep: stealthMode ? '#6B7280' : '#8B5CF6',
    skin: stealthMode ? '#6B7280' : '#06B6D4',
    digestive: stealthMode ? '#6B7280' : '#10B981',
    custom: stealthMode ? '#6B7280' : '#6366F1',
  };

  const getSeverityLabel = (severity: number) => {
    const labels = ['', 'Mild', 'Light', 'Moderate', 'Strong', 'Severe'];
    return labels[severity] || 'Moderate';
  };

  return (
    <YStack space="$3" testID={testID}>
      {/* Search and Filter */}
      <YStack space="$2">
        <XStack space="$2" alignItems="center">
          <YStack flex={1}>
            <Input
              placeholder="Search symptoms..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              disabled={readonly}
              backgroundColor={stealthMode ? '$gray2' : '$background'}
              borderColor={stealthMode ? '$gray6' : '$borderColor'}
              testID={`${testID}-search`}
              accessibilityLabel={getAccessibilityLabel('Search symptoms')}
              accessibilityHint={getAccessibilityHint('Type to filter available symptoms')}
            />
          </YStack>

          <Select
            value={selectedCategory}
            onValueChange={value => setSelectedCategory(value as SymptomCategory | 'all')}
            disabled={readonly}
          >
            <Select.Trigger
              width={120}
              testID={`${testID}-category-select`}
              accessibilityLabel={getAccessibilityLabel('Filter by category')}
            >
              <Select.Value />
              <ChevronDown size="$1" />
            </Select.Trigger>

            <Adapt when="sm" platform="touch">
              <Sheet modal dismissOnSnapToBottom>
                <Sheet.Frame>
                  <Sheet.ScrollView>
                    <Adapt.Contents />
                  </Sheet.ScrollView>
                </Sheet.Frame>
                <Sheet.Overlay />
              </Sheet>
            </Adapt>

            <Select.Content>
              <Select.Item index={0} value="all">
                <Select.ItemText>All</Select.ItemText>
              </Select.Item>
              <Select.Item index={1} value="mood">
                <Select.ItemText>Mood</Select.ItemText>
              </Select.Item>
              <Select.Item index={2} value="physical">
                <Select.ItemText>Physical</Select.ItemText>
              </Select.Item>
              <Select.Item index={3} value="energy">
                <Select.ItemText>Energy</Select.ItemText>
              </Select.Item>
              <Select.Item index={4} value="sleep">
                <Select.ItemText>Sleep</Select.ItemText>
              </Select.Item>
              <Select.Item index={5} value="skin">
                <Select.ItemText>Skin</Select.ItemText>
              </Select.Item>
              <Select.Item index={6} value="digestive">
                <Select.ItemText>Digestive</Select.ItemText>
              </Select.Item>
              <Select.Item index={7} value="custom">
                <Select.ItemText>Custom</Select.ItemText>
              </Select.Item>
            </Select.Content>
          </Select>
        </XStack>

        {!readonly && (
          <Button
            size="$3"
            variant="outlined"
            onPress={() => setShowCustomForm(!showCustomForm)}
            borderColor={stealthMode ? '$gray6' : '$blue8'}
            testID={`${testID}-add-custom`}
            accessibilityLabel={getAccessibilityLabel('Add custom symptom')}
          >
            <Plus size="$1" />
            <Text>Add Custom Symptom</Text>
          </Button>
        )}
      </YStack>

      {/* Custom Symptom Form */}
      {showCustomForm && !readonly && (
        <Card padding="$3" backgroundColor={stealthMode ? '$gray2' : '$blue1'}>
          <YStack space="$2">
            <Text fontSize="$4" fontWeight="600">
              Add Custom Symptom
            </Text>
            <XStack space="$2" alignItems="center">
              <Input
                flex={1}
                placeholder="Enter symptom name..."
                value={customSymptomName}
                onChangeText={setCustomSymptomName}
                testID={`${testID}-custom-input`}
              />
              <Button
                size="$3"
                onPress={addCustomSymptom}
                disabled={!customSymptomName.trim()}
                backgroundColor={stealthMode ? '$gray8' : '$blue9'}
                testID={`${testID}-add-custom-confirm`}
              >
                Add
              </Button>
            </XStack>
          </YStack>
        </Card>
      )}

      {/* Available Symptoms */}
      <ScrollView style={{ maxHeight: 300 }}>
        <YStack space="$2">
          {filteredSymptoms.map(symptom => {
            const isSelected = selectedSymptoms.some(s => s.id === symptom.id);
            const selectedSymptom = selectedSymptoms.find(s => s.id === symptom.id);

            return (
              <Card
                key={symptom.id}
                padding="$3"
                pressStyle={{ opacity: 0.7 }}
                onPress={() => handleSymptomToggle(symptom)}
                backgroundColor={
                  isSelected
                    ? stealthMode
                      ? '$gray4'
                      : '$blue2'
                    : stealthMode
                      ? '$gray1'
                      : '$background'
                }
                borderColor={
                  isSelected
                    ? categoryColors[symptom.category]
                    : stealthMode
                      ? '$gray4'
                      : '$borderColor'
                }
                borderWidth={isSelected ? 2 : 1}
                testID={`${testID}-symptom-${symptom.id}`}
              >
                <XStack alignItems="center" justifyContent="space-between">
                  <XStack alignItems="center" space="$3" flex={1}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSymptomToggle(symptom)}
                      disabled={readonly}
                      testID={`${testID}-symptom-checkbox-${symptom.id}`}
                    />

                    <YStack flex={1}>
                      <XStack alignItems="center" space="$2">
                        <Text fontSize="$4" fontWeight={isSelected ? '600' : '400'}>
                          {symptom.name}
                        </Text>

                        <Text
                          fontSize="$2"
                          color={categoryColors[symptom.category]}
                          backgroundColor={
                            stealthMode ? '$gray3' : `${categoryColors[symptom.category]}20`
                          }
                          paddingHorizontal="$2"
                          paddingVertical="$1"
                          borderRadius="$2"
                        >
                          {symptom.category}
                        </Text>
                      </XStack>

                      {isSelected && selectedSymptom && (
                        <XStack alignItems="center" space="$2" marginTop="$2">
                          <Text fontSize="$3" color="$gray10">
                            Severity:
                          </Text>
                          {[1, 2, 3, 4, 5].map(level => (
                            <Button
                              key={level}
                              size="$2"
                              variant={selectedSymptom.severity === level ? 'filled' : 'outlined'}
                              onPress={() =>
                                handleSeverityChange(symptom.id, level as 1 | 2 | 3 | 4 | 5)
                              }
                              backgroundColor={
                                selectedSymptom.severity === level
                                  ? stealthMode
                                    ? '$gray8'
                                    : categoryColors[symptom.category]
                                  : 'transparent'
                              }
                              disabled={readonly}
                              testID={`${testID}-severity-${symptom.id}-${level}`}
                              accessibilityLabel={getAccessibilityLabel(
                                `Set severity to ${getSeverityLabel(level)}`
                              )}
                            >
                              <Text fontSize="$2">{level}</Text>
                            </Button>
                          ))}
                          <Text fontSize="$2" color="$gray8">
                            {getSeverityLabel(selectedSymptom.severity || 3)}
                          </Text>
                        </XStack>
                      )}
                    </YStack>
                  </XStack>

                  {symptom.category === 'custom' && !readonly && (
                    <Button
                      size="$2"
                      variant="outlined"
                      onPress={() => removeCustomSymptom(symptom.id)}
                      borderColor="$red8"
                      testID={`${testID}-remove-custom-${symptom.id}`}
                    >
                      <X size="$1" color="$red10" />
                    </Button>
                  )}
                </XStack>
              </Card>
            );
          })}
        </YStack>
      </ScrollView>

      {/* Selected Symptoms Summary */}
      {selectedSymptoms.length > 0 && (
        <Card padding="$3" backgroundColor={stealthMode ? '$gray2' : '$green1'}>
          <Text fontSize="$4" fontWeight="600" marginBottom="$2">
            Selected Symptoms ({selectedSymptoms.length})
          </Text>
          <XStack flexWrap="wrap" space="$1">
            {selectedSymptoms.map(symptom => (
              <LinearGradient
                key={symptom.id}
                colors={[categoryColors[symptom.category], `${categoryColors[symptom.category]}80`]}
                start={[0, 0]}
                end={[1, 1]}
                borderRadius="$3"
                paddingHorizontal="$2"
                paddingVertical="$1"
                margin="$1"
              >
                <Text
                  fontSize="$2"
                  color="white"
                  fontWeight="500"
                  testID={`${testID}-selected-${symptom.id}`}
                >
                  {symptom.name} ({symptom.severity}/5)
                </Text>
              </LinearGradient>
            ))}
          </XStack>
        </Card>
      )}
    </YStack>
  );
};
