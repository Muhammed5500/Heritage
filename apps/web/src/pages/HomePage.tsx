import { Link } from 'react-router-dom'
import { Shield, Lock, Clock, Users, ArrowRight, Sparkles } from 'lucide-react'
import SecretSharingFlow from '@/components/SecretSharingFlow'

const features = [
  {
    icon: Lock,
    title: 'Military-Grade Encryption',
    description: 'Your secrets are AES encrypted and split using Shamir\'s Secret Sharing. No single point of failure.',
  },
  {
    icon: Clock,
    title: 'Dead Man\'s Switch',
    description: 'Assets automatically transfer to your heir after a period of inactivity. You control the timer.',
  },
  {
    icon: Users,
    title: 'Trustless Inheritance',
    description: 'No lawyers, no banks, no middlemen. Just code that executes exactly as programmed.',
  },
]

export function HomePage() {
  return (
    <div className="space-y-24 py-12">
      {/* Hero Section */}
      <section className="text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sui-primary/10 border border-sui-primary/20 text-sui-primary text-sm font-medium animate-fade-in">
          <Sparkles className="w-4 h-4" />
          Built on Sui Blockchain
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight animate-fade-in animate-delay-100">
          Secure Your
          <br />
          <span className="text-gradient">Digital Legacy</span>
        </h1>
        
        <p className="text-xl text-gray-400 max-w-2xl mx-auto animate-fade-in animate-delay-200">
          A decentralized dead man's switch that ensures your crypto assets and secrets 
          reach your loved ones, even when you can't be there.
        </p>
        
        <div className="flex items-center justify-center gap-4 animate-fade-in animate-delay-300">
          <Link to="/create" className="btn-primary">
            Create Your Legacy
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/claim" className="btn-secondary">
            Claim Inheritance
          </Link>
        </div>

        {/* Trust badge */}
        <div className="pt-8 animate-fade-in animate-delay-400">
          <p className="text-sm text-gray-500 mb-4">TRUST CODE, NOT PEOPLE</p>
          <div className="flex items-center justify-center gap-8">
            <div className="flex items-center gap-2 text-gray-400">
              <Shield className="w-5 h-5 text-sui-primary" />
              <span className="text-sm">5-3 Shamir Scheme</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Lock className="w-5 h-5 text-sui-primary" />
              <span className="text-sm">Client-Side Only</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-6">
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <div 
              key={feature.title}
              className="card-interactive animate-fade-in"
              style={{ animationDelay: `${(index + 1) * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-sui-primary/10 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-sui-primary" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
            </div>
          )
        })}
      </section>

      {/* How it works */}
      <section className="space-y-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">How It Works</h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Your secret is split into 5 shares. Any 3 can reconstruct it, but no single party can access it alone.
          </p>
        </div>

        {/* Neural Tree Visualization */}
        <SecretSharingFlow />

        {/* Simple explanation cards */}
        <div className="mt-20 max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-xl font-semibold text-white mb-3">Simple 4-Step Process</h3>
            <p className="text-gray-400 text-sm">No technical knowledge required</p>
          </div>

          <div className="relative">
            {/* Progress Line */}
            <div className="absolute top-8 left-0 right-0 h-0.5 bg-gradient-to-r from-sui-primary/20 via-sui-primary/40 to-sui-primary/20 hidden md:block"></div>
            
            <div className="grid md:grid-cols-4 gap-8 md:gap-4">
          {[
            {
              icon: Sparkles,
              title: 'Create',
              desc: 'Enter your secret message and set when your heir should receive it',
            },
            {
              icon: Shield,
              title: 'Secure',
              desc: 'Your secret gets encrypted and split into 5 pieces automatically',
            },
            {
              icon: Clock,
              title: "Stay Alive",
              desc: 'Tap “I’m Alive” in the dashboard to keep the vault locked while you are active.',
            },
            {
              icon: Users,
              title: 'Inherit',
              desc: 'Your heir automatically gains access when the timer expires',
            },
          ].map((step, i) => {
            const Icon = step.icon;
            return (
              <div 
                key={step.title} 
                className="relative group animate-fade-in" 
                style={{ animationDelay: `${(i + 1) * 150}ms` }}
              >
                {/* Step Number Circle */}
                <div className="relative z-10 w-16 h-16 mx-auto mb-6 rounded-full bg-black border-2 border-gray-700 flex items-center justify-center group-hover:border-sui-primary/50 transition-colors duration-300">
                  <Icon className="w-6 h-6 text-sui-primary group-hover:scale-110 transition-transform duration-300" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-sui-primary text-black text-xs font-bold flex items-center justify-center">
                    0{i + 1}
                  </div>
                </div>

                {/* Content Card */}
                <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-xl p-6 group-hover:border-sui-primary/30 transition-all duration-300 group-hover:shadow-[0_0_20px_-5px_rgba(99,102,241,0.2)]">
                  <h4 className="text-lg font-semibold text-white mb-3 group-hover:text-sui-primary transition-colors">
                    {step.title}
                  </h4>
                  <p className="text-gray-400 text-sm leading-relaxed mb-4">
                    {step.desc}
                  </p>
                  
                  {/* Action Indicator */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium px-3 py-1 rounded-full bg-sui-primary/20 text-sui-primary">
                      {i === 0 ? 'Start Here →' : i === 3 ? 'Auto-Complete ✓' : 'In Progress...'}
                    </span>
                    {i < 3 && (
                      <div className="hidden md:flex items-center text-gray-600">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Connection Line (Mobile) */}
                {i < 3 && (
                  <div className="md:hidden flex justify-center mt-6 mb-2">
                    <div className="w-0.5 h-8 bg-gradient-to-b from-sui-primary/40 to-transparent"></div>
                  </div>
                )}
              </div>
            );
          })}
            </div>

            {/* Call to Action */}
            <div className="text-center mt-12">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-sui-primary/10 border border-sui-primary/20 rounded-full">
                <div className="w-2 h-2 bg-sui-primary rounded-full animate-pulse"></div>
                <span className="text-sui-primary text-sm font-medium">Ready to secure your digital legacy?</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}









