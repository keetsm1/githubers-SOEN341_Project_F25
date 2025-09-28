# Squad Events Pro - Complete File Reference

This document explains the purpose of every file in the Squad Events Pro project. The project is built with React, TypeScript, and various modern web technologies.

## Root Directory Files

### Configuration Files
- `.env` - Environment variables (API keys, database URLs, etc.)
- `bun.lockb` - Lock file for Bun package manager (alternative to npm/yarn)
- `components.json` - Configuration for UI components (likely for shadcn/ui)
- `eslint.config.js` - ESLint configuration for code linting
- `example.gitignore.txt` - Example gitignore file (should be copied to .gitignore)
- `package-lock.json` - Lock file for npm dependencies (ensures consistent installs)
- `package.json` - Project configuration, dependencies, and scripts
- `postcss.config.js` - PostCSS configuration for CSS processing
- `tailwind.config.ts` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `tsconfig.app.json` - TypeScript configuration for the app
- `tsconfig.node.json` - TypeScript configuration for Node.js
- `vite.config.ts` - Vite build tool configuration

### Source Files
- `index.html` - Main HTML entry point for the application
- `DB_SCHEMA_PROPOSAL.txt` - Proposed database schema documentation

## Source Code (`/src` Directory)

### Main Application Files
- `main.tsx` - The entry point of the React application
- `App.tsx` - The root React component
- `App.css` - Global styles for the application
- `index.css` - Global CSS styles (includes Tailwind directives)
- `vite-env.d.ts` - TypeScript type declarations for Vite

### Contexts
- `contexts/AuthContext.tsx` - React context for authentication state management

### Hooks
- `hooks/use-mobile.tsx` - Custom hook for detecting mobile devices
- `hooks/use-toast.ts` - Custom hook for showing toast notifications

### Pages
- `pages/Index.tsx` - Home/Landing page
- `pages/MyEvents.tsx` - User's events page
- `pages/CreateEvent.tsx` - Page for creating new events
- `pages/SearchEvents.tsx` - Page for searching events
- `pages/Analytics.tsx` - Analytics dashboard
- `pages/Friends.tsx` - User's friends/connections page
- `pages/NotFound.tsx` - 404 error page

#### Admin Pages
- `pages/admin/Dashboard.tsx` - Admin dashboard
- `pages/admin/AllEvents.tsx` - Admin view of all events
- `pages/admin/ApproveCompanies.tsx` - Page for approving company accounts
- `pages/admin/Stats.tsx` - Statistics and metrics for admins

### Components

#### Authentication
- `components/auth/LoginForm.tsx` - User login form

#### Events
- `components/events/EventCard.tsx` - Card component for displaying event information

#### Layout
- `components/layout/Navigation.tsx` - Main navigation component

#### UI Components (shadcn/ui)
These are reusable UI components built with Radix UI and styled with Tailwind CSS:
- `accordion.tsx` - Collapsible content sections
- `alert.tsx` - Alert/notification component
- `alert-dialog.tsx` - Modal dialog for important actions
- `aspect-ratio.tsx` - Maintains consistent aspect ratios
- `avatar.tsx` - User avatar/icon component
- `badge.tsx` - Small status indicators
- `breadcrumb.tsx` - Navigation breadcrumbs
- `button.tsx` - Button component with variants
- `calendar.tsx` - Date picker component
- `card.tsx` - Card container component
- `carousel.tsx` - Image/content carousel
- `chart.tsx` - Data visualization component
- `checkbox.tsx` - Checkbox input
- `collapsible.tsx` - Collapsible content
- `command.tsx` - Command palette component
- `context-menu.tsx` - Right-click context menu
- `dialog.tsx` - Modal dialog
- `drawer.tsx` - Slide-out panel
- `dropdown-menu.tsx` - Dropdown menu component
- `form.tsx` - Form handling component
- `hover-card.tsx` - Card shown on hover
- `input-otp.tsx` - One-time password input
- `input.tsx` - Text input field
- `label.tsx` - Form label
- `menubar.tsx` - Navigation menu bar
- `navigation-menu.tsx` - Navigation menu component
- `pagination.tsx` - Pagination controls
- `popover.tsx` - Popover component
- `progress.tsx` - Progress indicator
- `radio-group.tsx` - Radio button group
- `resizable.tsx` - Resizable panels
- `scroll-area.tsx` - Custom scrollable area
- `select.tsx` - Dropdown select component
- `separator.tsx` - Visual separator
- `sheet.tsx` - Side sheet component
- `sidebar.tsx` - Sidebar navigation
- `skeleton.tsx` - Loading skeleton
- `slider.tsx` - Range slider input
- `sonner.tsx` - Toast notifications
- `switch.tsx` - Toggle switch
- `table.tsx` - Data table component
- `tabs.tsx` - Tabbed interface
- `textarea.tsx` - Multi-line text input
- `toast.tsx` - Toast notification component
- `toaster.tsx` - Toast container
- `toggle-group.tsx` - Group of toggle buttons
- `toggle.tsx` - Toggle button
- `tooltip.tsx` - Tooltip component
- `use-toast.ts` - Toast notification hook

### Services
- `services/database.ts` - Database service layer (Supabase client)

### Utilities
- `lib/supabase.ts` - Supabase client configuration
- `lib/utils.ts` - General utility functions

## Project Structure Overview

- **Vite** 
- **TypeScript** 
- **React** for UI components
- **Tailwind CSS** for styling
- **shadcn/ui** for pre-built, accessible components
- **Supabase** for backend services (auth, database)

Remember, it's okay if you don't understand everything at once!