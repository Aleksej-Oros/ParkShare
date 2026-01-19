/**
 * AddressSearchModal Component
 * Modal for searching addresses and locations
 * Displays search results, recent searches, and favourite locations
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAddressSearch, GeocodingResult } from '@/hooks/useAddressSearch';
import { useRecentSearches, LocationItem } from '@/hooks/useRecentSearches';
import { useFavouriteLocations } from '@/hooks/useFavouriteLocations';

interface AddressSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (result: GeocodingResult) => void;
}

export function AddressSearchModal({
  visible,
  onClose,
  onSelect,
}: AddressSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const addressSearch = useAddressSearch(400);
  const { recentSearches, addRecentSearch, clearRecentSearches } = useRecentSearches();
  const { favouriteLocations, isFavourite, toggleFavourite } = useFavouriteLocations();

  // Sync local input with search hook
  useEffect(() => {
    addressSearch.search(searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Clear search when modal closes
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      addressSearch.clear();
    }
  }, [visible]);

  // Convert GeocodingResult to LocationItem
  const toLocationItem = (result: GeocodingResult): LocationItem => ({
    id: `${result.latitude}-${result.longitude}`,
    label: result.label,
    latitude: result.latitude,
    longitude: result.longitude,
  });

  // Handle selection from any source (search, recent, favourite)
  const handleSelect = async (location: LocationItem | GeocodingResult) => {
    const locationItem: LocationItem =
      'id' in location ? location : toLocationItem(location);

    // Add to recent searches
    await addRecentSearch(locationItem);

    // Convert to GeocodingResult for onSelect callback
    const geocodingResult: GeocodingResult = {
      label: locationItem.label,
      address: locationItem.label,
      latitude: locationItem.latitude,
      longitude: locationItem.longitude,
    };

    onSelect(geocodingResult);
    setSearchQuery('');
    addressSearch.clear();
    onClose();
  };

  // Handle star toggle on search results
  const handleStarToggle = async (result: GeocodingResult, event: any) => {
    event.stopPropagation();
    const locationItem = toLocationItem(result);
    await toggleFavourite(locationItem);
  };

  // Render search result item with star
  const renderSearchResult = ({ item }: { item: GeocodingResult }) => {
    const favourited = isFavourite(item.latitude, item.longitude);
    const locationItem = toLocationItem(item);

    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => handleSelect(locationItem)}
        activeOpacity={0.7}
      >
        <View style={styles.resultIcon}>
          <Ionicons name="location" size={20} color="#2f95dc" />
        </View>
        <View style={styles.resultContent}>
          <Text style={styles.resultLabel}>{item.label}</Text>
          {(item.city || item.country) && (
            <Text style={styles.resultSubtext}>
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
            color={favourited ? '#FFB800' : '#999'}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Render recent/favourite item
  const renderLocationItem = (
    item: LocationItem,
    iconName: 'time-outline' | 'star',
    iconColor: string,
    showStar: boolean = false
  ) => {
    const favourited = showStar && isFavourite(item.latitude, item.longitude);

    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.resultIcon}>
          <Ionicons name={iconName} size={20} color={iconColor} />
        </View>
        <View style={styles.resultContent}>
          <Text style={styles.resultLabel}>{item.label}</Text>
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
              color={favourited ? '#FFB800' : '#999'}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  // Render section header
  const renderSectionHeader = (title: string, showClear?: boolean, onClear?: () => void) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {showClear && onClear && (
        <TouchableOpacity onPress={onClear} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Determine what to show based on search state
  const showSearchResults = searchQuery.length > 0;
  const showFavourites = !showSearchResults && favouriteLocations.length > 0;
  const showRecent = !showSearchResults && recentSearches.length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Search Location</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for an address..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  addressSearch.clear();
                }}
                style={styles.clearInputButton}
              >
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {/* Content */}
          <View style={styles.resultsContainer}>
            {showSearchResults ? (
              // Show search results
              <>
                {addressSearch.loading ? (
                  <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#2f95dc" />
                    <Text style={styles.loadingText}>Searching...</Text>
                  </View>
                ) : addressSearch.error ? (
                  <View style={styles.centerContainer}>
                    <Ionicons name="alert-circle" size={48} color="#ff4444" />
                    <Text style={styles.errorText}>{addressSearch.error}</Text>
                    <Text style={styles.errorSubtext}>
                      Please check your connection and try again.
                    </Text>
                  </View>
                ) : addressSearch.results.length > 0 ? (
                  <FlatList
                    data={addressSearch.results}
                    renderItem={renderSearchResult}
                    keyExtractor={(item, index) =>
                      `${item.latitude}-${item.longitude}-${index}`
                    }
                    style={styles.resultsList}
                    keyboardShouldPersistTaps="handled"
                  />
                ) : (
                  <View style={styles.centerContainer}>
                    <Ionicons name="search" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>No results found</Text>
                    <Text style={styles.emptySubtext}>
                      Try a different search term
                    </Text>
                  </View>
                )}
              </>
            ) : (
              // Show favourites and recent searches when search is empty
              <ScrollView style={styles.resultsList} keyboardShouldPersistTaps="handled">
                {/* Favourites Section */}
                {showFavourites && (
                  <View style={styles.section}>
                    {renderSectionHeader('Favourites')}
                    {favouriteLocations.map((item) => (
                      <View key={item.id}>
                        {renderLocationItem(item, 'star', '#FFB800', true)}
                      </View>
                    ))}
                  </View>
                )}

                {/* Recent Searches Section */}
                {showRecent && (
                  <View style={styles.section}>
                    {renderSectionHeader(
                      'Recent Searches',
                      true,
                      clearRecentSearches
                    )}
                    {recentSearches.map((item) => (
                      <View key={item.id}>
                        {renderLocationItem(item, 'time-outline', '#666', true)}
                      </View>
                    ))}
                  </View>
                )}

                {/* Empty State */}
                {!showFavourites && !showRecent && (
                  <View style={styles.centerContainer}>
                    <Ionicons name="location-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>Start typing to search</Text>
                    <Text style={styles.emptySubtext}>
                      Search for addresses, places, or landmarks
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    paddingTop: 60,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2f95dc',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 20,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    padding: 0,
  },
  clearInputButton: {
    marginLeft: 8,
    padding: 4,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsList: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  clearButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#2f95dc',
    fontWeight: '500',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultContent: {
    flex: 1,
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  resultSubtext: {
    fontSize: 14,
    color: '#666',
  },
  starButton: {
    padding: 4,
    marginLeft: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#ff4444',
    textAlign: 'center',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
