import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { login } from "../api/auth";
import type { LoginRequest } from "../types/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("test@gmail.com");
  const [password, setPassword] = useState("835114");

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginRequest) => login(credentials),
    onSuccess: (data) => {
      localStorage.setItem("access_token", data.access_token);
      window.location.href = "/";
    },
    onError: (error) => {
      alert("Đăng nhập thất bại: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-[minmax(320px,520px)_1fr] bg-canvas">
      {/* Login Panel Left */}
      <section className="flex flex-col justify-center p-[clamp(32px,7vw,88px)] bg-white">
        {/* Brand */}
        <div className="flex items-center gap-2.5 font-extrabold text-[1.08rem] text-slate mb-16">
          <div className="w-[38px] h-[38px] rounded-xl bg-teal text-white flex items-center justify-center">
            <svg className="w-5 h-5 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24">
              <path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>
            </svg>
          </div>
          <span>Nhà Trọ An Tâm</span>
        </div>

        <p className="m-0 mb-1.5 text-teal text-[0.75rem] font-extrabold tracking-widest uppercase">
          Quản lý nhẹ nhàng hơn
        </p>
        <h1 className="text-[clamp(2rem,4vw,3rem)] font-bold tracking-tight text-slate my-2">
          Chào mừng trở lại
        </h1>
        <p className="text-muted text-sm m-0 mb-6">
          Theo dõi phòng, hóa đơn và chi phí tại một nơi.
        </p>

        <form onSubmit={handleSubmit} className="grid gap-[9px] mt-2">
          <label className="text-[0.85rem] font-bold text-slate mt-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-border rounded-btn bg-white text-slate px-[13px] h-[44px] focus:outline-none focus:ring-2 focus:ring-blue/30 font-normal"
            required
          />

          <label className="text-[0.85rem] font-bold text-slate mt-1.5">Mật khẩu</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-border rounded-btn bg-white text-slate px-[13px] h-[44px] focus:outline-none focus:ring-2 focus:ring-blue/30 font-normal"
            required
          />

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="mt-4 border border-transparent rounded-btn px-4 bg-teal text-white font-bold text-sm min-h-[44px] hover:bg-teal-dark disabled:bg-gray-400 transition-colors"
          >
            {loginMutation.isPending ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>

          {loginMutation.isError && (
            <p className="text-danger text-sm text-center mt-2 font-semibold">
              Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.
            </p>
          )}
        </form>

        <p className="text-[0.78rem] text-muted text-center mt-[18px]">
          Tài khoản thử nghiệm: test@gmail.com / 835114
        </p>
      </section>

      {/* Login Art Right (Hidden on small screens) */}
      <aside className="hidden lg:flex relative overflow-hidden flex-col justify-between p-[clamp(40px,8vw,100px)] text-white bg-gradient-to-br from-[#0f766e] to-[#075985]">
        {/* Decorative circle */}
        <div className="absolute w-[420px] h-[420px] border-[80px] border-white/10 rounded-full -right-[180px] -top-[120px] pointer-events-none" />

        <div className="relative z-10">
          <span className="inline-flex items-center rounded-full px-[11px] py-[7px] text-[0.75rem] font-bold bg-white/15">
            Tháng 07/2026
          </span>
          <h2 className="text-[clamp(2.5rem,5vw,5rem)] font-bold leading-none tracking-tight my-7">
            Vận hành nhà trọ<br />rõ ràng, an tâm.
          </h2>
          <p className="text-white/90 text-lg m-0">12 phòng · 92% lấp đầy · 9 hóa đơn đã thu</p>
        </div>

        <div className="relative z-10 flex justify-between items-center max-w-[440px] p-[22px] border border-white/20 rounded-[18px] bg-white/10 backdrop-blur-md">
          <div className="grid gap-1.5">
            <span className="text-[0.8rem] text-[#d7f4ef]">Doanh thu dự kiến</span>
            <strong className="text-[1.55rem] font-bold leading-none">31,2 triệu</strong>
          </div>
          <span className="p-2 rounded-lg bg-white/15 text-sm font-bold">+8,4%</span>
        </div>
      </aside>
    </main>
  );
}
