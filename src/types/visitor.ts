export type VisitorStatus =
|"Waiting"
|"Meeting"
|"Completed"

export interface Visitor {
  id:number;
  name: string;
  visitorType?: "SEAFARER" | "GUEST" | null;
  rank?: string | null;
  position?: string | null;
  company: string;
  phone: string;
  purpose: string;
  division: string;
  pic: string;
  checkIn: string;
  checkOut?: string;
  status: VisitorStatus;
}