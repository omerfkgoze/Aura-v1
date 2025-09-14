import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import {
  YStack,
  XStack,
  Text,
  Input,
  Button,
  Card,
  Switch,
  AlertDialog,
  Separator,
} from '@tamagui/core';
import { Settings, Trash2, Edit3, Plus, Save, X } from '@tamagui/lucide-icons';
import type { Symptom, SymptomCategory } from '@aura/shared-types';
import { useAccessibility } from '../../utils/accessibility';

interface CategoryConfig {
  category: SymptomCategory;
  enabled: boolean;
  customSymptoms: string[];
  displayName: string;
  color: string;
}

interface SymptomCategoryManagerProps {
  onConfigChange: (config: CategoryConfig[]) => void;
  stealthMode?: boolean;
  testID?: string;
}

const DEFAULT_CATEGORIES: CategoryConfig[] = [
  {
    category: 'mood',
    enabled: true,
    customSymptoms: [],
    displayName: 'Mood & Emotions',
    color: '#EC4899',
  },
  {
    category: 'physical',
    enabled: true,
    customSymptoms: [],
    displayName: 'Physical Symptoms',
    color: '#EF4444',
  },
  {
    category: 'energy',
    enabled: true,
    customSymptoms: [],
    displayName: 'Energy Levels',
    color: '#F59E0B',
  },
  {
    category: 'sleep',
    enabled: true,
    customSymptoms: [],
    displayName: 'Sleep Patterns',
    color: '#8B5CF6',
  },
  {
    category: 'skin',
    enabled: true,
    customSymptoms: [],
    displayName: 'Skin & Beauty',
    color: '#06B6D4',
  },
  {
    category: 'digestive',
    enabled: true,
    customSymptoms: [],
    displayName: 'Digestive Health',
    color: '#10B981',
  },
  {
    category: 'custom',
    enabled: true,
    customSymptoms: [],
    displayName: 'Custom Symptoms',
    color: '#6366F1',
  },
];

