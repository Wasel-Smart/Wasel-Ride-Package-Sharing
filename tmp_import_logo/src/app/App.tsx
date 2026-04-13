import { motion } from "motion/react";
import { ArrowRight, Network, Zap, Shield, TrendingUp } from "lucide-react";
import { Button } from "./components/ui/button";
import { AnimatedLogo } from "./components/AnimatedLogo";
import networkIcon from "../imports/image-1.png";

export default function App() {
  return (
    <div className="min-h-screen bg-[#0a1628] text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10" />
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 py-6 lg:px-12">
        <nav className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Animated Logo */}
          <AnimatedLogo />

          {/* Navigation */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="hidden md:flex items-center gap-8 text-sm"
          >
            <a href="#" className="hover:text-cyan-400 transition-colors">
              Solutions
            </a>
            <a href="#" className="hover:text-cyan-400 transition-colors">
              Pricing
            </a>
            <a href="#" className="hover:text-cyan-400 transition-colors">
              Developers
            </a>
            <a href="#" className="hover:text-cyan-400 transition-colors">
              Company
            </a>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 rounded-full">
              Open account
            </Button>
          </motion.div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 px-6 lg:px-12 pt-12 lg:pt-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="inline-block mb-4"
              >
                <span className="px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-sm">
                  The future of banking
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-5xl lg:text-7xl mb-6 leading-tight"
              >
                <span className="block">Open the</span>
                <span className="block bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  network. Fast.
                </span>
                <span className="block">Choose</span>
                <span className="block">movement.</span>
                <span className="block text-cyan-400">with Bani.p</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-lg text-gray-400 mb-8 max-w-xl"
              >
                Experience the next generation of financial services. Fast, secure, and built for the modern world.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-wrap gap-4"
              >
                <Button className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-6 rounded-full text-lg group">
                  Get started
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  variant="outline"
                  className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 px-8 py-6 rounded-full text-lg"
                >
                  Learn more
                </Button>
              </motion.div>
            </div>

            {/* Right Visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
              className="relative"
            >
              {/* Animated Wave Elements */}
              <div className="relative h-[500px] bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-3xl border border-slate-700/50 overflow-hidden">
                {/* Sketch/Network Illustration Background */}
                <div className="relative w-full h-full">
                  {/* Network Icon center piece */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.img
                      src={networkIcon}
                      alt="Network"
                      className="w-48 h-48 object-contain"
                      animate={{
                        filter: [
                          "brightness(1) drop-shadow(0 0 10px rgba(34,211,238,0.5))",
                          "brightness(1.4) drop-shadow(0 0 30px rgba(34,211,238,1))",
                          "brightness(1) drop-shadow(0 0 10px rgba(34,211,238,0.5))",
                        ],
                        scale: [1, 1.05, 1],
                      }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                  {/* Network nodes */}
                  <svg className="w-full h-full opacity-30" viewBox="0 0 400 400">
                    <motion.circle
                      cx="100"
                      cy="100"
                      r="8"
                      fill="#22d3ee"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <motion.circle
                      cx="300"
                      cy="150"
                      r="8"
                      fill="#22d3ee"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    />
                    <motion.circle
                      cx="200"
                      cy="300"
                      r="8"
                      fill="#22d3ee"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                    />
                    <motion.line
                      x1="100"
                      y1="100"
                      x2="300"
                      y2="150"
                      stroke="#22d3ee"
                      strokeWidth="2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <motion.line
                      x1="300"
                      y1="150"
                      x2="200"
                      y2="300"
                      stroke="#22d3ee"
                      strokeWidth="2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    />
                  </svg>
                </div>

                {/* Animated Red Wave Stripes */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-48"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute left-0 right-0 h-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                      style={{
                        bottom: `${i * 12 + 20}px`,
                        left: `${i * 10}px`,
                        right: `${100 - i * 15}px`,
                      }}
                      animate={{
                        scaleX: [1, 1.1, 1],
                        x: [0, 10, 0],
                      }}
                      transition={{
                        duration: 3 + i * 0.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Features Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="mt-24 grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              {
                icon: Zap,
                title: "Lightning Fast",
                desc: "Instant transactions at the speed of thought",
              },
              {
                icon: Shield,
                title: "Secure by Design",
                desc: "Bank-grade security with advanced encryption",
              },
              {
                icon: Network,
                title: "Global Network",
                desc: "Connected to financial systems worldwide",
              },
              {
                icon: TrendingUp,
                title: "Smart Growth",
                desc: "AI-powered insights to grow your wealth",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3 + index * 0.1 }}
                whileHover={{ y: -5 }}
                className="p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50 hover:border-cyan-500/50 transition-all group"
              >
                <div className="mb-4 w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-cyan-400" />
                </div>
                <h3 className="mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </main>
    </div>
  );
}