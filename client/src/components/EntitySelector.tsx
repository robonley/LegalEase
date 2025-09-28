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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EntitySelectorProps {
  sidebarWidth?: number;
}

export function EntitySelector({ sidebarWidth = 256 }: EntitySelectorProps) {
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
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-3 bg-muted hover:bg-accent h-auto min-h-[52px] max-w-full"
              data-testid="entity-selector"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-6 h-6 bg-primary rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-primary-foreground">
                    {getInitials(displayEntity.name)}
                  </span>
                </div>
                <div className="text-left min-w-0 flex-1">
                  <div className="text-sm font-medium leading-tight truncate">
                    {displayEntity.name}
                  </div>
                </div>
              </div>
              <i className="fas fa-chevron-down text-xs text-muted-foreground flex-shrink-0 ml-2"></i>
            </Button>
          </TooltipTrigger>
          {displayEntity.name !== 'Select an Entity' && displayEntity.name.length > 20 && (
            <TooltipContent side="right" className="max-w-xs">
              <p className="font-medium">{displayEntity.name}</p>
              {currentEntity?.jurisdiction && (
                <p className="text-xs text-muted-foreground">{currentEntity.jurisdiction}</p>
              )}
            </TooltipContent>
          )}
        </Tooltip>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="min-w-[240px]" 
        style={{ width: Math.max(240, sidebarWidth - 32) }}
        align="start"
      >
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
                    <div className="text-sm font-medium leading-tight truncate" title={entity.name}>
                      {entity.name}
                    </div>
                    {entity.jurisdiction && (
                      <div className="text-xs text-muted-foreground truncate">
                        {entity.jurisdiction}
                      </div>
                    )}
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