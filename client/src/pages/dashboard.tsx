import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Users,
  Clock,
  PenTool,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FormTemplate, FilledForm, Patient } from "@shared/schema";

interface Stats {
  templateCount: number;
  filledThisMonth: number;
  patientCount: number;
  timeSaved: string;
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

const tips = [
  "Utilisez les suggestions intelligentes pour remplir vos formulaires 3x plus vite.",
  "Ajoutez vos patients frequents pour un remplissage automatique.",
  "Vos corrections sont memorisees pour ameliorer les futures suggestions.",
  "Exportez vos formulaires en PDF en un clic.",
];

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function DashboardPage() {
  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  const { data: templates } = useQuery<FormTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const { data: filledForms } = useQuery<FilledForm[]>({
    queryKey: ["/api/filled-forms"],
  });

  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const templateMap = new Map((templates ?? []).map((t) => [t.id, t]));
  const patientMap = new Map((patients ?? []).map((p) => [p.id, p]));

  const randomTip = tips[Math.floor(Math.random() * tips.length)];
  const recentTemplates = templates?.slice(0, 3) ?? [];
  const recentForms = filledForms?.slice(0, 5) ?? [];

  const statCards = [
    {
      label: "Templates",
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
      value: stats?.patientCount ?? 0,
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Templates recents</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {recentTemplates.map((t) => (
              <Card
                key={t.id}
                className="glass rounded-xl card-hover-lift cursor-pointer border-white/[0.08]"
                data-testid={`template-card-${t.id}`}
              >
                <CardContent className="p-4">
                  <div className="template-thumb w-full h-24 rounded-lg bg-muted/50 mb-3 flex items-center justify-center">
                    <FileText className="size-8 text-muted-foreground/50" />
                  </div>
                  <p className="font-medium text-sm truncate">{t.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="outline" className={`text-xs ${t.category === "CPAM" ? "badge-cpam" : t.category === "Mutuelle" ? "badge-mutuelle" : t.category === "Prescription" ? "badge-prescription" : "badge-autre"}`}>
                      {t.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {t.uploadCount ?? 0} utilisations
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <h2 className="text-lg font-semibold mt-6">Formulaires recents</h2>
          <div className="space-y-2">
            {recentForms.map((f) => (
              <Card
                key={f.id}
                className="glass rounded-xl card-hover-lift border-white/[0.08]"
                data-testid={`filled-form-${f.id}`}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{templateMap.get(f.templateId)?.name ?? "Formulaire"}</p>
                      <p className="text-xs text-muted-foreground">
                        {patientMap.get(f.patientId) ? `${patientMap.get(f.patientId)!.firstName} ${patientMap.get(f.patientId)!.lastName}` : ""}
                        {" - "}
                        {f.createdAt
                          ? new Date(f.createdAt).toLocaleDateString("fr-FR")
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      f.status === "completed"
                        ? "default"
                        : f.status === "downloaded"
                          ? "secondary"
                          : "outline"
                    }
                    data-testid={`status-${f.id}`}
                  >
                    {f.status === "draft"
                      ? "Brouillon"
                      : f.status === "completed"
                        ? "Termine"
                        : "Telecharge"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <Card className="glow-card bg-card/50 backdrop-blur-xl border-white/[0.08] rounded-xl" data-testid="tip-widget">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="bg-amber-500/15 p-1.5 rounded-lg">
                  <Lightbulb className="size-4 text-amber-500" />
                </div>
                Astuce du jour
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{randomTip}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
