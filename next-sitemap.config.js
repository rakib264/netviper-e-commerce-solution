/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://www.muscarimart.com',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  robotsTxtOptions: {
    additionalSitemaps: [
      'https://www.muscarimart.com/sitemap.xml',
    ],
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/debug/', '/test*'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/admin/', '/debug/', '/test*'],
      },
    ],
  },
  exclude: [
    '/api/*',
    '/admin/*',
    '/debug/*',
    '/test*',
    '/auth/*',
    '/profile',
    '/checkout',
    '/cart',
    '/orders/*',
    '/returns',
    '/wishlist',
  ],
  transform: async (config, path) => {
    // Custom priority and changefreq for different pages
    const customConfig = {
      loc: path,
      changefreq: 'daily',
      priority: 0.7,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      alternateRefs: config.alternateRefs ?? [],
    }

    // Higher priority for important pages
    if (path === '/') {
      customConfig.priority = 1.0
      customConfig.changefreq = 'daily'
    } else if (path.startsWith('/products') || path.startsWith('/categories')) {
      customConfig.priority = 0.9
      customConfig.changefreq = 'weekly'
    } else if (path.startsWith('/blogs') || path.startsWith('/events')) {
      customConfig.priority = 0.8
      customConfig.changefreq = 'weekly'
    } else if (path === '/about' || path === '/contact') {
      customConfig.priority = 0.6
      customConfig.changefreq = 'monthly'
    }

    return customConfig
  },
  additionalPaths: async (config) => {
    // Add additional static paths that might not be automatically discovered
    return [
      await config.transform(config, '/'),
      await config.transform(config, '/about'),
      await config.transform(config, '/contact'),
      await config.transform(config, '/products'),
      await config.transform(config, '/categories'),
      await config.transform(config, '/blogs'),
      await config.transform(config, '/events'),
      await config.transform(config, '/deals'),
      await config.transform(config, '/explore'),
      await config.transform(config, '/faqs'),
      await config.transform(config, '/shipping-delivery'),
      await config.transform(config, '/terms-conditions'),
      await config.transform(config, '/privilege-members'),
    ]
  },
}
