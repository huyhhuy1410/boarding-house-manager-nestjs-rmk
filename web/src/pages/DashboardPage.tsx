import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchDashboardData } from "../api/dashboard";

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardData,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted text-sm font-semibold">Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Topbar */}
      <header className="min-h-[104px] flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-[clamp(20px,4vw,52px)] py-[22px] border-b border-border bg-white/88 backdrop-blur-[10px]">
        <div>
          <p className="m-0 mb-1.5 text-teal text-[0.75rem] font-extrabold tracking-widest uppercase">
            Nhà trọ An Tâm
          </p>
          <h1 className="text-[1.65rem] font-bold tracking-tight text-slate m-0">Tổng quan</h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-[30px_clamp(20px,4vw,52px)_56px]">
        {/* Section Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-5">
          <div>
            <h2 className="m-0 text-[1.15rem] font-bold text-slate">Tình hình tháng hiện tại</h2>
            <p className="m-0 mt-1 text-muted text-[0.83rem]">
              Cập nhật gần nhất: {new Date().toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[0.7rem] font-extrabold bg-[#e6f7f2] text-[#08705f] self-start sm:self-auto">
            Đang vận hành tốt
          </span>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          <article className="border border-border rounded-card bg-card shadow-card p-5">
            <span className="text-muted text-[0.78rem] font-[650] block">Tỷ lệ lấp đầy</span>
            <strong className="block my-2.5 mb-1 text-[1.65rem] font-bold tracking-tight text-slate">
              {stats?.occupancyRate || 0}%
            </strong>
            <small className="text-teal font-bold text-[0.8rem]">
              {stats?.occupiedRooms || 0}/{stats?.totalRooms || 0} phòng đang thuê
            </small>
          </article>

          <article className="border border-border rounded-card bg-card shadow-card p-5">
            <span className="text-muted text-[0.78rem] font-[650] block">Doanh thu đã thu</span>
            <strong className="block my-2.5 mb-1 text-[1.65rem] font-bold tracking-tight text-slate">
              {new Intl.NumberFormat('vi-VN').format(stats?.totalRevenue || 0)} ₫
            </strong>
            <small className="text-teal font-bold text-[0.8rem]">
              {stats?.paidInvoices || 0} hóa đơn hoàn tất
            </small>
          </article>

          <article className="border border-border rounded-card bg-card shadow-card p-5">
            <span className="text-muted text-[0.78rem] font-[650] block">Hóa đơn chờ thu</span>
            <strong className="block my-2.5 mb-1 text-[1.65rem] font-bold tracking-tight text-slate">
              {stats?.pendingInvoices || 0}
            </strong>
            <small className="text-teal font-bold text-[0.8rem]">Cần theo dõi</small>
          </article>

          <article className="border border-border rounded-card bg-card shadow-card p-5">
            <span className="text-muted text-[0.78rem] font-[650] block">Hợp đồng đang hiệu lực</span>
            <strong className="block my-2.5 mb-1 text-[1.65rem] font-bold tracking-tight text-slate">
              {stats?.activeContracts || 0}
            </strong>
            <small className="text-teal font-bold text-[0.8rem]">Khách thuê hiện tại</small>
          </article>
        </div>

        {/* Two Columns Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_0.75fr] gap-5">
          <article className="border border-border rounded-card bg-card shadow-card p-5">
            <h3 className="m-0 mb-[18px] text-base font-bold text-slate">Phân bổ phòng</h3>
            <div className="space-y-[17px] text-[0.84rem]">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-slate">Phòng đang thuê</span>
                  <strong className="font-bold text-slate">{stats?.occupiedRooms || 0} phòng</strong>
                </div>
                <div className="h-2 rounded-full bg-[#e8efee] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-teal"
                    style={{ width: `${stats?.occupancyRate || 0}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-slate">Phòng trống</span>
                  <strong className="font-bold text-slate">{stats?.vacantRooms || 0} phòng</strong>
                </div>
                <div className="h-2 rounded-full bg-[#e8efee] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue"
                    style={{ width: `${100 - (stats?.occupancyRate || 0)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </article>

          <article className="border border-border rounded-card bg-card shadow-card p-5">
            <h3 className="m-0 mb-[18px] text-base font-bold text-slate">Thống kê nhanh</h3>
            <div className="space-y-4 text-[0.82rem]">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted">Tổng số phòng</span>
                <strong className="font-bold text-slate">{stats?.totalRooms || 0}</strong>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted">Hợp đồng active</span>
                <strong className="font-bold text-slate">{stats?.activeContracts || 0}</strong>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted">Hóa đơn đã thu</span>
                <strong className="font-bold text-[#08705f]">{stats?.paidInvoices || 0}</strong>
              </div>
            </div>
          </article>
        </div>

        {/* Recent Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
          <article className="border border-border rounded-card bg-card shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="m-0 text-base font-bold text-slate">Hóa đơn chờ thu</h3>
              <Link to="/invoices" className="text-teal text-[0.78rem] font-bold hover:underline">
                Xem tất cả →
              </Link>
            </div>
            {stats?.dueInvoices.length ? (
              <ul className="m-0 p-0 list-none divide-y divide-border">
                {stats.dueInvoices.map((inv) => (
                  <li key={inv.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[0.82rem] font-bold text-slate truncate">
                        {inv.contract?.tenant?.name || inv.contractId}
                      </div>
                      <div className="text-[0.7rem] text-muted">
                        {inv.contract?.room?.code || "—"} · Kỳ {inv.month}/{inv.year}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[0.82rem] font-bold text-slate">
                        {new Intl.NumberFormat('vi-VN').format(inv.total)} ₫
                      </div>
                      <div className="text-[0.7rem] text-amber-600 font-bold">
                        Đến {inv.dueAt ? new Date(inv.dueAt).toLocaleDateString('vi-VN') : "—"}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-muted text-sm">Chưa có hóa đơn chờ thu.</p>
            )}
          </article>

          <article className="border border-border rounded-card bg-card shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="m-0 text-base font-bold text-slate">Hợp đồng sắp hết hạn</h3>
              <Link to="/contracts" className="text-teal text-[0.78rem] font-bold hover:underline">
                Xem tất cả →
              </Link>
            </div>
            {stats?.expiringContracts.length ? (
              <ul className="m-0 p-0 list-none divide-y divide-border">
                {stats.expiringContracts.map((contract) => (
                  <li key={contract.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[0.82rem] font-bold text-slate truncate">
                        {contract.tenant?.name || "—"}
                      </div>
                      <div className="text-[0.7rem] text-muted">
                        {contract.room?.code || "—"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[0.82rem] font-bold text-amber-600">
                        {contract.endsAt ? new Date(contract.endsAt).toLocaleDateString('vi-VN') : "—"}
                      </div>
                      <div className="text-[0.7rem] text-muted">Kết thúc hợp đồng</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-muted text-sm">Chưa có hợp đồng sắp hết hạn.</p>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}
