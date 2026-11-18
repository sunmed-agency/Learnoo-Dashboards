import { appleAppSiteAssociation } from '@/src/lib/app-site-association';

// No file extension: Apple requires the exact name, served as JSON.
export function GET() {
  return Response.json(appleAppSiteAssociation);
}
