# Legal Entity Management Platform

## Overview

This is a comprehensive web application for managing legal entities and generating corporate minute books. The platform allows lawyers and legal professionals to create and maintain corporate entities, manage cap tables, handle people and roles (directors, officers, shareholders), and generate compliant legal documents using customizable templates. The system provides full audit logging and supports the creation of complete minute book bundles with by-laws, organizational resolutions, and various corporate registers.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **Forms**: React Hook Form with Zod validation

The frontend follows a component-based architecture with reusable UI components. The application uses a sidebar navigation layout with role-based access control. Pages are organized by functionality (Dashboard, Entities, People, Cap Table, Documents, Templates, Minute Books, Audit Log).

### Backend Architecture
- **Runtime**: Node.js with Express framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth integration with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL storage
- **API Design**: RESTful API with standardized error handling

The backend follows a layered architecture with separate concerns for routing, business logic, and data access. The storage layer provides an abstraction over database operations with a well-defined interface.

### Database Design
- **Primary Database**: PostgreSQL with Neon serverless driver
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Key Entities**:
  - Users (authentication and authorization)
  - Organizations (legal entities with addresses)
  - People and PersonOnOrg (individuals and their roles)
  - Share Classes and Share Issuances (cap table management)
  - Templates and Generated Documents (document management)
  - Audit Logs (compliance and tracking)

The database uses UUID primary keys and includes proper relationships between entities. The schema supports multi-tenancy through organization-scoped data.

### Authentication & Authorization
- **Provider**: Replit Auth with OIDC
- **Session Storage**: PostgreSQL-backed sessions
- **Role-Based Access**: Admin, Lawyer, and Read-only roles
- **Security**: HTTP-only cookies with CSRF protection

### Document Generation System
The application is designed to support document templating with:
- Upload and management of .docx templates
- Placeholder variable substitution ({{variable}} syntax)
- Support for loops and conditionals in templates
- PDF generation capabilities
- Minute book bundle generation

### Data Validation & Types
- **Schema Validation**: Zod schemas for runtime type checking
- **Type Safety**: TypeScript throughout the stack
- **Shared Types**: Common schema definitions between client and server
- **Form Validation**: Client-side validation with server-side verification

## External Dependencies

### Core Infrastructure
- **Database**: Neon PostgreSQL serverless database
- **Authentication**: Replit Auth OIDC provider
- **Build Tools**: Vite for frontend bundling, ESBuild for backend compilation

### Frontend Dependencies
- **UI Framework**: React 18 with TypeScript
- **Component Library**: Radix UI primitives with Shadcn/ui
- **Styling**: Tailwind CSS with PostCSS
- **State Management**: TanStack Query for server state
- **Form Handling**: React Hook Form with Hookform Resolvers
- **Validation**: Zod for schema validation
- **Routing**: Wouter for client-side routing
- **Date Handling**: date-fns for date manipulation
- **Icons**: Font Awesome (referenced in components)

### Backend Dependencies
- **Framework**: Express.js with TypeScript
- **Database**: Drizzle ORM with Neon serverless driver
- **Authentication**: OpenID Client and Passport for OIDC
- **Session Management**: Express Session with connect-pg-simple
- **Validation**: Zod for runtime type checking
- **Utilities**: Memoizee for caching, Nanoid for ID generation

### Development Dependencies
- **TypeScript**: Full TypeScript support across the stack
- **Build Tools**: Vite with React plugin and runtime error overlay
- **Development**: TSX for TypeScript execution, various ESLint and type definitions

### Planned Integrations
The architecture supports future integration with:
- Document generation libraries (docx-templater, LibreOffice)
- Cloud storage services (S3-compatible for document storage)
- E-signature providers (DocuSign, Dropbox Sign)
- Legal software integrations (Clio API)
- Calendar systems for compliance reminders