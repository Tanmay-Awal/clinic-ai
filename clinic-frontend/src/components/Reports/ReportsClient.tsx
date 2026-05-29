import React, { useState } from 'react';
import { FileBarChart, ArrowRight, Bed, MessageSquare, ClipboardList, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ReportBuilder from './ReportBuilder';

export default function ReportsClient() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  if (selectedReport) {
    return <ReportBuilder reportType={selectedReport} onBack={() => setSelectedReport(null)} />;
  }

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">
            Generate, view, and export detailed reports for your organization.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Bookings Report Card */}
        <Card
          className="group relative cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-600/10 border-border/50 bg-gradient-to-b from-card to-card/50"
          onClick={() => setSelectedReport('bookings')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader>
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-amber-600/20 to-amber-700/20 shadow-inner">
              <Bed className="h-7 w-7 text-amber-600" />
            </div>
            <CardTitle className="text-xl">Bookings Data</CardTitle>
            <CardDescription className="pt-2 leading-relaxed">
              Detailed logs of all reservations captured through the AI, complete with party sizes, dates, and locations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm font-semibold text-amber-600">
              Build Report
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </CardContent>
        </Card>

        {/* Feedback Report Card */}
        <Card
          className="group relative cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-600/10 border-border/50 bg-gradient-to-b from-card to-card/50"
          onClick={() => setSelectedReport('feedback')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader>
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600/20 to-emerald-700/20 shadow-inner">
              <MessageSquare className="h-7 w-7 text-emerald-600" />
            </div>
            <CardTitle className="text-xl">Feedback Logs</CardTitle>
            <CardDescription className="pt-2 leading-relaxed">
              A comprehensive dataset of customer feedback, ratings, and sentiments collected via post-visit SMS.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm font-semibold text-emerald-600">
              Build Report
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </CardContent>
        </Card>

        {/* Actions Report Card */}
        <Card
          className="group relative cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-600/10 border-border/50 bg-gradient-to-b from-card to-card/50"
          onClick={() => setSelectedReport('actions')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader>
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600/20 to-blue-700/20 shadow-inner">
              <ClipboardList className="h-7 w-7 text-blue-600" />
            </div>
            <CardTitle className="text-xl">Action Center Logs</CardTitle>
            <CardDescription className="pt-2 leading-relaxed">
              Explore customer requests and inquiries captured from calls, track status, priority, and resolution info.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm font-semibold text-blue-600">
              Build Report
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </CardContent>
        </Card>

        {/* Coupons Report Card */}
        <Card
          className="group relative cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-600/10 border-border/50 bg-gradient-to-b from-card to-card/50"
          onClick={() => setSelectedReport('coupons')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader>
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/20 to-violet-700/20 shadow-inner">
              <Ticket className="h-7 w-7 text-violet-600" />
            </div>
            <CardTitle className="text-xl">Coupons Report</CardTitle>
            <CardDescription className="pt-2 leading-relaxed">
              Track all issued feedback coupons, redemption status, validity periods, and customer details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm font-semibold text-violet-600">
              Build Report
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
