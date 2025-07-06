"use client";

import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/Button';
import { 
  ArrowRightIcon, 
  CloudArrowUpIcon, 
  SparklesIcon,
  HeartIcon,
  LightBulbIcon,
  RocketLaunchIcon,
  StarIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

export default function ButtonShowcase() {
  return (
    <AppLayout showFooter={true}>
      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Button Component Showcase
        </h1>
        
        <div className="space-y-12">
          {/* Primary Buttons */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Primary Actions</h2>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary" leftIcon={<ArrowRightIcon className="w-4 h-4" />}>
                Get Started
              </Button>
              <Button variant="primary" size="lg" rightIcon={<SparklesIcon className="w-5 h-5" />}>
                Create Magic
              </Button>
              <Button variant="primary" loading>
                Processing
              </Button>
              <Button variant="primary" disabled>
                Disabled
              </Button>
            </div>
          </section>

          {/* Gradient & Glow Buttons */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Premium Styles</h2>
            <div className="flex flex-wrap gap-4">
              <Button variant="gradient" leftIcon={<RocketLaunchIcon className="w-4 h-4" />}>
                Launch Now
              </Button>
              <Button variant="glow" leftIcon={<BoltIcon className="w-4 h-4" />}>
                Power Mode
              </Button>
              <Button variant="neon">
                Neon Style
              </Button>
              <Button variant="glass" className="bg-gray-900">
                Glass Effect
              </Button>
            </div>
          </section>

          {/* Action Buttons */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Action Variants</h2>
            <div className="flex flex-wrap gap-4">
              <Button variant="success" leftIcon={<CloudArrowUpIcon className="w-4 h-4" />}>
                Upload File
              </Button>
              <Button variant="danger" leftIcon={<HeartIcon className="w-4 h-4" />}>
                Delete Item
              </Button>
              <Button variant="soft" leftIcon={<LightBulbIcon className="w-4 h-4" />}>
                Learn More
              </Button>
              <Button variant="secondary">
                Secondary Action
              </Button>
            </div>
          </section>

          {/* Outline & Ghost Buttons */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Subtle Styles</h2>
            <div className="flex flex-wrap gap-4">
              <Button variant="outline">
                Outline Button
              </Button>
              <Button variant="ghost">
                Ghost Button
              </Button>
              <Button variant="outline" size="sm">
                Small Outline
              </Button>
              <Button variant="ghost" size="sm">
                Small Ghost
              </Button>
            </div>
          </section>

          {/* Size Variations */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Size Variations</h2>
            <div className="flex flex-wrap items-center gap-4">
              <Button size="xs">Extra Small</Button>
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
            </div>
          </section>

          {/* Rounded Variations */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Border Radius</h2>
            <div className="flex flex-wrap gap-4">
              <Button rounded="sm">Small Radius</Button>
              <Button rounded="md">Medium Radius</Button>
              <Button rounded="lg">Large Radius</Button>
              <Button rounded="full" leftIcon={<StarIcon className="w-4 h-4" />}>
                Full Rounded
              </Button>
            </div>
          </section>

          {/* Special Effects */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Special Effects</h2>
            <div className="flex flex-wrap gap-4">
              <Button variant="gradient" pulse>
                Pulse Animation
              </Button>
              <Button variant="primary" shimmer>
                Shimmer Effect
              </Button>
              <Button variant="glow" size="lg" className="animate-bounce">
                Bouncing Button
              </Button>
            </div>
          </section>

          {/* Combined Examples */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Real World Examples</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 bg-gray-50 rounded-xl">
                <h3 className="font-semibold mb-4">Call to Action</h3>
                <Button variant="gradient" size="lg" className="w-full" rightIcon={<ArrowRightIcon className="w-5 h-5" />}>
                  Start Free Trial
                </Button>
              </div>
              
              <div className="p-6 bg-gray-50 rounded-xl">
                <h3 className="font-semibold mb-4">Danger Zone</h3>
                <Button variant="danger" className="w-full">
                  Delete Account
                </Button>
              </div>
              
              <div className="p-6 bg-gray-50 rounded-xl">
                <h3 className="font-semibold mb-4">Upload Action</h3>
                <Button variant="success" className="w-full" leftIcon={<CloudArrowUpIcon className="w-5 h-5" />}>
                  Upload Document
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}