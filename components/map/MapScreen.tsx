/**
 * MapScreen Component
 * Main map view with OpenStreetMap tiles, real-time parking pins, and user location
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import MapView, { Region, UrlTile } from 'react-native-maps';
import ClusteredMapView from 'react-native-map-clustering';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMapPins, MapPin } from './useMapPins';
import { PinMarker } from './PinMarker';
import { PinModal } from './PinModal';
import { ClusterMarker } from './clusterRenderer';
import { useAuth } from '@/hooks/useAuth';

/**
 * OpenStreetMap Tile Provider
 * Custom tile URL for OpenStreetMap
 * Note: For Android, we need to disable default map tiles and use UrlTile
 */
const OSM_TILE_URL_TEMPLATE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

/**
 * MapScreen Component
 * Displays map with:
 * - OpenStreetMap tiles
 * - User location (blue dot)
 * - Real-time parking pins from Firestore
 * - Pin clustering
 * - Floating buttons (+, my location)
 */
export default function MapScreen() {
  const { user } = useAuth();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [region, setRegion] = useState<Region | null>(null);
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const mapRef = useRef<MapView>(null);

  // Get real-time parking pins
  const { pins, loading: pinsLoading } = useMapPins(location, 5000); // 5km radius

  // Request location permission and get user location
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          setLoading(false);
          return;
        }

        const userLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const coords = {
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
        };

        setLocation(coords);

        // Set initial region
        const initialRegion: Region = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setRegion(initialRegion);
        setMapCenter(coords); // Initialize map center
      } catch (error: any) {
        console.error('[MapScreen] Error getting location:', error);
        setErrorMsg('Failed to get user location');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Handle pin press
  const handlePinPress = (pin: MapPin) => {
    setSelectedPin(pin);
    setModalVisible(true);
  };

  // Handle recenter to user location
  const handleRecenter = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500
      );
    }
  };

  // Handle map region change (track center for pin creation)
  const handleRegionChangeComplete = (newRegion: Region) => {
    setMapCenter({
      latitude: newRegion.latitude,
      longitude: newRegion.longitude,
    });
  };

  // Handle add pin button
  const handleAddPin = () => {
    // Check if user is logged in
    if (!user) {
      Alert.alert('Login Required', 'You must be logged in to create a parking spot.');
      return;
    }

    // Check if we have map center coordinates
    if (!mapCenter) {
      Alert.alert('Error', 'Unable to determine map location. Please wait for the map to load.');
      return;
    }

    // Navigate to add pin screen with coordinates
    router.push({
      pathname: '/map/add',
      params: {
        latitude: mapCenter.latitude.toString(),
        longitude: mapCenter.longitude.toString(),
      },
    });
  };

  // Render individual pin marker
  const renderPin = (pin: MapPin) => (
    <PinMarker
      key={pin.id}
      pin={pin}
      onPress={() => handlePinPress(pin)}
    />
  );

  // Render cluster marker
  const renderCluster = (cluster: any) => {
    const { geometry, properties, onPress } = cluster;
    return (
      <ClusterMarker
        geometry={geometry}
        properties={properties}
        onPress={onPress}
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2f95dc" style={styles.loader} />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  if (!region) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2f95dc" style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ClusteredMapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        provider={undefined}
        showsUserLocation
        showsMyLocationButton={false}
        userLocationPriority="high"
        clusterColor="#2f95dc"
        clusterTextColor="#fff"
        radius={50}
        minZoom={10}
        maxZoom={20}
        extent={512}
        renderCluster={renderCluster}
        // Use none map type to show only custom tiles
        mapType="none"
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        {/* OpenStreetMap Tiles */}
        <UrlTile
          urlTemplate={OSM_TILE_URL_TEMPLATE}
          maximumZ={19}
          flipY={false}
        />
        
        {/* Render all pins */}
        {pins.map(renderPin)}
      </ClusteredMapView>

      {/* Floating Add Pin Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={handleAddPin}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
      
      {/* Crosshair indicator for map center (visual guide) */}
      {mapCenter && (
        <View style={styles.crosshair}>
          <View style={styles.crosshairLine} />
          <View style={[styles.crosshairLine, styles.crosshairLineVertical]} />
        </View>
      )}

      {/* Floating Recenter Button */}
      <TouchableOpacity
        style={[styles.floatingButton, styles.recenterButton]}
        onPress={handleRecenter}
        activeOpacity={0.8}
      >
        <Ionicons name="locate" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Pin Modal */}
      <PinModal
        visible={modalVisible}
        pin={selectedPin}
        userLocation={location}
        onClose={() => {
          setModalVisible(false);
          setSelectedPin(null);
        }}
        onNavigate={() => {
          Alert.alert('Coming Soon', 'Navigation will be available in the next phase.');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    flex: 1,
  },
  loader: {
    marginTop: '50%',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  errorText: {
    color: '#ff4444',
    padding: 16,
    textAlign: 'center',
    fontSize: 16,
    marginTop: '50%',
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2f95dc',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  recenterButton: {
    bottom: 20,
    backgroundColor: '#4CAF50',
  },
  crosshair: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 30,
    height: 30,
    marginLeft: -15,
    marginTop: -15,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  crosshairLine: {
    position: 'absolute',
    width: 20,
    height: 2,
    backgroundColor: '#2f95dc',
    opacity: 0.8,
  },
  crosshairLineVertical: {
    width: 2,
    height: 20,
  },
});




