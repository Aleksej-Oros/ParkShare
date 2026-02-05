import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
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
              : '—';
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
              vehicleText: '—',
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
      return <ActivityIndicator size="small" color="#2f95dc" />;
    }
    const activeIncoming = incoming.filter((spot) => toMillis((spot as any).expiresAt) > now);
    if (activeIncoming.length === 0) {
      return <Text style={styles.emptyText}>No incoming requests.</Text>;
    }

    return activeIncoming.map((spot) => {
      const requesterId = spot.reservation?.requesterId || '';
      const requesterProfile = requesterProfiles[requesterId];
      const requesterName = requesterProfile?.displayName || 'Loading...';
      const vehicleText = requesterProfile?.vehicleText || '—';
      return (
        <View key={spot.id} style={styles.card}>
          <Text style={styles.cardTitle}>Leaving Soon Reservation</Text>
          <Text style={styles.cardLine}>Requester: {requesterName}</Text>
          <Text style={styles.cardLine}>Vehicle: {vehicleText}</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => handleApprove(spot.id)}
              disabled={actionLoading[`approve-${spot.id}`] || actionLoading[`reject-${spot.id}`]}
            >
              {actionLoading[`approve-${spot.id}`] ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>✅ Accept</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleReject(spot.id)}
              disabled={actionLoading[`reject-${spot.id}`] || actionLoading[`approve-${spot.id}`]}
            >
              {actionLoading[`reject-${spot.id}`] ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>❌ Reject</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      );
    });
  }, [incoming, loadingIncoming, requesterProfiles, actionLoading, now]);

  const outgoingContent = useMemo(() => {
    if (loadingOutgoing) {
      return <ActivityIndicator size="small" color="#2f95dc" />;
    }
    const activeOutgoing = outgoing.filter((spot) => toMillis((spot as any).expiresAt) > now);
    if (activeOutgoing.length === 0) {
      return <Text style={styles.emptyText}>No outgoing requests.</Text>;
    }

    return activeOutgoing.map((spot) => {
      const status = normalizeReservationStatus(spot);
      const reservation = spot.reservation;
      const spotExpiresAt = toMillis((spot as any).expiresAt);
      const expiresIn = spotExpiresAt > now ? spotExpiresAt - now : 0;
      const countdown =
        status === 'approved'
          ? `${Math.floor(expiresIn / 60000)}m ${Math.floor((expiresIn % 60000) / 1000)}s`
          : null;

      return (
        <View key={spot.id} style={styles.card}>
          <Text style={styles.cardTitle}>Reservation Request</Text>
          <Text style={styles.cardLine}>
            Status: {status || 'unknown'}
          </Text>
          {status === 'approved' && countdown && (
            <Text style={styles.cardLine}>Arrive within: {countdown}</Text>
          )}
          {status === 'pending' && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancel(spot.id)}
              disabled={actionLoading[`cancel-${spot.id}`]}
            >
              {actionLoading[`cancel-${spot.id}`] ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Cancel Request</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      );
    });
  }, [outgoing, loadingOutgoing, now, actionLoading]);

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Reservations</Text>
        <Text style={styles.emptyText}>Log in to manage reservations.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Reservations</Text>
      {!isPremium && (
        <Text style={styles.infoText}>Reservation requests are sent by Premium users.</Text>
      )}
      <Text style={styles.sectionTitle}>Incoming Requests</Text>
      {incomingContent}
      <Text style={styles.sectionTitle}>Outgoing Requests</Text>
      {outgoingContent}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2f95dc',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  emptyText: {
    color: '#666',
    fontSize: 15,
    marginBottom: 12,
  },
  infoText: {
    color: '#666',
    fontSize: 14,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#f8f9fb',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e6e8f0',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#222',
  },
  cardLine: {
    fontSize: 14,
    color: '#444',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#ff4444',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6A5ACD',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
