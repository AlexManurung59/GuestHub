import { Visitor } from "@/types/visitor";
import WaitingTimer from "@/components/WaitingTimer";

interface VisitorTableProps {
  visitors: Visitor[];
}

const statusConfig: Record<string, { badge: string; dot: string }> = {
  Waiting: { badge: "status-badge-waiting", dot: "status-dot-waiting" },
  Meeting: { badge: "status-badge-meeting", dot: "status-dot-meeting" },
  Completed: { badge: "status-badge-completed", dot: "status-dot-completed" },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function VisitorTable({ visitors }: VisitorTableProps) {
  return (
    <div className="card border-0 shadow-sm mt-4 visitor-card">
      <div className="card-body p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h5 className="fw-bold mb-1">Visitor List</h5>
            <p className="text-muted small mb-0">{visitors.length} visitors recorded</p>
          </div>
          <button className="btn btn-primary btn-sm px-3 rounded-pill fw-semibold">
            View All
          </button>
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0 visitor-table">
            <thead>
              <tr className="text-uppercase small text-muted">
                <th className="border-0 pb-3">Name</th>
                <th className="border-0 pb-3">Company/Vessel</th>
                <th className="border-0 pb-3">Purpose</th>
                <th className="border-0 pb-3">Phone</th>
                <th className="border-0 pb-3">Division</th>
                <th className="border-0 pb-3">PIC</th>
                <th className="border-0 pb-3">Check-in</th>
                <th className="border-0 pb-3">Waiting Time</th>
                <th className="border-0 pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {visitors.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-5 border-0">
                    No visitors found.
                  </td>
                </tr>
              )}

              {visitors.map((visitor) => {
                const config = statusConfig[visitor.status] ?? {
                  badge: "status-badge-default",
                  dot: "status-dot-default",
                };

                return (
                  <tr key={visitor.name} className="visitor-row">
                    <td className="border-0">
                      <div className="d-flex align-items-center gap-2">
                        <div className="avatar-circle">{getInitials(visitor.name)}</div>
                        <span className="fw-semibold">{visitor.name}</span>
                      </div>
                    </td>
                    <td className="border-0 text-muted">{visitor.company}</td>
                    <td className="border-0 text-muted">{visitor.purpose}</td>
                    <td className="border-0 text-muted">{visitor.phone}</td>
                    <td className="border-0 text-muted">{visitor.division}</td>
                    <td className="border-0 text-muted">{visitor.pic}</td>
                    <td className="border-0 text-muted">{visitor.checkIn}</td>
                    <td className="border-0 text-muted">
                      {visitor.status==="Waiting"?
                      (<WaitingTimer checkIn={visitor.checkIn}/>):visitor.status==="Completed"?(
                        <span className="text-muted">
                          -
                        </span>
                      ):(
                        <span className="text-primary">
                          Visiting
                        </span>
                      )}
                    </td>
                    <td className="border-0">
                      <span className={`status-badge ${config.badge}`}>
                        <span className={`status-dot ${config.dot}`} />
                        {visitor.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}