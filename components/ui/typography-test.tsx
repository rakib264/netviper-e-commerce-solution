/**
 * Typography Test Component
 * 
 * This component demonstrates all typography variants and can be used
 * to test responsive behavior across different screen sizes.
 * 
 * Usage: Import and render this component on a test page to verify
 * typography scaling and appearance.
 */

import { Display, Heading, Text, Caption, FluidText } from './typography';

export default function TypographyTest() {
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-12">
      {/* Display Headings */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-foreground">Display Headings</h2>
        <div className="space-y-4">
          <Display size="xs" weight="bold" gradient="primary">
            Display XS - Hero Title (20px → 48px)
          </Display>
          <Display size="sm" weight="bold" gradient="warm">
            Display SM - Large Title (18px → 36px)
          </Display>
          <Display size="md" weight="bold" gradient="earth">
            Display MD - Medium Title (16px → 30px)
          </Display>
          <Display size="lg" weight="bold" gradient="elegant">
            Display LG - Small Title (14px → 24px)
          </Display>
        </div>
      </section>

      {/* Section Headings */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-foreground">Section Headings</h2>
        <div className="space-y-3">
          <Heading level={1} weight="bold">H1 Heading (18px → 30px)</Heading>
          <Heading level={2} weight="semibold">H2 Heading (16px → 24px)</Heading>
          <Heading level={3} weight="semibold">H3 Heading (14px → 20px)</Heading>
          <Heading level={4} weight="medium">H4 Heading (14px → 18px)</Heading>
          <Heading level={5} weight="medium">H5 Heading (12px → 16px)</Heading>
          <Heading level={6} weight="medium">H6 Heading (12px → 14px)</Heading>
        </div>
      </section>

      {/* Body Text */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-foreground">Body Text</h2>
        <div className="space-y-4">
          <Text size="xl" leading="relaxed" className="text-muted-foreground">
            <strong>Extra Large Body Text (14px → 18px):</strong> This is perfect for important paragraphs, 
            introductory text, and content that needs to stand out. It provides excellent readability 
            across all device sizes while maintaining proper hierarchy.
          </Text>
          
          <Text size="lg" leading="relaxed" className="text-muted-foreground">
            <strong>Large Body Text (14px → 16px):</strong> This is ideal for standard paragraph content, 
            article text, and general body copy. It offers a good balance between readability and 
            space efficiency on all screen sizes.
          </Text>
          
          <Text size="md" leading="normal" className="text-muted-foreground">
            <strong>Medium Body Text (12px → 14px):</strong> This works well for secondary content, 
            descriptions, and supporting text. It's compact yet readable on mobile devices.
          </Text>
          
          <Text size="sm" leading="normal" className="text-subtle-foreground">
            <strong>Small Body Text (12px → 12px):</strong> Perfect for fine print, metadata, 
            and supplementary information that doesn't need to dominate the layout.
          </Text>
        </div>
      </section>

      {/* Captions and Labels */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-foreground">Captions and Labels</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <Caption weight="semibold" className="text-muted-foreground">Form Label:</Caption>
            <Caption weight="normal" className="text-subtle-foreground">Caption text for additional context</Caption>
          </div>
          <div className="flex items-center gap-4">
            <Caption weight="medium" spacing="wide" className="text-info-600 uppercase">Badge Text</Caption>
            <Caption className="text-subtle-foreground">Helper text and instructions</Caption>
          </div>
        </div>
      </section>

      {/* Fluid Typography */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-foreground">Fluid Typography</h2>
        <div className="space-y-4">
          <FluidText size="6xl" weight="bold" className="text-primary-600">
            Fluid 6XL - Scales smoothly with viewport
          </FluidText>
          <FluidText size="4xl" weight="semibold" className="text-info-600">
            Fluid 4XL - Perfect for hero sections
          </FluidText>
          <FluidText size="2xl" weight="medium" className="text-success-600">
            Fluid 2XL - Great for section titles
          </FluidText>
          <FluidText size="lg" weight="normal" className="text-muted-foreground">
            Fluid LG - Ideal for body text that needs to scale
          </FluidText>
        </div>
      </section>

      {/* Color Variations */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-foreground">Color Variations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-muted-foreground mb-3">Theme Colors</h3>
            <Text size="lg" color="primary">Primary Color Text</Text>
            <Text size="lg" color="secondary">Secondary Color Text</Text>
            <Text size="lg" color="muted">Muted Color Text</Text>
            <Text size="lg" color="accent">Accent Color Text</Text>
          </div>
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-muted-foreground mb-3">Brand Colors</h3>
            <div className="text-brand-primary text-body-lg">Brand Primary (Deep Forest Green)</div>
            <div className="text-brand-secondary text-body-lg">Brand Secondary (Metallic Gold)</div>
            <div className="text-brand-beige text-body-lg">Brand Beige</div>
            <div className="text-brand-sandy text-body-lg">Brand Sandy Brown</div>
          </div>
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-muted-foreground mb-3">Hierarchy Colors</h3>
            <div className="text-hierarchy-title text-body-lg">Title Text</div>
            <div className="text-hierarchy-subtitle text-body-lg">Subtitle Text</div>
            <div className="text-hierarchy-body text-body-lg">Body Text</div>
            <div className="text-hierarchy-caption text-body-lg">Caption Text</div>
            <div className="text-hierarchy-label text-body-lg">Label Text</div>
            <div className="text-hierarchy-disabled text-body-lg">Disabled Text</div>
          </div>
        </div>
        
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-muted-foreground mb-4">Gradient Text</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Text size="lg" gradient="primary">Primary Gradient</Text>
            <Text size="lg" gradient="warm">Warm Gradient</Text>
            <Text size="lg" gradient="earth">Earth Gradient</Text>
            <Text size="lg" gradient="elegant">Elegant Gradient</Text>
            <Text size="lg" gradient="luxury">Luxury Gradient</Text>
          </div>
        </div>
      </section>

      {/* Font Weights */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-foreground">Font Weights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Text size="lg" weight="thin">Thin (100)</Text>
          <Text size="lg" weight="extralight">Extra Light (200)</Text>
          <Text size="lg" weight="light">Light (300)</Text>
          <Text size="lg" weight="normal">Normal (400)</Text>
          <Text size="lg" weight="medium">Medium (500)</Text>
          <Text size="lg" weight="semibold">Semibold (600)</Text>
          <Text size="lg" weight="bold">Bold (700)</Text>
          <Text size="lg" weight="extrabold">Extra Bold (800)</Text>
        </div>
      </section>

      {/* Letter Spacing */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-foreground">Letter Spacing</h2>
        <div className="space-y-3">
          <Text size="lg" spacing="tighter">Tighter Letter Spacing</Text>
          <Text size="lg" spacing="tight">Tight Letter Spacing</Text>
          <Text size="lg" spacing="normal">Normal Letter Spacing</Text>
          <Text size="lg" spacing="wide">Wide Letter Spacing</Text>
          <Text size="lg" spacing="wider">Wider Letter Spacing</Text>
          <Text size="lg" spacing="widest">Widest Letter Spacing</Text>
        </div>
      </section>

      {/* Line Heights */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-foreground">Line Heights</h2>
        <div className="space-y-6">
          <div>
            <Caption weight="semibold" className="text-muted-foreground mb-2">Tight Leading</Caption>
            <Text size="lg" leading="tight">
              This paragraph demonstrates tight line height. The lines are closer together, 
              which works well for headings and short text blocks where you want a more 
              compact appearance.
            </Text>
          </div>
          
          <div>
            <Caption weight="semibold" className="text-muted-foreground mb-2">Normal Leading</Caption>
            <Text size="lg" leading="normal">
              This paragraph shows normal line height. It provides a good balance between 
              readability and space efficiency, making it suitable for most body text 
              and general content.
            </Text>
          </div>
          
          <div>
            <Caption weight="semibold" className="text-muted-foreground mb-2">Relaxed Leading</Caption>
            <Text size="lg" leading="relaxed">
              This paragraph uses relaxed line height. The increased spacing between lines 
              improves readability for longer text passages and creates a more open, 
              breathable feeling in the layout.
            </Text>
          </div>
        </div>
      </section>

      {/* Typography Presets */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-foreground">Typography Presets</h2>
        <div className="space-y-8">
          <div className="bg-muted p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-muted-foreground mb-4">Hero Section</h3>
            <div className="typography-hero-title mb-2">Hero Title</div>
            <div className="typography-hero-subtitle">Hero subtitle with additional context</div>
          </div>
          
          <div className="bg-muted p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-muted-foreground mb-4">Section Headers</h3>
            <div className="typography-section-title mb-2">Section Title</div>
            <div className="typography-section-subtitle">Section subtitle with description</div>
          </div>
          
          <div className="bg-muted p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-muted-foreground mb-4">Card Content</h3>
            <div className="typography-card-title mb-2">Card Title</div>
            <div className="typography-card-subtitle">Card subtitle or description</div>
          </div>
          
          <div className="bg-muted p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-muted-foreground mb-4">Product Information</h3>
            <div className="typography-product-name mb-2">Premium Product Name</div>
            <div className="typography-product-price">$99.99</div>
          </div>
          
          <div className="bg-muted p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-muted-foreground mb-4">Button Styles</h3>
            <div className="space-x-4">
              <button className="typography-button-lg bg-info-600 text-white px-6 py-3 rounded">Large Button</button>
              <button className="typography-button-md bg-success-600 text-white px-4 py-2 rounded">Medium Button</button>
              <button className="typography-button-sm bg-primary-600 text-white px-3 py-1 rounded">Small Button</button>
            </div>
          </div>
          
          <div className="bg-muted p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-muted-foreground mb-4">Form Elements</h3>
            <div className="space-y-2">
              <div className="typography-label">Form Label</div>
              <div className="typography-caption">Helper text and instructions</div>
              <div className="typography-micro">Fine print and metadata</div>
            </div>
          </div>
        </div>
      </section>

      {/* Responsive Test Instructions */}
      <section className="bg-info-50 p-6 rounded-lg">
        <Heading level={3} className="text-info-800 mb-4">Responsive Testing Instructions</Heading>
        <div className="space-y-2">
          <Text size="md" className="text-info-700">
            • <strong>Mobile (320px-640px):</strong> Text should be readable and appropriately sized
          </Text>
          <Text size="md" className="text-info-700">
            • <strong>Tablet (640px-1024px):</strong> Text should scale up smoothly
          </Text>
          <Text size="md" className="text-info-700">
            • <strong>Desktop (1024px+):</strong> Text should reach optimal sizes
          </Text>
          <Text size="md" className="text-info-700">
            • <strong>Fluid text:</strong> Should scale continuously with viewport width
          </Text>
          <Text size="md" className="text-info-700">
            • <strong>Typography presets:</strong> Should maintain consistent styling across breakpoints
          </Text>
        </div>
      </section>
    </div>
  );
}

