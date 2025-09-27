import { Sidebar } from "./Sidebar";
import { SkipLinks } from "./accessibility/SkipLink";
import { AriaLiveRegion } from "./accessibility/AriaLiveRegion";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <>
      <SkipLinks />
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main 
          id="main-content"
          className="flex-1 flex flex-col overflow-hidden"
          role="main"
          aria-label="Main content"
        >
          {children}
        </main>
      </div>
      
      {/* Global live regions for screen reader announcements */}
      <AriaLiveRegion 
        id="global-announcements" 
        priority="polite" 
        aria-label="Status updates"
      />
      <AriaLiveRegion 
        id="global-alerts" 
        priority="assertive" 
        aria-label="Important alerts"
      />
    </>
  );
}
