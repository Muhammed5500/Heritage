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
            Your secret is split into 5 shares. Any 3 can reconstruct it, but no single party 
            can access it alone.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-4">
          {[
            { label: 'Share 1', location: 'Heir (Direct)', color: 'from-green-500 to-emerald-500' },
            { label: 'Share 2', location: 'Walrus Storage', color: 'from-blue-500 to-cyan-500' },
            { label: 'Share 3', location: 'Smart Contract', color: 'from-purple-500 to-violet-500' },
            { label: 'Share 4', location: 'Smart Contract', color: 'from-purple-500 to-violet-500' },
            { label: 'Share 5', location: 'Smart Contract', color: 'from-purple-500 to-violet-500' },
          ].map((share, i) => (
            <div key={i} className="card text-center">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${share.color} mx-auto mb-3 flex items-center justify-center text-white font-bold text-sm`}>
                {i + 1}
              </div>
              <p className="text-white font-medium text-sm">{share.label}</p>
              <p className="text-gray-500 text-xs mt-1">{share.location}</p>
            </div>
          ))}
        </div>

        <div className="card bg-gradient-to-r from-sui-primary/5 to-purple-500/5 border-sui-primary/20 text-center">
          <p className="text-sui-primary font-medium">
            🔐 Shares 3, 4, 5 are encrypted with your heir's public key before storage
          </p>
        </div>
      </section>
    </div>
  )
}





