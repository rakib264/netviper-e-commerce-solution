'use client';

import { useEffect } from 'react';

interface SeoOptimizerProps {
  pageType?: 'home' | 'product' | 'category' | 'blog' | 'page';
  productData?: {
    name: string;
    price: number;
    currency: string;
    availability: string;
    brand: string;
    category: string;
    description: string;
    image: string;
    sku: string;
  };
  breadcrumbs?: Array<{ name: string; url: string }>;
}

export default function SeoOptimizer({
  pageType = 'page',
  productData,
  breadcrumbs
}: SeoOptimizerProps) {
  useEffect(() => {
    // Add canonical link if not present
    if (!document.querySelector('link[rel="canonical"]')) {
      const canonical = document.createElement('link');
      canonical.rel = 'canonical';
      canonical.href = window.location.href;
      document.head.appendChild(canonical);
    }

    // Add preconnect links for performance
    const preconnectLinks = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://www.google-analytics.com',
      'https://www.googletagmanager.com',
    ];

    preconnectLinks.forEach(url => {
      if (!document.querySelector(`link[href="${url}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = url;
        if (url.includes('gstatic')) {
          link.crossOrigin = 'anonymous';
        }
        document.head.appendChild(link);
      }
    });

    // Add structured data based on page type
    if (pageType === 'product' && productData) {
      addProductStructuredData(productData);
    }

    if (breadcrumbs && breadcrumbs.length > 0) {
      addBreadcrumbStructuredData(breadcrumbs);
    }

    // Add FAQ structured data for specific pages
    if (window.location.pathname === '/faqs') {
      addFaqStructuredData();
    }

  }, [pageType, productData, breadcrumbs]);

  return null;
}

function addProductStructuredData(product: SeoOptimizerProps['productData']) {
  if (!product) return;

  const existingScript = document.getElementById('product-structured-data');
  if (existingScript) {
    existingScript.remove();
  }

  const script = document.createElement('script');
  script.id = 'product-structured-data';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.image,
    description: product.description,
    sku: product.sku,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'Muscari Mart'
    },
    category: product.category,
    offers: {
      '@type': 'Offer',
      url: window.location.href,
      priceCurrency: product.currency,
      price: product.price,
      availability: `https://schema.org/${product.availability}`,
      seller: {
        '@type': 'Organization',
        name: 'Muscari Mart'
      }
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.5',
      reviewCount: '100'
    }
  });

  document.head.appendChild(script);
}

function addBreadcrumbStructuredData(breadcrumbs: Array<{ name: string; url: string }>) {
  const existingScript = document.getElementById('breadcrumb-structured-data');
  if (existingScript) {
    existingScript.remove();
  }

  const script = document.createElement('script');
  script.id = 'breadcrumb-structured-data';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  });

  document.head.appendChild(script);
}

function addFaqStructuredData() {
  const existingScript = document.getElementById('faq-structured-data');
  if (existingScript) {
    existingScript.remove();
  }

  const script = document.createElement('script');
  script.id = 'faq-structured-data';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is Muscari Mart?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Muscari Mart is a women\'s wear brand specializing in luxury, trendy, and casual sarees, delivering premium quality and elegant designs for customers in Bangladesh and worldwide.'
        }
      },
      {
        '@type': 'Question',
        name: 'Do you deliver across Bangladesh?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, we provide fast delivery across Bangladesh with reliable shipping partners.'
        }
      },
      {
        '@type': 'Question',
        name: 'What payment methods do you accept?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We accept various payment methods including cash on delivery, mobile banking, and online payment gateways.'
        }
      }
    ]
  });

  document.head.appendChild(script);
}
