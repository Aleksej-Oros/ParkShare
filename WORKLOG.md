# ParkShare WORKLOG

## Milestone: Main App Structure & Tabs Skeleton

### Files Added
- app/(tabs)/_layout.tsx (tabs layout updated to 3-tab structure)
- app/(tabs)/add.tsx (Add Parking placeholder screen)
- app/(tabs)/profile.tsx (Profile skeleton)
- components/ParkPointsBar.tsx (Reusable progress bar for ParkPoints)

### Files Modified
- app/(tabs)/index.tsx (Map screen: now uses react-native-maps, centers on user location, shows a placeholder marker)

### Implemented in this Milestone
- 3-tab layout: Map, Add Spot, Profile screens navigable via bottom bar.
- Map screen: Expo Location for user position, MapView displays current location + marker.
- Add Spot: Stylized placeholder form, "Save Spot" disabled with note.
- Profile: Statics user info (displayName, email, vehicle data), static park points (ParkPointsBar), and Log Out button wired to Redux thunk.
- ParkPointsBar: Simple styled progress bar, placeholders only for now.

### What's Next
- Implement Firestore wiring and business logic for parking spots (Map, Add Spot).
- Wire user profile and points to Firestore and Redux.
- Add ParkPoints progress calculation and live update.
- Add error handling and UI polish as needed.

## Milestone: Firestore Logic for Parking Spots & Map

### Files Added/Modified
- services/parkingService.ts (enhanced): Real-time listeners, transaction, status management, geospatial queries, confirmParking.
- services/pointsService.ts: Atomic points transfer, award points, get points.
- services/parkHistoryService.ts (new): park history doc creation (immutable).
- hooks/useNearbySpots.ts: Subscribes, filters, updates map UI in real-time.
- app/(tabs)/index.tsx: Map renders all live spots, marker modal stubs for next milestone.
- firestore.rules: Minor review confirmed rules allow correct ops (allow spot updates, only allow parkHistory create, not update/delete).

### What was implemented
- Firestore-backed business logic for parking spots: create, lifecycle/expire, atomic confirmation, real-time listeners.
- RTK/Service hooks for nearby spots (bounding box, client Haversine filter).
- confirmParking transaction: status verify, update, parkHistory, points awarding, all atomic.
- Points system: atomic award for pin author and confirmer, Firestore update with transactions.
- parkHistory: service, immutable by Firestore rules.

### Manual Test Instructions
1. Use Map screen to view live pins—refreshes in real time.
2. Create leave-soon/walk-in pins (next milestone) and verify they appear and expire correctly.
3. Open any marker, click 'I Parked', confirm one user only can do this, spot status updates atomically.
4. "Report Missing" should (next) expire pins; only creator can soft-delete.
5. ParkHistory doc verified exists for confirmations and is immutable.
6. ParkPoints added for participants; points reflect in profile (on next UI update).

### Cloud Functions trade-off & stub
- All main logic can run client-side using Firestore transactions for MVP.
- For better robustness/scalability, recommend adding a Cloud Function for cleanup/auto-expiry (sample below).
- (Stub):

```js
exports.expireStaleParkingSpots = functions.pubsub.schedule('every 10 minutes').onRun(async () => {
  // Query parkingSpots where expiresAt < now && status != expired
  // Batch update to set status = "expired"
});
```

### Performance Notes
- Bounding box + client-side filtering scales for city level (<1k pins), but not globally (switch to Geofirestore or server geo-index at scale).
- Firestore rules restrict status changes to only allowed fields by non-authors; parkHistory is always immutable.

### What's Next
- UI wiring: creating/deleting/confirming pins, real ParkPoints display, testing edge/race conditions.
- Cloud Function deployment (optional for production).
