import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, ClipboardList, CircleAlert, RefreshCw, ShieldCheck, UsersRound } from "lucide-react";

const checks = [
  { key: "taskClassification", title: "待辦到期分類", goal: "建立逾期、今日與未來七日各一筆進行中待辦，確認三個提醒數字及篩選結果一致。", data: (input: any) => `逾期 ${input.overdueTasks} · 今日 ${input.todayTasks} · 未來七日 ${input.upcomingTasks}` },
  { key: "leaderScope", title: "Leader 小組範圍", goal: "指派一位啟用 Leader 至小組並至少加入一位成員，使用該 Leader 帳號確認可見範圍。", data: (input: any) => `Leader ${input.activeLeaders} · 小組 ${input.groups} · 成員 ${input.groupMembers}` },
  { key: "careSuggestions", title: "關懷待跟進建議", goal: "建立一筆真實且標記為「待跟進」的關懷紀錄，確認工作中心產生建議。", data: (input: any) => `待跟進關懷 ${input.pendingCareLogs}` },
  { key: "absenceSuggestions", title: "缺席跟進建議", goal: "建立一場真實聚會並記錄一筆缺席，確認工作中心產生缺席建議。", data: (input: any) => `聚會 ${input.meetings} · 近 30 日缺席 ${input.recentAbsences}` },
] as const;

export default function RolloutReadiness() {
  const { user } = useAuth(); const readiness = trpc.rollout.readiness.useQuery(undefined, { enabled: user?.role === "Admin" });
  if (user?.role !== "Admin") return <Card className="border-[#e3dbcf] bg-[#fdfcf9]"><CardContent className="py-16 text-center"><ShieldCheck className="mx-auto h-9 w-9 text-[#b07b51]" /><h2 className="mt-4 font-serif text-2xl text-[#405a49]">上線前驗收僅限 Admin</h2><p className="mt-2 text-sm text-[#78827b]">此區會讀取真實資料，提供導入與權限驗收的準備條件。</p></CardContent></Card>;
  if (readiness.isError) return <Card className="border-[#ead4cf] bg-[#fffaf8]"><CardContent className="py-16 text-center"><CircleAlert className="mx-auto h-9 w-9 text-[#a4594e]" /><h2 className="mt-4 font-serif text-2xl text-[#7d4037]">驗收準備狀態暫時無法載入</h2><Button onClick={() => readiness.refetch()} className="mt-6 rounded-xl bg-[#8b4f43] hover:bg-[#713d34]"><RefreshCw className="mr-2 h-4 w-4" />重新整理</Button></CardContent></Card>;
  const data = readiness.data;
  return <div className="space-y-6"><Card className="border-[#d7e4d5] bg-[#f8fbf7] shadow-none"><CardHeader><div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7f1e7] text-[#477258]"><ClipboardList className="h-5 w-5" /></div><div><CardTitle className="font-serif text-2xl text-[#405a49]">上線前驗收準備</CardTitle><CardDescription className="mt-1">此頁僅讀取目前真實資料，不會建立、修改或刪除任何牧養資料。</CardDescription></div></div></CardHeader><CardContent><p className="text-sm leading-6 text-[#66766a]">完成以下資料條件後，即可依各步驟用 Admin 與 Leader 帳號進行最終驗收。尚未就緒不代表系統錯誤，而是代表尚需導入對應的真實教會資料。</p></CardContent></Card><div className="grid gap-4 lg:grid-cols-2">{checks.map(check => { const ready = data?.checks[check.key]; return <Card key={check.key} className={`border shadow-none ${ready ? "border-[#d7e5d5] bg-[#fdfefd]" : "border-[#e7dfd5] bg-[#fdfcf9]"}`}><CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="font-serif text-xl text-[#405a49]">{check.title}</CardTitle><CardDescription className="mt-1">{data ? check.data(data.input) : "正在讀取資料條件…"}</CardDescription></div><Badge variant="outline" className={ready ? "border-[#d0dfd0] bg-[#eff5ed] text-[#50755a]" : "border-[#ead9c9] bg-[#fbf4ec] text-[#96613d]"}>{ready ? "可驗收" : "尚待資料"}</Badge></div></CardHeader><CardContent><p className="text-sm leading-6 text-[#66736b]">{check.goal}</p><div className="mt-4 flex items-center gap-2 text-xs font-medium"><>{ready ? <CheckCircle2 className="h-4 w-4 text-[#5b8c65]" /> : <UsersRound className="h-4 w-4 text-[#a87951]" />}</><span className={ready ? "text-[#5b7d62]" : "text-[#967355]"}>{ready ? "資料條件已具備，可執行帳號與流程驗收。" : "導入對應真實資料後，系統會自動更新此狀態。"}</span></div></CardContent></Card>; })}</div></div>;
}
