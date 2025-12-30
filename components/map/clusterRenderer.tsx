/**
 * Cluster Renderer
 * Custom renderer for map clusters
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';

interface ClusterMarkerProps {
  geometry: {
    coordinates: [number, number];
  };
  properties: {
    cluster_id: number;
    point_count: number;
  };
  onPress?: () => void;
}

/**
 * Render a cluster marker
 * Shows the number of pins in the cluster
 */
export function ClusterMarker({
  geometry,
  properties,
  onPress,
}: ClusterMarkerProps) {
  const { coordinates } = geometry;
  const { point_count } = properties;

  return (
    <Marker
      coordinate={{
        latitude: coordinates[1],
        longitude: coordinates[0],
      }}
      onPress={onPress}
    >
      <View style={styles.clusterContainer}>
        <View style={styles.clusterCircle}>
          <Text style={styles.clusterText}>{point_count}</Text>
        </View>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  clusterContainer: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2f95dc',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  clusterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default ClusterMarker;




