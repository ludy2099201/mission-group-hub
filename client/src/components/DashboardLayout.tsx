import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Bell,
  CalendarDays,
  CalendarCheck2,
  ClipboardList,
  ContactRound,
  ChevronDown,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  PanelLeft,
  ShieldCheck,
  Sprout,
  UsersRound,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, useSidebar } from "./ui/sidebar";

const menuItems: { icon: typeof LayoutDashboard; label: string; path: string; roles: ("Admin" | "Leader" | "Member")[] }[] = [
  { icon: LayoutDashboard, label: "儀表板", path: "/", roles: ["Admin", "Leader", "Member"] },
  { icon: Sprout, label: "宣教士", path: "/missionaries", roles: ["Admin", "Leader", "Member"] },
  { icon: HeartHandshake, label: "代禱事項", path: "/prayers", roles: ["Admin", "Leader", "Member"] },
  { icon: UsersRound, label: "小組牧養", path: "/groups", roles: ["Admin", "Leader"] },
  { icon: ClipboardList, label: "牧養工作", path: "/pastoral-work", roles: ["Admin", "Leader"] },
  { icon: ContactRound, label: "人員主檔", path: "/people", roles: ["Admin"] },
  { icon: CalendarDays, label: "活動行事曆", path: "/activities", roles: ["Admin", "Leader", "Member"] },
  { icon: CalendarCheck2, label: "活動報名", path: "/event-registration", roles: ["Admin"] },
  { icon: Megaphone, label: "公告中心", path: "/announcements", roles: ["Admin", "Leader", "Member"] },
  { icon: ShieldCheck, label: "角色權限", path: "/permissions", roles: ["Admin"] },
  { icon: ShieldCheck, label: "資料治理", path: "/governance", roles: ["Admin"] },
];

const SIDEBAR_WIDTH_KEY = "mission-group-sidebar-width";
const DEFAULT_WIDTH = 264;
const MIN_WIDTH = 216;
const MAX_WIDTH = 360;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem(SIDEBAR_WIDTH_KEY)) || DEFAULT_WIDTH);
  const { loading, user } = useAuth();

  useEffect(() => localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString()), [sidebarWidth]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f5f1e9] px-6">
        <div className="text-center"><div className="mx-auto grid h-12 w-12 animate-pulse place-items-center rounded-2xl bg-[#355f4d] text-white"><Sprout className="h-5 w-5" /></div><p className="mt-5 font-serif text-xl font-semibold text-[#355f4d]">正在預備管理空間</p><p className="mt-2 text-sm text-[#7b857d]">請稍候，正在確認登入狀態。</p></div>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="min-h-screen grid place-items-center overflow-hidden bg-[#f5f1e9] px-6 text-center">
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle at 16% 18%, rgba(154, 111, 62, 0.18), transparent 26%), radial-gradient(circle at 82% 82%, rgba(57, 93, 76, 0.17), transparent 28%)" }} />
        <section className="relative max-w-md rounded-[2rem] border border-white/80 bg-white/85 p-10 shadow-[0_24px_70px_rgba(67,49,25,0.12)] backdrop-blur">
          <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-[#355f4d] text-white shadow-lg"><Sprout className="h-6 w-6" /></div>
          <p className="mb-2 text-xs font-semibold tracking-[0.22em] text-[#a06c3b]">MISSION & GROUP HUB</p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-[#273b32]">以關懷，連結使命</h1>
          <p className="mt-4 leading-7 text-[#66736b]">登入後即可進入宣教支持、小組牧養、關懷追蹤與教會活動的整合管理空間。</p>
          <Button onClick={() => startLogin()} size="lg" className="mt-8 w-full rounded-xl bg-[#355f4d] text-white hover:bg-[#294a3d]">登入管理系統</Button>
        </section>
      </div>
    );
  }

  return <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}><LayoutContent setSidebarWidth={setSidebarWidth}>{children}</LayoutContent></SidebarProvider>;
}

