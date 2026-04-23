import type { Metadata } from 'next';
import PhotoEditorInteractive from './components/PhotoEditorInteractive';

export const metadata: Metadata = {
  title: 'Photo Upload and Editor - The Agency Brand Studio',
  description: 'Upload property photos and create branded marketing materials with The Agency overlay system.',
};

export default function PhotoUploadAndEditorPage() {
  return (
    <main className="min-h-screen bg-[#0F0F0F]">
      <PhotoEditorInteractive />
    </main>
  );
}