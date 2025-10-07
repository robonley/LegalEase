import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemplateUploader } from "@/components/TemplateUploader";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search, MoreHorizontal, Trash2, Eye, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { useEntityContext } from "@/hooks/useEntityContext";
import { DocumentEditor } from "@/components/DocumentEditor";
import type { Template, GeneratedDoc } from "@shared/schema";

export default function Templates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentEntity } = useEntityContext();
  const [activeTab, setActiveTab] = useState("starter");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showVariablesDialog, setShowVariablesDialog] = useState(false);
  const [showDocumentEditor, setShowDocumentEditor] = useState(false);
  const [selectedStarterTemplate, setSelectedStarterTemplate] = useState<any>(null);
  const [selectedDraft, setSelectedDraft] = useState<GeneratedDoc | null>(null);

  // Fetch starter templates
  const { data: starterTemplates = [], isLoading: loadingStarter } = useQuery<Template[]>({
    queryKey: ["/api/templates/starter"],
  });

  // Fetch custom templates
  const { data: customTemplates = [], isLoading: loadingCustom } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  // Fetch draft documents
  const { data: draftDocs = [], isLoading: loadingDrafts } = useQuery<GeneratedDoc[]>({
    queryKey: [`/api/orgs/${currentEntity?.id}/drafts`],
    enabled: !!currentEntity?.id,
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (templateId: string) => {
      await apiRequest("DELETE", `/api/templates/${templateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getTemplateBadge = (scope: string, category?: string | null) => {
    if (category === 'minute-book') return <Badge variant="default">Minute Book</Badge>;
    if (scope === 'resolution') return <Badge variant="secondary">Resolution</Badge>;
    if (scope === 'register') return <Badge variant="outline">Register</Badge>;
    if (scope === 'bylaws') return <Badge variant="secondary">By-Laws</Badge>;
    if (scope === 'organization') return <Badge variant="default">Organization</Badge>;
    return <Badge>{scope}</Badge>;
  };

  const getTemplateIcon = (scope: string, category?: string | null) => {
    if (category === 'minute-book') return 'fas fa-book';
    if (scope === 'resolution') return 'fas fa-file-signature';
    if (scope === 'register') return 'fas fa-list-alt';
    if (scope === 'bylaws') return 'fas fa-gavel';
    if (scope === 'organization') return 'fas fa-building';
    return 'fas fa-file-alt';
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString();
  };

  const filteredStarter = starterTemplates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const filteredCustom = customTemplates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const handlePreviewTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setShowPreviewDialog(true);
  };

  const handleViewVariables = (template: Template) => {
    setSelectedTemplate(template);
    setShowVariablesDialog(true);
  };

  const handleDeleteTemplate = (templateId: string) => {
    deleteMutation.mutate(templateId);
  };

  // Create common corporate resolutions for existing corporations
  const getCommonResolutions = () => {
    return [
      // Annual / Routine Resolutions
      {
        category: 'Annual / Routine Resolutions',
        type: 'Directors\' Resolutions',
        resolutions: [
          { id: 'annual-directors-financial', name: 'Approving Financial Statements', icon: 'fas fa-chart-line', content: '<div style="text-align: center; margin-bottom: 20px;"><h1>{{CompanyName}}</h1><h2>RESOLUTION OF THE BOARD OF DIRECTORS</h2><h3>APPROVING FINANCIAL STATEMENTS</h3></div><p><strong>WHEREAS</strong> the Board of Directors of {{CompanyName}} (the "Corporation") deems it advisable and in the best interests of the Corporation to approve the annual financial statements;</p><p><strong>NOW THEREFORE BE IT RESOLVED THAT:</strong></p><ol><li>The financial statements of the Corporation for the year ending {{FormationDate}} be and are hereby approved and adopted.</li><li>The officers of the Corporation are hereby authorized and directed to take all such action and execute all such documents as may be necessary or desirable to give effect to this resolution.</li></ol><p>This resolution may be executed in counterparts and by electronic signature.</p><br><p><strong>DATED:</strong> {{CurrentDate}}</p><br><br><table style="width: 100%; border-collapse: collapse;"><tr><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td></tr></table>' },
          { id: 'annual-directors-officers', name: 'Appointing Officers', icon: 'fas fa-user-tie', content: '<div style="text-align: center; margin-bottom: 20px;"><h1>{{CompanyName}}</h1><h2>RESOLUTION OF THE BOARD OF DIRECTORS</h2><h3>APPOINTING OFFICERS</h3></div><p><strong>WHEREAS</strong> the Board of Directors of {{CompanyName}} (the "Corporation") deems it advisable and necessary to appoint officers to manage the day-to-day operations of the Corporation;</p><p><strong>NOW THEREFORE BE IT RESOLVED THAT:</strong></p><ol><li>The following persons are hereby appointed as officers of the Corporation to hold office at the pleasure of the Board:<br><br>President: {{President}}<br>Secretary: {{Secretary}}<br>Treasurer: {{Treasurer}}</li><li>Each such officer is hereby authorized to exercise all powers and perform all duties incident to their respective offices.</li><li>All previous appointments of officers are hereby confirmed and ratified.</li></ol><p>This resolution may be executed in counterparts and by electronic signature.</p><br><p><strong>DATED:</strong> {{CurrentDate}}</p><br><br><table style="width: 100%; border-collapse: collapse;"><tr><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td></tr></table>' },
          { id: 'annual-directors-dividends', name: 'Declaring Dividends', icon: 'fas fa-coins', content: '<div style="text-align: center; margin-bottom: 20px;"><h1>{{CompanyName}}</h1><h2>RESOLUTION OF THE BOARD OF DIRECTORS</h2><h3>DECLARING DIVIDENDS</h3></div><p><strong>WHEREAS</strong> the Board of Directors of {{CompanyName}} (the "Corporation") deems it advisable and in the best interests of the Corporation and its shareholders to declare a dividend;</p><p><strong>WHEREAS</strong> the Corporation has sufficient retained earnings and cash flow to support such dividend payment;</p><p><strong>NOW THEREFORE BE IT RESOLVED THAT:</strong></p><ol><li>A dividend of $_______ per share on the Common Shares of the Corporation be and is hereby declared.</li><li>The dividend shall be payable on _______ to shareholders of record as of _______.</li><li>The officers of the Corporation are hereby authorized and directed to take all necessary steps to pay such dividend and make all required filings.</li></ol><p>This resolution may be executed in counterparts and by electronic signature.</p><br><p><strong>DATED:</strong> {{CurrentDate}}</p><br><br><table style="width: 100%; border-collapse: collapse;"><tr><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td></tr></table>' },
          { id: 'annual-directors-meeting', name: 'Calling Annual Shareholders Meeting', icon: 'fas fa-calendar', content: '<div style="text-align: center; margin-bottom: 20px;"><h1>{{CompanyName}}</h1><h2>RESOLUTION OF THE BOARD OF DIRECTORS</h2><h3>CALLING ANNUAL SHAREHOLDERS MEETING</h3></div><p><strong>WHEREAS</strong> the Board of Directors of {{CompanyName}} (the "Corporation") is required to call an annual meeting of shareholders;</p><p><strong>WHEREAS</strong> the Board deems it advisable to call such meeting for the transaction of business;</p><p><strong>NOW THEREFORE BE IT RESOLVED THAT:</strong></p><ol><li>The annual meeting of shareholders of the Corporation be and is hereby called for _______ at _______ o\'clock __.m.</li><li>The meeting shall be held at the registered office of the Corporation or such other location as may be determined by the officers.</li><li>The business to be transacted shall include: election of directors, appointment of auditor, and such other business as may properly come before the meeting.</li><li>The officers are hereby authorized to give proper notice of such meeting as required by law and the by-laws of the Corporation.</li></ol><p>This resolution may be executed in counterparts and by electronic signature.</p><br><p><strong>DATED:</strong> {{CurrentDate}}</p><br><br><table style="width: 100%; border-collapse: collapse;"><tr><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td></tr></table>' }
        ]
      },
      {
        category: 'Annual / Routine Resolutions',
        type: 'Shareholders\' Resolutions',
        resolutions: [
          { id: 'annual-shareholders-directors', name: 'Electing Directors', icon: 'fas fa-vote-yea', content: '<div style="text-align: center; margin-bottom: 20px;"><h1>{{CompanyName}}</h1><h2>RESOLUTION OF THE SHAREHOLDERS</h2><h3>ELECTING DIRECTORS</h3></div><p><strong>WHEREAS</strong> the shareholders of {{CompanyName}} (the "Corporation") are required to elect directors at the annual meeting;</p><p><strong>WHEREAS</strong> the shareholders wish to elect qualified persons to serve as directors;</p><p><strong>NOW THEREFORE BE IT RESOLVED THAT:</strong></p><ol><li>The following persons are hereby elected as directors of the Corporation to hold office until the next annual meeting of shareholders or until their successors are duly elected:<br><br>{{DirectorNames}}</li><li>The number of directors is hereby fixed at the number of persons so elected.</li><li>All acts of the directors in their capacity as such are hereby ratified and confirmed.</li></ol><p>This resolution may be executed in counterparts and by electronic signature.</p><br><p><strong>DATED:</strong> {{CurrentDate}}</p><br><br><table style="width: 100%; border-collapse: collapse;"><tr><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Shareholder Signature</td><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Shareholder Signature</td></tr></table>' },
          { id: 'annual-shareholders-auditor', name: 'Appointing Auditor', icon: 'fas fa-user-check', content: '<div style="text-align: center; margin-bottom: 20px;"><h1>{{CompanyName}}</h1><h2>RESOLUTION OF THE SHAREHOLDERS</h2><h3>APPOINTING AUDITOR</h3></div><p><strong>WHEREAS</strong> the shareholders of {{CompanyName}} (the "Corporation") are required to appoint an auditor for the Corporation;</p><p><strong>WHEREAS</strong> the shareholders wish to appoint a qualified firm to serve as auditor;</p><p><strong>NOW THEREFORE BE IT RESOLVED THAT:</strong></p><ol><li>_______________________ be and is hereby appointed as auditor of the Corporation to hold office until the next annual meeting of shareholders at a remuneration to be fixed by the directors.</li><li>The auditor is hereby authorized to examine the books and accounts of the Corporation and to prepare the audited financial statements.</li><li>The directors are hereby authorized to fix the remuneration of the auditor.</li></ol><p>This resolution may be executed in counterparts and by electronic signature.</p><br><p><strong>DATED:</strong> {{CurrentDate}}</p><br><br><table style="width: 100%; border-collapse: collapse;"><tr><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Shareholder Signature</td><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Shareholder Signature</td></tr></table>' },
          { id: 'annual-shareholders-waive-audit', name: 'Waiving Audit (Small Corps)', icon: 'fas fa-times-circle', content: '<div style="text-align: center; margin-bottom: 20px;"><h1>{{CompanyName}}</h1><h2>RESOLUTION OF THE SHAREHOLDERS</h2><h3>WAIVING AUDIT</h3></div><p><strong>WHEREAS</strong> {{CompanyName}} (the "Corporation") qualifies as a non-distributing corporation within the meaning of the applicable corporate legislation;</p><p><strong>WHEREAS</strong> all shareholders consent to waive the appointment of an auditor;</p><p><strong>NOW THEREFORE BE IT RESOLVED THAT:</strong></p><ol><li>The appointment of an auditor for the Corporation for the current financial year is hereby waived.</li><li>The financial statements of the Corporation may be prepared without audit, review or compilation by a public accountant.</li><li>This resolution shall remain in effect until revoked by the shareholders.</li></ol><p>This resolution may be executed in counterparts and by electronic signature.</p><br><p><strong>DATED:</strong> {{CurrentDate}}</p><br><br><table style="width: 100%; border-collapse: collapse;"><tr><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Shareholder Signature</td><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Shareholder Signature</td></tr></table>' }
        ]
      },
      
      // Changes in Directors/Officers
      {
        category: 'Changes in Directors/Officers',
        type: 'Director Changes',
        resolutions: [
          { id: 'director-appointment', name: 'Appointment of New Director', icon: 'fas fa-user-plus', content: '<div style="text-align: center; margin-bottom: 20px;"><h1>{{CompanyName}}</h1><h2>RESOLUTION OF THE BOARD OF DIRECTORS</h2><h3>APPOINTMENT OF DIRECTOR</h3></div><p><strong>WHEREAS</strong> the Board of Directors of {{CompanyName}} (the "Corporation") deems it advisable to appoint an additional director;</p><p><strong>WHEREAS</strong> the person proposed is qualified and willing to serve as a director;</p><p><strong>NOW THEREFORE BE IT RESOLVED THAT:</strong></p><ol><li>_______________________ be and is hereby appointed as a director of the Corporation to hold office until the next annual meeting of shareholders or until a successor is duly elected or appointed.</li><li>The corporate secretary is directed to update the register of directors accordingly.</li><li>All necessary filings with regulatory authorities shall be made promptly.</li></ol><p>This resolution may be executed in counterparts and by electronic signature.</p><br><p><strong>DATED:</strong> {{CurrentDate}}</p><br><br><table style="width: 100%; border-collapse: collapse;"><tr><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td></tr></table>' },
          { id: 'director-resignation', name: 'Resignation of Director', icon: 'fas fa-user-minus', content: '<div style="text-align: center; margin-bottom: 20px;"><h1>{{CompanyName}}</h1><h2>RESOLUTION OF THE BOARD OF DIRECTORS</h2><h3>ACCEPTANCE OF DIRECTOR RESIGNATION</h3></div><p><strong>WHEREAS</strong> _______________________ has tendered their resignation as a director of {{CompanyName}} (the "Corporation");</p><p><strong>WHEREAS</strong> the Board of Directors deems it appropriate to accept such resignation;</p><p><strong>NOW THEREFORE BE IT RESOLVED THAT:</strong></p><ol><li>The resignation of _______________________ as a director of the Corporation, effective _______, be and is hereby accepted with regret.</li><li>The Board expresses its appreciation for the valuable services rendered by the resigning director.</li><li>The corporate secretary is directed to update the register of directors and make all necessary regulatory filings.</li></ol><p>This resolution may be executed in counterparts and by electronic signature.</p><br><p><strong>DATED:</strong> {{CurrentDate}}</p><br><br><table style="width: 100%; border-collapse: collapse;"><tr><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td></tr></table>' },
          { id: 'registered-office-change', name: 'Change of Registered Office Address', icon: 'fas fa-map-marker-alt', content: '<div style="text-align: center; margin-bottom: 20px;"><h1>{{CompanyName}}</h1><h2>RESOLUTION OF THE BOARD OF DIRECTORS</h2><h3>CHANGE OF REGISTERED OFFICE</h3></div><p><strong>WHEREAS</strong> the Board of Directors of {{CompanyName}} (the "Corporation") deems it advisable to change the registered office of the Corporation;</p><p><strong>WHEREAS</strong> the proposed new location meets all legal requirements;</p><p><strong>NOW THEREFORE BE IT RESOLVED THAT:</strong></p><ol><li>The registered office of the Corporation be and is hereby changed from {{RegisteredOffice}} to:<br><br>_______________________<br>_______________________<br>_______________________</li><li>The officers are hereby authorized to file all necessary documents with the appropriate regulatory authorities to effect this change.</li><li>This change shall be effective upon acceptance by the regulatory authorities.</li></ol><p>This resolution may be executed in counterparts and by electronic signature.</p><br><p><strong>DATED:</strong> {{CurrentDate}}</p><br><br><table style="width: 100%; border-collapse: collapse;"><tr><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td></tr></table>' }
        ]
      },
      {
        category: 'Changes in Directors/Officers',
        type: 'Officer Changes',
        resolutions: [
          { id: 'officer-appointment', name: 'Appointment of Officer (CEO, CFO, etc.)', icon: 'fas fa-briefcase', content: '<div style="text-align: center; margin-bottom: 20px;"><h1>{{CompanyName}}</h1><h2>RESOLUTION OF THE BOARD OF DIRECTORS</h2><h3>APPOINTMENT OF OFFICER</h3></div><p><strong>WHEREAS</strong> the Board of Directors of {{CompanyName}} (the "Corporation") deems it advisable to appoint an officer;</p><p><strong>WHEREAS</strong> the person proposed is qualified and willing to serve in such capacity;</p><p><strong>NOW THEREFORE BE IT RESOLVED THAT:</strong></p><ol><li>_______________________ be and is hereby appointed as _______________________ of the Corporation to hold office at the pleasure of the Board.</li><li>Such officer is hereby authorized to exercise all powers and perform all duties incident to such office.</li><li>The corporate secretary is directed to update the register of officers accordingly.</li></ol><p>This resolution may be executed in counterparts and by electronic signature.</p><br><p><strong>DATED:</strong> {{CurrentDate}}</p><br><br><table style="width: 100%; border-collapse: collapse;"><tr><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td></tr></table>' },
          { id: 'officer-resignation', name: 'Resignation/Termination of Officer', icon: 'fas fa-user-times', content: '<div style="text-align: center; margin-bottom: 20px;"><h1>{{CompanyName}}</h1><h2>RESOLUTION OF THE BOARD OF DIRECTORS</h2><h3>ACCEPTANCE OF OFFICER RESIGNATION</h3></div><p><strong>WHEREAS</strong> _______________________ has tendered their resignation as _______________________ of {{CompanyName}} (the "Corporation");</p><p><strong>WHEREAS</strong> the Board of Directors deems it appropriate to accept such resignation;</p><p><strong>NOW THEREFORE BE IT RESOLVED THAT:</strong></p><ol><li>The resignation of _______________________ as _______________________ of the Corporation, effective _______, be and is hereby accepted.</li><li>The Board expresses its appreciation for the valuable services rendered.</li><li>The corporate secretary is directed to update the register of officers and take all necessary administrative actions.</li></ol><p>This resolution may be executed in counterparts and by electronic signature.</p><br><p><strong>DATED:</strong> {{CurrentDate}}</p><br><br><table style="width: 100%; border-collapse: collapse;"><tr><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td></tr></table>' }
        ]
      },

      // Shareholder Matters
      {
        category: 'Shareholder Matters',
        type: 'Share Transactions',
        resolutions: [
          { id: 'share-issuance', name: 'Issuance of Shares', icon: 'fas fa-certificate', content: '<div style="text-align: center; margin-bottom: 20px;"><h1>{{CompanyName}}</h1><h2>RESOLUTION OF THE BOARD OF DIRECTORS</h2><h3>ISSUANCE OF SHARES</h3></div><p><strong>WHEREAS</strong> {{CompanyName}} (the "Corporation") has authorized share capital as set out in its articles of incorporation;</p><p><strong>WHEREAS</strong> the Board deems it advisable to issue shares of the Corporation;</p><p><strong>NOW THEREFORE BE IT RESOLVED THAT:</strong></p><ol><li>The Corporation hereby issues _______ shares of _______ class to _______________________ for total consideration of $_______.</li><li>The consideration is fair and reasonable and has been or will be fully paid.</li><li>The corporate secretary is directed to issue the appropriate share certificates and update the share register.</li><li>All necessary regulatory filings shall be made.</li></ol><p>This resolution may be executed in counterparts and by electronic signature.</p><br><p><strong>DATED:</strong> {{CurrentDate}}</p><br><br><table style="width: 100%; border-collapse: collapse;"><tr><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td></tr></table>' },
          { id: 'share-transfer', name: 'Transfer of Shares', icon: 'fas fa-exchange-alt', content: '<div style="text-align: center; margin-bottom: 20px;"><h1>{{CompanyName}}</h1><h2>RESOLUTION OF THE BOARD OF DIRECTORS</h2><h3>APPROVAL OF SHARE TRANSFER</h3></div><p><strong>WHEREAS</strong> _______________________ wishes to transfer _______ shares of {{CompanyName}} (the "Corporation") to _______________________;</p><p><strong>WHEREAS</strong> the Board deems such transfer to be in the best interests of the Corporation;</p><p><strong>NOW THEREFORE BE IT RESOLVED THAT:</strong></p><ol><li>The transfer of _______ shares from _______________________ to _______________________ be and is hereby approved.</li><li>The transferee meets all requirements for share ownership under the articles and by-laws.</li><li>The corporate secretary is directed to record the transfer in the share register and issue new certificates as required.</li><li>All transfer documents are hereby approved for execution.</li></ol><p>This resolution may be executed in counterparts and by electronic signature.</p><br><p><strong>DATED:</strong> {{CurrentDate}}</p><br><br><table style="width: 100%; border-collapse: collapse;"><tr><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td></tr></table>' },
          { id: 'share-redemption', name: 'Redemption or Repurchase of Shares', icon: 'fas fa-undo', content: '<div style="text-align: center; margin-bottom: 20px;"><h1>{{CompanyName}}</h1><h2>RESOLUTION OF THE BOARD OF DIRECTORS</h2><h3>REDEMPTION OF SHARES</h3></div><p><strong>WHEREAS</strong> {{CompanyName}} (the "Corporation") wishes to redeem shares in accordance with its articles of incorporation;</p><p><strong>WHEREAS</strong> the Corporation has sufficient financial resources to complete the redemption;</p><p><strong>NOW THEREFORE BE IT RESOLVED THAT:</strong></p><ol><li>The Corporation hereby redeems _______ shares held by _______________________ for total consideration of $_______.</li><li>The redemption price is fair and reasonable and reflects the true value of the shares.</li><li>The Corporation has the financial capacity to complete this redemption without impairing its ability to pay creditors.</li><li>The corporate secretary is directed to cancel the redeemed shares and update the share register accordingly.</li></ol><p>This resolution may be executed in counterparts and by electronic signature.</p><br><p><strong>DATED:</strong> {{CurrentDate}}</p><br><br><table style="width: 100%; border-collapse: collapse;"><tr><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td></tr></table>' },
          { id: 'dividend-declaration', name: 'Declaration of Dividends', icon: 'fas fa-money-bill-wave', content: '<div style="text-align: center; margin-bottom: 20px;"><h1>{{CompanyName}}</h1><h2>RESOLUTION OF THE SHAREHOLDERS</h2><h3>DECLARATION OF DIVIDENDS</h3></div><p><strong>WHEREAS</strong> {{CompanyName}} (the "Corporation") has distributable earnings;</p><p><strong>WHEREAS</strong> the shareholders wish to declare a dividend;</p><p><strong>NOW THEREFORE BE IT RESOLVED THAT:</strong></p><ol><li>A dividend of $_______ per share on the _______ shares of the Corporation be and is hereby declared.</li><li>The dividend shall be payable on _______ to shareholders of record as of _______.</li><li>The directors are hereby authorized to take all necessary steps to pay such dividend.</li><li>Appropriate withholding taxes, if any, shall be deducted and remitted as required by law.</li></ol><p>This resolution may be executed in counterparts and by electronic signature.</p><br><p><strong>DATED:</strong> {{CurrentDate}}</p><br><br><table style="width: 100%; border-collapse: collapse;"><tr><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Shareholder Signature</td><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Shareholder Signature</td></tr></table>' }
        ]
      },

      // Financial/Corporate Administration
      {
        category: 'Financial/Corporate Administration',
        type: 'Financial Resolutions',
        resolutions: [
          { id: 'banking-arrangements', name: 'Banking Arrangements & Signing Authority', icon: 'fas fa-university', content: '<div style="text-align: center; margin-bottom: 20px;"><h1>{{CompanyName}}</h1><h2>RESOLUTION OF THE BOARD OF DIRECTORS</h2><h3>BANKING ARRANGEMENTS & SIGNING AUTHORITY</h3></div><p><strong>WHEREAS</strong> {{CompanyName}} (the "Corporation") requires banking facilities for the conduct of its business;</p><p><strong>WHEREAS</strong> it is necessary to establish signing authorities for the Corporation\'s banking arrangements;</p><p><strong>NOW THEREFORE BE IT RESOLVED THAT:</strong></p><ol><li>The Corporation is hereby authorized to establish banking arrangements with _______________________ (the "Bank").</li><li>The following officers are authorized to sign cheques, drafts, and other banking documents on behalf of the Corporation: _______________________.</li><li>Any two of the authorized signatories may sign jointly for amounts up to $_______.</li><li>The corporate secretary is directed to provide the Bank with certified copies of this resolution and specimen signatures.</li></ol><p>This resolution may be executed in counterparts and by electronic signature.</p><br><p><strong>DATED:</strong> {{CurrentDate}}</p><br><br><table style="width: 100%; border-collapse: collapse;"><tr><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td></tr></table>' },
          { id: 'borrowing-resolution', name: 'Borrowing Resolutions', icon: 'fas fa-hand-holding-usd', content: '<div style="text-align: center; margin-bottom: 20px;"><h1>{{CompanyName}}</h1><h2>RESOLUTION OF THE BOARD OF DIRECTORS</h2><h3>BORROWING AUTHORITY</h3></div><p><strong>WHEREAS</strong> {{CompanyName}} (the "Corporation") requires additional financing for its business operations;</p><p><strong>WHEREAS</strong> the Board deems it advisable to authorize borrowing on behalf of the Corporation;</p><p><strong>NOW THEREFORE BE IT RESOLVED THAT:</strong></p><ol><li>The Corporation is hereby authorized to borrow money from time to time up to an aggregate principal amount not exceeding $_______.</li><li>The Corporation may pledge, mortgage, or grant security interests in its assets to secure such borrowings.</li><li>The officers of the Corporation are authorized to execute all loan agreements, security documents, and related instruments necessary to effect such borrowings.</li><li>This borrowing authority shall remain in effect until revoked by the Board.</li></ol><p>This resolution may be executed in counterparts and by electronic signature.</p><br><p><strong>DATED:</strong> {{CurrentDate}}</p><br><br><table style="width: 100%; border-collapse: collapse;"><tr><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td></tr></table>' },
          { id: 'dividend-approval', name: 'Approval of Dividend Declaration', icon: 'fas fa-check-circle', content: '<div style="text-align: center; margin-bottom: 20px;"><h1>{{CompanyName}}</h1><h2>RESOLUTION OF THE BOARD OF DIRECTORS</h2><h3>APPROVAL OF DIVIDEND DECLARATION</h3></div><p><strong>WHEREAS</strong> the shareholders of {{CompanyName}} (the "Corporation") have declared a dividend;</p><p><strong>WHEREAS</strong> the Board of Directors must approve the payment of such dividend;</p><p><strong>NOW THEREFORE BE IT RESOLVED THAT:</strong></p><ol><li>The dividend declaration by the shareholders in the amount of $_______ per share be and is hereby approved.</li><li>The Corporation has sufficient retained earnings and cash flow to support the dividend payment.</li><li>The dividend shall be paid on _______ to shareholders of record as of _______.</li><li>The officers are authorized to take all necessary steps to pay the dividend and make required tax remittances.</li></ol><p>This resolution may be executed in counterparts and by electronic signature.</p><br><p><strong>DATED:</strong> {{CurrentDate}}</p><br><br><table style="width: 100%; border-collapse: collapse;"><tr><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td></tr></table>' }
        ]
      },

      // Special but Still Common
      {
        category: 'Special but Still Common',
        type: 'Corporate Changes',
        resolutions: [
          { id: 'bylaw-amendment', name: 'Amendment to By-laws', icon: 'fas fa-gavel', content: '<div style="text-align: center; margin-bottom: 20px;"><h1>{{CompanyName}}</h1><h2>RESOLUTION OF THE SHAREHOLDERS</h2><h3>AMENDMENT TO BY-LAWS</h3></div><p><strong>WHEREAS</strong> {{CompanyName}} (the "Corporation") has by-laws governing its internal affairs;</p><p><strong>WHEREAS</strong> the shareholders deem it advisable to amend the by-laws of the Corporation;</p><p><strong>NOW THEREFORE BE IT RESOLVED THAT:</strong></p><ol><li>By-law No. _______ of the Corporation be and is hereby amended as follows: _______________________.</li><li>The amended by-law shall take effect immediately upon the passing of this resolution.</li><li>The directors are hereby authorized to make any necessary filings with regulatory authorities.</li><li>All previous by-laws of the Corporation remain in full force and effect except as specifically amended hereby.</li></ol><p>This resolution may be executed in counterparts and by electronic signature.</p><br><p><strong>DATED:</strong> {{CurrentDate}}</p><br><br><table style="width: 100%; border-collapse: collapse;"><tr><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Shareholder Signature</td><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Shareholder Signature</td></tr></table>' },
          { id: 'contract-ratification', name: 'Ratification of Contracts with Related Parties', icon: 'fas fa-handshake', content: '<div style="text-align: center; margin-bottom: 20px;"><h1>{{CompanyName}}</h1><h2>RESOLUTION OF THE BOARD OF DIRECTORS</h2><h3>RATIFICATION OF RELATED PARTY CONTRACT</h3></div><p><strong>WHEREAS</strong> {{CompanyName}} (the "Corporation") has entered into or proposes to enter into a contract with a related party;</p><p><strong>WHEREAS</strong> the Board deems such contract to be fair and reasonable and in the best interests of the Corporation;</p><p><strong>NOW THEREFORE BE IT RESOLVED THAT:</strong></p><ol><li>The contract dated _______ between the Corporation and _______________________ (the "Related Party") be and is hereby ratified and approved.</li><li>The Board confirms that the terms of the contract are fair and reasonable and were negotiated at arm\'s length.</li><li>Any director having an interest in the contract has disclosed such interest and abstained from voting.</li><li>The officers are authorized to execute all documents necessary to complete the contract.</li></ol><p>This resolution may be executed in counterparts and by electronic signature.</p><br><p><strong>DATED:</strong> {{CurrentDate}}</p><br><br><table style="width: 100%; border-collapse: collapse;"><tr><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Director Signature</td></tr></table>' },
          { id: 'usa-adoption', name: 'Unanimous Shareholder Agreement', icon: 'fas fa-users', content: '<div style="text-align: center; margin-bottom: 20px;"><h1>{{CompanyName}}</h1><h2>RESOLUTION OF THE SHAREHOLDERS</h2><h3>ADOPTION OF UNANIMOUS SHAREHOLDER AGREEMENT</h3></div><p><strong>WHEREAS</strong> the shareholders of {{CompanyName}} (the "Corporation") wish to enter into a Unanimous Shareholder Agreement ("USA");</p><p><strong>WHEREAS</strong> such agreement will restrict the powers of the directors and provide for certain shareholder rights;</p><p><strong>NOW THEREFORE BE IT RESOLVED THAT:</strong></p><ol><li>The Unanimous Shareholder Agreement in the form presented to this meeting be and is hereby approved and adopted.</li><li>Each shareholder is hereby authorized to execute the USA on behalf of themselves and their successors and assigns.</li><li>The restrictions on director powers contained in the USA are hereby acknowledged and approved.</li><li>The corporate secretary is directed to file a copy of the USA with the corporate records and regulatory authorities as required.</li></ol><p>This resolution may be executed in counterparts and by electronic signature.</p><br><p><strong>DATED:</strong> {{CurrentDate}}</p><br><br><table style="width: 100%; border-collapse: collapse;"><tr><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Shareholder Signature</td><td style="width: 50%; text-align: center; border-top: 1px solid black; padding-top: 5px;">Shareholder Signature</td></tr></table>' }
        ]
      }
    ];
  };

  const commonResolutions = getCommonResolutions();

  // Filter common resolutions based on search term
  const filteredCommonResolutions = searchTerm
    ? commonResolutions
        .map(group => ({
          ...group,
          resolutions: group.resolutions.filter(resolution =>
            resolution.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            group.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            group.type.toLowerCase().includes(searchTerm.toLowerCase())
          )
        }))
        .filter(group => group.resolutions.length > 0) // Only include groups that have matching resolutions
    : commonResolutions;

  const handleOpenStarterTemplate = (template: any) => {
    console.log('Templates Debug:', {
      template: template.name,
      currentEntity,
      entityId: currentEntity?.id
    });
    
    // Always allow opening the editor - we'll handle entity selection within it
    setSelectedStarterTemplate(template);
    setShowDocumentEditor(true);
  };

  const handleSaveDocument = async (content: string) => {
    if (!selectedStarterTemplate) return;
    
    try {
      // Create a new document based on the starter template
      const response = await apiRequest("POST", "/api/documents", {
        orgId: currentEntity?.id,
        templateId: selectedStarterTemplate.id,
        content,
        fileKey: `${selectedStarterTemplate.name} - ${new Date().toLocaleDateString()}`
      });

      // Invalidate drafts cache to show the new document
      queryClient.invalidateQueries({ queryKey: [`/api/orgs/${currentEntity?.id}/drafts`] });

      toast({
        title: "Success",
        description: "Document created successfully",
      });

      setShowDocumentEditor(false);
      setSelectedStarterTemplate(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save document",
        variant: "destructive",
      });
    }
  };

  const renderTemplateTable = (templates: Template[], isStarter: boolean = false) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Description</TableHead>
          {!isStarter && <TableHead>Created</TableHead>}
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {templates.length === 0 ? (
          <TableRow>
            <TableCell colSpan={isStarter ? 4 : 5} className="text-center py-8 text-muted-foreground">
              No templates found
            </TableCell>
          </TableRow>
        ) : (
          templates.map((template) => (
            <TableRow key={template.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                    <i className={`${getTemplateIcon(template.scope, template.category)} text-sm`}></i>
                  </div>
                  <div>
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-muted-foreground">{template.code}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {getTemplateBadge(template.scope, template.category)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                {template.description || 'No description'}
              </TableCell>
              {!isStarter && (
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(template.createdAt?.toString() ?? null)}
                </TableCell>
              )}
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" data-testid={`template-actions-${template.id}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handlePreviewTemplate(template)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleViewVariables(template)}>
                      <Search className="mr-2 h-4 w-4" />
                      View Variables
                    </DropdownMenuItem>
                    {!isStarter && (
                      <>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Template</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{template.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteTemplate(template.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Templates</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage document templates for generating legal documents
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
                data-testid="template-search"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="starter" data-testid="quick-create-tab">
              Create
            </TabsTrigger>
            <TabsTrigger value="custom" data-testid="custom-templates-tab">
              Manage Templates ({customTemplates.length})
            </TabsTrigger>
            <TabsTrigger value="drafts" data-testid="drafts-tab">
              Drafts ({draftDocs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="custom">
            <Card>
              <CardContent className="p-0">
                <div className="border-b p-6">
                  <TemplateUploader orgId={currentEntity?.id || ''} />
                </div>
                <div className="p-0">
                  {renderTemplateTable(filteredCustom)}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="starter">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {filteredCommonResolutions.length === 0 && searchTerm ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No resolutions found for "{searchTerm}"
                    </div>
                  ) : (
                    Object.entries(
                      filteredCommonResolutions.reduce((acc, group) => {
                        if (!acc[group.category]) {
                          acc[group.category] = [];
                        }
                        acc[group.category].push(group);
                        return acc;
                      }, {} as Record<string, typeof filteredCommonResolutions>)
                    ).map(([category, groups]) => (
                      <div key={category}>
                        <h3 className="text-lg font-semibold mb-4 text-primary">{category}</h3>
                        
                        {/* Render each group type within the category */}
                        {groups.map((group, groupIndex) => (
                          <Collapsible key={`${category}-${groupIndex}`} className="mb-6">
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-between p-4 h-auto"
                                data-testid={`resolution-group-${group.type.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                    <i className="fas fa-file-signature text-primary"></i>
                                  </div>
                                  <div className="text-left">
                                    <div className="font-medium">{group.type}</div>
                                    <div className="text-sm text-muted-foreground">{group.resolutions.length} resolutions</div>
                                  </div>
                                </div>
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-2 mt-2">
                              {group.resolutions.map((resolution) => (
                                <div
                                  key={resolution.id}
                                  className="flex items-center gap-3 p-3 ml-4 border border-border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                                  onClick={() => handleOpenStarterTemplate(resolution)}
                                  data-testid={`resolution-${resolution.id}`}
                                >
                                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                                    <i className={`${resolution.icon} text-sm text-muted-foreground`}></i>
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">{resolution.name}</div>
                                  </div>
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                </div>
                              ))}
                            </CollapsibleContent>
                          </Collapsible>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drafts">
            <Card>
              <CardContent className="p-6">
                {loadingDrafts ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-muted-foreground">Loading drafts...</div>
                  </div>
                ) : draftDocs.length === 0 ? (
                  <div className="text-center py-12">
                    <i className="fas fa-file-alt text-4xl text-muted-foreground mb-4"></i>
                    <h3 className="text-lg font-semibold mb-2">No Draft Documents</h3>
                    <p className="text-sm text-muted-foreground">
                      Start creating a document from a template to see drafts here
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {draftDocs.map((draft) => (
                      <Card 
                        key={draft.id} 
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={async () => {
                          try {
                            const fullDraft = (await apiRequest("GET", `/api/documents/${draft.id}`)) as unknown as GeneratedDoc;
                            setSelectedDraft(fullDraft);
                            setShowDocumentEditor(true);
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to load draft document",
                              variant: "destructive",
                            });
                          }
                        }}
                        data-testid={`draft-${draft.id}`}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center">
                                <i className="fas fa-file-alt text-amber-600 dark:text-amber-400"></i>
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg">{draft.fileKey || "Untitled Document"}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Last updated: {draft.updatedAt ? new Date(draft.updatedAt).toLocaleDateString() : 'Unknown'}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950">
                              <i className="fas fa-pencil mr-1"></i>
                              Draft
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <i className={`${getTemplateIcon(selectedTemplate?.scope || '', selectedTemplate?.category)}`}></i>
              {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate?.description}
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Category:</span>
                  <div className="mt-1">{getTemplateBadge(selectedTemplate.scope, selectedTemplate.category)}</div>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Code:</span>
                  <div className="mt-1 font-mono text-xs">{selectedTemplate.code}</div>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Type:</span>
                  <div className="mt-1">{selectedTemplate.isStarter ? 'Starter Template' : 'Custom Template'}</div>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Created:</span>
                  <div className="mt-1">{formatDate(selectedTemplate.createdAt?.toString() ?? null)}</div>
                </div>
              </div>
              <Separator />
              <div>
                <span className="font-medium text-muted-foreground">Schema Fields:</span>
                <div className="mt-2 p-3 bg-muted rounded-lg font-mono text-xs max-h-48 overflow-y-auto">
                  <pre>{JSON.stringify(selectedTemplate.schema, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Variables Dialog */}
      <Dialog open={showVariablesDialog} onOpenChange={setShowVariablesDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Template Variables</DialogTitle>
            <DialogDescription>
              Available variables for {selectedTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variable</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedTemplate.variables && typeof selectedTemplate.variables === 'object' ? (
                      Object.entries(selectedTemplate.variables as Record<string, any>).map(([key, value]) => (
                        <TableRow key={key}>
                          <TableCell className="font-mono text-sm">
                            {`{{${key}}}`}
                          </TableCell>
                          <TableCell className="text-sm">{value.description || 'No description'}</TableCell>
                          <TableCell className="text-sm">
                            <Badge variant="outline">{value.type || 'string'}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                          No variables defined for this template
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Document Editor Modal */}
      {showDocumentEditor && selectedStarterTemplate && (
        <Dialog open={showDocumentEditor} onOpenChange={setShowDocumentEditor}>
          <DialogContent className="max-w-6xl max-h-[90vh] p-0 top-[5%] translate-y-0">
            <DocumentEditor
              documentId={null}
              orgId={currentEntity?.id || ''}
              initialContent={selectedStarterTemplate.content}
              initialTitle={selectedStarterTemplate.name}
              onSave={handleSaveDocument}
              onClose={() => {
                setShowDocumentEditor(false);
                setSelectedStarterTemplate(null);
              }}
              isFullscreen={false}
              onToggleFullscreen={() => {}}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Document Editor Modal for Drafts */}
      {showDocumentEditor && selectedDraft && (
        <Dialog open={showDocumentEditor} onOpenChange={setShowDocumentEditor}>
          <DialogContent className="max-w-6xl max-h-[90vh] p-0 top-[5%] translate-y-0">
            <DocumentEditor
              documentId={selectedDraft.id}
              orgId={currentEntity?.id || ''}
              initialContent={selectedDraft.content || ''}
              initialTitle={selectedDraft.fileKey || 'Untitled Document'}
              onClose={() => {
                setShowDocumentEditor(false);
                setSelectedDraft(null);
                queryClient.invalidateQueries({ queryKey: [`/api/orgs/${currentEntity?.id}/drafts`] });
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}