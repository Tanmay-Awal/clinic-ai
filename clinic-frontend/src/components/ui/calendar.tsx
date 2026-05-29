import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, useNavigation } from "react-day-picker";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-[260px] min-w-[260px]",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "flex items-center",
        button_previous: "absolute left-1",
        button_next: "absolute right-1",
        month_grid: "w-full border-collapse",
        weekdays: "flex w-full justify-between items-center mb-2",
        weekday: "text-muted-foreground rounded-md w-8 h-8 font-normal text-[0.75rem] flex items-center justify-center",
        weeks: "w-full space-y-1",
        week: "flex w-full mt-1 justify-between items-center",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-white/10 rounded-full transition-all flex items-center justify-center text-sm"
        ),
        selected:
          "bg-white text-black hover:bg-white hover:text-black focus:bg-white focus:text-black shadow-[0_0_10px_rgba(255,255,255,0.3)] !opacity-100",
        today: "bg-white/5 text-white border border-white/20",
        outside:
          "text-muted-foreground opacity-30 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        disabled: "text-muted-foreground opacity-20",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        MonthCaption: ({ calendarMonth }) => {
          const { goToMonth, nextMonth, previousMonth } = useNavigation();
          return (
            <div className="flex items-center justify-center gap-4 py-2 mb-2 relative">
              <button
                type="button"
                onClick={() => previousMonth && goToMonth(previousMonth)}
                disabled={!previousMonth}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 rounded-full border-white/10 transition-opacity disabled:opacity-20 flex items-center justify-center"
                )}
              >
                <ChevronLeft className="h-4 w-4 text-white" />
              </button>
              <div className="text-sm font-medium min-w-[120px] text-center text-white">
                {format(calendarMonth.date, "MMMM yyyy")}
              </div>
              <button
                type="button"
                onClick={() => nextMonth && goToMonth(nextMonth)}
                disabled={!nextMonth}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 rounded-full border-white/10 transition-opacity disabled:opacity-20 flex items-center justify-center"
                )}
              >
                <ChevronRight className="h-4 w-4 text-white" />
              </button>
            </div>
          );
        },
        Nav: () => <></>,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
