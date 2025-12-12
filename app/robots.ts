import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/auth/', '/dashboard/', '/preview/'],
    },
    sitemap: 'https://yeezuz2020.cz/sitemap.xml',
  };
}
