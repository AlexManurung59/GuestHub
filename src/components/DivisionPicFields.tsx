"use client";

import { scrollDivision, scrollPIC, getPICByDivision } from "@/data/scroll";

interface DivisionPicFieldsProps {
  division: string;
  pic: string;
  onDivisionChange: (division: string) => void;
  onPicChange: (pic: string) => void;
  divisionLabel: string;
  selectDivisionLabel: string;
  picLabel: string;
  selectPICLabel: string;
  divisionId?: string;
  picId?: string;
}

export default function DivisionPicFields({
  division,
  pic,
  onDivisionChange,
  onPicChange,
  divisionLabel,
  selectDivisionLabel,
  picLabel,
  selectPICLabel,
  divisionId = "division",
  picId = "pic",
}: DivisionPicFieldsProps) {
  const availablePICs = division ? getPICByDivision(division) : scrollPIC;

  return (
    <div className="row g-3">
      <div className="col-12 col-md-6">
        <label htmlFor={divisionId} className="form-label fw-semibold">
          {divisionLabel}
        </label>
        <select
          className="form-select"
          id={divisionId}
          value={division}
          onChange={(event) => {
            const nextDivision = event.target.value;
            const divisionPICs = getPICByDivision(nextDivision);
            onDivisionChange(nextDivision);
            onPicChange(divisionPICs.length === 1 ? divisionPICs[0] : "");
          }}
          required
        >
          <option value="">{selectDivisionLabel}</option>
          {scrollDivision.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="col-12 col-md-6">
        <label htmlFor={picId} className="form-label fw-semibold">
          {picLabel}
        </label>
        <select
          className="form-select"
          id={picId}
          value={pic}
          onChange={(event) => onPicChange(event.target.value)}
          disabled={Boolean(division) && availablePICs.length === 0}
          required
        >
          <option value="">{selectPICLabel}</option>
          {availablePICs.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
