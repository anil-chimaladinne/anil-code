import { PlusCircle, Link2, Users2, ArrowRight } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      step: "01",
      icon: PlusCircle,
      title: "Create a Room",
      description:
        "Click 'Create Room' to spin up a collaborative workspace in milliseconds. Choose your programming language and starting template.",
    },
    {
      step: "02",
      icon: Link2,
      title: "Share the Link",
      description:
        "Copy your unique room URL and share it with peers, students, or interviewers. No signups, invitations, or passwords required.",
    },
    {
      step: "03",
      icon: Users2,
      title: "Collaborate in Real Time",
      description:
        "Write, debug, execute, and discuss code together live. Watch characters appear as your teammates type with zero delay.",
    },
  ];

  return (
    <section className="py-20 relative bg-[#090d13]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-purple-400 mb-3">
            Workflow
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            How CodeConnect Works
          </p>
          <p className="mt-4 text-base text-gray-400">
            Three simple steps to start collaborating with anyone in the world.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="relative rounded-2xl bg-ide-panel/60 border border-ide-border/80 p-8 flex flex-col items-start hover:border-purple-500/40 transition-all group"
              >
                <div className="flex items-center justify-between w-full mb-6">
                  <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-3xl font-extrabold text-gray-700/60 group-hover:text-purple-400/40 transition-colors font-mono">
                    {item.step}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors">
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
