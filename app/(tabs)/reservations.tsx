import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
  SafeAreaView,
} from 'react-native';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import { usePremiumAccess } from '@/hooks/usePremiumAccess';
import { getUserById } from '@/services/userService';
import {
  approveReservation,
  cancelReservation,
  rejectReservation,
} from '@/services/parkingService';
import { ParkingSpot } from '@/models/firestore';
import { Text as ThemedText } from '@/components/Themed';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useThemeColor } from '@/components/Themed';

const nowLabel = () => Date.now();
const toMillis = (value: any): number => {
  if (typeof value === 'number') {
    return value;
  }
  if (value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  return Number(value || 0);
};

export default function ReservationsTab() {
  const { user } = useAuth();
  const { isPremium } = usePremiumAccess();
  const [incoming, setIncoming] = useState<ParkingSpot[]>([]);
  const [outgoing, setOutgoing] = useState<ParkingSpot[]>([]);
  const [loadingIncoming, setLoadingIncoming] = useState(true);
  const [loadingOutgoing, setLoadingOutgoing] = useState(true);
  const [requesterProfiles, setRequesterProfiles] = useState<
    Record<string, { displayName: string; vehicleText: string }>
  >({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState(nowLabel());

  const colorScheme = useColorScheme() ?? 'dark';
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const tintColor = Colors[colorScheme].tint;
  const errorColor = Colors[colorScheme].error;

  useEffect(() => {
    const interval = setInterval(() => setNow(nowLabel()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setIncoming([]);
      setLoadingIncoming(false);
      return;
    }

    setLoadingIncoming(true);
    const q = query(collection(firestore, 'parkingSpots'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const nowValue = Date.now();
        const spots: ParkingSpot[] = snapshot.docs
          .map((docSnap) => ({ ...(docSnap.data() as ParkingSpot), id: docSnap.id }))
          .filter((spot) => spot.reservation?.status === 'pending')
          .filter((spot) => toMillis((spot as any).expiresAt) > nowValue);
        setIncoming(spots);
        setLoadingIncoming(false);
      },
      (error) => {
        console.error('[ReservationsTab] Incoming subscription error', error);
        setIncoming([]);
        setLoadingIncoming(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setOutgoing([]);
      setLoadingOutgoing(false);
      return;
    }

    setLoadingOutgoing(true);
    const q = query(
      collection(firestore, 'parkingSpots'),
      where('reservation.requesterId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const nowValue = Date.now();
        const spots: ParkingSpot[] = snapshot.docs.map((docSnap) => ({
          ...(docSnap.data() as ParkingSpot),
          id: docSnap.id,
        })).filter((spot) => toMillis((spot as any).expiresAt) > nowValue);
        setOutgoing(spots);
        setLoadingOutgoing(false);
      },
      (error) => {
        console.error('[ReservationsTab] Outgoing subscription error', error);
        setOutgoing([]);
        setLoadingOutgoing(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    const requesterIds = Array.from(
      new Set(incoming.map((spot) => spot.reservation?.requesterId).filter(Boolean) as string[])
    );
    if (requesterIds.length === 0) return;

    requesterIds.forEach((id) => {
      if (requesterProfiles[id]) return;
      getUserById(id)
        .then((profile) => {
          const vehicleText =
            profile?.vehicleBrand || profile?.vehicleModel || profile?.vehicleColor
              ? [profile?.vehicleBrand, profile?.vehicleModel, profile?.vehicleColor]
                  .filter(Boolean)
                  .join(' ')
              : '-';
          setRequesterProfiles((prev) => ({
            ...prev,
            [id]: {
              displayName: profile?.displayName?.trim() || 'Unknown',
              vehicleText,
            },
          }));
        })
        .catch(() => {
          setRequesterProfiles((prev) => ({
            ...prev,
            [id]: {
              displayName: 'Unknown',
              vehicleText: '-',
            },
          }));
        });
    });
  }, [incoming, requesterProfiles]);

  const normalizeReservationStatus = (spot: ParkingSpot) => {
    const reservation = spot.reservation;
    if (!reservation) return null;
    if (
      reservation.status === 'approved' &&
      toMillis((spot as any).expiresAt) <= now
    ) {
      return 'expired';
    }
    return reservation.status;
  };

  const handleApprove = async (spotId: string) => {
    if (!user?.uid) return;
    setActionLoading((prev) => ({ ...prev, [`approve-${spotId}`]: true }));
    try {
      const result = await approveReservation(spotId, user.uid);
      if (result === 'rejected_due_to_expired') {
        Alert.alert('Pin Expired', 'This pin expired before approval. The request was rejected.');
      }
    } catch (error: any) {
      console.error('[ReservationsTab] Approve error', error);
      Alert.alert('Approval Failed', error.message || 'Unable to approve reservation.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [`approve-${spotId}`]: false }));
    }
  };

  const handleReject = async (spotId: string) => {
    if (!user?.uid) return;
    setActionLoading((prev) => ({ ...prev, [`reject-${spotId}`]: true }));
    try {
      await rejectReservation(spotId, user.uid);
    } catch (error: any) {
      console.error('[ReservationsTab] Reject error', error);
      Alert.alert('Reject Failed', error.message || 'Unable to reject reservation.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [`reject-${spotId}`]: false }));
    }
  };

  const handleCancel = async (spotId: string) => {
    if (!user?.uid) return;
    setActionLoading((prev) => ({ ...prev, [`cancel-${spotId}`]: true }));
    try {
      await cancelReservation(spotId, user.uid);
    } catch (error: any) {
      console.error('[ReservationsTab] Cancel error', error);
      Alert.alert('Cancel Failed', error.message || 'Unable to cancel reservation.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [`cancel-${spotId}`]: false }));
    }
  };

  const incomingContent = useMemo(() => {
    if (loadingIncoming) {
      return <ActivityIndicator size="small" color={tintColor} />;
    }
    const activeIncoming = incoming.filter((spot) => toMillis((spot as any).expiresAt) > now);
    if (activeIncoming.length === 0) {
      return <ThemedText style={[styles.emptyText, { color: textSecondaryColor }]}>No incoming requests.</ThemedText>;
    }

    return activeIncoming.map((spot, index) => {
      const requesterId = spot.reservation?.requesterId || '';
      const requesterProfile = requesterProfiles[requesterId];
      const requesterName = requesterProfile?.displayName || 'Loading...';
      const vehicleText = requesterProfile?.vehicleText || '-';
      return (
        <View
          key={spot.id}
          style={[
            styles.requestItem,
            { borderBottomColor: tintColor + '30' },
            index === activeIncoming.length - 1 && styles.requestItemLast,
          ]}
        >
          <ThemedText style={[styles.cardTitle, { color: textColor }]}>Leaving Soon Reservation</ThemedText>
          <ThemedText style={[styles.cardLine, { color: textSecondaryColor }]}>Requester: {requesterName}</ThemedText>
          <ThemedText style={[styles.cardLine, { color: textSecondaryColor }]}>Vehicle: {vehicleText}</ThemedText>
          <View style={styles.row}>
            <Button
              title="✅ Accept"
              onPress={() => handleApprove(spot.id)}
              variant="success"
              loading={actionLoading[`approve-${spot.id}`]}
              disabled={actionLoading[`approve-${spot.id}`] || actionLoading[`reject-${spot.id}`]}
              style={styles.actionButton}
            />
            <Button
              title="❌ Reject"
              onPress={() => handleReject(spot.id)}
              variant="danger"
              loading={actionLoading[`reject-${spot.id}`]}
              disabled={actionLoading[`reject-${spot.id}`] || actionLoading[`approve-${spot.id}`]}
              style={styles.actionButton}
            />
          </View>
        </View>
      );
    });
  }, [incoming, loadingIncoming, requesterProfiles, actionLoading, now, textColor, textSecondaryColor, tintColor]);

  const outgoingContent = useMemo(() => {
    if (loadingOutgoing) {
      return <ActivityIndicator size="small" color={tintColor} />;
    }
    const activeOutgoing = outgoing.filter((spot) => toMillis((spot as any).expiresAt) > now);
    if (activeOutgoing.length === 0) {
      return <ThemedText style={[styles.emptyText, { color: textSecondaryColor }]}>No outgoing requests.</ThemedText>;
    }

    return activeOutgoing.map((spot, index) => {
      const status = normalizeReservationStatus(spot);
      const spotExpiresAt = toMillis((spot as any).expiresAt);
      const expiresIn = spotExpiresAt > now ? spotExpiresAt - now : 0;
      const countdown =
        status === 'approved'
          ? `${Math.floor(expiresIn / 60000)}m ${Math.floor((expiresIn % 60000) / 1000)}s`
          : null;

      return (
        <View
          key={spot.id}
          style={[
            styles.requestItem,
            { borderBottomColor: tintColor + '30' },
            index === activeOutgoing.length - 1 && styles.requestItemLast,
          ]}
        >
          <ThemedText style={[styles.cardTitle, { color: textColor }]}>Reservation Request</ThemedText>
          <ThemedText style={[styles.cardLine, { color: textSecondaryColor }]}>
            Status: {status || 'unknown'}
          </ThemedText>
          {status === 'approved' && countdown && (
            <ThemedText style={[styles.cardLine, { color: textSecondaryColor }]}>Arrive within: {countdown}</ThemedText>
          )}
          {status === 'pending' && (
            <Button
              title="Cancel Request"
              onPress={() => handleCancel(spot.id)}
              variant="secondary"
              loading={actionLoading[`cancel-${spot.id}`]}
              disabled={actionLoading[`cancel-${spot.id}`]}
              style={[styles.cancelButton, { borderColor: errorColor + '88', backgroundColor: errorColor + '12' }]}
              textStyle={{ color: errorColor, fontWeight: '700' }}
            />
          )}
        </View>
      );
    });
  }, [outgoing, loadingOutgoing, now, actionLoading, textColor, textSecondaryColor, tintColor]);

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.content}>
          <ThemedText style={[styles.title, { color: tintColor }]}>Reservations</ThemedText>
          <ThemedText style={[styles.emptyText, { color: textSecondaryColor }]}>Log in to manage reservations.</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText style={[styles.title, { color: tintColor }]}>Reservations</ThemedText>
        {!isPremium && (
          <ThemedText style={[styles.infoText, { color: textSecondaryColor }]}>Reservation requests are sent by Premium users.</ThemedText>
        )}
        <Card style={{ borderColor: tintColor + '55' }}>
          <ThemedText style={[styles.sectionTitle, { color: textColor }]}>Incoming Requests</ThemedText>
          {incomingContent}
        </Card>
        <Card style={{ borderColor: tintColor + '55' }}>
          <ThemedText style={[styles.sectionTitle, { color: textColor }]}>Outgoing Requests</ThemedText>
          {outgoingContent}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 0,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardLine: {
    fontSize: 14,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
  },
  cancelButton: {
    marginTop: 8,
  },
  requestItem: {
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  requestItemLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
});

