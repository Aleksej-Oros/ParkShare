import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { ParkHistory } from '@/models/firestore';

/**
 * Create a new parkHistory entry (immutable)
 * @param spotId - ID of parking spot
 * @param confirmerUserId - User who confirmed
 * @param authorUserId - Author of spot
 */
export async function createParkHistory(
  spotId: string,
  confirmerUserId: string,
  authorUserId: string
): Promise<void> {
  const newId = doc(collection(firestore, 'parkHistory')).id;
  const entry: ParkHistory & { authorUserId: string } = {
    userId: confirmerUserId,
    spotId,
    authorUserId,
    confirmedAt: Date.now(),
    ratingGiven: null
  };
  await setDoc(doc(firestore, 'parkHistory', newId), entry);
}













