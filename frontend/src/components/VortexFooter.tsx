import React from 'react'
import { MapPinIcon } from '@heroicons/react/24/solid'
import { VortexLogo } from './VortexLogo'

export const VortexFooter: React.FC = () => {
  return (
    <footer className="py-5 bg-black text-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-3">
            <div className="footer-brand mb-3">
              <VortexLogo variant="iso" size="lg" className="mb-3 h-12 w-auto" />
              <p className="text-white/60">Building the tools for tomorrow with AI-first approach</p>
            </div>
          </div>

          {/* Services */}
          <div className="lg:col-span-2">
            <h5 className="font-bold mb-3 text-lg">Services</h5>
            <ul className="space-y-2">
              <li>
                <a 
                  href="https://vortex-website-lake.vercel.app/generative-ai.html" 
                  className="text-white/60 hover:text-white transition-colors no-underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Generative AI
                </a>
              </li>
              <li>
                <a 
                  href="https://vortex-website-lake.vercel.app/rpa.html" 
                  className="text-white/60 hover:text-white transition-colors no-underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  RPA
                </a>
              </li>
              <li>
                <a 
                  href="https://vortex-website-lake.vercel.app/#services" 
                  className="text-white/60 hover:text-white transition-colors no-underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Web Development
                </a>
              </li>
              <li>
                <a 
                  href="https://vortex-website-lake.vercel.app/#services" 
                  className="text-white/60 hover:text-white transition-colors no-underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Mobile Apps
                </a>
              </li>
            </ul>
          </div>

          {/* Methodology */}
          <div className="lg:col-span-2">
            <h5 className="font-bold mb-3 text-lg">Methodology</h5>
            <ul className="space-y-2">
              <li>
                <a 
                  href="https://vortex-website-lake.vercel.app/outcom-ex.html" 
                  className="text-white/60 hover:text-white transition-colors no-underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Outcom-EX
                </a>
              </li>
              <li>
                <a 
                  href="https://vortex-website-lake.vercel.app/ai-vortex.html" 
                  className="text-white/60 hover:text-white transition-colors no-underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  AI Vortex
                </a>
              </li>
              <li>
                <a 
                  href="https://vortex-website-lake.vercel.app/#about" 
                  className="text-white/60 hover:text-white transition-colors no-underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  About Us
                </a>
              </li>
            </ul>
          </div>

          {/* Our Tools */}
          <div className="lg:col-span-2">
            <h5 className="font-bold mb-3 text-lg">Our Tools</h5>
            <ul className="space-y-2">
              <li>
                <a 
                  href="/" 
                  className="text-white hover:text-purple-400 transition-colors font-medium no-underline"
                >
                  Warren - Financial Dashboard
                </a>
              </li>
              <li>
                <a 
                  href="https://lineup-murex.vercel.app/" 
                  className="text-white/60 hover:text-white transition-colors no-underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  LineUp - Team Allocation
                </a>
              </li>
            </ul>
          </div>

          {/* Global Presence */}
          <div className="lg:col-span-3">
            <h5 className="font-bold mb-3 text-lg">Global Presence</h5>
            <div className="space-y-2">
              <div className="flex items-center">
                <MapPinIcon className="w-4 h-4 text-purple-400 mr-2" />
                <span className="text-white/60">California, USA</span>
              </div>
              <div className="flex items-center">
                <MapPinIcon className="w-4 h-4 text-purple-400 mr-2" />
                <span className="text-white/60">Buenos Aires, Argentina</span>
              </div>
              <div className="flex items-center">
                <MapPinIcon className="w-4 h-4 text-purple-400 mr-2" />
                <span className="text-white/60">Vietnam</span>
              </div>
            </div>
          </div>
        </div>

        <hr className="my-4 border-gray-600" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between text-center md:text-left">
          <div className="mb-2 md:mb-0">
            <p className="text-white/60 text-sm">© 2024 Vortex. All rights reserved.</p>
          </div>
          <div>
            <p className="text-white/60 text-sm">Warren - Financial Intelligence Platform</p>
          </div>
        </div>
      </div>
    </footer>
  )
}