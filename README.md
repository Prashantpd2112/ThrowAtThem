# 🍅 ThrowAtThem

Create a funny profile, roast your friends, and throw virtual emojis, tomatoes, and hilarious objects at anyone. No signup. No login. Just fun.

## ✨ Features

- **Guest Entry** — Enter a nickname, pick your country, and you're in!
- **Interactive World Map** — Colorful cartoon-style SVG map with hover and click animations
- **8 Throwable Objects** — 🍅 Tomato, 🥚 Egg, 🎨 Paint, 🖋 Ink, 🧀 Cheese, ❄ Snowball, 🧻 Toilet Paper, 🦆 Rubber Duck
- **Animations** — Flying objects with splash effects and particles
- **Live Feed** — See what others are throwing in real-time
- **Country Statistics** — Click any country to see stats, most used objects, and recent reasons
- **Leaderboards** — Most targeted countries and most used objects (daily/weekly/all-time)
- **Heat Map** — Countries change color based on activity
- **Responsive Design** — Works perfectly on desktop and mobile
- **Dark Mode** — Automatic theme support

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm
- A Supabase account (free tier)

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd ThrowAtThem
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Supabase:
   - Create a project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key
   - Create a `.env.local` file (see `.env.local.example`)

4. Run the database schema:
   - Open your Supabase project SQL editor
   - Copy and run the contents of `supabase-schema.sql`

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🏗 Project Structure

```
src/
├── app/
│   ├── globals.css          # Global styles & Tailwind theme
│   ├── layout.tsx           # Root layout with fonts & metadata
│   ├── page.tsx             # Landing page with 3D globe
│   ├── providers.tsx        # Theme provider
│   └── world/
│       └── page.tsx         # Main world screen
├── components/
│   ├── landing/
│   │   ├── FloatingClouds.tsx  # Animated background clouds
│   │   ├── Globe3D.tsx         # Three.js 3D globe
│   │   ├── GuestPopup.tsx      # Guest entry modal
│   │   └── HeroSection.tsx     # Landing page hero
│   ├── ui/
│   │   ├── Button.tsx          # Reusable button
│   │   ├── Card.tsx            # Glass card component
│   │   └── Modal.tsx           # Modal dialog
│   └── world/
│       ├── CountryPopup.tsx    # Country statistics popup
│       ├── Leaderboard.tsx     # Rankings & leaderboard
│       ├── LiveFeed.tsx        # Recent throws feed
│       ├── Navigation.tsx      # Top navigation bar
│       ├── ThrowAnimation.tsx  # Flying objects & particles
│       ├── ThrowPanel.tsx      # Object selector & throw button
│       └── WorldMap.tsx        # Interactive SVG map
├── data/
│   ├── countries.ts        # Country data & SVG paths
│   └── objects.ts          # Throwable objects data
├── hooks/
│   ├── useGuest.ts         # Guest state management
│   ├── useLeaderboard.ts   # Leaderboard data fetching
│   └── useThrows.ts        # Throw operations
└── lib/
    ├── supabase.ts         # Supabase client & queries
    ├── types.ts            # TypeScript type definitions
    └── utils.ts            # Utility functions
```

## 🛠 Tech Stack

- **Frontend:** React 19, Next.js 15, TypeScript
- **Styling:** Tailwind CSS v4, CSS Animations
- **Animation:** Framer Motion, Custom CSS
- **3D:** Three.js, React Three Fiber, Drei
- **Backend:** Supabase (PostgreSQL)
- **Map:** Custom SVG-based interactive world map

## 🎨 Design

- Cheerful, colorful cartoon aesthetic
- Glassmorphism panels
- Rounded UI elements with soft shadows
- Smooth micro-animations throughout
- Gradient accents and playful typography
- Responsive grid layout (desktop 3-column, mobile single-column)

## 🔮 Future Enhancements

- Real-time multiplayer via Supabase Realtime
- User profiles and achievements
- Friend system and chat
- More throwable objects and animations
- Sound effects
- Admin dashboard
- Advanced analytics

## 📝 License

This project is for entertainment purposes. No violence is intended — everything is purely fun and cartoonish!

---

Built with ❤️ by ThrowAtThem
