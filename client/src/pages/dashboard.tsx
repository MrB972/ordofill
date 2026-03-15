import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Users,
  Clock,
  PenTool,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { getQueryFn } from "@/lib/queryClient";

interface Stats {
  templateCount: number;
  filledThisMonth: number;
  patientCount: number;
  timeSaved: string;
}

interface OrdocalPatient {
  id: string;
  firstName: string;
  lastName: string;
}

function AnimatedCounter({ value, suffix = "" }: { value: number | string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const numericValue = typeof value === "string" ? parseInt(value) || 0 : value;

  useEffect(() => {
    let start = 0;
    const end = numericValue;
    if (start === end) return;
    const duration = 600;
    const stepTime = duration / end;
    const timer = setInterval(() => {
      start += 1;
      setDisplay(start);
      if (start >= end) clearInterval(timer);
    }, stepTime);
    return () => clearInterval(timer);
  }, [numericValue]);

  if (typeof value === "string" && isNaN(parseInt(value))) {
    return <span>{value}</span>;
  }

  return (
    <span>
      {display}
      {suffix}
    </span>
  );
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const ordocalUserId = user?.ordocalUserId;

  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  const { data: ordocalPatients = [] } = useQuery<OrdocalPatient[]>({
    queryKey: ["/api/ordocal/patients", ordocalUserId],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!ordocalUserId,
  });

  const statCards = [
    {
      label: "Formulaires",
      value: stats?.templateCount ?? 0,
      icon: FileText,
      color: "text-primary",
      iconBg: "bg-primary/15",
    },
    {
      label: "Remplis ce mois",
      value: stats?.filledThisMonth ?? 0,
      icon: CheckCircle2,
      color: "text-green-500",
      iconBg: "bg-green-500/15",
    },
    {
      label: "Patients",
      value: ordocalPatients.length,
      icon: Users,
      color: "text-accent",
      iconBg: "bg-accent/15",
    },
    {
      label: "Temps economise",
      value: stats?.timeSaved ?? "0m",
      icon: Clock,
      color: "text-amber-500",
      iconBg: "bg-amber-500/15",
    },
  ];

  return (
    <div className="p-6 space-y-6" data-testid="dashboard-page">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statCards.map((card) => (
          <motion.div key={card.label} variants={staggerItem}>
            <Card className="glow-card bg-card/50 backdrop-blur-xl border-white/[0.08] rounded-xl card-hover-lift" data-testid={`stat-${card.label}`}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`${card.color} ${card.iconBg} p-3 rounded-xl`}>
                  <card.icon className="size-5" />
                </div>
                <div>
                  <p className="text-3xl font-extrabold tracking-tight">
                    {typeof card.value === "number" ? (
                      <AnimatedCounter value={card.value} />
                    ) : (
                      card.value
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Link href="/remplissage">
          <Button
            size="lg"
            className="pulse-glow bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white rounded-xl h-12 px-8 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
            data-testid="cta-nouveau-remplissage"
          >
            <PenTool className="size-5 mr-2" />
            Nouveau remplissage
            <ArrowRight className="size-5 ml-2" />
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
