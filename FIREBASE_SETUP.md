# Firebase Authentication Setup Guide

This guide will help you set up Firebase Authentication for your Trading Journal app.

## Prerequisites

- Node.js and npm installed
- Firebase account (free at https://firebase.google.com/)

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name (e.g., "trading-journal")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable the following providers:
   - **Email/Password**: Click to enable
   - **Google**: Click to enable, configure OAuth consent screen
   - **Facebook**: Click to enable, add App ID and App Secret from Facebook Developer Console

## Step 3: Enable Firestore Database

1. Go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in production mode" or "Start in test mode" (test mode for development)
4. Select a location for your database

## Step 4: Get Firebase Configuration

1. Go to Project Settings (gear icon in left sidebar)
2. Scroll down to "Your apps" section
3. Click "Add app" and select "Web" (</> icon)
4. Register your app with a nickname (e.g., "trading-journal-web")
5. Copy the Firebase configuration object

## Step 5: Configure Environment Variables

1. Create a `.env.local` file in your project root (same level as package.json)
2. Add your Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
```

Replace the placeholder values with your actual Firebase config values.

## Step 6: Set Up Firestore Security Rules (Production)

For production, update your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can only access their own trades
    match /trades/{tradeId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
  }
}
```

## Step 7: Social Login Setup (Optional)

### Google OAuth
- Already configured when you enable Google sign-in in Firebase

### Facebook OAuth
1. Go to [Facebook for Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Get App ID and App Secret
5. Add them to Firebase Authentication settings
6. Add your domain to Valid OAuth Redirect URIs

### Discord OAuth (Custom Implementation Required)
Discord is not natively supported by Firebase Auth. You would need to:
1. Set up Discord OAuth app
2. Implement custom OAuth flow
3. Create custom tokens in Firebase

For now, the Discord button shows an informative error message.

## Step 8: Test Your Setup

1. Start your development server: `npm run dev`
2. Navigate to `/auth` in your app
3. Try creating an account with email/password
4. Try logging in with Google (if configured)
5. Check that user data appears in Firestore

## Firestore Data Structure

The app creates the following collections:

### `users` collection
```javascript
{
  uid: "firebase_user_id",
  email: "user@example.com",
  displayName: "User Name",
  photoURL: "https://example.com/photo.jpg",
  createdAt: Timestamp,
  xp: 0,
  streak: 0,
  longestStreak: 0
}
```

### `trades` collection
```javascript
{
  userId: "firebase_user_id",  // Associates trade with user
  symbol: "AAPL",
  company: "Apple Inc.",
  type: "long",
  quantity: 100,
  entryPrice: 150.00,
  exitPrice: 155.00,
  entryDate: "2024-01-15",
  exitDate: "2024-01-16",
  pnl: 500.00,
  status: "closed",
  notes: "Great momentum trade",
  strategy: "Momentum",
  screenshot: "base64_image_data",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## Troubleshooting

### Common Issues

1. **"Firebase config not found"**
   - Make sure `.env.local` exists and has correct variable names
   - Restart your development server after adding environment variables

2. **"Auth domain not authorized"**
   - Add your domain to Firebase Authentication settings > Authorized domains

3. **"Firestore permission denied"**
   - Check your Firestore security rules
   - Make sure you're authenticated before making database calls

4. **Social login not working**
   - Verify OAuth settings in Firebase and provider consoles
   - Check redirect URIs are correctly configured

### Development vs Production

- Use test mode Firestore rules for development
- Switch to production rules with proper security for live deployment
- Consider using different Firebase projects for development and production

## Security Notes

- Never commit `.env.local` to version control
- Use proper Firestore security rules in production
- Regularly review user permissions and access patterns
- Consider implementing additional security measures like rate limiting

## Next Steps

Once authentication is working:
1. Test all authentication flows (signup, login, logout)
2. Verify trade data is properly associated with users
3. Test the app with multiple user accounts
4. Deploy to production with secure Firestore rules
5. Monitor authentication metrics in Firebase Console 