function LayoutContent({ children, setSidebarWidth }: { children: React.ReactNode; setSidebarWidth: (width: number) => void }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const isMobile = useIsMobile();
  const isCollapsed = state === "collapsed";
  const visibleItems = menuItems.filter(item => item.roles.includes(user?.role ?? "Member"));
  const active = visibleItems.find(item => item.path === location);
  const isRestrictedRoute = menuItems.some(item => item.path === location) && !visibleItems.some(item => item.path === location);

  useEffect(() => {
    if (isRestrictedRoute) setLocation("/");
  }, [isRestrictedRoute, setLocation]);

  useEffect(() => {
    const move = (event: MouseEvent) => {
      if (!isResizing) return;
      const left = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const width = event.clientX - left;
      if (width >= MIN_WIDTH && width <= MAX_WIDTH) setSidebarWidth(width);
    };
    const up = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
      document.body.style.cursor = "col-resize";
    }
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-[#e8e2d8] bg-[#fdfcf9]" disableTransition={isResizing}>
          <SidebarHeader className="h-[86px] justify-center border-b border-[#eee9e1]">
            <div className="flex items-center gap-3 px-3">
              <button onClick={toggleSidebar} aria-label="收合選單" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[#6e776f] transition hover:bg-[#f2eee7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a06c3b]"><PanelLeft className="h-4 w-4" /></button>
              {!isCollapsed && <div className="min-w-0"><p className="font-serif text-lg font-semibold text-[#29483c]">恩典同行</p><p className="mt-0.5 text-[10px] font-bold tracking-[0.18em] text-[#a06c3b]">CHURCH CARE</p></div>}
            </div>
          </SidebarHeader>
          <SidebarContent className="px-2 py-5">
            {!isCollapsed && <p className="px-3 pb-2 text-[10px] font-bold tracking-[0.16em] text-[#9a938a]">管理空間</p>}
            <SidebarMenu className="gap-1">
              {visibleItems.map(item => {
                const activeItem = item.path === location;
                return <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={activeItem} onClick={() => setLocation(item.path)} tooltip={item.label} className={`h-11 rounded-xl px-3 font-medium transition ${activeItem ? "bg-[#e8f0ea] text-[#294f40]" : "text-[#657068] hover:bg-[#f5f1eb] hover:text-[#294f40]"}`}><item.icon className={`h-[18px] w-[18px] ${activeItem ? "text-[#49775e]" : ""}`} /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>;
              })}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t border-[#eee9e1] p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><button className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-[#f5f1eb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a06c3b]"><Avatar className="h-9 w-9 border border-[#e1d9ce] bg-[#e8f0ea]"><AvatarFallback className="bg-[#e8f0ea] text-xs font-bold text-[#355f4d]">{user?.name?.slice(0, 1).toUpperCase() || "會"}</AvatarFallback></Avatar><div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-semibold text-[#33463d]">{user?.name || "教會同工"}</p><p className="mt-0.5 text-xs text-[#9a938a]">{user?.role}</p></div><ChevronDown className="h-4 w-4 text-[#9a938a] group-data-[collapsible=icon]:hidden" /></button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl"><DropdownMenuItem onClick={logout} className="cursor-pointer text-red-700 focus:text-red-700"><LogOut className="mr-2 h-4 w-4" />登出系統</DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div className={`absolute right-0 top-0 z-50 h-full w-1 cursor-col-resize hover:bg-[#a06c3b]/30 ${isCollapsed ? "hidden" : ""}`} onMouseDown={() => setIsResizing(true)} />
      </div>
      <SidebarInset className="bg-[#f7f5f0]">
        {isMobile && <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#e8e2d8] bg-[#fdfcf9]/95 px-4 backdrop-blur"><div className="flex items-center gap-3"><button onClick={toggleSidebar} aria-label="開啟選單" className="rounded-xl p-2 text-[#355f4d] hover:bg-[#f3efe8]"><Menu className="h-5 w-5" /></button><div><p className="font-serif font-semibold text-[#29483c]">{active?.label ?? "恩典同行"}</p><p className="text-[10px] tracking-widest text-[#a06c3b]">CHURCH CARE</p></div></div><Bell className="h-5 w-5 text-[#7a847c]" /></header>}
        <main className="min-h-screen p-4 sm:p-6 lg:p-9">{isRestrictedRoute ? <div className="grid min-h-[65vh] place-items-center"><section className="max-w-md rounded-3xl border border-[#e2dace] bg-[#fdfcf9] p-8 text-center shadow-[0_18px_45px_rgba(57,75,62,0.08)]"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#f6eee2] text-[#a06c3b]"><ShieldCheck className="h-6 w-6" /></div><h1 className="mt-5 font-serif text-2xl font-semibold text-[#405a49]">此功能需要更高權限</h1><p className="mt-3 text-sm leading-6 text-[#758077]">您的目前角色為 {user?.role}。系統已帶您回到儀表板，若需此功能請向 Admin 申請授權。</p><Button onClick={() => setLocation("/")} className="mt-6 rounded-xl bg-[#355f4d] hover:bg-[#294a3d]">返回儀表板</Button></section></div> : children}</main>
      </SidebarInset>
    </>
  );
}
