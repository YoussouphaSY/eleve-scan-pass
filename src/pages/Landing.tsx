import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Lycée Samba DIONE Gandiaye</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold mb-4">Système de Gestion de Présence</h2>
            <p className="text-xl text-muted-foreground">
              Connectez-vous pour accéder à votre espace
            </p>
          </div>

          <div className="bg-card rounded-lg border p-8">
            <Button 
              className="w-full h-14 text-lg" 
              onClick={() => navigate("/auth")}
            >
              Se connecter
            </Button>
          </div>
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 Lycée Samba DIONE Gandiaye. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;