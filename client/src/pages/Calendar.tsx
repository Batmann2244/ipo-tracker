import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Bell, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

interface IpoEventIpo {
  id: number;
  symbol: string;
  companyName: string;
  status: string;
}

interface IpoTimelineEvent {
  id: number;
  ipoId: number;
  eventType: string;
  eventDate: string | null;
  eventTime: string | null;
  description: string | null;
  isConfirmed: boolean | null;
  ipo: IpoEventIpo;
}

const EVENT_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  drhp_filing: { label: "DRHP Filing", color: "text-purple-700", bgColor: "bg-purple-50" },
  price_band: { label: "Price Band", color: "text-blue-700", bgColor: "bg-blue-50" },
  open_date: { label: "Opens", color: "text-green-700", bgColor: "bg-green-50" },
  close_date: { label: "Closes", color: "text-orange-700", bgColor: "bg-orange-50" },
  allotment: { label: "Allotment", color: "text-cyan-700", bgColor: "bg-cyan-50" },
  refund: { label: "Refund", color: "text-yellow-700", bgColor: "bg-yellow-50" },
  listing: { label: "Listing", color: "text-primary", bgColor: "bg-primary/10" },
};

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: events, isLoading } = useQuery<IpoTimelineEvent[]>({
    queryKey: ["/api/calendar/events"],
    queryFn: async () => {
      const res = await fetch("/api/calendar/events?days=60");
      return res.json();
    },
  });

  const allEvents = events || [];

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const firstDayOfWeek = monthStart.getDay();
  const paddingDays = Array(firstDayOfWeek).fill(null);

  const getEventsForDay = (date: Date) => {
    return allEvents.filter(event => {
      if (!event.eventDate) return false;
      return isSameDay(new Date(event.eventDate), date);
    });
  };

  const selectedEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  const upcomingEvents = allEvents
    .filter(e => e.eventDate && new Date(e.eventDate) >= new Date())
    .sort((a, b) => new Date(a.eventDate!).getTime() - new Date(b.eventDate!).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-primary" />
              IPO Calendar
            </h1>
            <p className="text-muted-foreground mt-1">
              Track important IPO dates and set reminders
            </p>
          </div>
        </div>
        <div className="animate-pulse">
          <div className="bg-card rounded-lg border border-border p-6 h-96"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-primary" />
            IPO Calendar
          </h1>
          <p className="text-muted-foreground mt-1">
            Track important IPO dates and set reminders
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">
                {format(currentMonth, "MMMM yyyy")}
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  data-testid="button-prev-month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  data-testid="button-next-month"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {paddingDays.map((_, idx) => (
                <div key={`pad-${idx}`} className="aspect-square" />
              ))}
              
              {days.map(day => {
                const dayEvents = getEventsForDay(day);
                const hasEvents = dayEvents.length > 0;
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`aspect-square p-1 rounded-lg transition-colors relative ${
                      isToday(day) ? "bg-primary/10 border-2 border-primary" : ""
                    } ${
                      isSelected ? "bg-primary text-white" : "hover:bg-muted"
                    }`}
                    data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                  >
                    <span className={`text-sm font-medium ${isSelected ? "text-white" : ""}`}>
                      {format(day, "d")}
                    </span>
                    {hasEvents && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {dayEvents.slice(0, 3).map((event, idx) => (
                          <div 
                            key={idx}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: isSelected ? "white" : "hsl(var(--primary))" }}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDate && (
            <div className="bg-card rounded-lg border border-border p-6 mt-6">
              <h3 className="font-bold text-foreground mb-4">
                Events on {format(selectedDate, "MMMM d, yyyy")}
              </h3>
              
              {selectedEvents.length > 0 ? (
                <div className="space-y-3">
                  {selectedEvents.map(event => {
                    const config = EVENT_CONFIG[event.eventType] || EVENT_CONFIG.listing;
                    if (!event.ipo) return null;
                    return (
                      <Link key={event.id} href={`/ipos/${event.ipoId}`}>
                        <div className={`${config.bgColor} rounded-lg p-4 hover-elevate cursor-pointer`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <Badge variant="outline" className={`${config.color} border-current mb-2`}>
                                {config.label}
                              </Badge>
                              <h4 className="font-semibold text-foreground">{event.ipo.companyName}</h4>
                              <p className="text-sm text-muted-foreground">{event.ipo.symbol}</p>
                            </div>
                            <div className="text-right">
                              {event.eventTime && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  {event.eventTime}
                                </div>
                              )}
                              {!event.isConfirmed && (
                                <Badge variant="outline" className="text-orange-600 border-orange-200 mt-1">
                                  Tentative
                                </Badge>
                              )}
                            </div>
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No IPO events scheduled for this date
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              Upcoming Events
            </h3>
            
            {upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.map(event => {
                  const config = EVENT_CONFIG[event.eventType] || EVENT_CONFIG.listing;
                  if (!event.ipo) return null;
                  const daysUntil = Math.ceil(
                    (new Date(event.eventDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  );
                  
                  return (
                    <Link key={event.id} href={`/ipos/${event.ipoId}`}>
                      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                        <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                          <span className={`text-xs font-bold ${config.color}`}>
                            {format(new Date(event.eventDate!), "dd")}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{event.ipo.symbol}</p>
                          <p className="text-xs text-muted-foreground">{config.label}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-medium ${
                            daysUntil === 0 ? "text-green-600" : 
                            daysUntil <= 3 ? "text-orange-600" : "text-muted-foreground"
                          }`}>
                            {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `${daysUntil} days`}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">
                No upcoming events
              </p>
            )}
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="font-bold text-foreground mb-4">Event Types</h3>
            <div className="space-y-2">
              {Object.entries(EVENT_CONFIG).map(([key, config]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${config.bgColor} border ${config.color.replace("text-", "border-")}`} />
                  <span className="text-sm text-muted-foreground">{config.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg border border-orange-200 p-5">
            <h4 className="font-bold text-orange-700 mb-2 flex items-center gap-2 text-sm">
              <Bell className="w-4 h-4" />
              Set Up Alerts
            </h4>
            <p className="text-xs text-muted-foreground mb-3">
              Get notified before important IPO dates
            </p>
            <Link href="/settings">
              <Button size="sm" className="w-full bg-primary text-white hover:bg-primary/90">
                Configure Alerts <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
