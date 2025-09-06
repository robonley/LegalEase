import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'wouter';

interface Entity {
  id: string;
  name: string;
  jurisdiction: string;
  number?: string;
}

interface EntityContextType {
  currentEntity: Entity | null;
  recentEntities: Entity[];
  setCurrentEntity: (entity: Entity | null) => void;
  addRecentEntity: (entity: Entity) => void;
  clearCurrentEntity: () => void;
}

const EntityContext = createContext<EntityContextType | undefined>(undefined);

export function useEntityContext() {
  const context = useContext(EntityContext);
  if (context === undefined) {
    throw new Error('useEntityContext must be used within an EntityProvider');
  }
  return context;
}

export function EntityProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [currentEntity, setCurrentEntityState] = useState<Entity | null>(null);
  const [recentEntities, setRecentEntities] = useState<Entity[]>([]);

  // Load recent entities from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('recentEntities');
    if (saved) {
      try {
        setRecentEntities(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse recent entities from localStorage:', error);
      }
    }
  }, []);

  // Save recent entities to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('recentEntities', JSON.stringify(recentEntities));
  }, [recentEntities]);

  // Clear current entity when navigating to home or other non-entity pages
  useEffect(() => {
    if (location === '/' || location === '/dashboard') {
      setCurrentEntityState(null);
    }
  }, [location]);

  const setCurrentEntity = (entity: Entity | null) => {
    setCurrentEntityState(entity);
    if (entity) {
      addRecentEntity(entity);
    }
  };

  const addRecentEntity = (entity: Entity) => {
    setRecentEntities(prev => {
      // Remove if already exists to avoid duplicates
      const filtered = prev.filter(e => e.id !== entity.id);
      // Add to front and limit to 5 recent entities
      return [entity, ...filtered].slice(0, 5);
    });
  };

  const clearCurrentEntity = () => {
    setCurrentEntityState(null);
  };

  const value: EntityContextType = {
    currentEntity,
    recentEntities,
    setCurrentEntity,
    addRecentEntity,
    clearCurrentEntity,
  };

  return (
    <EntityContext.Provider value={value}>
      {children}
    </EntityContext.Provider>
  );
}