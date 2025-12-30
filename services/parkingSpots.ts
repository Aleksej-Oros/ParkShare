import { collection, addDoc, getDocs, updateDoc, doc, query, where, DocumentData, Timestamp } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { ParkingSpot, ParkingStatus } from '@/models/firestore';

const COLLECTION = 'parkingSpots';

export async function createParkingSpot(spot: Omit<ParkingSpot, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(firestore, COLLECTION), spot);
  return docRef.id;
}

export async function getAllParkingSpots(): Promise<ParkingSpot[]> {
  const snapshot = await getDocs(collection(firestore, COLLECTION));
  return snapshot.docs.map(docSnap => ({ ...(docSnap.data() as ParkingSpot), id: docSnap.id }));
}

export async function updateParkingSpotStatus(id: string, status: ParkingStatus): Promise<void> {
  await updateDoc(doc(firestore, COLLECTION, id), { status });
}

export async function softDeleteParkingSpot(id: string): Promise<void> {
  await updateDoc(doc(firestore, COLLECTION, id), { status: 'expired' });
}

