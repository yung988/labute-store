"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

export const description = "An interactive area chart"

const chartData = [
  { date: "2024-04-01", orders: 5, revenue: 12500 },
  { date: "2024-04-02", orders: 3, revenue: 8900 },
  { date: "2024-04-03", orders: 7, revenue: 15600 },
  { date: "2024-04-04", orders: 4, revenue: 11200 },
  { date: "2024-04-05", orders: 8, revenue: 18900 },
  { date: "2024-04-06", orders: 6, revenue: 14300 },
  { date: "2024-04-07", orders: 9, revenue: 20100 },
  { date: "2024-04-08", orders: 5, revenue: 13400 },
  { date: "2024-04-09", orders: 2, revenue: 6700 },
  { date: "2024-04-10", orders: 6, revenue: 15800 },
  { date: "2024-04-11", orders: 7, revenue: 17600 },
  { date: "2024-04-12", orders: 4, revenue: 12300 },
  { date: "2024-04-13", orders: 8, revenue: 19200 },
  { date: "2024-04-14", orders: 3, revenue: 8900 },
  { date: "2024-04-15", orders: 5, revenue: 14500 },
  { date: "2024-04-16", orders: 6, revenue: 16700 },
  { date: "2024-04-17", orders: 9, revenue: 21300 },
  { date: "2024-04-18", orders: 7, revenue: 18900 },
  { date: "2024-04-19", orders: 4, revenue: 12400 },
  { date: "2024-04-20", orders: 2, revenue: 7800 },
  { date: "2024-04-21", orders: 6, revenue: 15600 },
  { date: "2024-04-22", orders: 5, revenue: 13400 },
  { date: "2024-04-23", orders: 8, revenue: 19800 },
  { date: "2024-04-24", orders: 7, revenue: 17600 },
  { date: "2024-04-25", orders: 4, revenue: 11200 },
  { date: "2024-04-26", orders: 3, revenue: 9100 },
  { date: "2024-04-27", orders: 9, revenue: 22400 },
  { date: "2024-04-28", orders: 5, revenue: 13800 },
  { date: "2024-04-29", orders: 6, revenue: 16700 },
  { date: "2024-04-30", orders: 8, revenue: 19200 },
]

const chartConfig = {
  orders: {
    label: "Objednávky",
    color: "var(--primary)",
  },
  revenue: {
    label: "Tržby (Kč)",
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("90d")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2024-06-30")
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Prodejní trendy</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Objednávky a tržby za poslední měsíc
          </span>
          <span className="@[540px]/card:hidden">Poslední měsíc</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-orders)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-orders)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-revenue)"
                  stopOpacity={0.6}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-revenue)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="orders"
              type="natural"
              fill="url(#fillOrders)"
              stroke="var(--color-orders)"
              stackId="a"
            />
            <Area
              dataKey="revenue"
              type="natural"
              fill="url(#fillRevenue)"
              stroke="var(--color-revenue)"
              stackId="b"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
