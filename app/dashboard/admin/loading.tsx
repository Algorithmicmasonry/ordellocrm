import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoadingPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar Skeleton */}
     

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          {/* Header */}
          <div className="flex flex-col gap-6 pb-8">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
              </div>

              <div className="flex items-center gap-4">
                <Skeleton className="w-64 h-10 rounded-lg" />
                <Skeleton className="size-10 rounded-lg" />
                <Skeleton className="size-10 rounded-lg" />
                <Skeleton className="size-10 rounded-lg" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-10 w-80 rounded-lg" />
            <Skeleton className="h-10 w-40 rounded-lg" />
          </div>

          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <Skeleton className="h-6 w-16 rounded-full" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Chart and Top Products */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Revenue Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-40" />
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64 w-full flex items-center justify-center">
                    <div className="space-y-4 w-full animate-pulse">
                      <div className="flex items-end gap-2 h-48">
                        {[40, 60, 45, 70, 55, 75, 65].map((height, i) => (
                          <Skeleton
                            key={i}
                            className="flex-1"
                            style={{ height: `${height}%` }}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between">
                        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                          <Skeleton key={i} className="h-3 w-8" />
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Products */}
              <Card className="flex flex-col">
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 animate-pulse"
                      >
                        <Skeleton className="size-10 rounded-lg" />
                        <div className="flex-1 min-w-0 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </div>
                  <Skeleton className="h-10 w-full mt-6 rounded-lg" />
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders */}
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-muted-foreground font-medium">
                      <tr>
                        <th className="px-6 py-4">
                          <Skeleton className="h-4 w-20" />
                        </th>
                        <th className="px-6 py-4">
                          <Skeleton className="h-4 w-20" />
                        </th>
                        <th className="px-6 py-4">
                          <Skeleton className="h-4 w-16" />
                        </th>
                        <th className="px-6 py-4">
                          <Skeleton className="h-4 w-16" />
                        </th>
                        <th className="px-6 py-4">
                          <Skeleton className="h-4 w-16" />
                        </th>
                        <th className="px-6 py-4">
                          <Skeleton className="h-4 w-16" />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <tr key={i} className="border-b animate-pulse">
                          <td className="px-6 py-4">
                            <Skeleton className="h-4 w-24" />
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Skeleton className="h-4 w-28" />
                          </td>
                          <td className="px-6 py-4">
                            <Skeleton className="h-4 w-20" />
                          </td>
                          <td className="px-6 py-4">
                            <Skeleton className="h-6 w-16 rounded-full" />
                          </td>
                          <td className="px-6 py-4">
                            <Skeleton className="h-8 w-8 rounded" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}