import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NAICSSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const NAICS_CODES = [
  { code: "541110", label: "541110 - Offices of Lawyers" },
  { code: "541120", label: "541120 - Offices of Notaries" },
  { code: "541211", label: "541211 - Offices of Certified Public Accountants" },
  { code: "541213", label: "541213 - Tax Preparation Services" },
  { code: "541990", label: "541990 - All Other Professional, Scientific and Technical Services" },
  { code: "523930", label: "523930 - Investment Advice" },
  { code: "541611", label: "541611 - Administrative Management and General Management Consulting Services" },
];

export function NAICSSelector({ value, onChange, disabled }: NAICSSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger data-testid="select-naics-code">
        <SelectValue placeholder="Select NAICS code" />
      </SelectTrigger>
      <SelectContent>
        {NAICS_CODES.map((naics) => (
          <SelectItem key={naics.code} value={naics.code} data-testid={`option-naics-${naics.code}`}>
            {naics.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
