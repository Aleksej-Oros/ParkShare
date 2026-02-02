import React, { useEffect, useMemo, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, usePathname } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useAuth } from '@/hooks/useAuth';
import { firestore } from '@/firebase';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const pathname = usePathname();
  const [lastSeenAt, setLastSeenAt] = useState(0);
  const [lastSeenLoaded, setLastSeenLoaded] = useState(false);
  const [hasReservationNotification, setHasReservationNotification] = useState(false);

  const isOnReservationsTab = useMemo(() => pathname?.includes('/two'), [pathname]);
  const storageKey = user?.uid ? `reservations:lastSeenAt:${user.uid}` : null;

  useEffect(() => {
    let isActive = true;
    if (!storageKey) {
      setLastSeenAt(0);
      setLastSeenLoaded(true);
      setHasReservationNotification(false);
      return () => {
        isActive = false;
      };
    }

    setLastSeenLoaded(false);
    AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (!isActive) return;
        const parsed = Number(value || 0);
        setLastSeenAt(Number.isFinite(parsed) ? parsed : 0);
        setLastSeenLoaded(true);
      })
      .catch(() => {
        if (!isActive) return;
        setLastSeenAt(0);
        setLastSeenLoaded(true);
      });

    return () => {
      isActive = false;
    };
  }, [storageKey]);

  useEffect(() => {
    if (isOnReservationsTab) {
      setHasReservationNotification(false);
      const now = Date.now();
      setLastSeenAt(now);
      if (storageKey) {
        AsyncStorage.setItem(storageKey, String(now)).catch(() => {});
      }
    }
  }, [isOnReservationsTab, storageKey]);

  useEffect(() => {
    if (!user?.uid || !lastSeenLoaded) {
      setHasReservationNotification(false);
      return;
    }

    const toMillis = (value: any): number => {
      if (typeof value === 'number') return value;
      if (value && typeof value.toMillis === 'function') return value.toMillis();
      return Number(value || 0);
    };

    const incomingQuery = query(
      collection(firestore, 'parkingSpots'),
      where('userId', '==', user.uid)
    );
    const outgoingQuery = query(
      collection(firestore, 'parkingSpots'),
      where('reservation.requesterId', '==', user.uid)
    );

    const incomingUnsub = onSnapshot(incomingQuery, (snapshot) => {
      if (isOnReservationsTab || !lastSeenLoaded) return;
      const hasNew = snapshot.docs.some((docSnap) => {
        const data: any = docSnap.data();
        const reservation = data.reservation;
        if (!reservation || reservation.status !== 'pending') return false;
        const requestedAt = toMillis(reservation.requestedAt);
        return lastSeenAt === 0 || requestedAt > lastSeenAt;
      });
      if (hasNew) {
        setHasReservationNotification(true);
      }
    });

    const outgoingUnsub = onSnapshot(outgoingQuery, (snapshot) => {
      if (isOnReservationsTab || !lastSeenLoaded) return;
      const hasNew = snapshot.docs.some((docSnap) => {
        const data: any = docSnap.data();
        const reservation = data.reservation;
        if (!reservation) return false;
        if (reservation.status !== 'approved' && reservation.status !== 'rejected') {
          return false;
        }
        const updatedAt =
          toMillis(reservation.approvedAt) ||
          toMillis(reservation.expiresAt) ||
          toMillis(reservation.requestedAt);
        return lastSeenAt === 0 || updatedAt > lastSeenAt;
      });
      if (hasNew) {
        setHasReservationNotification(true);
      }
    });

    return () => {
      incomingUnsub();
      outgoingUnsub();
    };
  }, [user?.uid, lastSeenAt, isOnReservationsTab, lastSeenLoaded]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <TabBarIcon name="map" color={color} />,
          // Removed headerRight - Profile only in footer tab menu
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Reservations',
          tabBarIcon: ({ color }) => (
            <View style={styles.iconWrapper}>
              <TabBarIcon name="bookmark" color={color} />
              {hasReservationNotification && <View style={styles.notificationDot} />}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff4444',
  },
});
