import { useLocation } from "wouter";
import { useEntityContext } from "@/hooks/useEntityContext";
import ContractEditor from "@/components/ContractEditor";

export default function ContractNew() {
  const [, setLocation] = useLocation();
  const { currentEntity } = useEntityContext();

  if (!currentEntity) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">No Entity Selected</h2>
            <p className="text-muted-foreground mb-4">
              Please select an entity to create a contract for.
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
        orgId={currentEntity.id}
        mode="create"
        onSave={(contract) => {
          setLocation(`/contracts/${contract.id}`);
        }}
        onCancel={() => {
          setLocation("/contracts");
        }}
      />
    </div>
  );
}
