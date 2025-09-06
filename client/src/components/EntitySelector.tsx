import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useEntityContext } from '@/hooks/useEntityContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function EntitySelector() {
  const { currentEntity, recentEntities, setCurrentEntity } = useEntityContext();
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();

  // Show current entity or default message
  const displayEntity = currentEntity || {
    name: 'Select an Entity',
    jurisdiction: ''
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-3 bg-muted hover:bg-accent h-auto min-h-[52px]"
          data-testid="entity-selector"
        >
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-primary-foreground">
                {getInitials(displayEntity.name)}
              </span>
            </div>
            <div className="text-left min-w-0 flex-1">
              <div className="text-sm font-medium leading-tight break-words">
                {displayEntity.name}
              </div>
            </div>
          </div>
          <i className="fas fa-chevron-down text-xs text-muted-foreground flex-shrink-0"></i>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-64" align="start">
        {recentEntities.length > 0 && (
          <>
            <DropdownMenuLabel>Recent Entities</DropdownMenuLabel>
            {recentEntities.map((entity) => (
              <DropdownMenuItem 
                key={entity.id}
                onClick={() => {
                  setCurrentEntity(entity);
                  setIsOpen(false);
                  // Navigate to entity detail page (same as View button from Entities screen)
                  setLocation(`/entities/${entity.id}`);
                }}
              >
                <div className="flex items-center gap-3 w-full cursor-pointer">
                  <div className="w-6 h-6 bg-primary rounded flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-primary-foreground">
                      {getInitials(entity.name)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium leading-tight break-words">
                      {entity.name}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        
        <DropdownMenuItem asChild>
          <Link href="/entities">
            <div 
              className="flex items-center gap-3 w-full cursor-pointer"
              onClick={() => setIsOpen(false)}
            >
              <i className="fas fa-building w-4 text-muted-foreground"></i>
              <span>View All Entities</span>
            </div>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link href="/entities?action=create">
            <div 
              className="flex items-center gap-3 w-full cursor-pointer"
              onClick={() => setIsOpen(false)}
            >
              <i className="fas fa-plus w-4 text-muted-foreground"></i>
              <span>Create New Entity</span>
            </div>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}