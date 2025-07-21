import {
  SidebarInset,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import DashboardCTA from "@/components/common/dashboard/dashboardCTA";
import DashBoardCard from "@/components/common/dashboard/card";


export default function Dashboard() {
  return (
      <SidebarInset>
          <div className="p-6 lg:p-8 min-h-screen ">
              <div className="mb-10">
                  <DashboardCTA/>
              </div>
              <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
                  <div>
                      <div className="flex items-center justify-between mb-4 ">
                          <h1 className="text-2xl font-bold">Recent</h1>
                          <Button variant="outline" size="sm">View All</Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {[1, 2, 3,4,5,6,7,8,9,10].map((i) => (
                              <DashBoardCard key={i}/>
                          ))}
                      </div>
                  </div>
              </div>
              <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
                  <div className="text-lg font-bold">
                      Explore more tools
                  </div>
              </div>
          </div>
      </SidebarInset>
  )
}
