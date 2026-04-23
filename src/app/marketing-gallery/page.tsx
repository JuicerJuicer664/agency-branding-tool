import type { Metadata } from 'next';
import MarketingGalleryInteractive from './components/MarketingGalleryInteractive';

export const metadata: Metadata = {
  title: 'Marketing Gallery - The Agency Brand Studio',
  description: 'Manage, organize, and share your branded property marketing materials in one comprehensive library.',
};

export default function MarketingGalleryPage() {
  return <MarketingGalleryInteractive />;
}