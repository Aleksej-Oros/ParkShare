import { configureStore } from '@reduxjs/toolkit';
import authReducer from './features/auth/authSlice';
// import userReducer from './features/user/userSlice';
// import parkingSpotsReducer from './features/parkingSpots/parkingSpotsSlice';
// import subscriptionReducer from './features/subscription/subscriptionSlice';
// import pointsReducer from './features/points/pointsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // user: userReducer,
    // parkingSpots: parkingSpotsReducer,
    // subscription: subscriptionReducer,
    // points: pointsReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    serializableCheck: false, // Adjust as you integrate Firebase, etc.
  }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