export const SymptomCategoryManager: React.FC<SymptomCategoryManagerProps> = ({
  onConfigChange,
  stealthMode = false,
  testID = 'symptom-category-manager',
}) => {
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [editingCategory, setEditingCategory] = useState<SymptomCategory | null>(null);
  const [newSymptomName, setNewSymptomName] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState<SymptomCategory | null>(null);

  const { getAccessibilityLabel, getAccessibilityHint } = useAccessibility();

  const handleCategoryToggle = (category: SymptomCategory) => {
    const updated = categories.map(cat =>
      cat.category === category ? { ...cat, enabled: !cat.enabled } : cat
    );
    setCategories(updated);
    onConfigChange(updated);
  };

  const handleDisplayNameChange = (category: SymptomCategory, newName: string) => {
    const updated = categories.map(cat =>
      cat.category === category ? { ...cat, displayName: newName } : cat
    );
    setCategories(updated);
    onConfigChange(updated);
  };

  const addCustomSymptom = (category: SymptomCategory) => {
    if (!newSymptomName.trim()) return;

    const updated = categories.map(cat =>
      cat.category === category
        ? { ...cat, customSymptoms: [...cat.customSymptoms, newSymptomName.trim()] }
        : cat
    );
    setCategories(updated);
    onConfigChange(updated);
    setNewSymptomName('');
  };

  const removeCustomSymptom = (category: SymptomCategory, symptomName: string) => {
    const updated = categories.map(cat =>
      cat.category === category
        ? { ...cat, customSymptoms: cat.customSymptoms.filter(s => s !== symptomName) }
        : cat
    );
    setCategories(updated);
    onConfigChange(updated);
  };

  const resetToDefaults = () => {
    setCategories(DEFAULT_CATEGORIES);
    onConfigChange(DEFAULT_CATEGORIES);
  };

  const getCategoryColor = (category: CategoryConfig) => {
    return stealthMode ? '#6B7280' : category.color;
  };

  return (
    <YStack space="$4" testID={testID}>
      <XStack alignItems="center" justifyContent="space-between">
        <Text fontSize="$6" fontWeight="600">
          Symptom Categories
        </Text>
        <Button
          size="$3"
          variant="outlined"
          onPress={resetToDefaults}
          testID={`${testID}-reset`}
          accessibilityLabel={getAccessibilityLabel('Reset to default categories')}
        >
          <Settings size="$1" />
          <Text>Reset</Text>
        </Button>
      </XStack>

      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack space="$3">
          {categories.map(category => (
            <Card
              key={category.category}
              padding="$4"
              backgroundColor={
                category.enabled ? (stealthMode ? '$gray2' : '$background') : '$gray1'
              }
              borderColor={category.enabled ? getCategoryColor(category) : '$gray4'}
              borderWidth={category.enabled ? 2 : 1}
              opacity={category.enabled ? 1 : 0.6}
              testID={`${testID}-category-${category.category}`}
            >
              <YStack space="$3">
                {/* Category Header */}
                <XStack alignItems="center" justifyContent="space-between">
                  <XStack alignItems="center" space="$3" flex={1}>
                    <YStack
                      width={16}
                      height={16}
                      backgroundColor={getCategoryColor(category)}
                      borderRadius="$2"
                    />

                    {editingCategory === category.category ? (
                      <XStack alignItems="center" space="$2" flex={1}>
                        <Input
                          flex={1}
                          value={category.displayName}
                          onChangeText={text => handleDisplayNameChange(category.category, text)}
                          testID={`${testID}-edit-name-${category.category}`}
                        />
                        <Button
                          size="$2"
                          onPress={() => setEditingCategory(null)}
                          testID={`${testID}-save-name-${category.category}`}
                        >
                          <Save size="$1" />
                        </Button>
                      </XStack>
                    ) : (
                      <XStack alignItems="center" space="$2" flex={1}>
                        <Text
                          fontSize="$5"
                          fontWeight="600"
                          color={category.enabled ? '$color' : '$gray8'}
                        >
                          {category.displayName}
                        </Text>
                        <Button
                          size="$2"
                          variant="ghost"
                          onPress={() => setEditingCategory(category.category)}
                          testID={`${testID}-edit-${category.category}`}
                        >
                          <Edit3 size="$1" />
                        </Button>
                      </XStack>
                    )}
                  </XStack>

                  <Switch
                    checked={category.enabled}
                    onCheckedChange={() => handleCategoryToggle(category.category)}
                    testID={`${testID}-toggle-${category.category}`}
                    accessibilityLabel={getAccessibilityLabel(`Toggle ${category.displayName}`)}
                  />
                </XStack>

                {/* Custom Symptoms */}
                {category.enabled && category.customSymptoms.length > 0 && (
                  <>
                    <Separator />
                    <YStack space="$2">
                      <Text fontSize="$4" fontWeight="500" color="$gray10">
                        Custom Symptoms ({category.customSymptoms.length})
                      </Text>
                      <YStack space="$1">
                        {category.customSymptoms.map((symptom, index) => (
                          <XStack
                            key={`${category.category}-${symptom}-${index}`}
                            alignItems="center"
                            justifyContent="space-between"
                            padding="$2"
                            backgroundColor="$gray2"
                            borderRadius="$2"
                          >
                            <Text fontSize="$3">{symptom}</Text>
                            <Button
                              size="$2"
                              variant="ghost"
                              onPress={() => removeCustomSymptom(category.category, symptom)}
                              testID={`${testID}-remove-${category.category}-${index}`}
                            >
                              <X size="$1" color="$red10" />
                            </Button>
                          </XStack>
                        ))}
                      </YStack>
                    </YStack>
                  </>
                )}

                {/* Add Custom Symptom */}
                {category.enabled && (
                  <>
                    <Separator />
                    <XStack space="$2" alignItems="center">
                      <Input
                        flex={1}
                        placeholder={`Add custom ${category.displayName.toLowerCase()} symptom...`}
                        value={newSymptomName}
                        onChangeText={setNewSymptomName}
                        testID={`${testID}-add-input-${category.category}`}
                      />
                      <Button
                        size="$3"
                        onPress={() => addCustomSymptom(category.category)}
                        disabled={!newSymptomName.trim()}
                        backgroundColor={getCategoryColor(category)}
                        testID={`${testID}-add-btn-${category.category}`}
                        accessibilityLabel={getAccessibilityLabel(
                          `Add custom symptom to ${category.displayName}`
                        )}
                      >
                        <Plus size="$1" />
                      </Button>
                    </XStack>
                  </>
                )}
              </YStack>
            </Card>
          ))}
        </YStack>
      </ScrollView>

      {/* Statistics Summary */}
      <Card padding="$3" backgroundColor={stealthMode ? '$gray2' : '$blue1'}>
        <YStack space="$2">
          <Text fontSize="$4" fontWeight="600">
            Category Statistics
          </Text>
          <XStack justifyContent="space-between">
            <Text fontSize="$3" color="$gray10">
              Active Categories: {categories.filter(c => c.enabled).length}
            </Text>
            <Text fontSize="$3" color="$gray10">
              Custom Symptoms: {categories.reduce((sum, c) => sum + c.customSymptoms.length, 0)}
            </Text>
          </XStack>
        </YStack>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay />
          <AlertDialog.Content>
            <YStack space="$3">
              <AlertDialog.Title>Delete Custom Symptom</AlertDialog.Title>
              <AlertDialog.Description>
                This action cannot be undone. The custom symptom will be permanently removed.
              </AlertDialog.Description>
              <XStack space="$3" justifyContent="flex-end">
                <AlertDialog.Cancel asChild>
                  <Button variant="outlined">Cancel</Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <Button theme="red">Delete</Button>
                </AlertDialog.Action>
              </XStack>
            </YStack>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog>
    </YStack>
  );
};
