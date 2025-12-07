import { Link } from 'react-router-dom'
import { Shield, Lock, Clock, Users, ArrowRight, Sparkles } from 'lucide-react'

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
            Plain steps your heir can follow—no crypto jargon needed.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          {[
            {
              icon: Sparkles,
              title: 'Create',
              desc: 'Type your secret, pick an unlock timer, and set the heir address or SuiNS name.',
            },
            {
              icon: Shield,
              title: 'Protect',
              desc: 'We encrypt in your browser and split it into pieces; a safe backup lives on Walrus.',
            },
            {
              icon: Clock,
              title: "Stay Alive",
              desc: 'Tap “I’m Alive” in the dashboard to keep the vault locked while you are active.',
            },
            {
              icon: Users,
              title: 'Claim',
              desc: 'When the timer ends, the heir claims, pastes their share, and the app reunites the secret.',
            },
          ].map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.title} className="card text-left space-y-3 animate-fade-in" style={{ animationDelay: `${(i + 1) * 100}ms` }}>
                <div className="w-10 h-10 rounded-full bg-sui-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-sui-primary" />
                </div>
                <div>
                  <p className="text-white font-semibold">{step.title}</p>
                  <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}









