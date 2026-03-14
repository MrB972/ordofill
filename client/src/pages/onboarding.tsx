import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Logo } from "@/components/logo";

const steps = [
  { title: "Informations personnelles", description: "Vos coordonnees professionnelles" },
  { title: "Cabinet", description: "Les informations de votre cabinet" },
  { title: "Signature", description: "Votre signature electronique (optionnel)" },
];

export default function OnboardingPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState("");
  const [numeroRpps, setNumeroRpps] = useState("");
  const [numeroAdeli, setNumeroAdeli] = useState("");
  const [cabinetName, setCabinetName] = useState("");
  const [cabinetAddress, setCabinetAddress] = useState("");

  const progress = ((step + 1) / steps.length) * 100;

  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await apiRequest("PATCH", `/api/profiles/${user.id}`, {
        fullName,
        phone,
        numeroRpps,
        numeroAdeli,
        cabinetName,
        cabinetAddress,
        onboardingCompleted: true,
      });
      const updated = await res.json();
      queryClient.setQueryData(["/api/auth/me"], updated);
      navigate("/dashboard");
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -200 : 200, opacity: 0 }),
  };

  const [direction, setDirection] = useState(1);

  const goNext = () => {
    if (step < steps.length - 1) {
      setDirection(1);
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const goBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-6">
          <Logo size={36} showText={true} />
        </div>

        <div className="glass-strong rounded-2xl p-8" data-testid="onboarding-card">
          <div className="mb-6">
            <Progress value={progress} className="h-2" data-testid="onboarding-progress" />
            <p className="text-sm text-muted-foreground mt-2">
              Etape {step + 1} sur {steps.length}
            </p>
            <h2 className="text-xl font-semibold mt-1">{steps[step].title}</h2>
            <p className="text-sm text-muted-foreground">{steps[step].description}</p>
          </div>

          <div className="relative overflow-hidden min-h-[200px]">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                {step === 0 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ob-name">Nom complet</Label>
                      <Input
                        id="ob-name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Marie Dupont"
                        data-testid="onboarding-fullname"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ob-phone">Telephone</Label>
                      <Input
                        id="ob-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="01 23 45 67 89"
                        data-testid="onboarding-phone"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ob-rpps">Numero RPPS</Label>
                        <Input
                          id="ob-rpps"
                          value={numeroRpps}
                          onChange={(e) => setNumeroRpps(e.target.value)}
                          placeholder="12345678901"
                          data-testid="onboarding-rpps"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ob-adeli">Numero ADELI</Label>
                        <Input
                          id="ob-adeli"
                          value={numeroAdeli}
                          onChange={(e) => setNumeroAdeli(e.target.value)}
                          placeholder="123456789"
                          data-testid="onboarding-adeli"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ob-cabinet">Nom du cabinet</Label>
                      <Input
                        id="ob-cabinet"
                        value={cabinetName}
                        onChange={(e) => setCabinetName(e.target.value)}
                        placeholder="Cabinet Dupont"
                        data-testid="onboarding-cabinet"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ob-address">Adresse</Label>
                      <Input
                        id="ob-address"
                        value={cabinetAddress}
                        onChange={(e) => setCabinetAddress(e.target.value)}
                        placeholder="12 Rue de la Sante, 75013 Paris"
                        data-testid="onboarding-address"
                      />
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div
                      className="border-2 border-dashed border-muted rounded-xl p-8 text-center"
                      data-testid="signature-upload-area"
                    >
                      <p className="text-muted-foreground text-sm">
                        Glissez votre signature ici ou cliquez pour uploader
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        className="mt-4 text-sm"
                        data-testid="signature-input"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Vous pourrez ajouter votre signature plus tard dans les parametres.
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={goBack}
              disabled={step === 0}
              data-testid="onboarding-back"
            >
              <ArrowLeft className="size-4 mr-2" />
              Retour
            </Button>
            <Button
              onClick={goNext}
              disabled={loading}
              data-testid="onboarding-next"
            >
              {step === steps.length - 1 ? (
                <>
                  <Check className="size-4 mr-2" />
                  {loading ? "Enregistrement..." : "Terminer"}
                </>
              ) : (
                <>
                  Suivant
                  <ArrowRight className="size-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
