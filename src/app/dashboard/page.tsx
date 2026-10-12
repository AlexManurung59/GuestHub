import DashboardStats from "@/components/DashboardStats";
import VisitorTable from "@/components/VisitorTable";
import { visitorData } from "@/data/visitorData";
import VisitorReminder from "@/components/VisitorReminder";

export default function DashboardPage() {
  return (
    <main className="bg-light min-vh-100">
      {/*Header*/}
      <div className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="fw-bold mb-1">Employee Dashboard</h1>
            <p className="text-muted mb-0">Welcome! This is Today Visitor.</p>
          </div>
          <button className="btn btn-primary">+ Register Visitor</button>
        </div>
        {visitorData
          .filter((visitor) => visitor.status === "Waiting")
          .map((visitor) => (
            <VisitorReminder
              key={visitor.id}
              visitorName={visitor.name}
              checkIn={visitor.checkIn}
              //reminder alarm
              thresholdMinutes={10}
            />
          ))}
        {/*Statistics*/}
        <DashboardStats visitors={visitorData} />
        {/* Visitor Table */}
        <VisitorTable visitors={visitorData} />
      </div>
    </main>
  );
}
