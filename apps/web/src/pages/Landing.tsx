import { Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button, GlassCard, GradientText, Badge } from "../components/ui/index.js";

const CarPreview = lazy(() => import("../three/CarPreview.js"));

const FEATURES = [
  { title: "VR Showroom", body: "Walk around EVs in the browser." },
  { title: "Eye Tracking", body: "Capture gaze and dwell on every component." },
  { title: "Attention Heatmaps", body: "See exactly what customers focus on." },
  { title: "AI Insights", body: "Engagement, interest, and recommendation scores." },
];
const STACK = ["React", "Three.js / R3F", "Node + Express", "Prisma", "PostgreSQL", "scikit-learn"];

export default function Landing() {
  return (
    <div>
      <section className="grid lg:grid-cols-2 gap-8 items-center px-8 py-20 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <Badge>EV Design Research Platform</Badge>
          <h1 className="font-display text-5xl leading-tight">
            See what customers <GradientText>truly notice</GradientText>.
          </h1>
          <p className="text-slate-400 text-lg">
            A VR + eye-tracking studio that turns showroom attention into design decisions.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/register">
              <Button>Get started</Button>
            </Link>
            <Link to="/showroom">
              <Button variant="ghost">Explore the showroom →</Button>
            </Link>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 pt-2 text-xs text-slate-500">
            <span><span className="text-slate-300">3</span> real EVs</span>
            <span><span className="text-slate-300">15</span> tracked components</span>
            <span><span className="text-slate-300">ms-precision</span> gaze</span>
            <span><span className="text-slate-300">live</span> heatmaps</span>
          </div>
        </motion.div>
        <div className="h-[420px] glass overflow-hidden">
          <Suspense fallback={<div className="h-full grid place-items-center text-slate-500">Loading 3D preview…</div>}>
            <CarPreview />
          </Suspense>
        </div>
      </section>

      <section className="px-8 py-16 max-w-7xl mx-auto">
        <h2 className="font-display text-3xl mb-8">
          Platform <GradientText>highlights</GradientText>
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <GlassCard key={f.title}>
              <h3 className="font-display text-white mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400">{f.body}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="px-8 py-16 max-w-7xl mx-auto">
        <h2 className="font-display text-3xl mb-6">Built with a modern stack</h2>
        <div className="flex flex-wrap gap-2">
          {STACK.map((s) => (
            <Badge key={s}>{s}</Badge>
          ))}
        </div>
      </section>

      <section className="px-8 py-20 max-w-3xl mx-auto text-center space-y-5">
        <h2 className="font-display text-4xl">
          Ready to <GradientText>understand</GradientText> your customers?
        </h2>
        <Link to="/register">
          <Button>Create your account</Button>
        </Link>
      </section>

      <footer className="px-8 py-8 text-center text-slate-500 text-sm">© 2026 SmartEV Vision</footer>
    </div>
  );
}
