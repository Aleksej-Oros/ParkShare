import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { View, StyleSheet, TouchableOpacity, Alert, Platform, SafeAreaView, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '@/components/Themed';
import ParkPointsBar from '@/components/ParkPointsBar';
import { logout } from '@/features/auth/authSlice';
import { RootState, AppDispatch } from '@/store';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { updateUser } from '@/services/userService';
import { isValidBrand, isValidModelForBrand, getModelsForBrand } from '@/utils/vehicleData';

export default function ProfileScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { user: authUser } = useAuth();
  const { profile, reloadProfile } = useProfile();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingBrand, setEditingBrand] = useState('');
  const [editingModel, setEditingModel] = useState('');
  const [editingColor, setEditingColor] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ brand?: string; model?: string; color?: string }>({});
  
  // Reload profile on mount to ensure fresh data
  useEffect(() => {
    if (authUser) {
      reloadProfile();
    }
  }, [authUser]);

  // Initialize editing fields when entering edit mode
  useEffect(() => {
    if (isEditing && profile) {
      setEditingBrand(profile.vehicleBrand || '');
      setEditingModel(profile.vehicleModel || '');
      setEditingColor(profile.vehicleColor || '');
      if (profile.vehicleBrand && isValidBrand(profile.vehicleBrand)) {
        setAvailableModels(getModelsForBrand(profile.vehicleBrand));
      }
    }
  }, [isEditing, profile]);
  
  // Use profile data if available, fallback to auth user
  const displayName = profile?.displayName || authUser?.displayName || '-';
  const email = authUser?.email || '-';
  const vehicleBrand = profile?.vehicleBrand || '';
  const vehicleModel = profile?.vehicleModel || '';
  const vehicleColor = profile?.vehicleColor || '';
  const parkPoints = profile?.parkPoints || 0;

  const handleSave = async () => {
    // Validate
    const newErrors: { brand?: string; model?: string; color?: string } = {};
    
    if (!editingBrand.trim()) {
      newErrors.brand = 'Vehicle brand is required';
    } else if (!isValidBrand(editingBrand)) {
      newErrors.brand = 'Please enter a valid vehicle brand';
    }
    
    if (!editingModel.trim()) {
      newErrors.model = 'Vehicle model is required';
    } else if (editingBrand.trim() && !isValidModelForBrand(editingBrand, editingModel)) {
      newErrors.model = `"${editingModel}" is not a valid model for ${editingBrand}`;
    }
    
    if (!editingColor.trim()) {
      newErrors.color = 'Vehicle color is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!authUser?.uid) {
      Alert.alert('Error', 'You must be logged in to update your profile');
      return;
    }

    setSaving(true);
    try {
      await updateUser(authUser.uid, {
        vehicleBrand: editingBrand.trim(),
        vehicleModel: editingModel.trim(),
        vehicleColor: editingColor.trim(),
      });
      await reloadProfile();
      setIsEditing(false);
      setErrors({});
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      console.error('[ProfileScreen] Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrors({});
  };

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      // The global listener will redirect to login
    } catch (e: any) {
      Alert.alert('Logout Failed', e.message || 'Could not log out.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Profile</Text>
          
          <View style={styles.section}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{displayName}</Text>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{email}</Text>
          </View>
          
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.label}>Vehicle:</Text>
              {!isEditing && (
                <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
            {isEditing ? (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Brand *</Text>
                  <TextInput
                    style={[styles.input, errors.brand ? styles.inputError : null]}
                    placeholder="e.g., Toyota, Honda, BMW"
                    placeholderTextColor="#999"
                    value={editingBrand}
                    onChangeText={(text) => {
                      setEditingBrand(text);
                      if (text.trim() && isValidBrand(text)) {
                        setAvailableModels(getModelsForBrand(text));
                      } else {
                        setAvailableModels([]);
                      }
                      if (editingModel) {
                        setEditingModel('');
                      }
                      if (errors.brand) {
                        setErrors({ ...errors, brand: undefined });
                      }
                    }}
                    autoCapitalize="words"
                    editable={!saving}
                  />
                  {errors.brand ? <Text style={styles.errorText}>{errors.brand}</Text> : null}
                </View>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Model *</Text>
                  <TextInput
                    style={[styles.input, errors.model ? styles.inputError : null]}
                    placeholder={editingBrand.trim() && isValidBrand(editingBrand) 
                      ? `e.g., ${availableModels.slice(0, 3).join(', ')}` 
                      : "Select brand first"}
                    placeholderTextColor="#999"
                    value={editingModel}
                    onChangeText={(text) => {
                      setEditingModel(text);
                      if (errors.model) {
                        setErrors({ ...errors, model: undefined });
                      }
                    }}
                    autoCapitalize="words"
                    editable={!saving && Boolean(editingBrand.trim() && isValidBrand(editingBrand))}
                  />
                  {errors.model ? <Text style={styles.errorText}>{errors.model}</Text> : null}
                  {editingBrand.trim() && isValidBrand(editingBrand) && availableModels.length > 0 && (
                    <Text style={styles.hintText}>
                      Available: {availableModels.slice(0, 5).join(', ')}
                      {availableModels.length > 5 ? ` +${availableModels.length - 5} more` : ''}
                    </Text>
                  )}
                </View>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Color *</Text>
                  <TextInput
                    style={[styles.input, errors.color ? styles.inputError : null]}
                    placeholder="e.g., Red, Blue, Black, White"
                    placeholderTextColor="#999"
                    value={editingColor}
                    onChangeText={(text) => {
                      setEditingColor(text);
                      if (errors.color) {
                        setErrors({ ...errors, color: undefined });
                      }
                    }}
                    autoCapitalize="words"
                    editable={!saving}
                  />
                  {errors.color ? <Text style={styles.errorText}>{errors.color}</Text> : null}
                </View>
                
                <View style={styles.editActions}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.cancelButton]} 
                    onPress={handleCancel}
                    disabled={saving}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.saveButton, saving && styles.buttonDisabled]} 
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={styles.value}>
                {(vehicleBrand && vehicleModel && vehicleColor) 
                  ? `${vehicleBrand} ${vehicleModel} (${vehicleColor})` 
                  : '-'}
              </Text>
            )}
          </View>
          
          <View style={styles.section}>
            <Text style={styles.label}>ParkPoints:</Text>
            <ParkPointsBar points={parkPoints} maxPoints={100} />
          </View>
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 28,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#2f95dc',
    textAlign: 'center',
  },
  section: {
    marginBottom: 18,
  },
  label: {
    color: '#444',
    fontSize: 15,
    marginBottom: 3,
  },
  value: {
    color: '#333',
    fontSize: 17,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    borderRadius: 8,
    marginTop: 35,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  scrollContent: {
    flexGrow: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  editButtonText: {
    color: '#2f95dc',
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
  },
  hintText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#2f95dc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});








