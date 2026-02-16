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
  LayoutChangeEvent,
} from 'react-native';
import MapView, { Region, UrlTile, Polyline } from 'react-native-maps';
import ClusteredMapView from 'react-native-map-clustering';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMapPins, MapPin } from './useMapPins';
import { PinMarker } from './PinMarker';
import { PinModal } from './PinModal';
import { ClusterMarker } from './clusterRenderer';
import { FloatingSearchBar } from './FloatingSearchBar';
import { useAuth } from '@/hooks/useAuth';
import { usePremiumAccess } from '@/hooks/usePremiumAccess';
import { useRoutePreview } from '@/hooks/useRoutePreview';
import { openNavigation } from '@/utils/navigation';
import { GeocodingResult } from '@/services/geocodingService';
import { useThemeColor } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

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
  const { isPremium } = usePremiumAccess();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [region, setRegion] = useState<Region | null>(null);
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [liveUserLocation, setLiveUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapViewport, setMapViewport] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const mapRef = useRef<MapView>(null);

  const colorScheme = useColorScheme() ?? 'dark';
  const tintColor = Colors[colorScheme].tint;
  const textColor = useThemeColor({}, 'text');

  // Get real-time parking pins
  const { pins, loading: pinsLoading } = useMapPins(location, 5000); // 5km radius

  // Route preview hook (premium-only)
  const routePreview = useRoutePreview(isPremium);

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
    // If selecting a different pin, clear the previous route
    if (selectedPin && selectedPin.id !== pin.id) {
      routePreview.clearRoute();
      routeRequestedRef.current = false;
    }
    setSelectedPin(pin);
    setModalVisible(true);
  };

  // Track if route was requested via Show Route button (prevents clearing)
  const routeRequestedRef = useRef(false);

  // Handle show route button press
  const handleShowRoute = async () => {
    if (!selectedPin || !location) {
      Alert.alert('Error', 'Missing location or pin data');
      return;
    }

    console.log('[MapScreen] Show Route clicked', {
      from: location,
      to: selectedPin.coordinate,
      isPremium,
    });

    // Mark that route was requested (prevents clearing on modal close)
    routeRequestedRef.current = true;

    // Close modal so user can see the route
    setModalVisible(false);

    try {
      // Fetch route (hook will handle caching and errors)
      // Note: State updates are async, so we don't check immediately
      // The route will appear automatically when state updates via useEffect
      await routePreview.fetchRoute(location, selectedPin.coordinate);
    } catch (error: any) {
      console.error('[MapScreen] Route fetch exception:', error);
      Alert.alert(
        'Route Error',
        error?.message || 'Failed to load route. Please try again.'
      );
      routeRequestedRef.current = false;
    }
  };

  // Handle hide route button press
  const handleHideRoute = () => {
    console.log('[MapScreen] Hide Route clicked');
    routePreview.clearRoute();
    routeRequestedRef.current = false;
    // Close modal so user can see the map without route
    setModalVisible(false);
  };

  // Handle address search selection
  const handleAddressSelect = (result: GeocodingResult) => {
    console.log('[MapScreen] Address selected:', result);

    if (!mapRef.current) {
      return;
    }

    // Animate map to selected location
    const newRegion: Region = {
      latitude: result.latitude,
      longitude: result.longitude,
      latitudeDelta: 0.01, // Street-level zoom
      longitudeDelta: 0.01,
    };

    mapRef.current.animateToRegion(newRegion, 1000);

    // Update map center state (this will trigger pin reload)
    setMapCenter({
      latitude: result.latitude,
      longitude: result.longitude,
    });
  };

  // Show error alert if route fetch fails (after state updates)
  useEffect(() => {
    if (routePreview.error && routeRequestedRef.current) {
      console.error('[MapScreen] Route error:', routePreview.error);
      Alert.alert('Route Error', routePreview.error);
      routeRequestedRef.current = false;
    }
  }, [routePreview.error]);

  // Log successful route load (after state updates)
  useEffect(() => {
    if (routePreview.coordinates && routePreview.coordinates.length > 0 && routeRequestedRef.current) {
      console.log('[MapScreen] Route loaded successfully', {
        coordinatesCount: routePreview.coordinates.length,
        distance: routePreview.distance,
        duration: routePreview.duration,
      });
    }
  }, [routePreview.coordinates, routePreview.distance, routePreview.duration]);

  // Clear route when pin is deselected (but not when route was just requested)
  useEffect(() => {
    // Only clear if pin is explicitly null (deselected) and route wasn't just requested
    if (!selectedPin && !routeRequestedRef.current) {
      routePreview.clearRoute();
      routeRequestedRef.current = false;
    }
  }, [selectedPin]);

  // Keep in sync with the exact coordinate used by the native user-location marker (blue dot).
  const handleUserLocationChange = (event: any) => {
    const coordinate = event?.nativeEvent?.coordinate;
    if (
      coordinate &&
      typeof coordinate.latitude === 'number' &&
      typeof coordinate.longitude === 'number'
    ) {
      const next = { latitude: coordinate.latitude, longitude: coordinate.longitude };
      setLiveUserLocation(next);
      setLocation(next);
    }
  };

  const handleMapLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setMapViewport({ width, height });
  };

  // Handle recenter to user location (use blue-dot coordinate for exact visual alignment)
  const handleRecenter = async () => {
    if (!mapRef.current) return;

    // Prefer map-sourced live user coordinate (same source as blue marker).
    let target = liveUserLocation ?? location;
    if (!target) {
      try {
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });
        target = {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        };
        setLocation(target);
      } catch {
        // No-op: if location fetch fails and we have no target, we return below.
      }
    }

    if (!target) return;

    const nextCamera = {
      center: {
        latitude: target.latitude,
        longitude: target.longitude,
      },
      zoom: 17,
      heading: 0,
      pitch: 0,
    } as const;

    // Primary animated move.
    mapRef.current.animateCamera(
      nextCamera,
      { duration: 500 }
    );

    // Precision calibration:
    // Compute coordinate currently under visual crosshair and adjust center by delta.
    // This compensates provider-specific center-offset behavior when zooming from far out.
    setTimeout(async () => {
      if (!mapRef.current || mapViewport.width <= 0 || mapViewport.height <= 0) return;
      try {
        const camera = await mapRef.current.getCamera();
        const visualCenterCoord = await mapRef.current.coordinateForPoint({
          x: mapViewport.width / 2,
          y: mapViewport.height / 2,
        });
        const correctedCenter = {
          latitude:
            camera.center.latitude + (target.latitude - visualCenterCoord.latitude),
          longitude:
            camera.center.longitude + (target.longitude - visualCenterCoord.longitude),
        };
        mapRef.current.setCamera({
          ...camera,
          center: correctedCenter,
          zoom: 17,
          heading: 0,
          pitch: 0,
        });
      } catch {
        // Keep animated result if calibration APIs are unavailable.
      }
    }, 560);

    setMapCenter(target);
  };

  // Handle map region change (track center for pin creation)
  const handleRegionChangeComplete = (newRegion: Region) => {
    setMapCenter({
      latitude: newRegion.latitude,
      longitude: newRegion.longitude,
    });
  };

  // Fit map to route bounds when route is loaded
  useEffect(() => {
    if (routePreview.coordinates && routePreview.coordinates.length > 0 && mapRef.current) {
      const coordinates = routePreview.coordinates;
      
      // Calculate bounds
      let minLat = coordinates[0].latitude;
      let maxLat = coordinates[0].latitude;
      let minLng = coordinates[0].longitude;
      let maxLng = coordinates[0].longitude;

      coordinates.forEach((coord) => {
        minLat = Math.min(minLat, coord.latitude);
        maxLat = Math.max(maxLat, coord.latitude);
        minLng = Math.min(minLng, coord.longitude);
        maxLng = Math.max(maxLng, coord.longitude);
      });

      // Include user location and pin location in bounds
      if (location) {
        minLat = Math.min(minLat, location.latitude);
        maxLat = Math.max(maxLat, location.latitude);
        minLng = Math.min(minLng, location.longitude);
        maxLng = Math.max(maxLng, location.longitude);
      }

      if (selectedPin) {
        minLat = Math.min(minLat, selectedPin.coordinate.latitude);
        maxLat = Math.max(maxLat, selectedPin.coordinate.latitude);
        minLng = Math.min(minLng, selectedPin.coordinate.longitude);
        maxLng = Math.max(maxLng, selectedPin.coordinate.longitude);
      }

      // Add padding
      const latDelta = (maxLat - minLat) * 1.5;
      const lngDelta = (maxLng - minLng) * 1.5;

      mapRef.current.fitToCoordinates(
        [
          ...coordinates,
          ...(location ? [{ latitude: location.latitude, longitude: location.longitude }] : []),
          ...(selectedPin ? [selectedPin.coordinate] : []),
        ],
        {
          edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
          animated: true,
        }
      );
    }
  }, [routePreview.coordinates, location, selectedPin]);

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
        onLayout={handleMapLayout}
        initialRegion={region}
        paddingAdjustmentBehavior="never"
        mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
        provider={undefined}
        showsUserLocation
        onUserLocationChange={handleUserLocationChange}
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
        
        {/* Render route polyline (premium-only) */}
        {routePreview.coordinates && routePreview.coordinates.length > 0 && (
          <Polyline
            coordinates={routePreview.coordinates}
            strokeColor="#2f95dc"
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
            miterLimit={1}
          />
        )}
        
        {/* Render all pins */}
        {pins.map(renderPin)}
      </ClusteredMapView>

      {/* Floating Add Pin Button */}
      <TouchableOpacity
        style={[
          styles.floatingButton,
          styles.addButton,
          {
            backgroundColor: colorScheme === 'dark' 
              ? 'rgba(0, 0, 0, 0.4)' 
              : 'rgba(0, 0, 0, 0.3)',
            borderColor: `rgba(0, 175, 245, 0.8)`,
            borderWidth: 1.5,
          },
        ]}
        onPress={handleAddPin}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
      
      {/* Crosshair indicator for map center (visual guide) */}
      {mapCenter && (
        <View style={styles.crosshair}>
          <View style={styles.crosshairLine} />
          <View style={[styles.crosshairLine, styles.crosshairLineVertical]} />
        </View>
      )}

      {/* Floating Search Bar */}
      <FloatingSearchBar onSelect={handleAddressSelect} />

      {/* Floating Recenter Button */}
      <TouchableOpacity
        style={[
          styles.floatingButton,
          styles.recenterButton,
          {
            backgroundColor: colorScheme === 'dark' 
              ? 'rgba(0, 0, 0, 0.4)' 
              : 'rgba(0, 0, 0, 0.3)',
            borderColor: `rgba(0, 175, 245, 0.8)`,
            borderWidth: 1.5,
          },
        ]}
        onPress={handleRecenter}
        activeOpacity={0.8}
      >
        <Ionicons name="locate" size={22} color="#fff" />
      </TouchableOpacity>


      {/* Pin Modal */}
      <PinModal
        visible={modalVisible}
        pin={selectedPin}
        userLocation={location}
        onClose={() => {
          setModalVisible(false);
          // Only clear pin (and route) if route was NOT requested via Show Route button
          // If route was requested, keep the pin so route stays visible
          if (!routeRequestedRef.current) {
            setSelectedPin(null);
          }
        }}
        onShowRoute={handleShowRoute}
        onHideRoute={handleHideRoute}
        hasRoute={
          routePreview.coordinates !== null &&
          routePreview.coordinates.length > 0 &&
          selectedPin !== null
        }
        onNavigate={async () => {
          if (!selectedPin) return;

          // Safety check: coordinates must be valid
          const { latitude, longitude } = selectedPin.coordinate;
          if (
            typeof latitude !== 'number' ||
            typeof longitude !== 'number' ||
            isNaN(latitude) ||
            isNaN(longitude)
          ) {
            console.warn('[MapScreen] Invalid coordinates for navigation', selectedPin.coordinate);
            Alert.alert('Error', 'Invalid location coordinates for navigation.');
            return;
          }

          try {
            // Open native navigation app
            await openNavigation(latitude, longitude, 'Parking Spot');
          } catch (error: any) {
            console.error('[MapScreen] Error opening navigation:', error);
            Alert.alert(
              'Navigation Error',
              error.message || 'Failed to open navigation. Please try again.'
            );
          }
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
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  addButton: {
    bottom: 100,
  },
  recenterButton: {
    bottom: 20,
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




