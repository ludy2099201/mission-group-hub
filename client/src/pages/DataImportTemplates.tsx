import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Download, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const templates = [
  { key: "groups", label: "小組資料", note: "先建立小組與指派帶領人。" },
  { key: "group_members", label: "小組成員", note: "建議填寫 email 或電話，方便後續主檔連結。" },
  { key: "meetings", label: "小組聚會", note: "聚會時間使用 ISO 8601 格式。" },
  { key: "attendance", label: "出席紀錄", note: "先導入小組、成員與聚會。" },
  { key: "care_logs", label: "關懷日誌", note: "避免將高度敏感敘述留在未受控設備。" },
  { key: "pastoral_tasks", label: "牧養待辦", note: "可用於待辦分類與 Leader 範圍的最終驗收。" },
] as const;

export default function DataImportTemplates() {
  const { user } = useAuth(); const utils = trpc.useUtils(); const download = trpc.governance.downloadImportTemplate.useMutation({ onSuccess: data => { const url = URL.createObjectURL(new Blob([data.csv], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = data.filename; link.click(); URL.revokeObjectURL(url); utils.governance.auditLogs.invalidate(); toast.success(`已下載「${data.label}」模板`); }, onError: error => toast.error(error.message) });
  if (user?.role !== "Admin") return <Card className="border-[#e3dbcf] bg-[#fdfcf9]"><CardContent className="py-16 text-center"><ShieldCheck className="mx-auto h-9 w-9 text-[#b07b51]" /><h2 className="mt-4 font-serif text-2xl text-[#405a49]">資料導入模板僅限 Admin</h2><p className="mt-2 text-sm text-[#78827b]">模板用於準備真實教會資料，不包含會友或牧養示例資料。</p></CardContent></Card>;
  return <div className="space-y-6"><Card className="border-[#d7e4d5] bg-[#f8fbf7] shadow-none"><CardHeader><div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7f1e7] text-[#477258]"><FileSpreadsheet className="h-5 w-5" /></div><div><CardTitle className="font-serif text-2xl text-[#405a49]">真實資料導入模板</CardTitle><CardDescription className="mt-1">每份下載檔僅包含欄位標頭，不包含任何虛構會友、關懷或牧養資料。</CardDescription></div></div></CardHeader><CardContent><p className="text-sm leading-6 text-[#66766a]">請先離線整理並由資料管理者覆核真實資料，再進行未來的正式匯入。下載模板本身會留下操作稽核摘要。</p></CardContent></Card><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{templates.map(template => <Card key={template.key} className="border-[#e3dbcf] bg-[#fdfcf9] shadow-none"><CardHeader className="pb-3"><CardTitle className="font-serif text-xl text-[#405a49]">{template.label}</CardTitle><CardDescription>{template.note}</CardDescription></CardHeader><CardContent><Button variant="outline" disabled={download.isPending} onClick={() => download.mutate({ template: template.key })} className="w-full rounded-xl border-[#d7d0c4] text-[#52665b]"><Download className="mr-2 h-4 w-4 text-[#a06c3b]" />下載 CSV 模板</Button></CardContent></Card>)}</div><Card className="border-[#ead8c2] bg-[#fffaf3] shadow-none"><CardContent className="flex gap-3 p-5"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#a8743c]" /><div><p className="font-medium text-[#765330]">安全導入提醒</p><p className="mt-1 text-sm leading-6 text-[#8a6a46]">請僅在受管理、受加密的設備整理檔案；不要以未加密通訊軟體傳送關懷摘要、聯絡資訊或待辦細節。正式匯入功能上線前，請先由 Admin 依「上線驗收」頁完成資料條件檢核。</p></div></CardContent></Card></div>;
}
