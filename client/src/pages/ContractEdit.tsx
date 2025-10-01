import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ContractEditor from "@/components/ContractEditor";

type Contract = {
  id: string;
  orgId: string;
  name: string;
  contractType: string;
  status: string;
  description?: string;
  contractValue?: string;
  currency?: string;
  effectiveDate?: string | Date;
  expirationDate?: string | Date;
  renewalDate?: string | Date;
  autoRenewal?: boolean;
  renewalNoticeDays?: number;
  terminationNoticeDays?: number;
  governingLaw?: string;
  riskLevel?: string;
  tags?: string[];
  content?: string;
};

export default function ContractEdit() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  const { data: contract, isLoading } = useQuery<Contract>({
    queryKey: ["/api/contracts", id],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-center py-12">
          <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground"></i>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Contract Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The contract you're trying to edit could not be found.
            </p>
            <button
              onClick={() => setLocation("/contracts")}
              className="text-primary hover:underline"
            >
              Back to Contracts
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background">
      <ContractEditor
        contractId={id}
        orgId={contract.orgId}
        initialData={contract}
        mode="edit"
        onSave={(savedContract) => {
          setLocation(`/contracts/${savedContract.id}`);
        }}
        onCancel={() => {
          setLocation(`/contracts/${id}`);
        }}
      />
    </div>
  );
}
