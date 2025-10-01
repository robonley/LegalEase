import { useQuery } from "@tanstack/react-query";
import { useState, useCallback, useMemo, useEffect } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { Building2, X, Users, UserCircle, Share2, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { Org, Person, PersonOnOrg, ShareIssuance } from "@shared/schema";

interface NetworkData {
  entities: Org[];
  relationships: Array<{
    id: string;
    parentEntityId: string;
    childEntityId: string;
    relationshipType: string;
    ownershipPercentage: number | null;
    notes: string | null;
    effectiveDate: Date | null;
    endDate: Date | null;
    createdBy: string;
    createdAt: Date | null;
    updatedAt: Date | null;
    parentEntity: Org;
    childEntity: Org;
  }>;
  peopleByOrg: Record<string, Array<{
    person: Omit<Person, 'email' | 'dob'>;
    relation: PersonOnOrg & { relationId: string };
  }>>;
  shareIssuancesByOrg: Record<string, ShareIssuance[]>;
}

// Custom Entity Node Component
function EntityNode({ data }: { data: { entity: Org; onSelect: (entity: Org) => void } }) {
  return (
    <div
      className="px-4 py-3 shadow-lg rounded-lg border-2 border-primary/20 bg-card min-w-[200px] cursor-pointer hover:border-primary/40 transition-colors"
      onClick={() => data.onSelect(data.entity)}
      data-testid={`node-entity-${data.entity.id}`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex items-center gap-2 mb-1">
        <Building2 className="h-4 w-4 text-primary" />
        <div className="font-semibold text-sm">{data.entity.name}</div>
      </div>
      <div className="text-xs text-muted-foreground">{data.entity.jurisdiction}</div>
      {data.entity.number && (
        <div className="text-xs text-muted-foreground mt-1">#{data.entity.number}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}

const nodeTypes = {
  entity: EntityNode,
};

// Dagre layout configuration
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const nodeWidth = 220;
  const nodeHeight = 100;

  dagreGraph.setGraph({ rankdir: direction, nodesep: 100, ranksep: 150 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// Relationship type to edge style mapping
const getEdgeStyle = (relationshipType: string) => {
  switch (relationshipType) {
    case 'subsidiary':
      return { stroke: '#3b82f6', strokeWidth: 2 };
    case 'parent':
      return { stroke: '#8b5cf6', strokeWidth: 2 };
    case 'sister':
      return { stroke: '#ec4899', strokeWidth: 2, strokeDasharray: '5,5' };
    case 'related':
      return { stroke: '#10b981', strokeWidth: 2, strokeDasharray: '3,3' };
    case 'joint_venture':
      return { stroke: '#f59e0b', strokeWidth: 2 };
    default:
      return { stroke: '#6b7280', strokeWidth: 1 };
  }
};

export default function EntityNetworkVisualization() {
  const [selectedEntity, setSelectedEntity] = useState<Org | null>(null);

  const { data: networkData, isLoading } = useQuery<NetworkData>({
    queryKey: ['/api/entity-network'],
  });

  // Convert data to React Flow nodes and edges
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!networkData) return { nodes: [], edges: [] };

    const nodes: Node[] = networkData.entities.map((entity) => ({
      id: entity.id,
      type: 'entity',
      position: { x: 0, y: 0 },
      data: { 
        entity,
        onSelect: setSelectedEntity,
      },
    }));

    const edges: Edge[] = networkData.relationships.map((rel) => ({
      id: rel.id,
      source: rel.parentEntityId,
      target: rel.childEntityId,
      label: rel.ownershipPercentage ? `${rel.ownershipPercentage}%` : rel.relationshipType,
      type: 'smoothstep',
      style: getEdgeStyle(rel.relationshipType),
      animated: rel.relationshipType === 'subsidiary',
      labelStyle: { fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
    }));

    return getLayoutedElements(nodes, edges);
  }, [networkData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when data changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const handleClosePanel = useCallback(() => {
    setSelectedEntity(null);
  }, []);

  // Get people and shareholdings for selected entity
  const selectedEntityPeople = useMemo(() => {
    if (!selectedEntity || !networkData) return { directors: [], officers: [], shareholders: [] };
    
    const people = networkData.peopleByOrg[selectedEntity.id] || [];
    
    return {
      directors: people.filter(p => p.relation.role?.toLowerCase() === 'director'),
      officers: people.filter(p => p.relation.role?.toLowerCase() === 'officer'),
      shareholders: people.filter(p => p.relation.role?.toLowerCase() === 'shareholder'),
    };
  }, [selectedEntity, networkData]);

  const selectedEntityShares = useMemo(() => {
    if (!selectedEntity || !networkData) return { individual: [], corporate: [] };
    
    const shares = networkData.shareIssuancesByOrg[selectedEntity.id] || [];
    
    return {
      individual: shares.filter(s => s.shareholderType === 'person'),
      corporate: shares.filter(s => s.shareholderType === 'entity'),
    };
  }, [selectedEntity, networkData]);

  if (isLoading) {
    return (
      <div className="h-screen p-8">
        <Skeleton className="h-12 w-64 mb-4" />
        <Skeleton className="h-[calc(100vh-8rem)] w-full" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 border-b bg-background">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          Entity Network Visualization
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Interactive visualization of entity relationships and ownership structures
        </p>
      </div>

      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          data-testid="entity-network-graph"
        >
          <Controls data-testid="network-controls" />
          <MiniMap 
            data-testid="network-minimap"
            nodeColor={(node) => '#3b82f6'}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
          <Background color="#aaa" gap={16} />
        </ReactFlow>

        {selectedEntity && (
          <div className="absolute top-4 right-4 w-96 bg-background border rounded-lg shadow-xl z-10 max-h-[calc(100vh-8rem)] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between bg-muted/50">
              <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="panel-entity-name">
                <Building2 className="h-5 w-5" />
                {selectedEntity.name}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClosePanel}
                data-testid="button-close-details"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Entity Details */}
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Entity Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Jurisdiction:</span>{" "}
                      <span data-testid="text-jurisdiction">{selectedEntity.jurisdiction}</span>
                    </div>
                    {selectedEntity.number && (
                      <div>
                        <span className="text-muted-foreground">Corporation #:</span>{" "}
                        <span data-testid="text-corporation-number">{selectedEntity.number}</span>
                      </div>
                    )}
                    {selectedEntity.formationAt && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Formed:</span>{" "}
                        <span data-testid="text-formation-date">
                          {new Date(selectedEntity.formationAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Directors */}
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Directors ({selectedEntityPeople.directors.length})
                  </h3>
                  {selectedEntityPeople.directors.length > 0 ? (
                    <div className="space-y-2" data-testid="list-directors">
                      {selectedEntityPeople.directors.map((director) => (
                        <div key={director.person.id} className="text-sm bg-muted/30 p-2 rounded" data-testid={`director-${director.person.id}`}>
                          <div className="font-medium">
                            {director.person.firstName} {director.person.lastName}
                          </div>
                          {director.relation.startAt && (
                            <div className="text-xs text-muted-foreground">
                              From: {new Date(director.relation.startAt).toLocaleDateString()}
                              {director.relation.endAt && ` - To: ${new Date(director.relation.endAt).toLocaleDateString()}`}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No directors recorded</p>
                  )}
                </div>

                <Separator />

                {/* Officers */}
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    Officers ({selectedEntityPeople.officers.length})
                  </h3>
                  {selectedEntityPeople.officers.length > 0 ? (
                    <div className="space-y-2" data-testid="list-officers">
                      {selectedEntityPeople.officers.map((officer) => (
                        <div key={officer.person.id} className="text-sm bg-muted/30 p-2 rounded" data-testid={`officer-${officer.person.id}`}>
                          <div className="font-medium">
                            {officer.person.firstName} {officer.person.lastName}
                          </div>
                          {officer.relation.title && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              {officer.relation.title}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No officers recorded</p>
                  )}
                </div>

                <Separator />

                {/* Individual Shareholders */}
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    Individual Shareholders ({selectedEntityShares.individual.length})
                  </h3>
                  {selectedEntityShares.individual.length > 0 ? (
                    <div className="space-y-2" data-testid="list-shareholders-individual">
                      {selectedEntityShares.individual.map((share) => {
                        const shareholder = selectedEntityPeople.shareholders.find(
                          p => p.person.id === share.shareholderId
                        );
                        return (
                          <div key={share.id} className="text-sm bg-muted/30 p-2 rounded" data-testid={`shareholder-individual-${share.id}`}>
                            {shareholder && (
                              <div className="font-medium">
                                {shareholder.person.firstName} {shareholder.person.lastName}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {share.quantity.toLocaleString()} shares
                              {share.certNumber && ` - Cert #${share.certNumber}`}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No individual shareholders</p>
                  )}
                </div>

                <Separator />

                {/* Corporate Shareholders */}
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Corporate Shareholders ({selectedEntityShares.corporate.length})
                  </h3>
                  {selectedEntityShares.corporate.length > 0 ? (
                    <div className="space-y-2" data-testid="list-shareholders-corporate">
                      {selectedEntityShares.corporate.map((share) => {
                        const corporateShareholder = networkData?.entities.find(
                          e => e.id === share.entityShareholderId
                        );
                        return (
                          <div key={share.id} className="text-sm bg-muted/30 p-2 rounded" data-testid={`shareholder-corporate-${share.id}`}>
                            {corporateShareholder && (
                              <div className="font-medium">{corporateShareholder.name}</div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {share.quantity.toLocaleString()} shares
                              {share.certNumber && ` - Cert #${share.certNumber}`}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No corporate shareholders</p>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
