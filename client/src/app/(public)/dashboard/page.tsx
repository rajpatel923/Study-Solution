import {
  SidebarInset,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"


export default function Dashboard() {
  return (
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Recent Projects</h1>
            <Button variant="outline" size="sm">View All</Button>
          </div>
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <ProjectCard key={i} />
            ))}
          </div>
          <h2 className="mt-4 text-xl font-semibold">Project Activity</h2>
          <div className="min-h-[400px] flex-1 rounded-xl bg-muted/50 md:min-h-min">
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              Activity timeline will be displayed here
            </div>
          </div>
        </div>
      </SidebarInset>
  )
}

function ProjectCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Project Name</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground mb-4">
          Last updated 2 days ago
        </div>
        <div className="flex justify-between items-center">
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 w-8 rounded-full bg-muted border border-background" />
            ))}
          </div>
          <Button variant="ghost" size="sm">View</Button>
        </div>
      </CardContent>
    </Card>
  )
}