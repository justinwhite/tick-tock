# Tick Tock Time Practice 🕰️

An interactive digital clock web application designed to help kids learn how to tell time. Built with React and styled with a beautiful "Frosted Glass" UI.

## Features

- **Interactive Clock**: Drag the hands of the clock to set the target time.
- **Progressive Difficulty Levels**: 
  - Level 1: Hours
  - Level 2: Half-hours
  - Level 3: Quarter-hours
  - Level 4: 5-minute intervals
  - Level 5: 1-minute intervals
- **Customizable Sessions**: Set practice sessions to 5, 10, or 20 problems at a time.
- **Visual Helpers**: Toggle 5-minute interval markers to help students learn the clock face.
- **PWA Ready**: Includes an icon and manifest to allow installation on mobile devices.
- **Responsive Design**: Adapts beautifully to mobile, tablet, and desktop screens.

## Tech Stack

- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion (`motion/react`)
- **Icons**: Lucide React

## Getting Started

### Prerequisites

Make sure you have Node.js and npm installed on your machine.

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd tick-tock
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   The app will typically run at `http://localhost:3000` (or another port depending on your Vite config).

### Building for Production

To create a production-ready build, run:
```bash
npm run build
```
This will compile and minify the app into the `dist/` directory, which can be served using any static file server.

## License

MIT
