# 🪷 Evdivine – Psychic & Astrology App

React Native app with full UI matching the Figma design.

---

## 📁 Project Structure

```
EvdivineApp/
├── App.js                        # Entry point
├── package.json
├── babel.config.js
└── src/
    ├── theme/
    │   └── colors.js             # All colors & shadows
    ├── components/
    │   └── GradientButton.js     # Reusable gradient button
    ├── navigation/
    │   └── AppNavigator.js       # Stack + Bottom Tab navigator
    └── screens/
        ├── HomeScreen.js         # Home with hero, specialties
        ├── ServicesScreen.js     # All 6 services list
        ├── BookingScreen.js      # Full booking flow
        ├── AboutScreen.js        # About Pavneesh
        ├── ProfileScreen.js      # User profile + menu
        ├── LoginScreen.js        # Login form
        ├── SignupScreen.js       # Signup form
        ├── ContactScreen.js      # Contact info + social links
        └── BlocksScreen.js       # FAQ, Terms, Privacy Policy
```

---

## ⚙️ Setup & Run

### Step 1 – Install dependencies
```bash
cd EvdivineApp
npm install
```

### Step 2 – Run on phone
```bash
npm start
```

Then scan the QR code with the latest Expo Go app on your phone.

### Step 3 – Android / iOS builds
```bash
npm run android
```

---

## 📦 Dependencies Used

| Package | Purpose |
|---|---|
| `@react-navigation/native` | Navigation container |
| `@react-navigation/native-stack` | Stack screens (Login, Signup etc.) |
| `@react-navigation/bottom-tabs` | Bottom tab bar |
| `react-native-screens` | Optimized screens |
| `react-native-safe-area-context` | Safe area insets |
| `LinearGradient` (local) | Gradient-style backgrounds & buttons without native setup |

---

## 🎨 Design Tokens

- **Primary Color:** `#9B1D6E`
- **Gradient:** `#9B1D6E → #C4407A`
- **Soft Gradient:** `#FDE8F5 → #F0D8FF`
- **Font:** System serif for headings, System sans-serif for body

---

## 📱 Screens Included

1. **Home** – Hero banner, specializations grid, Why Choose Me
2. **Services** – All 6 services with icons
3. **Booking** – Category, date, time, consultation type picker
4. **About** – Profile, stats (20+ years, 100K+ clients, 4.9⭐)
5. **Profile** – User info, menu items, logout
6. **Login** – Email/phone + password, Google/Apple sign-in
7. **Signup** – Full registration form with T&C checkbox
8. **Contact** – Phone, Email, WhatsApp, Address + social buttons
9. **Blocks** – FAQ, Terms, Privacy Policy, Satisfaction Guarantee

---

## 🔧 Gradient Handling

The app now uses a pure React Native gradient fallback, so there is no native
`android/app/build.gradle` setup required for gradients.

---

Made with ❤️ for Evdivine
