# **App Name**: FlexInvest Pro

## Core Features:

- Secure User Authentication & Profile Management: Users can register, log in/out, and reset passwords using Firebase Authentication. Upon registration, a corresponding user document is created in Firestore with initial financial and profile data.
- Dynamic Investment Plan Display & Management: Users can browse various investment plans dynamically loaded from Firestore. Admins have a tool within the panel to create, edit, or delete investment plans, including their financial parameters.
- Deposit System (Manual & Paystack Integration): Supports user deposits via manual submission of payment proof (awaiting admin approval) and automated processing through Paystack for real-time balance updates upon verification.
- Withdrawal Request Processing: Users can submit withdrawal requests. The system automatically applies minimum withdrawal limits and calculated fees based on settings in Firestore, queuing requests for admin approval.
- Admin Panel for Operations & Oversight: Admins can monitor core metrics, approve/reject user deposits and withdrawals, manage user accounts (e.g., suspend users, adjust balances), and update global platform settings in real-time.
- Real-time User Dashboard: Provides users with a modern dashboard displaying their real-time available and invested balances, active investments, and transaction history using Firestore listeners for instant updates.
- Automated Investment Completion & Return Tool: A server-side Cloud Function acts as a tool to automatically process completed investments, calculate returns based on the plan's defined type (range or expected percentage), and update user balances accordingly.

## Style Guidelines:

- Primary color: A sophisticated, muted violet-blue (#2424B2) to convey stability and professionalism, creating good contrast with light backgrounds.
- Background color: A subtle, light grey-blue (#ECECF3) with very low saturation, providing a clean and approachable canvas for financial data.
- Accent color: A vibrant sky blue (#26A1E5), analogous to the primary color, used for interactive elements, highlights, and calls to action to add dynamism.
- Headline font: 'Space Grotesk' (sans-serif) for its modern, tech-inspired aesthetic, ideal for displaying financial metrics and titles clearly. Body font: 'Inter' (sans-serif) for neutral and highly legible text within dashboards, forms, and tables.
- Use a set of clean, crisp outline icons. Prioritize icons that clearly represent financial concepts, transactions, charts, and user actions for intuitive navigation and data representation.
- Implement a modern, responsive dashboard layout featuring a persistent sidebar for navigation and a main content area organized into intuitive, card-based components for an 'at-a-glance' overview of finances. Ensure full responsiveness across devices.
- Incorporate subtle, functional animations for UI feedback, such as smooth transitions for content loading, responsive hovers on interactive elements, and progressive chart animations to visualize data growth over time.