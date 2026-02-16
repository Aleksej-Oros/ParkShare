/**
 * FloatingSearchBar Component
 * Modern iPhone Maps-style floating search bar that expands when tapped
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Keyboard,
  Platform,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useThemeColor } from '@/components/Themed';
import { useAddressSearch, GeocodingResult } from '@/hooks/useAddressSearch';
import { useRecentSearches, LocationItem } from '@/hooks/useRecentSearches';
import { useFavouriteLocations } from '@/hooks/useFavouriteLocations';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface FloatingSearchBarProps {
  onSelect: (result: GeocodingResult) => void;
}

export function FloatingSearchBar({ onSelect }: FloatingSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const addressSearch = useAddressSearch(400);
  const { recentSearches, addRecentSearch, clearRecentSearches } = useRecentSearches();
  const { favouriteLocations, isFavourite, toggleFavourite } = useFavouriteLocations();

  const colorScheme = useColorScheme() ?? 'dark';
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const dividerColor = useThemeColor({}, 'divider');
  const tintColor = Colors[colorScheme].tint;

  // Sync local input with search hook
  useEffect(() => {
    addressSearch.search(searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    setSearchQuery('');
    addressSearch.clear();
    Keyboard.dismiss();
  };

  const inputRef = useRef<TextInput>(null);

  // Convert GeocodingResult to LocationItem
  const toLocationItem = (result: GeocodingResult): LocationItem => ({
    id: `${result.latitude}-${result.longitude}`,
    label: result.label,
    latitude: result.latitude,
    longitude: result.longitude,
  });

  // Handle selection from any source
  const handleSelect = async (location: LocationItem | GeocodingResult) => {
    const locationItem: LocationItem =
      'id' in location ? location : toLocationItem(location);

    await addRecentSearch(locationItem);

    const geocodingResult: GeocodingResult = {
      label: locationItem.label,
      address: locationItem.label,
      latitude: locationItem.latitude,
      longitude: locationItem.longitude,
    };

    onSelect(geocodingResult);
    setSearchQuery('');
    addressSearch.clear();
    handleCollapse();
  };

  // Handle star toggle
  const handleStarToggle = async (result: GeocodingResult, event: any) => {
    event.stopPropagation();
    const locationItem = toLocationItem(result);
    await toggleFavourite(locationItem);
  };

  // Render search result item
  const renderSearchResult = ({ item }: { item: GeocodingResult }) => {
    const favourited = isFavourite(item.latitude, item.longitude);
    const locationItem = toLocationItem(item);

    return (
      <TouchableOpacity
        style={[styles.resultItem, { borderBottomColor: dividerColor }]}
        onPress={() => handleSelect(locationItem)}
        activeOpacity={0.7}
      >
        <View style={[styles.resultIcon, { backgroundColor: tintColor + '20' }]}>
          <Ionicons name="location" size={20} color={tintColor} />
        </View>
        <View style={styles.resultContent}>
          <Text style={[styles.resultLabel, { color: textColor }]}>{item.label}</Text>
          {(item.city || item.country) && (
            <Text style={[styles.resultSubtext, { color: textSecondaryColor }]}>
              {[item.city, item.country].filter(Boolean).join(', ')}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={(e) => handleStarToggle(item, e)}
          style={styles.starButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={favourited ? 'star' : 'star-outline'}
            size={22}
            color={favourited ? '#FFB800' : textSecondaryColor}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Render location item
  const renderLocationItem = (
    item: LocationItem,
    iconName: 'time-outline' | 'star',
    iconColor: string,
    showStar: boolean = false
  ) => {
    const favourited = showStar && isFavourite(item.latitude, item.longitude);

    return (
      <TouchableOpacity
        style={[styles.resultItem, { borderBottomColor: dividerColor }]}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.resultIcon, { backgroundColor: tintColor + '20' }]}>
          <Ionicons name={iconName} size={20} color={iconColor} />
        </View>
        <View style={styles.resultContent}>
          <Text style={[styles.resultLabel, { color: textColor }]}>{item.label}</Text>
        </View>
        {showStar && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              toggleFavourite(item);
            }}
            style={styles.starButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={favourited ? 'star' : 'star-outline'}
              size={22}
              color={favourited ? '#FFB800' : textSecondaryColor}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  // Render section header
  const renderSectionHeader = (title: string, showClear?: boolean, onClear?: () => void) => (
    <View style={[styles.sectionHeader, { borderBottomColor: dividerColor }]}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
      {showClear && onClear && (
        <TouchableOpacity onPress={onClear} style={styles.clearSectionButton}>
          <Text style={[styles.clearButtonText, { color: tintColor }]}>Clear</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const showSearchResults = searchQuery.length > 0;
  const showFavourites = !showSearchResults && favouriteLocations.length > 0;
  const showRecent = !showSearchResults && recentSearches.length > 0;

  // Glass effect: semi-transparent background with opacity (iOS Maps style)
  const glassBackground = colorScheme === 'dark' 
    ? 'rgba(30, 30, 30, 0.75)' // Dark glass with more transparency
    : 'rgba(255, 255, 255, 0.85)'; // Light glass with more transparency

  const glassBorderColor = colorScheme === 'dark'
    ? 'rgba(255, 255, 255, 0.15)'
    : 'rgba(0, 0, 0, 0.08)';

  return (
    <>
      {/* Collapsed state: floating pill on top of map */}
      {!isExpanded && (
        <View style={styles.collapsedWrapper} pointerEvents="box-none">
          <TouchableOpacity
            onPress={handleExpand}
            activeOpacity={0.85}
            style={[
              styles.collapsedPill,
              {
                backgroundColor: glassBackground,
                borderColor: 'rgba(0, 175, 245, 0.55)',
              },
            ]}
          >
            <Ionicons name="search" size={20} color={textSecondaryColor} style={styles.searchIcon} />
            <Text style={[styles.searchPlaceholder, { color: textSecondaryColor }]}>
              Search for a location...
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Expanded state: native modal overlay for reliable backdrop dismissal */}
      <Modal
        visible={isExpanded}
        transparent
        animationType="fade"
        onRequestClose={handleCollapse}
      >
        <Pressable style={styles.backdrop} onPress={handleCollapse} />

        <View style={styles.expandedWrapper} pointerEvents="box-none">
          <View
            style={[
              styles.expandedContainer,
              {
                backgroundColor: glassBackground,
                borderColor: glassBorderColor,
              },
            ]}
          >
            <View style={styles.searchBarContainer}>
              <View style={[styles.searchBar, styles.glassBar]}>
                <TouchableOpacity
                  onPress={handleCollapse}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color={textSecondaryColor} />
                </TouchableOpacity>
                <View style={styles.inputPressable}>
                  <TextInput
                    ref={inputRef}
                    style={[styles.searchInput, { color: textColor }]}
                    placeholder="Search for a location..."
                    placeholderTextColor={textSecondaryColor}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                    returnKeyType="search"
                    editable
                  />
                </View>
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery('');
                      addressSearch.clear();
                    }}
                    style={styles.clearInputButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle" size={20} color={textSecondaryColor} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handleCollapse}
                  style={styles.cancelButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelButtonText, { color: tintColor }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={[
                styles.resultsContainer,
                {
                  backgroundColor: glassBackground,
                  borderTopColor: glassBorderColor,
                },
              ]}
            >
              {showSearchResults ? (
                <>
                  {addressSearch.loading ? (
                    <View style={styles.centerContainer}>
                      <ActivityIndicator size="large" color={tintColor} />
                      <Text style={[styles.loadingText, { color: textSecondaryColor }]}>Searching...</Text>
                    </View>
                  ) : addressSearch.error ? (
                    <View style={styles.centerContainer}>
                      <Ionicons name="alert-circle" size={48} color={Colors[colorScheme].error} />
                      <Text style={[styles.errorText, { color: Colors[colorScheme].error }]}>
                        {addressSearch.error}
                      </Text>
                    </View>
                  ) : addressSearch.results.length > 0 ? (
                    <FlatList
                      data={addressSearch.results}
                      renderItem={renderSearchResult}
                      keyExtractor={(item, index) => `${item.latitude}-${item.longitude}-${index}`}
                      style={styles.resultsList}
                      keyboardShouldPersistTaps="handled"
                    />
                  ) : (
                    <View style={styles.centerContainer}>
                      <Ionicons name="search" size={48} color={textSecondaryColor} />
                      <Text style={[styles.emptyText, { color: textSecondaryColor }]}>No results found</Text>
                    </View>
                  )}
                </>
              ) : (
                <ScrollView style={styles.resultsList} keyboardShouldPersistTaps="handled">
                  {showFavourites && (
                    <View style={styles.section}>
                      {renderSectionHeader('Favourites')}
                      {favouriteLocations.map((item) => (
                        <View key={item.id}>{renderLocationItem(item, 'star', '#FFB800', true)}</View>
                      ))}
                    </View>
                  )}

                  {showRecent && (
                    <View style={styles.section}>
                      {renderSectionHeader('Recent Searches', true, clearRecentSearches)}
                      {recentSearches.map((item) => (
                        <View key={item.id}>
                          {renderLocationItem(item, 'time-outline', textSecondaryColor, true)}
                        </View>
                      ))}
                    </View>
                  )}

                  {!showFavourites && !showRecent && (
                    <View style={styles.centerContainer}>
                      <Ionicons name="location-outline" size={48} color={textSecondaryColor} />
                      <Text style={[styles.emptyText, { color: textSecondaryColor }]}>Start typing to search</Text>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  collapsedWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 16,
    right: 16,
    zIndex: 999,
  },
  collapsedPill: {
    height: 56,
    borderRadius: 28,
    borderWidth: 1.25,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  expandedWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Dimmed background for modal state
  },
  expandedContainer: {
    borderWidth: 0.5,
    borderRadius: 16,
    height: 500,
    maxHeight: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  searchBarContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchBarTouchable: {
    width: '100%',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  glassBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)', // Semi-transparent white overlay for glass effect (iOS Maps style)
    borderWidth: 1,
    borderColor: 'rgba(0, 175, 245, 0.5)', // Thin blue border matching app's tint color (#00AFF5)
  },
  searchIcon: {
    marginRight: 10,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
  },
  inputPressable: {
    flex: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  closeButton: {
    marginRight: 8,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    marginLeft: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  clearInputButton: {
    marginLeft: 8,
    padding: 4,
  },
  clearSectionButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resultsContainer: {
    flex: 1,
    maxHeight: 440,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  resultsList: {
    flex: 1,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  resultIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultContent: {
    flex: 1,
  },
  resultLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  resultSubtext: {
    fontSize: 13,
  },
  starButton: {
    padding: 4,
    marginLeft: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
});
