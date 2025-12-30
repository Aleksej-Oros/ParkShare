# Expo Go Setup & Testing Guide

## ✅ Payment Features - DISABLED for Expo Go

All payment functionality has been **completely disabled** to ensure Expo Go compatibility. The payment service is structured and ready for future RevenueCat integration but will not interfere with Expo Go testing.

### Payment Service Status
- ✅ **Completely safe** - No native module imports
- ✅ **No require() calls** - All native code removed
- ✅ **Stubbed functions** - Return safe defaults
- ✅ **Future-ready** - Can be enabled with single flag change

### To Enable Payments Later
1. Install: `npm install react-native-purchases`
2. Set `PAYMENTS_ENABLED = true` in `ParkShare/services/paymentService.ts`
3. Configure RevenueCat API keys
4. Use EAS Build (payments require native code)

---

## 🚀 Running the App in Expo Go

### Step 1: Clear Cache
```bash
cd ParkShare
npx expo start --clear
```

### Step 2: On Your iPhone
1. Open **Expo Go** app
2. Close it completely (swipe up from app switcher)
3. Reopen Expo Go
4. Scan the QR code from terminal

### Step 3: If Issues Persist
```bash
# Delete cache folders
rm -rf .expo
rm -rf node_modules/.cache

# Reinstall dependencies
npm install

# Start fresh
npx expo start --clear
```

---

## ✅ What's Working in Expo Go

- ✅ Firebase Authentication (Login/Register)
- ✅ Firebase Firestore (Database)
- ✅ Redux State Management
- ✅ React Navigation
- ✅ All Expo packages
- ✅ React Native Maps (basic functionality)
- ✅ Notifications (Expo Notifications)
- ✅ Location services
- ✅ All app screens and navigation

---

## ⚠️ Known Limitations

1. **Payments**: Disabled (requires EAS Build)
2. **Custom Native Modules**: Not available
3. **New Architecture**: Disabled for Expo Go compatibility

---

## 🔧 Troubleshooting PlatformConstants Error

If you still see the error:

1. **Verify app.json** - Ensure `newArchEnabled` is NOT present
2. **Check package.json** - No `react-native-purchases` installed
3. **Clear everything**:
   ```bash
   rm -rf .expo node_modules/.cache
   npm install
   npx expo start --clear
   ```
4. **Restart Expo Go** - Fully close and reopen the app
5. **Check Metro bundler** - Look for any red errors in terminal

---

## 📱 Testing Checklist

- [ ] App opens in Expo Go
- [ ] Login screen displays
- [ ] Register screen displays
- [ ] Can create account
- [ ] Can login
- [ ] Navigation works
- [ ] Firebase connection works
- [ ] No red screen errors

---

## 🎯 Next Steps for Development

1. Test authentication flows
2. Build map screen
3. Implement parking spot features
4. Add gamification
5. Test all core features

When ready for payments:
- Use EAS Build
- Enable payment service
- Test with RevenueCat



















