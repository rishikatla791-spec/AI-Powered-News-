import type { Metadata } from "next";
import { getSourcesWithHealth } from "@/lib/services/stories";
import { load } from "@/lib/services/safe";
import { timeAgo } from "@/lib/format";
import { topicName } from "@/lib/topics";
import { ErrorNotice, SetupNotice } from "@/components/ui/notice";

export const metadata: Metadata = { title: "Sources", description: "Every outlet Lede reads, and whether its feed is working right now." };
export const revalidate = 300;

const STATUS: Record<string, { label: string; cls: string }> = {
  ok: { label: "Working", cls: "bg-[#3d8a5a]" },
  "not-modified": { label: "Working, no new items", cls: "bg-[#3d8a5a]" },
  error: { label: "Failing", cls: "bg-danger" },
  skipped: { label: "Needs an API key", cls: "bg-ink-muted/40" },
};

export default async function SourcesPage() {
  const res = await load(getSourcesWithHealth);
  if (!res.ok) return res.reason === "unconfigured" ? <SetupNotice /> : <ErrorNotice what="sources" />;
  const list = res.data;
  const failing = list.filter((s) => s.lastStatus === "error").length;
  return (
    <div className="shell pt-10 md:pt-14">
      <div className="max-w-[760px]">
        <h1 className="hed hed-xl">Sources</h1>
        <p className="dek mt-4">
          Lede reads the public feeds of {list.length} outlets every 30 minutes. It keeps each report’s headline, byline, a short excerpt and
          a link, and never republishes the article itself.
        </p>
        <p className="meta mt-4">
          {failing === 0 ? "All feeds responded on their last check." : `${failing} ${failing === 1 ? "feed is" : "feeds are"} failing on the last check; stories still use the others.`}
        </p>
      </div>
      <div className="mt-10 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-[0.9375rem]">
          <thead>
            <tr className="border-b border-rule-strong text-[0.8125rem] text-ink-muted">
              <th className="py-3 pr-4 font-medium">Outlet</th>
              <th className="py-3 pr-4 font-medium">Section</th>
              <th className="py-3 pr-4 font-medium">Country</th>
              <th className="py-3 pr-4 font-medium">Feed status</th>
              <th className="py-3 pr-4 font-medium">Last checked</th>
              <th className="py-3 text-right font-medium">Reports collected</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => {
              const st = STATUS[s.lastStatus ?? ""] ?? { label: "Not checked yet", cls: "bg-ink-muted/30" };
              return (
                <tr key={s.id} className="border-b border-rule">
                  <td className="py-3 pr-4">
                    <a href={s.homepage} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-pencil">{s.name}</a>
                  </td>
                  <td className="py-3 pr-4 text-ink-2">{s.defaultTopic ? topicName(s.defaultTopic) : "Mixed"}</td>
                  <td className="py-3 pr-4 text-ink-2">{s.country}</td>
                  <td className="py-3 pr-4">
                    <span className="inline-flex items-center gap-2" title={s.lastError ?? undefined}>
                      <span className={`size-2 rounded-full ${st.cls}`} aria-hidden />
                      {s.active ? st.label : "Paused"}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-ink-muted num">{s.lastFetchAt ? timeAgo(s.lastFetchAt) : "Never"}</td>
                  <td className="py-3 text-right num">{(s.articlesTotal ?? 0).toLocaleString("en-IN")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
