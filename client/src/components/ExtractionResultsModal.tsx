import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, AlertTriangle, Building, User, DollarSign, FileText } from 'lucide-react';

interface ExtractedEntity {
  name: string;
  type: string;
  incorporationNumber?: string;
  jurisdiction?: string;
  address?: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  confidence: number;
}

interface ExtractedPerson {
  firstName: string;
  lastName: string;
  roles: string[];
  email?: string;
  address?: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  confidence: number;
}

interface ExtractedShareData {
  className: string;
  totalShares: number;
  parValue?: number;
  votingRights: boolean;
  dividendRights: boolean;
  holders: {
    personName: string;
    sharesHeld: number;
    certificateNumber?: string;
  }[];
  confidence: number;
}

interface ExtractionResult {
  id: string;
  filename: string;
  entities: ExtractedEntity[];
  people: ExtractedPerson[];
  shareData: ExtractedShareData[];
  summary: {
    totalEntities: number;
    totalPeople: number;
    totalShareClasses: number;
    averageConfidence: number;
  };
}

interface ExtractionResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: ExtractionResult[];
  onApplyResults: (selectedData: any) => void;
}

export function ExtractionResultsModal({ 
  isOpen, 
  onClose, 
  results, 
  onApplyResults 
}: ExtractionResultsModalProps) {
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set());
  const [selectedShareData, setSelectedShareData] = useState<Set<string>>(new Set());

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBadge = (confidence: number) => {
    const percentage = Math.round(confidence * 100);
    let variant: 'default' | 'secondary' | 'destructive' = 'default';
    
    if (confidence >= 0.8) variant = 'default';
    else if (confidence >= 0.6) variant = 'secondary';
    else variant = 'destructive';

    return (
      <Badge variant={variant} className="ml-2">
        {percentage}% confident
      </Badge>
    );
  };

  const handleApply = () => {
    const selectedData = {
      entities: results.flatMap(result => 
        result.entities.filter((_, index) => 
          selectedEntities.has(`${result.id}-entity-${index}`)
        )
      ),
      people: results.flatMap(result => 
        result.people.filter((_, index) => 
          selectedPeople.has(`${result.id}-person-${index}`)
        )
      ),
      shareData: results.flatMap(result => 
        result.shareData.filter((_, index) => 
          selectedShareData.has(`${result.id}-share-${index}`)
        )
      ),
    };

    onApplyResults(selectedData);
    onClose();
  };

  const toggleEntity = (resultId: string, index: number) => {
    const key = `${resultId}-entity-${index}`;
    const newSelected = new Set(selectedEntities);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedEntities(newSelected);
  };

  const togglePerson = (resultId: string, index: number) => {
    const key = `${resultId}-person-${index}`;
    const newSelected = new Set(selectedPeople);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedPeople(newSelected);
  };

  const toggleShareData = (resultId: string, index: number) => {
    const key = `${resultId}-share-${index}`;
    const newSelected = new Set(selectedShareData);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedShareData(newSelected);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Extraction Results
          </DialogTitle>
          <DialogDescription>
            Review the information extracted from your documents. Select what you want to import.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {results.map((result) => (
              <Card key={result.id}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {result.filename}
                    </span>
                    {getConfidenceBadge(result.summary.averageConfidence)}
                  </CardTitle>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{result.summary.totalEntities} entities</span>
                    <span>{result.summary.totalPeople} people</span>
                    <span>{result.summary.totalShareClasses} share classes</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="entities" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="entities" className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Entities
                      </TabsTrigger>
                      <TabsTrigger value="people" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        People
                      </TabsTrigger>
                      <TabsTrigger value="shares" className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Share Data
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="entities" className="space-y-4">
                      {result.entities.length > 0 ? (
                        result.entities.map((entity, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-4 border rounded-lg"
                            data-testid={`entity-${result.id}-${index}`}
                          >
                            <Checkbox
                              checked={selectedEntities.has(`${result.id}-entity-${index}`)}
                              onCheckedChange={() => toggleEntity(result.id, index)}
                              data-testid={`select-entity-${result.id}-${index}`}
                            />
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{entity.name}</h4>
                                {getConfidenceBadge(entity.confidence)}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                <div>Type: {entity.type}</div>
                                {entity.incorporationNumber && (
                                  <div>Inc. #: {entity.incorporationNumber}</div>
                                )}
                                {entity.jurisdiction && (
                                  <div>Jurisdiction: {entity.jurisdiction}</div>
                                )}
                              </div>
                              {entity.address && (
                                <div className="text-sm text-muted-foreground">
                                  <p>{entity.address.street}</p>
                                  <p>{entity.address.city}, {entity.address.province} {entity.address.postalCode}</p>
                                  <p>{entity.address.country}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-muted-foreground py-8">No entities found</p>
                      )}
                    </TabsContent>

                    <TabsContent value="people" className="space-y-4">
                      {result.people.length > 0 ? (
                        result.people.map((person, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-4 border rounded-lg"
                            data-testid={`person-${result.id}-${index}`}
                          >
                            <Checkbox
                              checked={selectedPeople.has(`${result.id}-person-${index}`)}
                              onCheckedChange={() => togglePerson(result.id, index)}
                              data-testid={`select-person-${result.id}-${index}`}
                            />
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{person.firstName} {person.lastName}</h4>
                                {getConfidenceBadge(person.confidence)}
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {person.roles.map((role, roleIndex) => (
                                  <Badge key={roleIndex} variant="outline">
                                    {role}
                                  </Badge>
                                ))}
                              </div>
                              {person.email && (
                                <p className="text-sm text-muted-foreground">Email: {person.email}</p>
                              )}
                              {person.address && (
                                <div className="text-sm text-muted-foreground">
                                  <p>{person.address.street}</p>
                                  <p>{person.address.city}, {person.address.province} {person.address.postalCode}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-muted-foreground py-8">No people found</p>
                      )}
                    </TabsContent>

                    <TabsContent value="shares" className="space-y-4">
                      {result.shareData.length > 0 ? (
                        result.shareData.map((shareClass, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-4 border rounded-lg"
                            data-testid={`share-${result.id}-${index}`}
                          >
                            <Checkbox
                              checked={selectedShareData.has(`${result.id}-share-${index}`)}
                              onCheckedChange={() => toggleShareData(result.id, index)}
                              data-testid={`select-share-${result.id}-${index}`}
                            />
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{shareClass.className}</h4>
                                {getConfidenceBadge(shareClass.confidence)}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                <div>Total Shares: {shareClass.totalShares.toLocaleString()}</div>
                                {shareClass.parValue && (
                                  <div>Par Value: ${shareClass.parValue}</div>
                                )}
                                <div>Voting: {shareClass.votingRights ? 'Yes' : 'No'}</div>
                                <div>Dividend: {shareClass.dividendRights ? 'Yes' : 'No'}</div>
                              </div>
                              {shareClass.holders.length > 0 && (
                                <div className="mt-3">
                                  <h5 className="font-medium text-sm mb-2">Shareholders:</h5>
                                  <div className="space-y-1">
                                    {shareClass.holders.map((holder, holderIndex) => (
                                      <div key={holderIndex} className="text-sm flex justify-between">
                                        <span>{holder.personName}</span>
                                        <span>{holder.sharesHeld.toLocaleString()} shares</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-muted-foreground py-8">No share data found</p>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <Separator />

        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Selected: {selectedEntities.size} entities, {selectedPeople.size} people, {selectedShareData.size} share classes
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleApply}
              disabled={selectedEntities.size === 0 && selectedPeople.size === 0 && selectedShareData.size === 0}
              data-testid="apply-extraction-results"
            >
              Apply Selected Data
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}