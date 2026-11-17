import { assetLinks } from '@/src/lib/app-site-association';

export function GET() {
  return Response.json(assetLinks);
}
