# Product Requirements Document (PRD)

## 1. Product Overview
**Product Name:** Reader (or Aesthetic PDF Reader)  
**Purpose:** To provide a highly immersive, aesthetically pleasing, and seamless reading experience for PDF documents. Unlike traditional utilitarian PDF readers, this product focuses on bringing joy, calmness, and visual delight to the simple act of reading through sophisticated UI aesthetics and micro-interactions.

## 2. Target Audience
- Individuals who consume a large volume of PDFs (students, researchers, avid readers) and desire a more engaging and beautiful environment.
- Users who appreciate philosophical quotes, modern web design aesthetics, and a distraction-free but deeply immersive UI.

## 3. Core Features

### 3.1. Dashboard Experience
- **Immersive Visuals:** A full-bleed looping video background that scales gracefully to fill the viewport without distortion.
- **Dynamic Welcome:** Displays a randomized philosophical quote (e.g., from Marcus Aurelius, Nietzsche) upon loading, styled with an animated gradient glow to inspire the user.
- **Micro-animations:** A custom cursor effect (trailing hearts "♡" or dynamic particles) that follows the user's mouse direction.
- **Actions:** 
  - **Upload Book:** A clean action link that opens a native file picker strictly accepting `.pdf` format.
  - **Library:** A link to navigate to the user's collection of saved books.

### 3.2. Library Management
- **Persistent Storage:** Uploaded PDFs are saved locally in the browser (via IndexedDB/Local Storage), ensuring they remain accessible across sessions without needing a backend server.
- **Library View:** Displays all uploaded and stored PDFs, allowing users to select and jump right back into reading their favorite books.

### 3.3. Reader Interface
- **PDF Rendering:** Robust processing and rendering of complex PDF layouts directly in the browser. State management ensures the user drops right onto the page they were reading.
- **Search (Ctrl+F):** Intercepts the native browser "Find" command and smartly redirects it to an optimized in-document PDF search to streamline finding text within the book.

## 4. Technical Architecture
**Tech Stack:**
- **Frontend Framework:** React 18, utilizing functional components and hooks.
- **State Management:** Zustand, managing global state for the active view (`dashboard`, `library`, `reader`), current book ID, and current page.
- **Build Tool:** Vite, for lightning-fast hot module replacement (HMR) and optimized production builds.
- **Styling:** Vanilla CSS, heavily utilizing modern CSS features (flexbox, CSS grid, custom animations, gradients) to achieve "glassmorphism" or neon glow effects.

**How it works seamlessly:** 
1. The app starts on the `Dashboard` view initialized globally by the Zustand store.
2. An asynchronous initialization routine fetches previously saved books from the local browser storage into `useStore`.
3. When the user uploads a `.pdf`, it is read into memory as an `ArrayBuffer` and sent to the `Reader` component. Concurrently, the file is persisted to the local storage.
4. The application handles rapid view-switching without reloading the page, delivering a seamless Single Page Application (SPA) experience.

## 5. Design Assets & Constraints
- Only use standard Google Fonts for typography.
- Avoid cluttered navigation. The application strictly toggles between the three views using state rather than complex routing architectures, maintaining utmost simplicity.
- The UI must adapt to different screen sizes, ensuring the PDF reader remains legible and the Dashboard elements center beautifully on both mobile and desktop.
