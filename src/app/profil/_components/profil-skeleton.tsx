/* src/app/profil/_components/profil-skeleton.tsx
 * Suspense fallback yang menyerupai layout profil agar transisi terasa halus
 * saat menavigasi ke /profil dari bottom tab / navbar.
 */
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProfilSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 rounded-md" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-48 rounded-sm" />
              <Skeleton className="h-3 w-32 rounded-sm" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-7 w-40 rounded-sm" />
        </CardContent>
      </Card>

      <Skeleton className="h-10 w-72 rounded-sm" />

      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32 rounded-sm" />
        <Skeleton className="h-9 w-40 rounded-md" />
      </div>

      <div className="grid grid-cols-1 gap-5 @2xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32 rounded-sm" />
              <Skeleton className="mt-2 h-3 w-48 rounded-sm" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full rounded-sm" />
              <Skeleton className="mt-4 h-9 w-56 rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}