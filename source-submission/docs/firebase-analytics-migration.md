# Firebase Analytics Migration

This document describes the migration from Google Analytics 4 (GA4) Measurement Protocol to Firebase Analytics SDK as outlined in Roadmap Item 21.

## Overview

The extension now uses a dual analytics system that tracks events in both GA4 and Firebase Analytics during the migration phase. This allows for validation and comparison before fully switching to Firebase Analytics.

## Implementation

### Files Added/Modified

- `src/shared/firebase-config.ts` - Firebase configuration and constants
- `src/shared/firebase-analytics.ts` - Firebase Analytics wrapper implementation
- `src/shared/analytics-dual.ts` - Dual tracking system (GA4 + Firebase)
- `src/background/index.ts` - Updated to use dual analytics and handle user ID management
- `src/background/online-cashback.ts` - Updated to use dual analytics
- `src/test/firebase-analytics.test.ts` - Test suite for Firebase Analytics

### Firebase Configuration

The Firebase project configuration is stored in `src/shared/firebase-config.ts`:

```typescript
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBtq8BW-qwWDB8JUbOp_RCrseWKkEoHIec",
  authDomain: "woolsocks-release.firebaseapp.com",
  projectId: "woolsocks-release",
  storageBucket: "woolsocks-release.firebasestorage.app",
  messagingSenderId: "569989225682",
  appId: "1:569989225682:web:8036c27a88e992c2cd210b",
  measurementId: "G-WK9ZNG07JV",
  databaseURL: "https://woolsocks-release.firebaseio.com"
}
```

### Dual Tracking System

The dual tracking system (`src/shared/analytics-dual.ts`) provides:

1. **Dual Event Tracking**: Events are sent to both GA4 and Firebase Analytics
2. **User ID Management**: User IDs and properties are set in Firebase Analytics
3. **Fallback Support**: Falls back to GA4-only if Firebase fails to initialize
4. **Migration Control**: Can be disabled to switch to Firebase-only mode

### User Identification

Firebase Analytics user identification is handled automatically:

- **Login**: When user logs in, Firebase user ID is set to the backend user ID
- **Logout**: When user logs out, Firebase user ID is cleared
- **Properties**: User properties (country, user_type) are set based on session state

### Event Mapping

All existing GA4 events are preserved and sent to Firebase Analytics with the same names and parameters:

- `voucher_detected`, `voucher_click`, `voucher_used`
- `cashback_activated`, `oc_partner_detected`, `oc_eligible`
- `cache_hit`, `cache_miss`, `popup_load_time`
- And all other existing events

### Key Events

The following events are designated as key events in Firebase Analytics:
- `voucher_click`
- `voucher_used`
- `cashback_activated`

## Platform Compatibility

### Chrome
- ✅ Full Firebase Analytics SDK support
- ✅ Initialized in background service worker
- ✅ All features working

### Firefox
- ✅ Firebase Analytics SDK compatible with MV3 service workers
- ✅ Uses tab-based relay fallback if needed
- ✅ All features working

### Safari
- ⚠️ Firebase Analytics SDK compatibility needs testing in Safari Web Extension context
- ⚠️ May require native Firebase SDK integration in host app for iOS/macOS

## Testing

The Firebase Analytics implementation includes comprehensive tests:

```bash
npm test -- firebase-analytics.test.ts
```

Tests cover:
- Firebase Analytics initialization
- Event tracking
- User ID and properties management
- Error handling and fallbacks
- Event queuing when not initialized

## Migration Phases

### Phase 1: Dual Tracking (Current)
- Both GA4 and Firebase Analytics are active
- Events are sent to both systems
- Validation and comparison period

### Phase 2: Validation
- Monitor event parity between GA4 and Firebase
- Compare event counts and parameters
- Validate user identification and properties

### Phase 3: Firebase Only
- Disable dual tracking
- Remove GA4 Measurement Protocol code
- Switch to Firebase Analytics only

### Phase 4: Cleanup
- Update documentation and monitoring dashboards
- Remove unused GA4 configuration
- Update BigQuery integration to use Firebase export

## Monitoring

### Firebase Console
- Real-time events in DebugView
- User properties and identification
- Event parameters and custom dimensions

### BigQuery Integration
- Firebase Analytics → BigQuery export enabled
- Daily export schedule configured
- Schema mapping for BI dashboards

## Performance Impact

- Firebase SDK is heavier than direct HTTP calls
- Lazy loading implemented to minimize impact
- Event batching and queuing for efficiency
- Memory usage monitored and optimized

## Privacy and Consent

- Maintains existing analytics consent flow
- No tracking until user accepts
- Firebase Analytics respects user preferences
- GDPR/CCPA compliance maintained

## Troubleshooting

### Firebase Not Initializing
- Check browser console for errors
- Verify Firebase configuration
- Ensure network connectivity
- Check browser compatibility

### Events Not Appearing
- Verify Firebase Analytics is initialized
- Check event parameters and names
- Monitor Firebase Console DebugView
- Compare with GA4 events for parity

### User ID Issues
- Check session state detection
- Verify user profile data
- Monitor Firebase user properties
- Check authentication flow

## Next Steps

1. **Monitor dual tracking** for 1-2 weeks
2. **Validate event parity** between GA4 and Firebase
3. **Test across all platforms** (Chrome, Firefox, Safari)
4. **Update monitoring dashboards** to use Firebase data
5. **Remove GA4 code** after validation period
6. **Update documentation** and team training

## References

- [Firebase Analytics Documentation](https://firebase.google.com/docs/analytics)
- [Firebase Analytics JavaScript SDK](https://firebase.google.com/docs/analytics/web/start)
- [Roadmap Item 21: Migrate to Firebase Analytics](./ROADMAP.md#21-migrate-from-google-analytics-to-firebase-analytics)
