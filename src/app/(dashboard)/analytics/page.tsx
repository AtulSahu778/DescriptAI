"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type DailyData = { date: string; count: number };
type CategoryData = { category: string; count: number };

export default function AnalyticsPage() {
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [stats, setStats] = useState({ total: 0, thisMonth: 0, topTone: "N/A" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();

      // Fetch all descriptions
      const { data: descriptions } = await supabase
        .from("descriptions")
        .select("created_at, category, tone")
        .order("created_at", { ascending: true });

      if (!descriptions) {
        setLoading(false);
        return;
      }

      // Daily generations (last 30 days)
      const dailyMap: Record<string, number> = {};
      for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        const key = d.toISOString().split("T")[0];
        dailyMap[key] = 0;
      }

      descriptions.forEach((d) => {
        const key = new Date(d.created_at).toISOString().split("T")[0];
        if (dailyMap[key] !== undefined) {
          dailyMap[key]++;
        }
      });

      setDailyData(
        Object.entries(dailyMap).map(([date, count]) => ({
          date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          count,
        }))
      );

      // Category breakdown
      const catMap: Record<string, number> = {};
      descriptions.forEach((d) => {
        const cat = d.category || "Uncategorized";
        catMap[cat] = (catMap[cat] || 0) + 1;
      });

      setCategoryData(
        Object.entries(catMap)
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8)
      );

      // Stats
      const now = new Date();
      const thisMonthCount = descriptions.filter((d) => {
        const date = new Date(d.created_at);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }).length;

      const toneMap: Record<string, number> = {};
      descriptions.forEach((d) => {
        const t = d.tone || "professional";
        toneMap[t] = (toneMap[t] || 0) + 1;
      });
      const topTone = Object.entries(toneMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

      setStats({
        total: descriptions.length,
        thisMonth: thisMonthCount,
        topTone: topTone.charAt(0).toUpperCase() + topTone.slice(1),
      });

      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-10">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tightest text-white/90 mb-2">Analytics</h1>
            <p className="text-white/60">See how you&apos;re using DescriptAI — generation volume, categories, and trends.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/[0.03] border border-white/10 rounded-lg p-6">
              <div className="h-4 w-20 rounded-md shimmer-loading mb-3" />
              <div className="h-8 w-16 rounded-md shimmer-loading" />
            </div>
          ))}
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-lg p-6 mb-6">
          <div className="h-4 w-48 rounded-md shimmer-loading mb-4" />
          <div className="h-[280px] rounded-md shimmer-loading" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-10">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tightest text-white/90 mb-2">Analytics</h1>
        <p className="text-white/60">Track your generation usage and trends.</p>
      </div>

      {/* Stats cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:border-white/20 transition-all duration-150 ease-in-out">
            <p className="text-xs font-medium text-white/60 uppercase tracking-wider mb-1">All-Time Generations</p>
          <p className="text-3xl font-bold text-white/90">{stats.total}</p>
        </div>
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:border-white/20 transition-all duration-150 ease-in-out">
          <p className="text-xs font-medium text-white/60 uppercase tracking-wider mb-1">This Month</p>
          <p className="text-3xl font-bold text-white/90">{stats.thisMonth}</p>
        </div>
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:border-white/20 transition-all duration-150 ease-in-out">
          <p className="text-xs font-medium text-white/60 uppercase tracking-wider mb-1">Favorite Tone</p>
          <p className="text-3xl font-bold text-white/90">{stats.topTone}</p>
        </div>
      </div>

      {/* Line Chart - Generations over time */}
      <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-lg p-6 mb-6">
          <h3 className="text-sm font-medium text-white/90 mb-4">Daily output (last 30 days)</h3>
        {dailyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                interval={4}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#818cf8"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#818cf8" }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-white/60 text-center py-12">No data yet</p>
        )}
      </div>

      {/* Bar Chart - By category */}
      <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-lg p-6">
          <h3 className="text-sm font-medium text-white/90 mb-4">Top categories</h3>
        {categoryData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="category"
                tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-white/60 text-center py-12">No data yet</p>
        )}
      </div>
    </div>
  );
}
