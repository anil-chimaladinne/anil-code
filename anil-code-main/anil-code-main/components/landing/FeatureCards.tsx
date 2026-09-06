import { Zap, Share2, Code, ShieldCheck, Terminal, Download, Cpu, Users } from "lucide-react";

export function FeatureCards() {
  const features = [
    {
      icon: Zap,
      title: "Real-Time Collaboration",
      description:
        "Code together simultaneously with zero lag. Edits, selections, and typing indicators synchronize instantaneously via WebSockets.",
      color: "text-amber-400",
      bgColor: "bg-amber-400/10",
      borderColor: "border-amber-400/20",
    },
    {
      icon: Share2,
      title: "Instant Room Sharing",
      description:
        "Generate unique, friendly room links in a single click. Share with teammates or students with no signup or credentials required.",
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
      borderColor: "border-blue-400/20",
    },
    {
      icon: Terminal,
      title: "Multi-Language Support",
      description:
        "Full syntax highlighting and auto-completion for JavaScript, TypeScript, Python, C++, Java, Rust, Go, SQL, HTML, and more.",
      color: "text-emerald-400",
      bgColor: "bg-emerald-400/10",
      borderColor: "border-emerald-400/20",
    },
    {
      icon: Cpu,
      title: "In-Browser Execution",
      description:
        "Run code directly in the browser! Test JavaScript algorithms in a sandboxed worker and execute multi-language code with live output.",
      color: "text-purple-400",
      bgColor: "bg-purple-400/10",
      borderColor: "border-purple-400/20",
    },
    {
      icon: ShieldCheck,
      title: "Private & Secure Rooms",
      description:
        "Your rooms are accessible strictly via unique room IDs. No unauthorized indexing and automatic clean persistence.",
      color: "text-cyan-400",
      bgColor: "bg-cyan-400/10",
      borderColor: "border-cyan-400/20",
    },
    {
      icon: Download,
      title: "1-Click Copy & Export",
      description:
        "Export your code with the right file extension (.js, .py, .cpp, .java) or copy with animated clipboard feedback.",
      color: "text-rose-400",
      bgColor: "bg-rose-400/10",
      borderColor: "border-rose-400/20",
    },
  ];

  return (
    <section className="py-20 border-t border-ide-border/50 bg-[#0c1017]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-3">
            Engineered For Speed & Simplicity
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Everything you need for seamless pair programming
          </p>
          <p className="mt-4 text-base text-gray-400">
            Designed from the ground up to give you an uncompromising IDE experience in any browser.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="glass-card rounded-2xl p-6 sm:p-7 border border-ide-border/70 hover:border-blue-500/40 transition-all duration-300 group"
              >
                <div
                  className={`h-12 w-12 rounded-xl flex items-center justify-center ${item.bgColor} ${item.borderColor} border mb-5 group-hover:scale-110 transition-transform`}
                >
                  <Icon className={`h-6 w-6 ${item.color}`} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
