import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Zap, BarChart2, FileText, Palette } from "lucide-react";

export default async function HomePage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50/30">
      <nav className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-base select-none leading-none" style={{ backgroundColor: "var(--primary)" }}>
            p.
          </div>
          <span className="text-xl font-bold text-gray-900">portly</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium px-4 py-2">Sign in</Link>
          <Link href="/register" className="text-sm text-white font-medium px-4 py-2 rounded-lg transition"
            style={{ backgroundColor: "var(--primary)" }}>
            Get started free
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full mb-6"
          style={{ backgroundColor: "var(--primary)", color: "#fff" }}>
          <Zap className="w-3 h-3" /> Modern Proposal Platform
        </span>
        <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-6">
          Proposals that{" "}
          <span className="text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(135deg, var(--primary), #4040ee)` }}>
            close deals
          </span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Create stunning commercial proposals with a block-based editor, track how prospects engage with your content, and export to PDF instantly.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/register"
            className="text-white font-semibold px-8 py-3.5 rounded-xl text-base transition shadow-lg"
            style={{ backgroundColor: "var(--primary)", boxShadow: "0 8px 24px #11118440" }}>
            Create free account
          </Link>
          <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium px-6 py-3.5 text-base transition">
            Sign in →
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-24 grid grid-cols-3 gap-6">
        {[
          { icon: <FileText className="w-5 h-5" />, title: "Block Editor", desc: "Drag-and-drop blocks: text, pricing, video embeds, CTAs, and more." },
          { icon: <BarChart2 className="w-5 h-5" />, title: "Real Analytics", desc: "Track views, time on page, and engagement per block — no third-party needed." },
          { icon: <Palette className="w-5 h-5" />, title: "Brand Kit", desc: "Your logo, colors, and fonts — applied automatically to every proposal." },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-white"
              style={{ backgroundColor: "var(--primary)" }}>
              {icon}
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
