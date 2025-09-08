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

The frontend follows a component-based architecture with reusable UI components. The application uses a sidebar navigation layout with role-based access control. Pages are organized by functionality:

- **Dashboard**: Overview of entities and recent activity
- **Entities**: Legal entity management (corporations, partnerships)
- **People**: Director, officer, and shareholder management
- **Cap Table**: Share class and issuance tracking
- **Documents**: Generated document library with editing capabilities
- **Templates**: .docx template upload and management with variable mapping
- **Minute Books**: Document bundle generation for corporate compliance
- **Audit Log**: Complete activity tracking for legal compliance

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
  - Minute Books and Minute Book Documents (bundle generation)
  - Audit Logs (compliance and tracking)

The database uses UUID primary keys and includes proper relationships between entities. The schema supports multi-tenancy through organization-scoped data.

### Authentication & Authorization
- **Provider**: Replit Auth with OIDC
- **Session Storage**: PostgreSQL-backed sessions
- **Role-Based Access**: Admin, Lawyer, and Read-only roles
- **Security**: HTTP-only cookies with CSRF protection

### Document Generation System
The application includes a comprehensive template and document generation system:

#### Template Management
- **Template Upload**: Support for .docx template file uploads with variable extraction
- **Template Categories**: Bylaws, resolutions, minute-book, incorporation, and organization templates
- **Variable System**: Automatic extraction and mapping of {{variable}} placeholders to entity data
- **Starter Templates**: Pre-built templates for common legal documents (CBCA, bylaws, resolutions)

#### Minute Book Generation
- **Bundle Creation**: Generate complete minute book packages containing multiple documents
- **Entity Data Integration**: Automatically populate templates with organization, director, officer, and shareholder data
- **Document Status Tracking**: Track generation progress (draft, generating, ready, error)
- **Professional Formatting**: HTML-to-document conversion with legal document styling

#### Variable Mapping
Template variables are mapped to entity data as follows:
- `{{CompanyName}}` → Organization name
- `{{Jurisdiction}}` → Incorporation jurisdiction  
- `{{FormationDate}}` → Date of incorporation
- `{{DirectorNames}}` → List of current directors
- `{{Officers}}` → List of officers with titles
- `{{AuthorizedShares}}` → Total authorized share capital
- `{{ShareClasses}}` → Names of share classes
- `{{RegisteredOffice}}` → Registered office address

#### Core Components
- **DocumentGeneratorService**: Handles template processing and variable substitution
- **TemplateProcessor**: Extracts variables from uploaded templates
- **MinuteBooks API**: RESTful endpoints for minute book CRUD operations

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